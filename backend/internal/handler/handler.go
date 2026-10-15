package handler

import (
	"encoding/json"
	"net"
	"net/http"
	"runtime"
	"time"

	"caredata/backend/internal/domain"
	"caredata/backend/internal/middleware"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	authService  *service.AuthService
	repo         *repository.Repository
	pipelineRepo *repository.PipelineRepository
}

func NewHandler(authService *service.AuthService, repo *repository.Repository, pipelineRepo *repository.PipelineRepository) *Handler {
	return &Handler{
		authService:  authService,
		repo:         repo,
		pipelineRepo: pipelineRepo,
	}
}

// Health godoc
// @Summary      System health check
// @Description  Returns the operational status, version, and server timestamp of the API
// @Tags         System & Health
// @Produce      json
// @Success      200 {object} map[string]interface{}
// @Router       /health [get]
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "healthy",
		"service":   "CareData Intelligence Core API",
		"version":   "1.0.0",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

var serverStartTime = time.Now()

// SystemHealth godoc
// @Summary      SuperAdmin detailed system health
// @Description  Returns real-time memory, DB connection, multi-service latency and uptime stats
// @Tags         System & Health
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} map[string]interface{}
// @Router       /system/health [get]
func (h *Handler) SystemHealth(w http.ResponseWriter, r *http.Request) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	uptimeSeconds := time.Since(serverStartTime).Seconds()

	// 1. PostgreSQL Database Health & Latency Probe
	startDB := time.Now()
	dbStatus := "ONLINE"
	if err := h.repo.PingDB(); err != nil {
		dbStatus = "DEGRADED"
	}
	dbLatency := time.Since(startDB).Milliseconds()
	if dbLatency < 1 {
		dbLatency = 1
	}

	// 2. Redis Event & Queue Probe
	redisStatus := "ONLINE"
	startRedis := time.Now()
	connRedis, err := net.DialTimeout("tcp", "localhost:6379", 600*time.Millisecond)
	if err != nil {
		redisStatus = "DEGRADED"
	} else {
		connRedis.Close()
	}
	redisLatency := time.Since(startRedis).Milliseconds()
	if redisLatency < 1 {
		redisLatency = 1
	}

	// 3. MinIO S3 Object Storage Health Probe
	minioStatus := "ONLINE"
	startMinio := time.Now()
	clientMinio := &http.Client{Timeout: 800 * time.Millisecond}
	respMinio, err := clientMinio.Get("http://localhost:9000/minio/health/live")
	if err != nil || respMinio.StatusCode != http.StatusOK {
		minioStatus = "DEGRADED"
	} else {
		respMinio.Body.Close()
	}
	minioLatency := time.Since(startMinio).Milliseconds()
	if minioLatency < 1 {
		minioLatency = 1
	}

	// 4. Python Data Engine Probe
	engineStatus := "ONLINE"
	startEngine := time.Now()
	clientEngine := &http.Client{Timeout: 800 * time.Millisecond}
	respEngine, err := clientEngine.Get("http://localhost:8001/docs")
	if err != nil || respEngine.StatusCode != http.StatusOK {
		engineStatus = "DEGRADED"
	} else {
		respEngine.Body.Close()
	}
	engineLatency := time.Since(startEngine).Milliseconds()
	if engineLatency < 1 {
		engineLatency = 1
	}

	// 5. Query Actual Lakehouse & System Aggregates
	dsStats, _ := h.repo.GetDatasetStats("")
	totalDatasets := int64(0)
	totalRecords := int64(0)
	totalSizeBytes := int64(0)
	if dsStats != nil {
		totalDatasets = dsStats.TotalDatasets
		totalRecords = dsStats.TotalRecords
		totalSizeBytes = dsStats.TotalSizeBytes
	}

	orgs, _ := h.repo.ListOrgs()
	users, _ := h.repo.ListUsersByOrg("")

	overallStatus := "HEALTHY"
	if dbStatus == "DEGRADED" || redisStatus == "DEGRADED" || minioStatus == "DEGRADED" {
		overallStatus = "DEGRADED"
	}

	stats := map[string]interface{}{
		"status":        overallStatus,
		"uptimeSeconds": uptimeSeconds,
		"memory": map[string]interface{}{
			"allocBytes": m.Alloc,
			"sysBytes":   m.Sys,
			"numGC":      m.NumGC,
		},
		"routines": runtime.NumGoroutine(),
		"database": map[string]interface{}{
			"status":    dbStatus,
			"latencyMs": dbLatency,
		},
		"redis": map[string]interface{}{
			"status":    redisStatus,
			"latencyMs": redisLatency,
		},
		"minio": map[string]interface{}{
			"status":    minioStatus,
			"latencyMs": minioLatency,
		},
		"dataEngine": map[string]interface{}{
			"status":    engineStatus,
			"latencyMs": engineLatency,
		},
		"lakehouse": map[string]interface{}{
			"totalDatasets":  totalDatasets,
			"totalRecords":   totalRecords,
			"totalSizeBytes": totalSizeBytes,
		},
		"counts": map[string]interface{}{
			"totalOrgs":  len(orgs),
			"totalUsers": len(users),
		},
		"timestamp": time.Now(),
	}

	respondJSON(w, http.StatusOK, stats)
}

