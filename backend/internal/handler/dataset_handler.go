package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"caredata/backend/internal/domain"
	"caredata/backend/internal/middleware"
	"caredata/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type DatasetHandler struct {
	datasetService *service.DatasetService
}

func NewDatasetHandler(datasetService *service.DatasetService) *DatasetHandler {
	return &DatasetHandler{
		datasetService: datasetService,
	}
}

// Upload godoc
// @Summary      Upload & ingest raw healthcare dataset
// @Description  Accepts multipart file upload (CSV, JSON, NDJSON, Parquet), stores in Lakehouse storage, and infers column schema
// @Tags         Datasets & Ingestion
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        file formData file true "Dataset file to upload"
// @Param        name formData string false "Custom display name for dataset"
// @Success      201 {object} domain.DatasetResponse
// @Failure      400 {object} map[string]string
// @Failure      401 {object} map[string]string
// @Router       /datasets/upload [post]
func (h *DatasetHandler) Upload(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Limit multipart request size to 100MB
	if err := r.ParseMultipartForm(100 << 20); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("Failed to parse multipart upload (max 100MB): %v", err))
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Form file field 'file' is required")
		return
	}
	defer file.Close()

	customName := strings.TrimSpace(r.FormValue("name"))
	if customName == "" {
		customName = header.Filename
	}

	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = forwarded
	}

	res, err := h.datasetService.UploadAndIngest(
		claims.OrganizationID,
		claims.UserID,
		claims.Email,
		ipAddress,
		customName,
		header.Filename,
		file,
	)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, res)
}

// GenerateSample godoc
// @Summary      Generate synthetic clinical benchmark dataset
// @Description  Creates and ingests realistic healthcare sample datasets (encounters, demographics, labs) for instant platform exploration
// @Tags         Datasets & Ingestion
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body map[string]string true "Sample Type ({\"type\": \"encounters\" | \"demographics\" | \"labs\"})"
// @Success      201 {object} domain.DatasetResponse
// @Failure      400 {object} map[string]string
// @Failure      401 {object} map[string]string
// @Router       /datasets/sample [post]
func (h *DatasetHandler) GenerateSample(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Type string `json:"type"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.Type == "" {
		req.Type = "encounters"
	}

	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = forwarded
	}

	res, err := h.datasetService.GenerateSampleDataset(
		claims.OrganizationID,
		claims.UserID,
		claims.Email,
		ipAddress,
		req.Type,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, res)
}

// List godoc
// @Summary      List organization datasets
// @Description  Returns catalog of ingested datasets with column count, total records, and status
// @Tags         Datasets & Ingestion
// @Produce      json
// @Security     BearerAuth
// @Param        search query string false "Search by name or filename"
// @Param        status query string false "Filter by status (PENDING, PROCESSING, READY, FAILED)"
// @Param        limit query int false "Pagination limit"
// @Param        offset query int false "Pagination offset"
// @Success      200 {array} domain.DatasetResponse
// @Router       /datasets [get]
func (h *DatasetHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	var orgID string
	if claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	filter := domain.DatasetFilterParams{
		OrganizationID: orgID,
		Status:         r.URL.Query().Get("status"),
		Search:         r.URL.Query().Get("search"),
		Limit:          limit,
		Offset:         offset,
	}

	datasets, err := h.datasetService.ListDatasets(filter)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to retrieve datasets")
		return
	}

	if datasets == nil {
		datasets = []domain.DatasetResponse{}
	}

	respondJSON(w, http.StatusOK, datasets)
}

// GetByID godoc
// @Summary      Get dataset schema & preview details
// @Description  Returns dataset metadata along with inferred column schemas and first 20 preview records
// @Tags         Datasets & Ingestion
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Dataset ID"
// @Success      200 {object} domain.DatasetResponse
// @Failure      404 {object} map[string]string
// @Router       /datasets/{id} [get]
func (h *DatasetHandler) GetByID(w http.ResponseWriter, r *http.Request) {
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

	var orgID string
	if claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	dataset, err := h.datasetService.GetDatasetByID(datasetID, orgID)
	if err != nil {
		respondError(w, http.StatusForbidden, err.Error())
		return
	}
	if dataset == nil {
		respondError(w, http.StatusNotFound, "Dataset not found")
		return
	}

	respondJSON(w, http.StatusOK, dataset)
}

// Download godoc
// @Summary      Download raw dataset file
// @Description  Streams the original uploaded file from the lakehouse storage
// @Tags         Datasets & Ingestion
// @Produce      application/octet-stream
// @Security     BearerAuth
// @Param        id path string true "Dataset ID"
// @Success      200 {file} binary
// @Failure      404 {object} map[string]string
// @Router       /datasets/{id}/download [get]
func (h *DatasetHandler) Download(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	datasetID := chi.URLParam(r, "id")
	var orgID string
	if claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	data, filename, mimeType, err := h.datasetService.DownloadDataset(datasetID, orgID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// Delete godoc
// @Summary      Delete dataset
// @Description  Removes the dataset and associated files from the lakehouse
// @Tags         Datasets & Ingestion
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Dataset ID"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Router       /datasets/{id} [delete]
func (h *DatasetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	datasetID := chi.URLParam(r, "id")
	var orgID string
	if claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = forwarded
	}

	if err := h.datasetService.DeleteDataset(datasetID, orgID, claims.UserID, claims.Email, ipAddress); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Dataset deleted successfully"})
}

// Stats godoc
// @Summary      Get dataset platform statistics
// @Description  Returns total count of datasets, total records, and lakehouse storage usage
// @Tags         Datasets & Ingestion
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} domain.DatasetStatsResponse
// @Router       /datasets/stats [get]
func (h *DatasetHandler) Stats(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var orgID string
	if claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	stats, err := h.datasetService.GetStats(orgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to calculate dataset stats")
		return
	}

	respondJSON(w, http.StatusOK, stats)
}
