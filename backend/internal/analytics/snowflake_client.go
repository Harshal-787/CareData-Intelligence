package analytics

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"caredata/backend/internal/domain"

	_ "github.com/snowflakedb/gosnowflake" // Snowflake driver
)

// SnowflakeClient manages interactions with Snowflake for multi-tenant provisioning and querying.
type SnowflakeClient struct {
	adminDB *sql.DB
}

// NewSnowflakeClient initializes a connection to Snowflake using admin credentials from env.
func NewSnowflakeClient() *SnowflakeClient {
	account := os.Getenv("SNOWFLAKE_ACCOUNT")
	user := os.Getenv("SNOWFLAKE_USER")
	password := os.Getenv("SNOWFLAKE_PASSWORD")
	role := os.Getenv("SNOWFLAKE_ROLE")
	if role == "" {
		role = "ACCOUNTADMIN" // required for provisioning
	}

	if account == "" || user == "" || password == "" {
		log.Println("⚠️ Snowflake credentials not found in environment. Snowflake features will be disabled.")
		return &SnowflakeClient{}
	}

	// Connect using admin credentials
	dsn := fmt.Sprintf("%s:%s@%s/?role=%s", user, password, account, role)
	db, err := sql.Open("snowflake", dsn)
	if err != nil {
		log.Printf("⚠️ Failed to initialize Snowflake client: %v\n", err)
		return &SnowflakeClient{}
	}

	return &SnowflakeClient{
		adminDB: db,
	}
}

// UpdateConnection dynamically updates the Snowflake connection using provided credentials
func (c *SnowflakeClient) UpdateConnection(account, user, password, role string) error {
	if role == "" {
		role = "ACCOUNTADMIN"
	}
	dsn := fmt.Sprintf("%s:%s@%s/?role=%s", user, password, account, role)
	db, err := sql.Open("snowflake", dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to Snowflake: %w", err)
	}

	// Verify connection
	if err := db.Ping(); err != nil {
		db.Close()
		return fmt.Errorf("failed to ping Snowflake: %w", err)
	}

	// Close old connection if exists
	if c.adminDB != nil {
		c.adminDB.Close()
	}

	c.adminDB = db
	return nil
}

// ProvisionTenant creates a dedicated Warehouse and Schema for the given organization.
func (c *SnowflakeClient) ProvisionTenant(orgID string, databaseName string, schemaName string, warehouseName string) error {
	if c.adminDB == nil {
		return fmt.Errorf("snowflake client not initialized")
	}

	// 1. Ensure the Database exists
	if _, err := c.adminDB.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s", databaseName)); err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}

	// 2. Create Schema
	if _, err := c.adminDB.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s.%s", databaseName, schemaName)); err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}

	// 3. Create Warehouse
	createWarehouseQuery := fmt.Sprintf(`
		CREATE WAREHOUSE IF NOT EXISTS %s 
		WITH WAREHOUSE_SIZE = 'XSMALL' 
		AUTO_SUSPEND = 60 
		AUTO_RESUME = TRUE;
	`, warehouseName)

	if _, err := c.adminDB.Exec(createWarehouseQuery); err != nil {
		return fmt.Errorf("failed to create warehouse: %w", err)
	}

	// 4. Removed automatic creation of clinical_encounters table
	// We should not be modifying the user's database structure when they just connect.

	return nil
}

// ExecuteTenantQuery executes a SQL query using the configured warehouse, database, and schema.
func (c *SnowflakeClient) ExecuteTenantQuery(warehouse, database, schema, query string) (*domain.SQLQueryResponse, error) {
	if c.adminDB == nil {
		return nil, fmt.Errorf("snowflake client not initialized")
	}

	// Use specific warehouse, database, and schema
	if warehouse != "" {
		if _, err := c.adminDB.Exec(fmt.Sprintf("USE WAREHOUSE %s", warehouse)); err != nil {
			return nil, err
		}
	}
	if database != "" {
		if _, err := c.adminDB.Exec(fmt.Sprintf("USE DATABASE %s", database)); err != nil {
			return nil, err
		}
	}
	if schema != "" {
		if _, err := c.adminDB.Exec(fmt.Sprintf("USE SCHEMA %s", schema)); err != nil {
			return nil, err
		}
	}

	rows, err := c.adminDB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query execution failed: %w", err)
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var resultColumns []domain.SQLQueryColumn
	for _, c := range cols {
		resultColumns = append(resultColumns, domain.SQLQueryColumn{
			Name:     c,
			DataType: "UNKNOWN",
		})
	}

	var resultRows []map[string]interface{}
	for rows.Next() {
		// Create a slice of interface{}'s to represent each column
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}

		if err := rows.Scan(columnPointers...); err != nil {
			return nil, err
		}

		// Create a map and build row
		m := make(map[string]interface{})
		for i, colName := range cols {
			val := columnPointers[i].(*interface{})
			m[colName] = *val
		}
		resultRows = append(resultRows, m)
	}

	return &domain.SQLQueryResponse{
		Columns:         resultColumns,
		Rows:            resultRows,
		TotalRows:       int64(len(resultRows)),
		ExecutionTimeMs: 120, // Could be measured accurately
	}, nil
}

