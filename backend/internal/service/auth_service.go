package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"caredata/backend/internal/config"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo   *repository.Repository
	config *config.Config
}

func NewAuthService(repo *repository.Repository, cfg *config.Config) *AuthService {
	return &AuthService{repo: repo, config: cfg}
}

func (s *AuthService) Register(req *domain.RegisterRequest) (*domain.AuthResponse, error) {
	existing, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}
	if existing != nil {
		return nil, errors.New("user with this email already exists")
	}

	orgID := "org-" + uuid.New().String()[:8]
	slug := strings.ToLower(strings.ReplaceAll(req.OrganizationName, " ", "-"))
	now := time.Now()

	org := &domain.Organization{
		ID:        orgID,
		Name:      req.OrganizationName,
		Slug:      slug,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.CreateOrg(org); err != nil {
		return nil, fmt.Errorf("failed to create organization: %w", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	role := domain.RoleOrgAdmin
	if req.Role != "" {
		role = req.Role
	}

	user := &domain.User{
		ID:             "usr-" + uuid.New().String()[:8],
		OrganizationID: orgID,
		Email:          req.Email,
		PasswordHash:   string(hashedPassword),
		FullName:       req.FullName,
		Role:           role,
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create audit log
	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		ID:             "audit-" + uuid.New().String()[:8],
		OrganizationID: orgID,
		UserID:         user.ID,
		UserEmail:      user.Email,
		Action:         "REGISTER",
		Resource:       "USER_ORG",
		Details:        fmt.Sprintf("Registered organization %s and admin %s", org.Name, user.Email),
		IPAddress:      "127.0.0.1",
		CreatedAt:      now,
	})

	return s.generateAuthResponse(user, org)
}

func (s *AuthService) RegisterUser(req *domain.RegisterUserRequest) (*domain.AuthResponse, error) {
	existing, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}
	if existing != nil {
		return nil, errors.New("user with this email already exists")
	}

	org, err := s.repo.GetOrgByID(req.OrganizationID)
	if err != nil || org == nil {
		return nil, errors.New("invalid organization ID or invite code")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	role := domain.RoleViewer // default safe role
	if req.Role != "" {
		role = req.Role
	}

	now := time.Now()
	user := &domain.User{
		ID:             "usr-" + uuid.New().String()[:8],
		OrganizationID: org.ID,
		Email:          req.Email,
		PasswordHash:   string(hashedPassword),
		FullName:       req.FullName,
		Role:           role,
		IsActive:       true, // In a strict flow, this could be false pending approval
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		ID:             "audit-" + uuid.New().String()[:8],
		OrganizationID: org.ID,
		UserID:         user.ID,
		UserEmail:      user.Email,
		Action:         "REGISTER_USER",
		Resource:       "USER",
		Details:        fmt.Sprintf("User %s registered into organization %s", user.Email, org.Name),
		IPAddress:      "127.0.0.1",
		CreatedAt:      now,
	})

	return s.generateAuthResponse(user, org)
}

func (s *AuthService) Login(req *domain.LoginRequest) (*domain.AuthResponse, error) {
	user, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return nil, fmt.Errorf("error querying user: %w", err)
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	if !user.IsActive {
		return nil, errors.New("account has been deactivated")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	org, _ := s.repo.GetOrgByID(user.OrganizationID)

	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		ID:             "audit-" + uuid.New().String()[:8],
		OrganizationID: user.OrganizationID,
		UserID:         user.ID,
		UserEmail:      user.Email,
		Action:         "LOGIN",
		Resource:       "AUTH",
		Details:        fmt.Sprintf("User %s (%s) logged in successfully", user.Email, user.Role),
		IPAddress:      "127.0.0.1",
		CreatedAt:      time.Now(),
	})

	return s.generateAuthResponse(user, org)
}

func (s *AuthService) CreateUser(orgID string, req *domain.CreateUserRequest, creator *domain.AuthClaims) (*domain.UserResponse, error) {
	existing, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email is already registered")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := &domain.User{
		ID:             "usr-" + uuid.New().String()[:8],
		OrganizationID: orgID,
		Email:          req.Email,
		PasswordHash:   string(hashedPassword),
		FullName:       req.FullName,
		Role:           req.Role,
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, err
	}

	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		ID:             "audit-" + uuid.New().String()[:8],
		OrganizationID: orgID,
		UserID:         creator.UserID,
		UserEmail:      creator.Email,
		Action:         "CREATE_USER",
		Resource:       "USER",
		Details:        fmt.Sprintf("Created user %s with role %s", user.Email, user.Role),
		IPAddress:      "127.0.0.1",
		CreatedAt:      now,
	})

	return &domain.UserResponse{
		ID:             user.ID,
		Email:          user.Email,
		FullName:       user.FullName,
		Role:           user.Role,
		OrganizationID: user.OrganizationID,
	}, nil
}

func (s *AuthService) RefreshToken(tokenStr string) (*domain.AuthResponse, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &domain.AuthClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.config.JWTRefresh), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired refresh token")
	}

	claims, ok := token.Claims.(*domain.AuthClaims)
	if !ok {
		return nil, errors.New("malformed token claims")
	}

	user, err := s.repo.GetUserByID(claims.UserID)
	if err != nil || user == nil || !user.IsActive {
		return nil, errors.New("user not found or inactive")
	}

	org, _ := s.repo.GetOrgByID(user.OrganizationID)
	return s.generateAuthResponse(user, org)
}

func (s *AuthService) generateAuthResponse(user *domain.User, org *domain.Organization) (*domain.AuthResponse, error) {
	now := time.Now()

	accessClaims := domain.AuthClaims{
		UserID:         user.ID,
		OrganizationID: user.OrganizationID,
		Email:          user.Email,
		FullName:       user.FullName,
		Role:           user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)), // 24h access for smooth dev
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "caredata-intelligence",
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessStr, err := accessToken.SignedString([]byte(s.config.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	refreshClaims := domain.AuthClaims{
		UserID:         user.ID,
		OrganizationID: user.OrganizationID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "caredata-intelligence",
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshStr, err := refreshToken.SignedString([]byte(s.config.JWTRefresh))
	if err != nil {
		return nil, fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return &domain.AuthResponse{
		AccessToken:  accessStr,
		RefreshToken: refreshStr,
		User: domain.UserResponse{
			ID:             user.ID,
			Email:          user.Email,
			FullName:       user.FullName,
			Role:           user.Role,
			OrganizationID: user.OrganizationID,
			Organization:   org,
		},
	}, nil
}
