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

type QualityHandler struct {
	qualityService *service.QualityService
}

func NewQualityHandler(qualityService *service.QualityService) *QualityHandler {
	return &QualityHandler{
		qualityService: qualityService,
	}
}

// GetOverview godoc
// @Summary      System-wide Data Quality & Health Overview
// @Description  Returns aggregated health scores, 4-pillar benchmarks, and violation counts
// @Tags         Data Quality
// @Produce      json
// @Success      200 {object} domain.QualityOverview
// @Router       /quality/overview [get]
func (h *QualityHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil && claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	overview, err := h.qualityService.GetQualityOverview(orgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, overview)
}

// GetQualityReport godoc
// @Summary      Get dataset quality scorecard & column profiles
// @Description  Returns the 4-pillar quality scores, column distributions, and violation breakdown
// @Tags         Data Quality
// @Produce      json
// @Param        id path string true "Dataset ID"
// @Success      200 {object} domain.QualityReport
// @Router       /datasets/{id}/quality-report [get]
func (h *QualityHandler) GetQualityReport(w http.ResponseWriter, r *http.Request) {
	datasetID := chi.URLParam(r, "id")
	if datasetID == "" {
		respondError(w, http.StatusBadRequest, "Dataset ID is required")
		return
	}

	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	report, err := h.qualityService.GetQualityReport(datasetID, orgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, report)
}

// RunQualityAudit godoc
// @Summary      Run on-demand quality audit & statistical profiler
// @Description  Executes complete column profiling and re-evaluates all active clinical validation rules
// @Tags         Data Quality
// @Produce      json
// @Param        id path string true "Dataset ID"
// @Success      200 {object} domain.QualityReport
// @Router       /datasets/{id}/audit [post]
func (h *QualityHandler) RunQualityAudit(w http.ResponseWriter, r *http.Request) {
	datasetID := chi.URLParam(r, "id")
	if datasetID == "" {
		respondError(w, http.StatusBadRequest, "Dataset ID is required")
		return
	}

	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	report, err := h.qualityService.RunQualityAudit(datasetID, orgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, report)
}

// ListViolations godoc
// @Summary      List row-level clinical rule violations
// @Description  Returns paginated validation violations with optional severity filter
// @Tags         Data Quality
// @Produce      json
// @Param        id path string true "Dataset ID"
// @Param        severity query string false "Filter by severity (CRITICAL, WARNING, INFO)"
// @Param        limit query int false "Items per page"
// @Param        offset query int false "Pagination offset"
// @Success      200 {object} map[string]interface{}
// @Router       /datasets/{id}/violations [get]
func (h *QualityHandler) ListViolations(w http.ResponseWriter, r *http.Request) {
	datasetID := chi.URLParam(r, "id")
	if datasetID == "" {
		respondError(w, http.StatusBadRequest, "Dataset ID is required")
		return
	}

	severity := r.URL.Query().Get("severity")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 50
	}

	violations, total, err := h.qualityService.ListViolations(datasetID, severity, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"violations": violations,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

// ListRules godoc
// @Summary      List validation rules for dataset
// @Description  Returns active and inactive clinical validation rules
// @Tags         Data Quality
// @Produce      json
// @Param        id path string true "Dataset ID"
// @Success      200 {array} domain.ValidationRule
// @Router       /datasets/{id}/rules [get]
func (h *QualityHandler) ListRules(w http.ResponseWriter, r *http.Request) {
	datasetID := chi.URLParam(r, "id")
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	rules, err := h.qualityService.ListRules(orgID, datasetID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, rules)
}

// CreateRule godoc
// @Summary      Add new validation rule
// @Description  Creates a new clinical validation rule for dataset or organization
// @Tags         Data Quality
// @Accept       json
// @Produce      json
// @Param        id path string true "Dataset ID"
// @Param        request body domain.CreateValidationRuleRequest true "Rule Details"
// @Success      201 {object} domain.ValidationRule
// @Router       /datasets/{id}/rules [post]
func (h *QualityHandler) CreateRule(w http.ResponseWriter, r *http.Request) {
	datasetID := chi.URLParam(r, "id")
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	var req domain.CreateValidationRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid rule payload")
		return
	}

	rule, err := h.qualityService.CreateRule(orgID, datasetID, &req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, rule)
}

// UpdateRule godoc
// @Summary      Update validation rule
// @Description  Updates rule thresholds, status, or parameters
// @Tags         Data Quality
// @Accept       json
// @Produce      json
// @Param        id path string true "Dataset ID"
// @Param        ruleId path string true "Rule ID"
// @Param        request body domain.UpdateValidationRuleRequest true "Updated Rule"
// @Success      200 {object} domain.ValidationRule
// @Router       /datasets/{id}/rules/{ruleId} [put]
func (h *QualityHandler) UpdateRule(w http.ResponseWriter, r *http.Request) {
	ruleID := chi.URLParam(r, "ruleId")
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	var req domain.UpdateValidationRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid rule payload")
		return
	}

	rule, err := h.qualityService.UpdateRule(orgID, ruleID, &req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, rule)
}

// DeleteRule godoc
// @Summary      Delete validation rule
// @Description  Deletes a validation rule
// @Tags         Data Quality
// @Produce      json
// @Param        id path string true "Dataset ID"
// @Param        ruleId path string true "Rule ID"
// @Success      200 {object} map[string]string
// @Router       /datasets/{id}/rules/{ruleId} [delete]
func (h *QualityHandler) DeleteRule(w http.ResponseWriter, r *http.Request) {
	ruleID := chi.URLParam(r, "ruleId")
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	if err := h.qualityService.DeleteRule(orgID, ruleID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Rule deleted successfully"})
}

// ResetDefaultRules godoc
// @Summary      Reset validation rules to healthcare defaults
// @Description  Clears custom rules and resets to ICD-10, NPI, DOB, and Vitals defaults
// @Tags         Data Quality
// @Produce      json
// @Param        id path string true "Dataset ID"
// @Success      200 {array} domain.ValidationRule
// @Router       /datasets/{id}/rules/reset [post]
func (h *QualityHandler) ResetDefaultRules(w http.ResponseWriter, r *http.Request) {
	datasetID := chi.URLParam(r, "id")
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	rules, err := h.qualityService.ResetDefaultRules(orgID, datasetID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, rules)
}
