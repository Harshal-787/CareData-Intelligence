package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"caredata/backend/internal/domain"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type DB struct {
	*sql.DB
	Driver string
}

func Connect(driver, source string) (*DB, error) {
	if driver == "postgres" {
		// Attempt to auto-create database if it doesn't exist yet on PostgreSQL server
		if err := ensurePostgresDBExists(source); err != nil {
			log.Printf("⚠️ Notice: Postgres check (%v).", err)
		}
	}

	db, err := sql.Open(driver, source)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if pingErr := db.Ping(); pingErr != nil {
		_ = db.Close()
		return nil, fmt.Errorf("could not connect to %s: %w", driver, pingErr)
	}
	
	dbInstance := &DB{DB: db, Driver: driver}
	if err := dbInstance.migrate(); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}
	_ = dbInstance.seedDemoData()
	log.Printf("✓ Connected to primary database: %s", driver)
	return dbInstance, nil
}

func ensurePostgresDBExists(source string) error {
	// e.g. postgres://user:pass@localhost:5432/caredata_db?sslmode=disable
	if !strings.HasPrefix(source, "postgres://") && !strings.HasPrefix(source, "postgresql://") {
		return nil
	}

	// Split by '/' to extract database name and options
	parts := strings.Split(source, "/")
	if len(parts) < 4 {
		return nil
	}

	dbAndOpts := parts[len(parts)-1]
	dbName := strings.Split(dbAndOpts, "?")[0]
	if dbName == "" || dbName == "postgres" {
		return nil
	}

	// Build connection string pointing to default 'postgres' database
	baseSource := strings.Join(parts[:len(parts)-1], "/") + "/postgres"
	if strings.Contains(dbAndOpts, "?") {
		opts := strings.Split(dbAndOpts, "?")[1]
		baseSource += "?" + opts
	}

	defaultDB, err := sql.Open("postgres", baseSource)
	if err != nil {
		return err
	}
	defer defaultDB.Close()

	if err := defaultDB.Ping(); err != nil {
		return err // Postgres server might not be running
	}

	var exists bool
	checkQuery := fmt.Sprintf("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '%s')", dbName)
	if err := defaultDB.QueryRow(checkQuery).Scan(&exists); err != nil {
		return err
	}

	if !exists {
		log.Printf("Database '%s' not found in PostgreSQL. Auto-creating database...", dbName)
		_, err = defaultDB.Exec(fmt.Sprintf("CREATE DATABASE \"%s\"", dbName))
		if err != nil {
			return fmt.Errorf("failed to create database '%s': %w", dbName, err)
		}
		log.Printf("✓ Created PostgreSQL database '%s' successfully", dbName)
	}

	return nil
}

