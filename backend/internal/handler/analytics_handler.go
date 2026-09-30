package handler

import (
	"encoding/json"
	"net/http"

	"caredata/backend/internal/domain"
	"caredata/backend/internal/middleware"
	"caredata/backend/internal/service"
)

type AnalyticsHandler struct {
	analyticsService *service.AnalyticsService
}

func NewAnalyticsHandler(as *service.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsService: as,
	}
}

// GetOverview handles GET /api/v1/analytics/overview
// @Summary      Get Executive Healthcare Analytics Overview
// @Description  Calculates enterprise clinical KPIs, length of stay, 30-day readmissions, and multi-dimensional distributions.
// @Tags         Analytics
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} domain.AnalyticsOverviewResponse
// @Router       /analytics/overview [get]
func (h *AnalyticsHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	filter := domain.AnalyticsFilterParams{
		DatasetID:      r.URL.Query().Get("datasetId"),
		OrganizationID: claims.OrganizationID,
		DateRange:      r.URL.Query().Get("dateRange"),
		Department:     r.URL.Query().Get("department"),
		AdmissionType:  r.URL.Query().Get("admissionType"),
		AgeCohort:      r.URL.Query().Get("ageCohort"),
		Gender:         r.URL.Query().Get("gender"),
	}

	overview, err := h.analyticsService.GetOverview(claims.OrganizationID, filter)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, overview)
}

// GetClinicalMetrics handles GET /api/v1/analytics/clinical-metrics
// @Summary      Get Detailed Clinical Metrics
// @Description  Retrieves departmental utilization, ALOS, and diagnosis distribution breakdowns.
// @Tags         Analytics
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} domain.AnalyticsOverviewResponse
// @Router       /analytics/clinical-metrics [get]
func (h *AnalyticsHandler) GetClinicalMetrics(w http.ResponseWriter, r *http.Request) {
	h.GetOverview(w, r)
}

// ExecuteQuery handles POST /api/v1/analytics/query
// @Summary      Execute DuckDB / OLAP SQL Query
// @Description  Runs high-performance analytical SQL queries directly on loaded dataset records with safety checks.
// @Tags         Analytics
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body domain.SQLQueryRequest true "SQL Query Request"
// @Success      200 {object} domain.SQLQueryResponse
// @Router       /analytics/query [post]
func (h *AnalyticsHandler) ExecuteQuery(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.SQLQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Query == "" {
		respondError(w, http.StatusBadRequest, "SQL query cannot be empty")
		return
	}

	res, err := h.analyticsService.ExecuteQuery(claims.OrganizationID, req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, res)
}

// GetSnowflakeStatus handles GET /api/v1/analytics/snowflake/status
// @Summary      Get Snowflake Connector Status & Sync History
// @Description  Returns Snowflake data warehouse connection status, auto-sync settings, and sync audit logs.
// @Tags         Analytics
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} domain.SnowflakeStatusResponse
// @Router       /analytics/snowflake/status [get]
func (h *AnalyticsHandler) GetSnowflakeStatus(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	status, err := h.analyticsService.GetSnowflakeStatus(claims.OrganizationID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, status)
}

// UpdateSnowflakeConfig handles PUT /api/v1/analytics/snowflake/config
// @Summary      Update Snowflake Connector Configuration
// @Description  Updates enterprise Snowflake account, warehouse, database, and sync parameters.
// @Tags         Analytics
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        config body domain.SnowflakeConfig true "Snowflake Config"
// @Success      200 {object} map[string]string
// @Router       /analytics/snowflake/config [put]
func (h *AnalyticsHandler) UpdateSnowflakeConfig(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var cfg domain.SnowflakeConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.analyticsService.UpdateSnowflakeConfig(claims.OrganizationID, &cfg); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Snowflake configuration updated successfully"})
}

// TriggerSnowflakeSync handles POST /api/v1/analytics/snowflake/sync
// @Summary      Trigger On-Demand Sync to Snowflake
// @Description  Synchronizes clinical mart aggregations to Snowflake enterprise data warehouse.
// @Tags         Analytics
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} domain.SnowflakeSyncRecord
// @Router       /analytics/snowflake/sync [post]
func (h *AnalyticsHandler) TriggerSnowflakeSync(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		DatasetID string `json:"datasetId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	syncRecord, err := h.analyticsService.TriggerSnowflakeSync(claims.OrganizationID, claims.Email, body.DatasetID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, syncRecord)
}

// GetSnowflakeTables handles GET /api/v1/analytics/snowflake/tables
// @Summary      Get Snowflake Tables
// @Description  Returns Snowflake tables.
// @Tags         Analytics
// @Security     BearerAuth
// @Success      200 {array} map[string]interface{}
// @Router       /analytics/snowflake/tables [get]
func (h *AnalyticsHandler) GetSnowflakeTables(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	tables, err := h.analyticsService.GetSnowflakeTables(claims.OrganizationID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, tables)
}