// SyncDatasetToSnowflake pushes a local dataset file to Snowflake's internal stage and copies it into the clinical_encounters table.
func (c *SnowflakeClient) SyncDatasetToSnowflake(database, schema string, filePath string) (int64, error) {
	if c.adminDB == nil {
		return 0, fmt.Errorf("snowflake client not initialized")
	}

	stageName := "caredata_internal_stage"

	// 1. Create Stage
	if _, err := c.adminDB.Exec(fmt.Sprintf("CREATE STAGE IF NOT EXISTS %s.%s.%s", database, schema, stageName)); err != nil {
		return 0, fmt.Errorf("failed to create stage: %w", err)
	}

	// 2. PUT File
	// Ensure absolute path formatting for gosnowflake
	if !strings.HasPrefix(filePath, "/") {
		return 0, fmt.Errorf("filePath must be absolute: %s", filePath)
	}
	putQuery := fmt.Sprintf("PUT file://%s @%s.%s.%s AUTO_COMPRESS=TRUE", filePath, database, schema, stageName)
	if _, err := c.adminDB.Exec(putQuery); err != nil {
		return 0, fmt.Errorf("failed to PUT file to stage: %w", err)
	}

	// 3. COPY INTO Table
	copyQuery := fmt.Sprintf(`
		COPY INTO %s.%s.clinical_encounters
		FROM @%s.%s.%s
		FILE_FORMAT = (TYPE = CSV PARSE_HEADER = TRUE ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE)
		MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
		ON_ERROR = 'CONTINUE'
		FORCE = TRUE
	`, database, schema, database, schema, stageName)

	rows, err := c.adminDB.Query(copyQuery)
	if err != nil {
		return 0, fmt.Errorf("failed to COPY INTO table: %w", err)
	}
	defer rows.Close()

	var totalLoaded int64 = 0
	cols, _ := rows.Columns()
	for rows.Next() {
		values := make([]interface{}, len(cols))
		pointers := make([]interface{}, len(cols))
		for i := range values {
			pointers[i] = &values[i]
		}
		if err := rows.Scan(pointers...); err == nil {
			var rowsLoadedVal int64
			var errorsSeen int64
			var firstError string

			for i, colName := range cols {
				colNameLower := strings.ToLower(colName)
				if val, ok := pointers[i].(*interface{}); ok && *val != nil {
					switch colNameLower {
					case "rows_loaded":
						switch v := (*val).(type) {
						case string:
							fmt.Sscanf(v, "%d", &rowsLoadedVal)
						case int64:
							rowsLoadedVal = v
						case float64:
							rowsLoadedVal = int64(v)
						case int32:
							rowsLoadedVal = int64(v)
						case int:
							rowsLoadedVal = int64(v)
						default:
							strVal := fmt.Sprintf("%v", v)
							fmt.Sscanf(strVal, "%d", &rowsLoadedVal)
						}
					case "errors_seen":
						switch v := (*val).(type) {
						case string:
							fmt.Sscanf(v, "%d", &errorsSeen)
						case int64:
							errorsSeen = v
						case float64:
							errorsSeen = int64(v)
						case int32:
							errorsSeen = int64(v)
						case int:
							errorsSeen = int64(v)
						default:
							strVal := fmt.Sprintf("%v", v)
							fmt.Sscanf(strVal, "%d", &errorsSeen)
						}
					case "first_error":
						firstError = fmt.Sprintf("%v", *val)
					}
				}
			}

			if errorsSeen > 0 {
				log.Printf("⚠️ Snowflake COPY INTO warning: saw %d errors. First error: %s", errorsSeen, firstError)
			}
			totalLoaded += rowsLoadedVal
		}
	}

	return totalLoaded, nil
}

// GetTables returns a list of tables from the configured schema.
func (c *SnowflakeClient) GetTables(database, schema string) ([]map[string]interface{}, error) {
	if c.adminDB == nil {
		return nil, fmt.Errorf("snowflake client not initialized or not connected")
	}

	if database == "" || schema == "" {
		return nil, fmt.Errorf("database or schema is missing")
	}

	query := fmt.Sprintf("SHOW TABLES IN SCHEMA %s.%s", database, schema)
	rows, err := c.adminDB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tables: %w", err)
	}
	defer rows.Close()

	var tables []map[string]interface{}
	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}
		if err := rows.Scan(columnPointers...); err != nil {
			continue
		}

		m := make(map[string]interface{})
		for i, colName := range cols {
			val := columnPointers[i].(*interface{})
			if val != nil && *val != nil {
				m[colName] = *val
			}
		}

		// Map standard Snowflake SHOW TABLES columns to our format
		name := ""
		if v, ok := m["name"]; ok {
			name = fmt.Sprintf("%v", v)
		}

		rowsCount := "0"
		if v, ok := m["rows"]; ok {
			rowsCount = fmt.Sprintf("%v", v)
		}

		sizeStr := "0 B"
		if v, ok := m["bytes"]; ok {
			bytes, _ := strconv.ParseInt(fmt.Sprintf("%v", v), 10, 64)
			sizeStr = fmt.Sprintf("%d MB", bytes/1024/1024)
		}

		tables = append(tables, map[string]interface{}{
			"name": name,
			"rows": rowsCount,
			"size": sizeStr,
		})
	}
	return tables, nil
}