func (d *DB) migrate() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS organizations (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			slug TEXT NOT NULL UNIQUE,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			full_name TEXT NOT NULL,
			role TEXT NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL,
			FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			user_email TEXT NOT NULL,
			action TEXT NOT NULL,
			resource TEXT NOT NULL,
			details TEXT NOT NULL,
			ip_address TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS datasets (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			uploaded_by TEXT NOT NULL,
			name TEXT NOT NULL,
			file_name TEXT NOT NULL,
			file_size INTEGER NOT NULL,
			mime_type TEXT NOT NULL,
			file_type TEXT NOT NULL DEFAULT 'csv',
			storage_path TEXT NOT NULL,
			parquet_path TEXT DEFAULT '',
			status TEXT NOT NULL DEFAULT 'PENDING',
			total_records INTEGER DEFAULT 0,
			columns_count INTEGER DEFAULT 0,
			schema_json TEXT DEFAULT '[]',
			preview_json TEXT DEFAULT '[]',
			quality_score REAL DEFAULT 0.0,
			error_message TEXT DEFAULT '',
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS validation_rules (
			id TEXT PRIMARY KEY,
			dataset_id TEXT NOT NULL DEFAULT '',
			organization_id TEXT NOT NULL,
			field_name TEXT NOT NULL,
			rule_type TEXT NOT NULL,
			severity TEXT NOT NULL DEFAULT 'WARNING',
			parameters TEXT NOT NULL DEFAULT '{}',
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			description TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS quality_reports (
			id TEXT PRIMARY KEY,
			dataset_id TEXT NOT NULL,
			organization_id TEXT NOT NULL,
			overall_score REAL NOT NULL DEFAULT 0.0,
			completeness_score REAL NOT NULL DEFAULT 0.0,
			validity_score REAL NOT NULL DEFAULT 0.0,
			uniqueness_score REAL NOT NULL DEFAULT 0.0,
			consistency_score REAL NOT NULL DEFAULT 0.0,
			total_checks INTEGER NOT NULL DEFAULT 0,
			passed_checks INTEGER NOT NULL DEFAULT 0,
			failed_checks INTEGER NOT NULL DEFAULT 0,
			total_violations INTEGER NOT NULL DEFAULT 0,
			critical_count INTEGER NOT NULL DEFAULT 0,
			warning_count INTEGER NOT NULL DEFAULT 0,
			info_count INTEGER NOT NULL DEFAULT 0,
			profiling_json TEXT NOT NULL DEFAULT '[]',
			created_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS quality_violations (
			id TEXT PRIMARY KEY,
			quality_report_id TEXT NOT NULL,
			dataset_id TEXT NOT NULL,
			row_number INTEGER NOT NULL,
			field_name TEXT NOT NULL,
			rule_type TEXT NOT NULL,
			severity TEXT NOT NULL,
			invalid_value TEXT NOT NULL,
			message TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS duplicate_pairs (
			id TEXT PRIMARY KEY,
			dataset_id TEXT NOT NULL,
			organization_id TEXT NOT NULL,
			record_a_id TEXT NOT NULL,
			record_b_id TEXT NOT NULL,
			record_a_data TEXT NOT NULL DEFAULT '{}',
			record_b_data TEXT NOT NULL DEFAULT '{}',
			confidence_score REAL NOT NULL DEFAULT 0.0,
			field_scores_json TEXT NOT NULL DEFAULT '[]',
			status TEXT NOT NULL DEFAULT 'PENDING',
			resolution_notes TEXT NOT NULL DEFAULT '',
			resolved_by TEXT NOT NULL DEFAULT '',
			resolved_at TIMESTAMP,
			survivor_record_id TEXT NOT NULL DEFAULT '',
			golden_record_json TEXT NOT NULL DEFAULT '{}',
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS patient_mpi_records (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			dataset_id TEXT NOT NULL,
			master_patient_id TEXT NOT NULL UNIQUE,
			consolidated_data TEXT NOT NULL DEFAULT '{}',
			source_record_ids TEXT NOT NULL DEFAULT '[]',
			duplicate_pair_ids TEXT NOT NULL DEFAULT '[]',
			created_by TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS snowflake_configs (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL UNIQUE,
			account TEXT NOT NULL DEFAULT 'caredata-health.us-east-1.snowflakecomputing.com',
			warehouse TEXT NOT NULL DEFAULT 'COMPUTE_WH',
			database_name TEXT NOT NULL DEFAULT 'CAREDATA_CLINICAL_LAKE',
			schema_name TEXT NOT NULL DEFAULT 'PUBLIC',
			role_name TEXT NOT NULL DEFAULT 'ACCOUNTADMIN',
			username TEXT NOT NULL DEFAULT 'caredata_svc_user',
			is_connected BOOLEAN NOT NULL DEFAULT TRUE,
			auto_sync BOOLEAN NOT NULL DEFAULT TRUE,
			sync_interval TEXT NOT NULL DEFAULT 'DAILY',
			last_sync_at TIMESTAMP,
			last_sync_status TEXT NOT NULL DEFAULT 'READY',
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS snowflake_sync_logs (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			dataset_id TEXT NOT NULL DEFAULT '',
			dataset_name TEXT NOT NULL DEFAULT '',
			target_table TEXT NOT NULL,
			records_synced INTEGER NOT NULL DEFAULT 0,
			duration_ms INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'SUCCESS',
			error_message TEXT NOT NULL DEFAULT '',
			triggered_by TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS ml_model_runs (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			dataset_id TEXT NOT NULL DEFAULT '',
			dataset_name TEXT NOT NULL DEFAULT '',
			model_name TEXT NOT NULL,
			model_type TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'COMPLETED',
			accuracy REAL NOT NULL DEFAULT 0.0,
			f1_score REAL NOT NULL DEFAULT 0.0,
			auc_roc REAL NOT NULL DEFAULT 0.0,
			contamination REAL NOT NULL DEFAULT 0.08,
			n_estimators INTEGER NOT NULL DEFAULT 100,
			anomaly_count INTEGER NOT NULL DEFAULT 0,
			total_records INTEGER NOT NULL DEFAULT 0,
			hyperparameters_json TEXT NOT NULL DEFAULT '{}',
			feature_importances_json TEXT NOT NULL DEFAULT '[]',
			error_message TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMP NOT NULL,
			completed_at TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS ml_anomalies (
			id TEXT PRIMARY KEY,
			model_run_id TEXT NOT NULL,
			dataset_id TEXT NOT NULL DEFAULT '',
			dataset_name TEXT NOT NULL DEFAULT '',
			organization_id TEXT NOT NULL,
			record_id TEXT NOT NULL DEFAULT '',
			row_number INTEGER NOT NULL DEFAULT 0,
			patient_id TEXT NOT NULL DEFAULT '',
			encounter_id TEXT NOT NULL DEFAULT '',
			patient_name TEXT NOT NULL DEFAULT '',
			anomaly_score REAL NOT NULL DEFAULT 0.0,
			severity TEXT NOT NULL DEFAULT 'WARNING',
			category TEXT NOT NULL DEFAULT 'CLINICAL_VITALS',
			description TEXT NOT NULL DEFAULT '',
			explanation_flags_json TEXT NOT NULL DEFAULT '[]',
			record_data_json TEXT NOT NULL DEFAULT '{}',
			status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
			resolution_notes TEXT NOT NULL DEFAULT '',
			resolved_by TEXT NOT NULL DEFAULT '',
			resolved_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS ml_risk_scores (
			id TEXT PRIMARY KEY,
			model_run_id TEXT NOT NULL,
			dataset_id TEXT NOT NULL DEFAULT '',
			dataset_name TEXT NOT NULL DEFAULT '',
			organization_id TEXT NOT NULL,
			patient_id TEXT NOT NULL DEFAULT '',
			encounter_id TEXT NOT NULL DEFAULT '',
			patient_name TEXT NOT NULL DEFAULT '',
			age INTEGER NOT NULL DEFAULT 0,
			gender TEXT NOT NULL DEFAULT '',
			primary_diagnosis TEXT NOT NULL DEFAULT '',
			risk_score REAL NOT NULL DEFAULT 0.0,
			risk_tier TEXT NOT NULL DEFAULT 'LOW',
			readmission_probability REAL NOT NULL DEFAULT 0.0,
			predicted_los_days REAL NOT NULL DEFAULT 0.0,
			top_drivers_json TEXT NOT NULL DEFAULT '[]',
			clinical_recommendations_json TEXT NOT NULL DEFAULT '[]',
			record_data_json TEXT NOT NULL DEFAULT '{}',
			created_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS ai_chat_sessions (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			title TEXT NOT NULL,
			dataset_id TEXT NOT NULL DEFAULT '',
			dataset_name TEXT NOT NULL DEFAULT '',
			active_model TEXT NOT NULL DEFAULT 'llama3',
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS ai_chat_messages (
			id TEXT PRIMARY KEY,
			session_id TEXT NOT NULL,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			generated_sql TEXT NOT NULL DEFAULT '',
			columns_json TEXT NOT NULL DEFAULT '[]',
			rows_json TEXT NOT NULL DEFAULT '[]',
			row_count INTEGER NOT NULL DEFAULT 0,
			execution_time_ms REAL NOT NULL DEFAULT 0.0,
			engine TEXT NOT NULL DEFAULT 'Google Gemini LLM',
			model TEXT NOT NULL DEFAULT 'llama3',
			created_at TIMESTAMP NOT NULL,
			FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS ai_clinical_reports (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			title TEXT NOT NULL,
			dataset_id TEXT NOT NULL DEFAULT '',
			dataset_name TEXT NOT NULL DEFAULT '',
			executive_summary TEXT NOT NULL DEFAULT '',
			key_findings_json TEXT NOT NULL DEFAULT '[]',
			strategic_risks_json TEXT NOT NULL DEFAULT '[]',
			recommended_actions_json TEXT NOT NULL DEFAULT '[]',
			markdown_content TEXT NOT NULL DEFAULT '',
			generated_by TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMP NOT NULL
		);`,
	}

	for _, query := range queries {
		if _, err := d.Exec(query); err != nil {
			return fmt.Errorf("failed executing migration [%s]: %w", query, err)
		}
	}

	// Ensure new columns exist on legacy tables if migrated earlier
	optionalColumns := []struct {
		col   string
		cType string
	}{
		{"file_type", "TEXT DEFAULT 'csv'"},
		{"parquet_path", "TEXT DEFAULT ''"},
		{"columns_count", "INTEGER DEFAULT 0"},
		{"schema_json", "TEXT DEFAULT '[]'"},
		{"preview_json", "TEXT DEFAULT '[]'"},
		{"error_message", "TEXT DEFAULT ''"},
	}

	for _, oc := range optionalColumns {
		alterQuery := fmt.Sprintf("ALTER TABLE datasets ADD COLUMN %s %s;", oc.col, oc.cType)
		_, _ = d.Exec(alterQuery) // Ignore if column already exists
	}

	return nil
}

func (d *DB) seedDemoData() error {
	var count int
	err := d.QueryRow("SELECT COUNT(*) FROM organizations WHERE slug = 'caredata-health'").Scan(&count)
	if err == nil && count > 0 {
		log.Println("Organization already exists, but ensuring users are seeded anyway.")
		// We deliberately do not return here to ensure user accounts exist!
	}

	orgID := "org-default-001"
	now := time.Now()

	// Wipe any lingering mock data from snowflake configs
	d.Exec("DELETE FROM snowflake_configs")


	// 1. Seed Main Demo Organization
	if d.Driver == "postgres" {
		_, _ = d.Exec(`
			INSERT INTO organizations (id, name, slug, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (slug) DO NOTHING
		`, orgID, "CareData Health System", "caredata-health", now, now)
	} else {
		_, _ = d.Exec(`
			INSERT OR IGNORE INTO organizations (id, name, slug, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?)
		`, orgID, "CareData Health System", "caredata-health", now, now)
	}

	// 2. Hash default password ("Password123!")
	hashedPass, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)

	users := []struct {
		ID       string
		Email    string
		FullName string
		Role     domain.Role
	}{
		{"usr-super-001", "superadmin@caredata.ai", "Dr. Alexander Wright (Super Admin)", domain.RoleSuperAdmin},
		{"usr-admin-002", "admin@caredata.ai", "Sarah Jenkins (Hospital Administrator)", domain.RoleOrgAdmin},
		{"usr-analyst-003", "analyst@caredata.ai", "Michael Chen (Senior Data Analyst)", domain.RoleDataAnalyst},
		{"usr-viewer-004", "viewer@caredata.ai", "Emily Watson (Clinical Viewer)", domain.RoleViewer},
	}

	for _, u := range users {
		var uCount int
		if d.Driver == "postgres" {
			_ = d.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", u.Email).Scan(&uCount)
		} else {
			_ = d.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", u.Email).Scan(&uCount)
		}

		if uCount == 0 {
			if d.Driver == "postgres" {
				query := `
					INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
					ON CONFLICT (email) DO NOTHING
				`
				_, _ = d.Exec(query, u.ID, orgID, u.Email, string(hashedPass), u.FullName, string(u.Role), true, now, now)
			} else {
				query := `
					INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`
				_, _ = d.Exec(query, u.ID, orgID, u.Email, string(hashedPass), u.FullName, string(u.Role), true, now, now)
			}
		}
	}

	log.Println("✓ Seeded default demo organizations and 4 RBAC user accounts")
	return nil
}
