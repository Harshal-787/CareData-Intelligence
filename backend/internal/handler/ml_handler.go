package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"caredata/backend/internal/domain"
	"caredata/backend/internal/middleware"
	"caredata/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type MLHandler struct {
	mlService *service.MLService
}

func NewMLHandler(s *service.MLService) *MLHandler {
	return &MLHandler{
		mlService: s,
	}
}

// GetOverview handles GET /api/v1/ml/overview
func (h *MLHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	datasetID := r.URL.Query().Get("datasetId")
	overview, err := h.mlService.GetOverview(claims.OrganizationID, datasetID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, overview)
}

// ListAnomalies handles GET /api/v1/ml/anomalies
func (h *MLHandler) ListAnomalies(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	params := domain.MLFilterParams{
		DatasetID:      r.URL.Query().Get("datasetId"),
		OrganizationID: claims.OrganizationID,
		Severity:       r.URL.Query().Get("severity"),
		Category:       r.URL.Query().Get("category"),
		Status:         r.URL.Query().Get("status"),
		Search:         r.URL.Query().Get("search"),
		Limit:          limit,
		Offset:         offset,
	}

	anomalies, total, err := h.mlService.ListAnomalies(params)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"anomalies": anomalies,
		"total":     total,
		"limit":     params.Limit,
		"offset":    params.Offset,
	})
}

// GetAnomalyByID handles GET /api/v1/ml/anomalies/{id}
func (h *MLHandler) GetAnomalyByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "Anomaly ID is required")
		return
	}

	anomaly, err := h.mlService.GetAnomalyByID(id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if anomaly == nil {
		respondError(w, http.StatusNotFound, "Anomaly not found")
		return
	}

	respondJSON(w, http.StatusOK, anomaly)
}

// ResolveAnomaly handles POST /api/v1/ml/anomalies/{id}/resolve
func (h *MLHandler) ResolveAnomaly(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "Anomaly ID is required")
		return
	}

	var req domain.MLResolveAnomalyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.mlService.ResolveAnomaly(id, req, claims.FullName); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Anomaly status updated successfully",
		"id":      id,
		"status":  req.Status,
	})
}

// ListRiskScores handles GET /api/v1/ml/risk-scores
func (h *MLHandler) ListRiskScores(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	params := domain.MLFilterParams{
		DatasetID:      r.URL.Query().Get("datasetId"),
		OrganizationID: claims.OrganizationID,
		RiskTier:       r.URL.Query().Get("riskTier"),
		Search:         r.URL.Query().Get("search"),
		Limit:          limit,
		Offset:         offset,
	}

	scores, total, err := h.mlService.ListRiskScores(params)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"riskScores": scores,
		"total":      total,
		"limit":      params.Limit,
		"offset":     params.Offset,
	})
}

// ListModels handles GET /api/v1/ml/models
func (h *MLHandler) ListModels(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	runs, err := h.mlService.ListModelRuns(claims.OrganizationID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"models": runs,
		"total":  len(runs),
	})
}

// TriggerMLRun handles POST /api/v1/datasets/{id}/ml/run
func (h *MLHandler) TriggerMLRun(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	datasetID := chi.URLParam(r, "id")
	if datasetID == "" {
		respondError(w, http.StatusBadRequest, "Dataset ID is required")
		return
	}

	var req domain.MLTrainRequest
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}
	req.DatasetID = datasetID

	run, err := h.mlService.TriggerMLRun(datasetID, claims.OrganizationID, req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusAccepted, map[string]interface{}{
		"message":  "Machine Learning pipeline executed successfully",
		"modelRun": run,
	})
}
