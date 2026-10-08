package quality

import (
	"database/sql"
	"fmt"
	"io"
	"strings"
	"os"

	"caredata/backend/internal/domain"
	_ "github.com/lib/pq"
)

type pgIterator struct {
	rows    *sql.Rows
	columns []string
}

func (p *pgIterator) Next() (map[string]interface{}, error) {
	if !p.rows.Next() {
		if err := p.rows.Err(); err != nil {
			return nil, err
		}
		return nil, io.EOF
	}

	values := make([]interface{}, len(p.columns))
	valuePtrs := make([]interface{}, len(p.columns))
	for i := range values {
		valuePtrs[i] = &values[i]
	}

	if err := p.rows.Scan(valuePtrs...); err != nil {
		return nil, err
	}

	m := make(map[string]interface{}, len(p.columns))
	for i, col := range p.columns {
		val := values[i]
		if b, ok := val.([]byte); ok {
			m[col] = string(b)
		} else {
			m[col] = val
		}
	}
	return m, nil
}

func (p *pgIterator) Close() error {
	return p.rows.Close()
}

func setupTestDB(tableName string, schema []domain.DatasetColumn, data []map[string]interface{}) (*sql.DB, *pgIterator, error) {
	dsn := "postgres://caredata_admin:caredata_secure_pass123@localhost:5432/caredata_db?sslmode=disable"
	if custom := os.Getenv("TEST_DATABASE_URL"); custom != "" {
		dsn = custom
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to postgres: %v", err)
	}

	var colDefs []string
	for _, c := range schema {
		typ := "TEXT"
		switch strings.ToUpper(c.DataType) {
		case "INTEGER":
			typ = "INTEGER"
		case "FLOAT":
			typ = "FLOAT"
		}
		colDefs = append(colDefs, fmt.Sprintf("%s %s", c.Name, typ))
	}

	_, err = db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", tableName))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to drop table: %v", err)
	}

	_, err = db.Exec(fmt.Sprintf("CREATE TABLE %s (%s)", tableName, strings.Join(colDefs, ", ")))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create table: %v", err)
	}

	for _, row := range data {
		var cols []string
		var placeholders []string
		var vals []interface{}
		i := 1
		for k, v := range row {
			cols = append(cols, k)
			placeholders = append(placeholders, fmt.Sprintf("$%d", i))
			vals = append(vals, v)
			i++
		}
		if len(cols) > 0 {
			q := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", tableName, strings.Join(cols, ", "), strings.Join(placeholders, ", "))
			_, err = db.Exec(q, vals...)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to insert data: %v", err)
			}
		}
	}

	rows, err := db.Query(fmt.Sprintf("SELECT * FROM %s", tableName))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query data: %v", err)
	}

	cols, err := rows.Columns()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get columns: %v", err)
	}

	return db, &pgIterator{rows: rows, columns: cols}, nil
}
