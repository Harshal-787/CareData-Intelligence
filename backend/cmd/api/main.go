package main

//go:generate swag init -g main.go -o ../../docs

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"caredata/backend/internal/config"
	"caredata/backend/internal/database"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/handler"
	"caredata/backend/internal/middleware"
	"caredata/backend/internal/mllp"
	"caredata/backend/internal/queue"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/service"
	"caredata/backend/internal/storage"
	"caredata/backend/internal/streaming"
	"caredata/backend/internal/swagger"

	_ "caredata/backend/docs" // Auto-generated swagger docs
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

// @title           CareData Intelligence Core REST API
// @version         1.0.0
// @description     Enterprise AI-enabled Healthcare Data Intelligence Platform API.
// @termsOfService  https://caredata.ai/terms

// @contact.name    CareData Engineering Support
// @contact.url     https://caredata.ai/support
// @contact.email   support@caredata.ai

// @license.name    Proprietary / Healthcare Confidential
// @license.url     https://caredata.ai/license

// @host            localhost:8080
// @BasePath        /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token (e.g. "Bearer eyJhbGci...").

func main() {
	cfg := config.LoadConfig()
	log.Printf("Starting CareData Intelligence Backend on port :%s (Database: %s)...", cfg.Port, cfg.DBDriver)

	db, err := database.Connect(cfg.DBDriver, cfg.DBSource)
	if err != nil {
		log.Fatalf("Fatal: Database initialization failed: %v", err)
	}
	defer db.Close()

	store := storage.NewStorage(cfg)
	repo := repository.NewRepository(db)
	pipelineRepo := repository.NewPipelineRepository()

	// Phase 9: Real-time Streaming Hub & MLLP TCP Server (Port 2575)
	streamHub := streaming.NewHub()
	var streamSvc *service.StreamService
	mllpServer := mllp.NewServer(2575, func(msg *mllp.HL7Message) {
		if streamSvc != nil {
			_, _ = streamSvc.IngestRawHL7(msg.RawMessage, "MLLP_TCP:2575")
		}
	})
	if err := mllpServer.Start(); err != nil {
		log.Printf("⚠️ Warning: MLLP server failed to bind port 2575 (port may be in use or non-root): %v", err)
	}

	authService := service.NewAuthService(repo, cfg)
	datasetService := service.NewDatasetService(repo, store, cfg)
	qualityService := service.NewQualityService(repo, store, cfg)
	dedupeService := service.NewDedupeService(repo, store, cfg)
	analyticsService := service.NewAnalyticsService(repo, store, cfg)
	mlService := service.NewMLService(repo, store, cfg)
	aiService := service.NewAIService(repo, cfg)

	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost"
	}
	redisQueue := queue.NewRedisQueue(redisHost+":6379", "", 0)

	pipelineService := service.NewPipelineService(repo, pipelineRepo, store, cfg, redisQueue)
	streamSvc = service.NewStreamService(repo, streamHub, mllpServer, dedupeService, cfg)

	h := handler.NewHandler(authService, repo, pipelineRepo)
	dh := handler.NewDatasetHandler(datasetService)
	qh := handler.NewQualityHandler(qualityService)
	dedupeH := handler.NewDedupeHandler(dedupeService)
	analyticsH := handler.NewAnalyticsHandler(analyticsService)
	mlH := handler.NewMLHandler(mlService)
	aiH := handler.NewAIHandler(aiService)
	pipelineH := handler.NewPipelineHandler(pipelineService)
	streamH := handler.NewStreamHandler(streamSvc, streamHub)

	r := chi.NewRouter()

	// Base middleware
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.RateLimitMiddleware(250, 0))

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173", "*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// API Routes v1
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", h.Health)

		// Public Auth Endpoints
		r.Post("/auth/login", h.Login)
		r.Post("/auth/register", h.Register)
		r.Post("/auth/register/user", h.RegisterUser)
		r.Post("/auth/refresh", h.Refresh)

		// Internal Endpoints (for python worker webhooks)
		r.Route("/internal", func(r chi.Router) {
			r.Post("/pipeline/progress", pipelineH.UpdateProgressInternal)
		})

		// Phase 9: Real-Time Stream WebSocket Connection
		r.Get("/stream/ws", streamH.WebSocket)

		// Authenticated Routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(cfg))

			r.Get("/auth/me", h.Me)

			// Datasets & Ingestion Endpoints (Phase 2)
			r.Get("/datasets/stats", dh.Stats)
			r.Get("/datasets", dh.List)
			r.Get("/datasets/{id}", dh.GetByID)
			r.Get("/datasets/{id}/download", dh.Download)

			// Upload & Sample Ingestion (Admins & Analysts)
			r.Post("/datasets/upload", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(dh.Upload)).ServeHTTP)
			r.Post("/datasets/sample", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(dh.GenerateSample)).ServeHTTP)

			// Delete Dataset (Admins & Super Admins)
			r.Delete("/datasets/{id}", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(dh.Delete)).ServeHTTP)

			// Phase 3: Data Quality, Profiling & Clinical Rules
			r.Get("/quality/overview", qh.GetOverview)
			r.Get("/datasets/{id}/quality-report", qh.GetQualityReport)
			r.Post("/datasets/{id}/audit", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(qh.RunQualityAudit)).ServeHTTP)
			r.Get("/datasets/{id}/violations", qh.ListViolations)
			r.Get("/datasets/{id}/rules", qh.ListRules)
			r.Post("/datasets/{id}/rules", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(qh.CreateRule)).ServeHTTP)
			r.Put("/datasets/{id}/rules/{ruleId}", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(qh.UpdateRule)).ServeHTTP)
			r.Delete("/datasets/{id}/rules/{ruleId}", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(qh.DeleteRule)).ServeHTTP)
			r.Post("/datasets/{id}/rules/reset", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(qh.ResetDefaultRules)).ServeHTTP)

			// Phase 4: Duplicate Record Detection & Patient Resolution
			r.Get("/duplicates/stats", dedupeH.Stats)
			r.Get("/duplicates", dedupeH.List)
			r.Get("/duplicates/mpi", dedupeH.ListMPI)
			r.Get("/duplicates/{id}", dedupeH.GetByID)
			r.Post("/datasets/{id}/deduplicate", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(dedupeH.RunDeduplication)).ServeHTTP)
			r.Delete("/datasets/{id}/deduplicate/data", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(dedupeH.ClearDedupeData)).ServeHTTP)
			r.Post("/duplicates/{id}/resolve", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(dedupeH.Resolve)).ServeHTTP)
			r.Post("/duplicates/{id}/unresolve", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(dedupeH.Unresolve)).ServeHTTP)
			r.Post("/duplicates/bulk-resolve", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(dedupeH.BulkResolve)).ServeHTTP)

			// Phase 5: Healthcare Analytics & OLAP Engine
			r.Get("/analytics/overview", analyticsH.GetOverview)
			r.Get("/analytics/clinical-metrics", analyticsH.GetClinicalMetrics)
			r.Post("/analytics/query", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(analyticsH.ExecuteQuery)).ServeHTTP)
			r.Get("/analytics/snowflake/status", analyticsH.GetSnowflakeStatus)
			r.Get("/analytics/snowflake/tables", analyticsH.GetSnowflakeTables)
			r.Put("/analytics/snowflake/config", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(analyticsH.UpdateSnowflakeConfig)).ServeHTTP)
			r.Post("/analytics/snowflake/sync", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(analyticsH.TriggerSnowflakeSync)).ServeHTTP)

			// Phase 6: Machine Learning Pipeline (Anomaly Detection & Risk Scoring)
			r.Get("/ml/overview", mlH.GetOverview)
			r.Get("/ml/anomalies", mlH.ListAnomalies)
			r.Get("/ml/anomalies/{id}", mlH.GetAnomalyByID)
			r.Post("/ml/anomalies/{id}/resolve", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(mlH.ResolveAnomaly)).ServeHTTP)
			r.Get("/ml/risk-scores", mlH.ListRiskScores)
			r.Get("/ml/models", mlH.ListModels)
			r.Post("/datasets/{id}/ml/run", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(mlH.TriggerMLRun)).ServeHTTP)
			r.Delete("/datasets/{id}/ml/data", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(mlH.ClearMLData)).ServeHTTP)

			// Phase 7: Local AI, Natural Language Analytics & Smart Reporting (Gemini)
			r.Get("/ai/status", aiH.GetGeminiStatus)
			r.Post("/ai/models/select", aiH.SelectModel)
			r.Post("/ai/chat", aiH.Chat)
			r.Get("/ai/chat/history", aiH.GetHistory)
			r.Get("/ai/chat/sessions", aiH.ListSessions)
			r.Delete("/ai/chat/sessions/{id}", aiH.DeleteSession)
			r.Get("/ai/narrative", aiH.GenerateNarrative)
			r.Post("/ai/reports/generate", aiH.GenerateReport)
			r.Get("/ai/reports", aiH.ListReports)
			r.Get("/ai/reports/{id}", aiH.GetReport)
			r.Delete("/ai/reports/{id}", aiH.DeleteReport)

			// Phase 8: Pipeline Orchestration & Execution Management
			r.Get("/pipelines/stats", pipelineH.GetStats)
			r.Get("/pipelines", pipelineH.List)
			r.Get("/pipelines/{id}", pipelineH.GetByID)
			r.Get("/pipelines/{id}/logs", pipelineH.GetLogs)
			r.Post("/pipelines/run", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(pipelineH.Trigger)).ServeHTTP)
			r.Post("/pipelines/{id}/retry", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(pipelineH.Retry)).ServeHTTP)
			r.Post("/pipelines/{id}/cancel", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(pipelineH.Cancel)).ServeHTTP)
			r.Delete("/pipelines/{id}", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin, domain.RoleDataAnalyst)(http.HandlerFunc(pipelineH.Delete)).ServeHTTP)

			// Phase 9: Real-Time Stream Ingestion & Live HL7/FHIR MLLP Monitor
			r.Get("/stream/stats", streamH.GetStats)
			r.Get("/stream/events", streamH.GetEvents)
			r.Post("/stream/simulate", streamH.Simulate)
			r.Post("/stream/ingest", streamH.IngestRaw)

			// User Management (Admins & Super Admins)
			r.Get("/users", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(h.ListUsers)).ServeHTTP)
			r.Post("/users", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(h.CreateUser)).ServeHTTP)
			r.Put("/users/me/profile", h.UpdateMyProfile)
			r.Put("/users/me/password", h.UpdateMyPassword)

			// Organizations & System (Super Admin Only)
			r.Get("/organizations", middleware.RequireRoles(domain.RoleSuperAdmin)(http.HandlerFunc(h.ListOrganizations)).ServeHTTP)
			r.Put("/organizations/{id}/status", middleware.RequireRoles(domain.RoleSuperAdmin)(http.HandlerFunc(h.UpdateOrganizationStatus)).ServeHTTP)
			r.Get("/system/health", middleware.RequireRoles(domain.RoleSuperAdmin)(http.HandlerFunc(h.SystemHealth)).ServeHTTP)
			r.Get("/system/settings", middleware.RequireRoles(domain.RoleSuperAdmin)(http.HandlerFunc(h.GetPlatformSettings)).ServeHTTP)
			r.Put("/system/settings", middleware.RequireRoles(domain.RoleSuperAdmin)(http.HandlerFunc(h.UpdatePlatformSettings)).ServeHTTP)

			// Audit Logs (Super Admin & Org Admin)
			r.Get("/audit-logs", middleware.RequireRoles(domain.RoleSuperAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(h.ListAuditLogs)).ServeHTTP)
		})
	})

	// Swagger Routes:
	// 1. Standard http-swagger handler
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))
	// 2. Fallback / docs redirect & custom enhanced UI
	r.Get("/swagger", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/swagger/index.html", http.StatusMovedPermanently)
	})
	r.Get("/docs", swagger.Handler())

	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("✓ CareData API ready to serve on %s", serverAddr)
	log.Printf("✓ Interactive Swagger documentation live on http://localhost:%s/swagger/index.html", cfg.Port)
	if err := http.ListenAndServe(serverAddr, r); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
		os.Exit(1)
	}
}
