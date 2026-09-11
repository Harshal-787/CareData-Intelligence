package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"caredata/backend/internal/domain"
	"caredata/backend/internal/middleware"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/service"
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
		Role:           user.Role,
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

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
