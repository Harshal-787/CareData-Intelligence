package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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
	aiClient := ai.NewAIClient(cfg.GeminiAPIKey, "gemini-3.6-flash")
	return &AIService{
		repo:     repo,
		aiClient: aiClient,
		cfg:      cfg,
	}
}

func (s *AIService) GetGeminiStatus() domain.GeminiStatusResponse {
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
			model = "gemini-3.6-flash"
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

	// 2. Answer via Python Data Engine (Gemini NL2SQL Agent)
	// We need the dataset object_name to load the DuckDB schema
	objectName := ""
	if req.DatasetID != "" {
		if ds, err := s.repo.GetDatasetByID(req.DatasetID); err == nil && ds != nil {
			objectName = ds.StoragePath
		}
	}
	
	if objectName == "" {
		objectName = "demodata.parquet" // fallback for demo
	}

	payload := map[string]interface{}{
		"question":    req.Question,
		"bucket":      "raw-data",
		"object_name": objectName,
	}
	
	payloadBytes, _ := json.Marshal(payload)
	
	dataEngineURL := os.Getenv("DATA_ENGINE_URL")
	if dataEngineURL == "" {
		dataEngineURL = "http://localhost:8000"
	}
	
	var asstContent string
	var sqlQuery string
	
	httpResp, err := http.Post(fmt.Sprintf("%s/api/v1/ai/nl2sql", dataEngineURL), "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		asstContent = fmt.Sprintf("⚠️ Failed to reach AI Engine: %v", err)
	} else {
		defer httpResp.Body.Close()
		if httpResp.StatusCode != 200 {
			asstContent = fmt.Sprintf("⚠️ AI Engine returned status %d", httpResp.StatusCode)
		} else {
			var result struct {
				SQLQuery string                   `json:"sql_query"`
				Records  []map[string]interface{} `json:"records"`
				Count    int                      `json:"count"`
			}
			if err := json.NewDecoder(httpResp.Body).Decode(&result); err != nil {
				asstContent = fmt.Sprintf("⚠️ Failed to parse AI response: %v", err)
			} else {
				sqlQuery = result.SQLQuery
				asstContent = fmt.Sprintf("I executed the following SQL query on your DuckDB clinical dataset:\n\n```sql\n%s\n```\n\n**Result Summary:** Found %d records.", result.SQLQuery, result.Count)
				if result.Count > 0 {
					asstContent += "\n\n**Sample Data:**\n"
					sampleCount := result.Count
					if sampleCount > 3 {
						sampleCount = 3
					}
					for i := 0; i < sampleCount; i++ {
						asstContent += fmt.Sprintf("- %v\n", result.Records[i])
					}
				}
			}
		}
	}

	asstMsg := &domain.AIChatMessage{
		ID:        fmt.Sprintf("msg-a-%d", time.Now().UnixNano()),
		SessionID: sessionID,
		Role:      domain.AIChatRoleAssistant,
		Content:   asstContent,
		Engine:    "Gemini 1.5 Flash (NL-to-SQL)",
		Model:     "gemini",
		Metadata: map[string]interface{}{
			"sql_executed": sqlQuery,
		},
		CreatedAt: time.Now(),
	}

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
		ActiveModel:    "gemini-3.6-flash",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	_ = s.repo.CreateAIChatSession(sess)

	welcomeMsg := domain.AIChatMessage{
		ID:        fmt.Sprintf("msg-welcome-%d", time.Now().Unix()),
		SessionID: sessionID,
		Role:      domain.AIChatRoleAssistant,
		Content:   "👋 Welcome to CareData AI! You can query your healthcare data lake using natural language. For example:\n\n➤ \"Show top 5 departments by 30-day readmissions\"\n➤ \"Identify patients with total hospital charges > $40,000\"\n➤ \"List high-risk patients with Charlson Comorbidity Index ≥ 4\"\n➤ \"Summarize recent vital sign anomalies flagged by Isolation Forest\"",
		Engine:    "CareData Intelligence Suite (Gemini)",
		Model:     "gemini-3.6-flash",
		CreatedAt: time.Now(),
	}
	_ = s.repo.SaveAIChatMessage(&welcomeMsg)

	sess.Messages = []domain.AIChatMessage{welcomeMsg}
	return sess, nil
}

func (s *AIService) GenerateNarrative(orgID, datasetID string) (*domain.AINarrativeInsight, error) {
	datasetName := "Clinical Vitals & Encounter Benchmark Feed"
	objectName := "demodata.parquet"
	if datasetID != "" {
		if ds, err := s.repo.GetDatasetByID(datasetID); err == nil && ds != nil {
			datasetName = ds.Name
			objectName = ds.StoragePath
		}
	}

	dataEngineURL := os.Getenv("DATA_ENGINE_URL")
	if dataEngineURL == "" {
		dataEngineURL = "http://localhost:8000"
	}

	payload := map[string]interface{}{
		"title":       "Narrative Insight",
		"dataset_name": datasetName,
		"bucket":      "raw-data",
		"object_name": objectName,
	}
	payloadBytes, _ := json.Marshal(payload)

	httpResp, err := http.Post(fmt.Sprintf("%s/api/v1/ai/narrative", dataEngineURL), "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to call ai engine: %w", err)
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != 200 {
		return nil, fmt.Errorf("ai engine returned status %d", httpResp.StatusCode)
	}

	var insight domain.AINarrativeInsight
	if err := json.NewDecoder(httpResp.Body).Decode(&insight); err != nil {
		return nil, err
	}
	insight.DatasetName = datasetName
	insight.DatasetID = datasetID
	insight.GeneratedAt = time.Now()

	return &insight, nil
}

func (s *AIService) GenerateReport(userID, orgID string, req domain.AIReportRequest) (*domain.AIClinicalReport, error) {
	datasetName := "Clinical Vitals & Encounter Benchmark Feed"
	objectName := "demodata.parquet"
	if req.DatasetID != "" {
		if ds, err := s.repo.GetDatasetByID(req.DatasetID); err == nil && ds != nil {
			datasetName = ds.Name
			objectName = ds.StoragePath
		}
	}

	title := req.Title
	if title == "" {
		title = fmt.Sprintf("CareData Clinical Intelligence Brief — %s", datasetName)
	}

	dataEngineURL := os.Getenv("DATA_ENGINE_URL")
	if dataEngineURL == "" {
		dataEngineURL = "http://localhost:8000"
	}

	payload := map[string]interface{}{
		"title":       title,
		"dataset_name": datasetName,
		"bucket":      "raw-data",
		"object_name": objectName,
	}
	payloadBytes, _ := json.Marshal(payload)

	httpResp, err := http.Post(fmt.Sprintf("%s/api/v1/ai/report", dataEngineURL), "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to call ai engine: %w", err)
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != 200 {
		return nil, fmt.Errorf("ai engine returned status %d", httpResp.StatusCode)
	}

	var report domain.AIClinicalReport
	if err := json.NewDecoder(httpResp.Body).Decode(&report); err != nil {
		return nil, err
	}

	report.ID = fmt.Sprintf("rep-%d", time.Now().Unix())
	report.OrganizationID = orgID
	report.Title = title
	report.DatasetName = datasetName
	report.DatasetID = req.DatasetID
	report.GeneratedBy = userID
	report.CreatedAt = time.Now()

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
	return reports, nil
}

func (s *AIService) GetReportByID(id string) (*domain.AIClinicalReport, error) {
	return s.repo.GetAIClinicalReportByID(id)
}

func (s *AIService) DeleteReport(id string) error {
	return s.repo.DeleteAIClinicalReport(id)
}
