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

type DedupeHandler struct {
	dedupeService *service.DedupeService
}

func NewDedupeHandler(dedupeService *service.DedupeService) *DedupeHandler {
	return &DedupeHandler{
		dedupeService: dedupeService,
	}
}

// RunDeduplication godoc
// @Summary      Execute demographic fuzzy patient deduplication analysis
// @Description  Scans dataset records using multi-attribute blocking and RapidFuzz/Jaro-Winkler scoring
// @Tags         Patient Deduplication
// @Accept       json
// @Produce      json
// @Param        id path string true "Dataset ID"
// @Param        body body domain.DeduplicationConfig false "Deduplication Algorithm Tuning Parameters"
// @Success      200 {object} map[string]interface{}
// @Router       /datasets/{id}/deduplicate [post]
func (h *DedupeHandler) RunDeduplication(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	datasetID := chi.URLParam(r, "id")
	if datasetID == "" {
		respondError(w, http.StatusBadRequest, "Dataset ID is required")
		return
	}

	var config domain.DeduplicationConfig
	_ = json.NewDecoder(r.Body).Decode(&config)

	orgID := ""
	if claims != nil {
		orgID = claims.OrganizationID
	}

	pairs, stats, err := h.dedupeService.RunDeduplication(datasetID, orgID, config)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":   "Patient deduplication analysis completed successfully",
		"total":     len(pairs),
		"pairs":     pairs,
		"stats":     stats,
		"datasetId": datasetID,
	})
}

// List godoc
// @Summary      List candidate duplicate pairs
// @Description  Returns paginated candidate duplicate records with match confidence and field differences
// @Tags         Patient Deduplication
// @Produce      json
// @Param        datasetId query string false "Filter by dataset ID"
// @Param        status query string false "Filter by status: PENDING, MERGED, DISTINCT"
// @Param        minConfidence query number false "Minimum match confidence (0.0 to 1.0)"
// @Param        search query string false "Search by patient name, MRN, phone"
// @Param        limit query int false "Pagination limit"
// @Param        offset query int false "Pagination offset"
// @Success      200 {object} map[string]interface{}
// @Router       /duplicates [get]
func (h *DedupeHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil && claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	q := r.URL.Query()
	datasetID := q.Get("datasetId")
	status := q.Get("status")
	search := q.Get("search")

	minConf, _ := strconv.ParseFloat(q.Get("minConfidence"), 64)
	maxConf, _ := strconv.ParseFloat(q.Get("maxConfidence"), 64)
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	if limit <= 0 {
		limit = 50
	}

	filter := domain.DuplicateFilterParams{
		OrganizationID: orgID,
		DatasetID:      datasetID,
		Status:         status,
		MinConfidence:  minConf,
		MaxConfidence:  maxConf,
		Search:         search,
		Limit:          limit,
		Offset:         offset,
	}

	pairs, total, err := h.dedupeService.ListDuplicatePairs(filter)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"pairs":  pairs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetByID godoc
// @Summary      Get details of a single duplicate candidate pair
// @Description  Returns side-by-side demographics and field similarity scores for two candidate records
// @Tags         Patient Deduplication
// @Produce      json
// @Param        id path string true "Duplicate Pair ID"
// @Success      200 {object} domain.DuplicatePair
// @Router       /duplicates/{id} [get]
func (h *DedupeHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "Duplicate Pair ID is required")
		return
	}

	pair, err := h.dedupeService.GetDuplicatePairByID(id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, pair)
}

