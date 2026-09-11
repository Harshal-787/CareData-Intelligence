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

type PipelineHandler struct {
	pipelineService *service.PipelineService
}

func NewPipelineHandler(s *service.PipelineService) *PipelineHandler {
	return &PipelineHandler{
		pipelineService: s,
	}
}

// List handles GET /api/v1/pipelines
func (h *PipelineHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	params := domain.PipelineFilterParams{
		DatasetID:      r.URL.Query().Get("datasetId"),
		OrganizationID: claims.OrganizationID,
		Status:         domain.PipelineStatus(r.URL.Query().Get("status")),
		TriggerType:    r.URL.Query().Get("triggerType"),
		Limit:          limit,
		Offset:         offset,
	}

	jobs, err := h.pipelineService.ListPipelines(params)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"pipelines": jobs,
		"total":     len(jobs),
	})
}

// GetByID handles GET /api/v1/pipelines/{id}
func (h *PipelineHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	job, err := h.pipelineService.GetPipelineByID(id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if job == nil {
		respondError(w, http.StatusNotFound, "Pipeline run not found")
		return
	}

	respondJSON(w, http.StatusOK, job)
}

// GetStats handles GET /api/v1/pipelines/stats
func (h *PipelineHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	stats := h.pipelineService.GetStats()
	respondJSON(w, http.StatusOK, stats)
}

// Trigger handles POST /api/v1/pipelines/run
func (h *PipelineHandler) Trigger(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.PipelineRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.DatasetID == "" {
		respondError(w, http.StatusBadRequest, "datasetId is required")
		return
	}

	user := &domain.User{
		ID:             claims.UserID,
		OrganizationID: claims.OrganizationID,
		Email:          claims.Email,
		FullName:       claims.FullName,
		Role:           claims.Role,
	}

	job, err := h.pipelineService.TriggerPipeline(r.Context(), user, req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusAccepted, map[string]interface{}{
		"message":  "Pipeline execution run triggered successfully",
		"pipeline": job,
	})
}

// Retry handles POST /api/v1/pipelines/{id}/retry
func (h *PipelineHandler) Retry(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	user := &domain.User{
		ID:             claims.UserID,
		OrganizationID: claims.OrganizationID,
		Email:          claims.Email,
		FullName:       claims.FullName,
		Role:           claims.Role,
	}

	job, err := h.pipelineService.RetryPipeline(r.Context(), id, user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":  "Pipeline run retried successfully",
		"pipeline": job,
	})
}

// Cancel handles POST /api/v1/pipelines/{id}/cancel
func (h *PipelineHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	user := &domain.User{
		ID:             claims.UserID,
		OrganizationID: claims.OrganizationID,
		Email:          claims.Email,
		FullName:       claims.FullName,
		Role:           claims.Role,
	}

	job, err := h.pipelineService.CancelPipeline(id, user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":  "Pipeline run cancelled",
		"pipeline": job,
	})
}

// GetLogs handles GET /api/v1/pipelines/{id}/logs
func (h *PipelineHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	logs := h.pipelineService.GetLogs(id)
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"pipelineId": id,
		"logs":       logs,
		"count":      len(logs),
	})
}
