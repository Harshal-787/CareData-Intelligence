"""
CareData Intelligence — DuckDB OLAP Healthcare Analytics Engine
Executes sub-second analytical queries, demographic aggregations, and clinical KPI calculations over local Parquet lakes.
"""

import sys
import json
import time
import os
from typing import Dict, Any, List, Optional
try:
    import duckdb
except ImportError:
    duckdb = None

class HealthcareOLAPEngine:
    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        self.con = duckdb.connect(database=db_path) if duckdb else None

    def register_parquet(self, table_name: str, file_path: str) -> bool:
        """Registers a Parquet file or directory as a queryable virtual table in DuckDB."""
        if not self.con:
            return False
        try:
            self.con.execute(f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM read_parquet('{file_path}')")
            return True
        except Exception as e:
            sys.stderr.write(f"Error registering parquet table: {e}\n")
            return False

    def execute_query(self, sql_query: str, limit: int = 1000) -> Dict[str, Any]:
        """Executes an OLAP SQL query with safety bounds and performance timing."""
        if not self.con:
            return {"error": "DuckDB is not installed or initialized"}

        # Basic query sanitization (read-only safety check)
        normalized = sql_query.strip().upper()
        forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE TABLE", "ATTACH", "COPY"]
        for f in forbidden:
            if normalized.startswith(f) or f" {f} " in normalized:
                return {"error": f"Disallowed operation '{f}'. Analytics OLAP queries are read-only."}

        start_time = time.perf_counter()
        try:
            cursor = self.con.execute(sql_query)
            col_names = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchmany(limit)
            exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Map rows to dicts
            result_rows = []
            for row in rows:
                row_dict = {}
                for idx, col in enumerate(col_names):
                    val = row[idx]
                    # Handle non-serializable objects
                    if hasattr(val, "isoformat"):
                        val = val.isoformat()
                    row_dict[col] = val
                result_rows.append(row_dict)

            return {
                "columns": [{"name": c, "dataType": "VARCHAR"} for c in col_names],
                "rows": result_rows,
                "totalRows": len(result_rows),
                "executionTimeMs": exec_time_ms,
                "engine": "DuckDB Embedded OLAP (Python)",
                "cached": False
            }
        except Exception as e:
            return {
                "error": str(e),
                "executionTimeMs": round((time.perf_counter() - start_time) * 1000, 2)
            }

    def compute_clinical_kpis(self, table_name: str) -> Dict[str, Any]:
        """Computes foundational healthcare KPIs directly in DuckDB."""
        if not self.con:
            return {}

        queries = {
            "overview": f"""
                SELECT 
                    COUNT(*) as total_encounters,
                    COUNT(DISTINCT patient_id) as active_patients,
                    COUNT(DISTINCT provider_npi) as unique_providers,
                    AVG(TRY_CAST(length_of_stay AS DOUBLE)) as avg_los,
                    AVG(CASE WHEN readmitted = 'true' OR readmission_30d = 1 THEN 1.0 ELSE 0.0 END) * 100 as readmission_rate,
                    SUM(TRY_CAST(billing_amount AS DOUBLE)) as total_cost
                FROM {table_name}
            """,
            "departments": f"""
                SELECT 
                    department,
                    COUNT(*) as encounter_count,
                    AVG(TRY_CAST(length_of_stay AS DOUBLE)) as avg_los,
                    SUM(TRY_CAST(billing_amount AS DOUBLE)) as total_cost
                FROM {table_name}
                WHERE department IS NOT NULL
                GROUP BY department
                ORDER BY encounter_count DESC
            """,
            "top_diagnoses": f"""
                SELECT 
                    icd10_code,
                    diagnosis_desc,
                    COUNT(*) as patient_count,
                    AVG(TRY_CAST(length_of_stay AS DOUBLE)) as avg_los
                FROM {table_name}
                WHERE icd10_code IS NOT NULL
                GROUP BY icd10_code, diagnosis_desc
                ORDER BY patient_count DESC
                LIMIT 10
            """
        }

        results = {}
        for key, q in queries.items():
            try:
                res = self.execute_query(q)
                results[key] = res.get("rows", [])
            except Exception as e:
                results[key] = []

        return results

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        engine = HealthcareOLAPEngine()
        if engine.con:
            print(json.dumps({"status": "ready", "engine": "duckdb"}))
        else:
            print(json.dumps({"status": "unavailable", "reason": "duckdb not installed"}))