// Resolve godoc
// @Summary      Resolve duplicate candidate (Merge into Golden Record or Mark as Distinct)
// @Description  Executes single-pair resolution with custom survivor attribute selection or false positive marking
// @Tags         Patient Deduplication
// @Accept       json
// @Produce      json
// @Param        id path string true "Duplicate Pair ID"
// @Param        body body domain.ResolveDuplicateRequest true "Resolution Action & Golden Record Data"
// @Success      200 {object} domain.DuplicatePair
// @Router       /duplicates/{id}/resolve [post]
func (h *DedupeHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "Duplicate Pair ID is required")
		return
	}

	var req domain.ResolveDuplicateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	orgID := ""
	userID := "anonymous"
	userEmail := "anonymous@caredata.ai"
	if claims != nil {
		orgID = claims.OrganizationID
		userID = claims.UserID
		userEmail = claims.Email
	}

	resolved, err := h.dedupeService.ResolveDuplicate(id, orgID, userID, userEmail, r.RemoteAddr, req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, resolved)
}

// Unresolve godoc
// @Summary      Re-open a resolved duplicate candidate back to PENDING status
// @Description  Reverts MERGED or DISTINCT state so the candidate pair can be re-evaluated
// @Tags         Patient Deduplication
// @Produce      json
// @Param        id path string true "Duplicate Pair ID"
// @Success      200 {object} domain.DuplicatePair
// @Router       /duplicates/{id}/unresolve [post]
func (h *DedupeHandler) Unresolve(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "Duplicate Pair ID is required")
		return
	}

	orgID := ""
	userID := "anonymous"
	userEmail := "anonymous@caredata.ai"
	if claims != nil {
		orgID = claims.OrganizationID
		userID = claims.UserID
		userEmail = claims.Email
	}

	reopened, err := h.dedupeService.UnresolveDuplicate(id, orgID, userID, userEmail, r.RemoteAddr)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, reopened)
}

// BulkResolve godoc
// @Summary      Bulk resolve high-confidence duplicate candidates
// @Description  Automatically merges or marks distinct all pending candidate pairs with match score >= threshold
// @Tags         Patient Deduplication
// @Accept       json
// @Produce      json
// @Param        body body domain.BulkResolveRequest true "Bulk Resolution Criteria"
// @Success      200 {object} map[string]interface{}
// @Router       /duplicates/bulk-resolve [post]
func (h *DedupeHandler) BulkResolve(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	var req domain.BulkResolveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	orgID := ""
	userID := "anonymous"
	userEmail := "anonymous@caredata.ai"
	if claims != nil {
		orgID = claims.OrganizationID
		userID = claims.UserID
		userEmail = claims.Email
	}

	count, err := h.dedupeService.BulkResolve(orgID, userID, userEmail, r.RemoteAddr, req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":       "Bulk resolution processed successfully",
		"resolvedCount": count,
		"action":        req.Action,
		"minConfidence": req.MinConfidence,
	})
}

// Stats godoc
// @Summary      Get deduplication summary metrics & confidence distributions
// @Description  Returns total duplicate pairs, pending review, merged, distinct, and confidence brackets
// @Tags         Patient Deduplication
// @Produce      json
// @Param        datasetId query string false "Filter by Dataset ID"
// @Success      200 {object} domain.DeduplicationStats
// @Router       /duplicates/stats [get]
func (h *DedupeHandler) Stats(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil && claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	datasetID := r.URL.Query().Get("datasetId")
	stats, err := h.dedupeService.GetStats(orgID, datasetID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, stats)
}

// ListMPI godoc
// @Summary      List Master Patient Index (MPI) consolidated golden records
// @Description  Returns verified golden records generated from merged duplicate patient feeds
// @Tags         Patient Deduplication
// @Produce      json
// @Param        datasetId query string false "Filter by dataset ID"
// @Param        limit query int false "Limit"
// @Param        offset query int false "Offset"
// @Success      200 {object} map[string]interface{}
// @Router       /duplicates/mpi [get]
func (h *DedupeHandler) ListMPI(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	orgID := ""
	if claims != nil && claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	datasetID := r.URL.Query().Get("datasetId")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 50
	}

	records, total, err := h.dedupeService.ListMPIRecords(orgID, datasetID, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"records": records,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}