// GetPlatformSettings godoc
// @Summary      Get platform settings
// @Description  Retrieves global configuration settings
// @Tags         System & Health
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} domain.PlatformSettings
// @Router       /system/settings [get]
func (h *Handler) GetPlatformSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.repo.GetPlatformSettings()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to load settings")
		return
	}
	respondJSON(w, http.StatusOK, settings)
}

// UpdatePlatformSettings godoc
// @Summary      Update platform settings
// @Description  Updates global configuration settings
// @Tags         System & Health
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body domain.PlatformSettings true "Updated Settings"
// @Success      200 {object} map[string]string
// @Router       /system/settings [put]
func (h *Handler) UpdatePlatformSettings(w http.ResponseWriter, r *http.Request) {
	var req domain.PlatformSettings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.repo.UpdatePlatformSettings(&req); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update settings")
		return
	}

	// Create Audit log
	claims := middleware.GetUserFromContext(r.Context())
	if claims != nil {
		h.repo.CreateAuditLog(&domain.AuditLog{
			ID:             "log-settings-upd-" + time.Now().Format("20060102150405"),
			OrganizationID: claims.OrganizationID,
			UserID:         claims.UserID,
			UserEmail:      claims.Email,
			Action:         "UPDATE",
			Resource:       "PLATFORM_SETTINGS",
			Details:        "SuperAdmin updated global platform configuration",
			IPAddress:      r.RemoteAddr,
			CreatedAt:      time.Now(),
		})
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Settings updated successfully"})
}

// Register godoc
// @Summary      Register organization & administrator
// @Description  Creates a new multi-tenant organization and provisions the primary Org Admin account
// @Tags         Authentication
// @Accept       json
// @Produce      json
// @Param        request body domain.RegisterRequest true "Organization & Admin Details"
// @Success      201 {object} domain.AuthResponse
// @Failure      400 {object} map[string]string
// @Router       /auth/register [post]
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req domain.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" || req.OrganizationName == "" {
		respondError(w, http.StatusBadRequest, "All fields (organizationName, fullName, email, password) are required")
		return
	}

	res, err := h.authService.Register(&req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, res)
}

// RegisterUser godoc
// @Summary      Register a new user into an existing organization
// @Description  Allows a user to self-register using an Organization ID or Invite Code
// @Tags         Authentication
// @Accept       json
// @Produce      json
// @Param        request body domain.RegisterUserRequest true "User Registration Details"
// @Success      201 {object} domain.AuthResponse
// @Failure      400 {object} map[string]string
// @Router       /auth/register/user [post]
func (h *Handler) RegisterUser(w http.ResponseWriter, r *http.Request) {
	var req domain.RegisterUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" || req.OrganizationID == "" {
		respondError(w, http.StatusBadRequest, "All fields (organizationId, fullName, email, password) are required")
		return
	}

	res, err := h.authService.RegisterUser(&req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, res)
}

// Login godoc
// @Summary      User login & JWT generation
// @Description  Authenticates user credentials and returns JWT Access and Refresh tokens
// @Tags         Authentication
// @Accept       json
// @Produce      json
// @Param        request body domain.LoginRequest true "User Credentials"
// @Success      200 {object} domain.AuthResponse
// @Failure      401 {object} map[string]string
// @Router       /auth/login [post]
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	res, err := h.authService.Login(&req)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, res)
}

// Refresh godoc
// @Summary      Rotate refresh token
// @Description  Exchanges a valid refresh token for a new access token
// @Tags         Authentication
// @Accept       json
// @Produce      json
// @Param        request body map[string]string true "Refresh Token Object ({\"refreshToken\": \"...\"})"
// @Success      200 {object} domain.AuthResponse
// @Failure      401 {object} map[string]string
// @Router       /auth/refresh [post]
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		respondError(w, http.StatusBadRequest, "RefreshToken is required")
		return
	}

	res, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, res)
}

// Me godoc
// @Summary      Get current authenticated user profile
// @Description  Returns current session details, assigned role, and organization info
// @Tags         Authentication
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} domain.UserResponse
// @Failure      401 {object} map[string]string
// @Router       /auth/me [get]
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.repo.GetUserByID(claims.UserID)
	if err != nil || user == nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	org, _ := h.repo.GetOrgByID(user.OrganizationID)

	respondJSON(w, http.StatusOK, domain.UserResponse{
		ID:             user.ID,
		Email:          user.Email,
		FullName:       user.FullName,
		JobTitle:       user.JobTitle,
		Department:     user.Department,
		NPINumber:      user.NPINumber,
		Phone:          user.Phone,
		Role:           user.Role,
		IsActive:       user.IsActive,
		OrganizationID: user.OrganizationID,
		Organization:   org,
	})
}

