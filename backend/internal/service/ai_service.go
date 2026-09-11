package service

import (
	"fmt"
	"time"

	"caredata/backend/internal/ai"
	"caredata/backend/internal/config"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/repository"
)

type AIService struct {
	repo     *repository.Repository
	aiClient *ai.AIClient
	cfg      *config.Config
}

func NewAIService(repo *repository.Repository, cfg *config.Config) *AIService {
	aiClient := ai.NewAIClient(cfg.OllamaURL, "llama3")
	return &AIService{
		repo:     repo,
		aiClient: aiClient,
		cfg:      cfg,
	}
}

func (s *AIService) GetOllamaStatus() domain.OllamaStatusResponse {
	return s.aiClient.GetStatus()
}

func (s *AIService) SelectModel(model string) {
	s.aiClient.SetActiveModel(model)
}

func (s *AIService) AskQuestion(userID, orgID string, req domain.AIChatRequest) (*domain.AIChatResponse, error) {
	if req.Question == "" {
		return nil, fmt.Errorf("question cannot be empty")
	}

	sessionID := req.SessionID
	var session *domain.AIChatSession
	var err error

	if sessionID != "" {
		session, err = s.repo.GetAIChatSessionByID(sessionID)
	}

	datasetName := "Combined Healthcare Lake"
	if req.DatasetID != "" {
		if ds, err := s.repo.GetDatasetByID(req.DatasetID); err == nil && ds != nil {
			datasetName = ds.Name
		}
	}

	if session == nil {
		sessionID = fmt.Sprintf("sess-%d", time.Now().UnixNano())
		title := req.Question
		if len(title) > 40 {
			title = title[:37] + "..."
		}
		model := req.Model
		if model == "" {
			model = "llama3"
		}

		session = &domain.AIChatSession{
			ID:             sessionID,
			OrganizationID: orgID,
			UserID:         userID,
			Title:          title,
			DatasetID:      req.DatasetID,
			DatasetName:    datasetName,
			ActiveModel:    model,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
		if err := s.repo.CreateAIChatSession(session); err != nil {
			return nil, fmt.Errorf("failed creating chat session: %w", err)
		}
	}

	// 1. Record User message
	userMsg := domain.AIChatMessage{
		ID:        fmt.Sprintf("msg-u-%d", time.Now().UnixNano()),
		SessionID: sessionID,
		Role:      domain.AIChatRoleUser,
		Content:   req.Question,
		CreatedAt: time.Now(),
	}
	_ = s.repo.SaveAIChatMessage(&userMsg)

	// 2. Answer via AI Client
	modelToUse := req.Model
	if modelToUse == "" {
		modelToUse = session.ActiveModel
	}
	asstMsg, err := s.aiClient.AnswerQuestion(req.Question, modelToUse)
	if err != nil {
		return nil, fmt.Errorf("ai inference failed: %w", err)
	}

	asstMsg.ID = fmt.Sprintf("msg-a-%d", time.Now().UnixNano())
	asstMsg.SessionID = sessionID
	_ = s.repo.SaveAIChatMessage(asstMsg)

	return &domain.AIChatResponse{
		SessionID:        sessionID,
		UserMessage:      userMsg,
		AssistantMessage: *asstMsg,
	}, nil
}

func (s *AIService) GetChatHistory(userID, orgID, sessionID string) (*domain.AIChatSession, error) {
	if sessionID != "" {
		return s.repo.GetAIChatSessionByID(sessionID)
	}

	// Get latest session or create default
	sessions, err := s.repo.ListAIChatSessions(userID, orgID)
	if err != nil {
		return nil, err
	}
	if len(sessions) > 0 {
		return s.repo.GetAIChatSessionByID(sessions[0].ID)
	}

	// Create initial welcome session
	return s.createDefaultWelcomeSession(userID, orgID)
}

func (s *AIService) ListChatSessions(userID, orgID string) ([]domain.AIChatSession, error) {
	sessions, err := s.repo.ListAIChatSessions(userID, orgID)
	if err != nil {
		return nil, err
	}
	if len(sessions) == 0 {
		sess, err := s.createDefaultWelcomeSession(userID, orgID)
		if err == nil && sess != nil {
			return []domain.AIChatSession{*sess}, nil
		}
	}
	return sessions, nil
}

func (s *AIService) DeleteChatSession(sessionID string) error {
	return s.repo.DeleteAIChatSession(sessionID)
}

func (s *AIService) createDefaultWelcomeSession(userID, orgID string) (*domain.AIChatSession, error) {
	sessionID := fmt.Sprintf("sess-welcome-%d", time.Now().Unix())
	sess := &domain.AIChatSession{
		ID:             sessionID,
		OrganizationID: orgID,
		UserID:         userID,
		Title:          "Welcome & Getting Started",
		DatasetName:    "Clinical Vitals Benchmark Feed",
		ActiveModel:    "llama3",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	_ = s.repo.CreateAIChatSession(sess)

	welcomeMsg := domain.AIChatMessage{
		ID:        fmt.Sprintf("msg-welcome-%d", time.Now().Unix()),
		SessionID: sessionID,
		Role:      domain.AIChatRoleAssistant,
		Content:   "👋 Welcome to CareData AI! You can query your healthcare data lake using natural language. For example:\n\n• *\"Show top 5 departments by 30-day readmissions\"*\n• *\"Identify patients with total hospital charges > $40,000\"*\n• *\"List high-risk patients with Charlson Comorbidity Index ≥ 4\"*\n• *\"Summarize recent vital sign anomalies flagged by Isolation Forest\"*",
		Engine:    "CareData Intelligence Suite",
		Model:     "llama3",
		CreatedAt: time.Now(),
	}
	_ = s.repo.SaveAIChatMessage(&welcomeMsg)

	sess.Messages = []domain.AIChatMessage{welcomeMsg}
	return sess, nil
}

func (s *AIService) GenerateNarrative(orgID, datasetID string) (*domain.AINarrativeInsight, error) {
	datasetName := "Clinical Vitals & Encounter Benchmark Feed"
	if datasetID != "" {
		if ds, err := s.repo.GetDatasetByID(datasetID); err == nil && ds != nil {
			datasetName = ds.Name
		}
	}

	insight := s.aiClient.GenerateNarrative(datasetName)
	insight.DatasetID = datasetID
	return &insight, nil
}

func (s *AIService) GenerateReport(userID, orgID string, req domain.AIReportRequest) (*domain.AIClinicalReport, error) {
	datasetName := "Clinical Vitals & Encounter Benchmark Feed"
	if req.DatasetID != "" {
		if ds, err := s.repo.GetDatasetByID(req.DatasetID); err == nil && ds != nil {
			datasetName = ds.Name
		}
	}

	title := req.Title
	if title == "" {
		title = fmt.Sprintf("CareData Clinical Intelligence Brief — %s", datasetName)
	}

	report := s.aiClient.GenerateClinicalReport(title, datasetName, orgID)
	report.DatasetID = req.DatasetID
	report.GeneratedBy = userID

	if err := s.repo.SaveAIClinicalReport(&report); err != nil {
		return nil, fmt.Errorf("failed saving report: %w", err)
	}

	return &report, nil
}

func (s *AIService) ListReports(orgID string) ([]domain.AIClinicalReport, error) {
	reports, err := s.repo.ListAIClinicalReports(orgID)
	if err != nil {
		return nil, err
	}
	if len(reports) == 0 {
		// Auto seed baseline sample report
		defaultRep := s.aiClient.GenerateClinicalReport("Executive Healthcare Intelligence & Risk Briefing", "Clinical Vitals Benchmark Feed", orgID)
		_ = s.repo.SaveAIClinicalReport(&defaultRep)
		return []domain.AIClinicalReport{defaultRep}, nil
	}
	return reports, nil
}

func (s *AIService) GetReportByID(id string) (*domain.AIClinicalReport, error) {
	return s.repo.GetAIClinicalReportByID(id)
}
