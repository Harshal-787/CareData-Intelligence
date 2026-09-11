package handler

import (
	"encoding/json"
	"net/http"

	"caredata/backend/internal/domain"
	"caredata/backend/internal/middleware"
	"caredata/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type AIHandler struct {
	aiService *service.AIService
}

func NewAIHandler(aiService *service.AIService) *AIHandler {
	return &AIHandler{aiService: aiService}
}

func (h *AIHandler) GetOllamaStatus(w http.ResponseWriter, r *http.Request) {
	status := h.aiService.GetOllamaStatus()
	respondJSON(w, http.StatusOK, status)
}

func (h *AIHandler) SelectModel(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Model string `json:"model"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Model == "" {
		respondError(w, http.StatusBadRequest, "model name is required")
		return
	}

	h.aiService.SelectModel(req.Model)
	respondJSON(w, http.StatusOK, map[string]string{
		"message":     "Active AI model updated to " + req.Model,
		"activeModel": req.Model,
	})
}

func (h *AIHandler) Chat(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	userID := "system-user"
	orgID := ""
	if claims != nil {
		userID = claims.UserID
		orgID = claims.OrganizationID
	}

	var req domain.AIChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	resp, err := h.aiService.AskQuestion(userID, orgID, req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

func (h *AIHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	userID := "system-user"
	orgID := ""
	if claims != nil {
		userID = claims.UserID
		orgID = claims.OrganizationID
	}

	sessionID := r.URL.Query().Get("sessionId")
	history, err := h.aiService.GetChatHistory(userID, orgID, sessionID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, history)
}

func (h *AIHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	userID := "system-user"
	orgID := ""
	if claims != nil {
		userID = claims.UserID
		orgID = claims.OrganizationID
	}

	sessions, err := h.aiService.ListChatSessions(userID, orgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, sessions)
}

func (h *AIHandler) DeleteSession(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	if sessionID == "" {
		respondError(w, http.StatusBadRequest, "session id is required")
		return
	}

	if err := h.aiService.DeleteChatSession(sessionID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Chat session deleted successfully"})
}

func (h *AIHandler) GenerateNarrative(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	datasetID := r.URL.Query().Get("datasetId")
	narrative, err := h.aiService.GenerateNarrative(orgID, datasetID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, narrative)
}

func (h *AIHandler) GenerateReport(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	userID := "system-user"
	orgID := ""
	if claims != nil {
		userID = claims.UserID
		orgID = claims.OrganizationID
	}

	var req domain.AIReportRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	report, err := h.aiService.GenerateReport(userID, orgID, req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, report)
}

func (h *AIHandler) ListReports(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	reports, err := h.aiService.ListReports(orgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, reports)
}

func (h *AIHandler) GetReport(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	report, err := h.aiService.GetReportByID(id)
	if err != nil || report == nil {
		respondError(w, http.StatusNotFound, "report not found")
		return
	}

	respondJSON(w, http.StatusOK, report)
}