// ListUsers godoc
// @Summary      List organization users
// @Description  Returns all users in the organization (or all organizations if Super Admin)
// @Tags         User Management
// @Produce      json
// @Security     BearerAuth
// @Success      200 {array} domain.UserResponse
// @Failure      401 {object} map[string]string
// @Failure      403 {object} map[string]string
// @Router       /users [get]
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var orgID string
	if claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	users, err := h.repo.ListUsersByOrg(orgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list users")
		return
	}

	respondJSON(w, http.StatusOK, users)
}

// CreateUser godoc
// @Summary      Provision new user with role
// @Description  Creates a new user inside the organization with designated RBAC role (SUPER_ADMIN, ORG_ADMIN, DATA_ANALYST, VIEWER)
// @Tags         User Management
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body domain.CreateUserRequest true "New User Details"
// @Success      201 {object} domain.UserResponse
// @Failure      400 {object} map[string]string
// @Failure      403 {object} map[string]string
// @Router       /users [post]
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" || req.Role == "" {
		respondError(w, http.StatusBadRequest, "All fields (fullName, email, password, role) are required")
		return
	}

	targetOrgID := claims.OrganizationID

	user, err := h.authService.CreateUser(targetOrgID, &req, claims)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, user)
}

// ApproveUser godoc
// @Summary      Approve a pending user
// @Description  Allows Super Admin or Org Admin to activate a pending user
// @Tags         User Management
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "User ID"
// @Success      200 {object} map[string]string
// @Router       /users/{id}/approve [put]
func (h *Handler) ApproveUser(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	
	if claims.Role != domain.RoleSuperAdmin && claims.Role != domain.RoleOrgAdmin {
		respondError(w, http.StatusForbidden, "Insufficient permissions")
		return
	}

	userID := chi.URLParam(r, "id")
	if userID == "" {
		respondError(w, http.StatusBadRequest, "User ID required")
		return
	}

	err := h.authService.ApproveUser(userID, claims)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "User approved successfully"})
}


// ListOrganizations godoc
// @Summary      List all tenant organizations
// @Description  Returns list of all hospital networks (Super Admin only)
// @Tags         Organizations
// @Produce      json
// @Security     BearerAuth
// @Success      200 {array} domain.Organization
// @Failure      403 {object} map[string]string
// @Router       /organizations [get]
func (h *Handler) ListOrganizations(w http.ResponseWriter, r *http.Request) {
	orgs, err := h.repo.ListOrgs()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list organizations")
		return
	}

	respondJSON(w, http.StatusOK, orgs)
}

// UpdateOrganizationStatus godoc
// @Summary      Approve or reject organization registration
// @Description  Super admin only endpoint to activate an organization
// @Tags         Super Admin
// @Accept       json
// @Produce      json
// @Param        id path string true "Organization ID"
// @Param        request body map[string]bool true "Status update ({\"isActive\": true})"
// @Success      200 {object} map[string]string
// @Router       /organizations/{id}/status [put]
func (h *Handler) UpdateOrganizationStatus(w http.ResponseWriter, r *http.Request) {
	orgID := chi.URLParam(r, "id")
	
	var req struct {
		IsActive bool `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.repo.UpdateOrgStatus(orgID, req.IsActive); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update organization status")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Organization status updated successfully"})
}

// ListAuditLogs godoc
// @Summary      Retrieve security audit trail
// @Description  Returns immutable audit event history for HIPAA compliance (Admins only)
// @Tags         Audit Logging
// @Produce      json
// @Security     BearerAuth
// @Success      200 {array} domain.AuditLog
// @Failure      403 {object} map[string]string
// @Router       /audit-logs [get]
func (h *Handler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var orgID string
	if claims.Role != domain.RoleSuperAdmin {
		orgID = claims.OrganizationID
	}

	logs, err := h.repo.ListAuditLogs(orgID, 100)
	if err != nil {
		logs = []domain.AuditLog{}
	}

	// Prepend real-time cryptographically hashed logs from memory chain
	if h.pipelineRepo != nil {
		chainLogs := h.pipelineRepo.ListAuditLogs(50)
		logs = append(chainLogs, logs...)
	}

	respondJSON(w, http.StatusOK, logs)
}

// UpdateMyProfile godoc
// @Summary      Update current user profile
// @Description  Update the logged in user's profile details (Name, Email)
// @Tags         User Management
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Router       /users/me/profile [put]
func (h *Handler) UpdateMyProfile(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		FullName string `json:"fullName"`
		Email    string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := h.repo.UpdateUserProfile(claims.UserID, req.FullName, req.Email); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update profile")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Profile updated successfully"})
}

// UpdateMyPassword godoc
// @Summary      Update current user password
// @Description  Update the logged in user's password
// @Tags         User Management
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Router       /users/me/password [put]
func (h *Handler) UpdateMyPassword(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		NewPassword string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	dummyHash := "dummy_hash_" + req.NewPassword

	if err := h.repo.UpdateUserPassword(claims.UserID, dummyHash); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update password")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Password updated successfully"})
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
