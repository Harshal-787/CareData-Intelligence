"""
CareData Intelligence — High Performance DuckDB & Polars Dataset Profiler
Computes detailed statistical summary, missing value quantiles, and histogram distribution directly over Parquet files.
"""

import sys
import os
import json
import math
from typing import Dict, Any, List

try:
    import duckdb
    import polars as pl
except ImportError:
    duckdb = None
    pl = None


def profile_parquet_file(parquet_path: str) -> List[Dict[str, Any]]:
    """
    Scans a local Parquet dataset using DuckDB and computes column-level metrics.
    """
    if not os.path.exists(parquet_path):
        raise FileNotFoundError(f"Parquet file not found at: {parquet_path}")

    if duckdb is None:
        raise ImportError("DuckDB is required for data-engine profiling. Run: pip install duckdb polars")

    con = duckdb.connect(database=":memory:")
    
    # 1. Inspect Schema
    schema_df = con.execute(f"DESCRIBE SELECT * FROM read_parquet('{parquet_path}')").fetchdf()
    total_rows = con.execute(f"SELECT COUNT(*) FROM read_parquet('{parquet_path}')").fetchone()[0]
    
    profiles = []
    
    for _, row in schema_df.iterrows():
        col_name = row['column_name']
        col_type = row['column_type'].upper()
        
        # Null count
        null_count = con.execute(
            f"SELECT COUNT(*) FROM read_parquet('{parquet_path}') WHERE \"{col_name}\" IS NULL"
        ).fetchone()[0]
        
        # Distinct count
        distinct_count = con.execute(
            f"SELECT COUNT(DISTINCT \"{col_name}\") FROM read_parquet('{parquet_path}') WHERE \"{col_name}\" IS NOT NULL"
        ).fetchone()[0]
        
        null_pct = round((null_count / total_rows * 100) if total_rows > 0 else 0, 2)
        unique_pct = round((distinct_count / (total_rows - null_count) * 100) if (total_rows - null_count) > 0 else 0, 2)
        
        col_profile = {
            "columnName": col_name,
            "dataType": col_type,
            "totalCount": total_rows,
            "nullCount": null_count,
            "nullPercentage": null_pct,
            "distinctCount": distinct_count,
            "uniquePct": unique_pct,
            "healthScore": max(0.0, 100.0 - null_pct)
        }
        
        # Numeric Stats
        if any(t in col_type for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC"]):
            stats = con.execute(f"""
                SELECT 
                    MIN("{col_name}") as min_val,
                    MAX("{col_name}") as max_val,
                    AVG("{col_name}") as avg_val,
                    STDDEV_SAMP("{col_name}") as stddev_val,
                    MEDIAN("{col_name}") as median_val,
                    QUANTILE_CONT("{col_name}", 0.25) as q25,
                    QUANTILE_CONT("{col_name}", 0.75) as q75
                FROM read_parquet('{parquet_path}')
                WHERE "{col_name}" IS NOT NULL
            """).fetchdf()
            
            if not stats.empty:
                r = stats.iloc[0]
                col_profile["min"] = float(r["min_val"]) if r["min_val"] is not None and not math.isnan(r["min_val"]) else None
                col_profile["max"] = float(r["max_val"]) if r["max_val"] is not None and not math.isnan(r["max_val"]) else None
                col_profile["mean"] = round(float(r["avg_val"]), 2) if r["avg_val"] is not None and not math.isnan(r["avg_val"]) else None
                col_profile["stdDev"] = round(float(r["stddev_val"]), 2) if r["stddev_val"] is not None and not math.isnan(r["stddev_val"]) else None
                col_profile["median"] = round(float(r["median_val"]), 2) if r["median_val"] is not None and not math.isnan(r["median_val"]) else None
                col_profile["q25"] = round(float(r["q25"]), 2) if r["q25"] is not None and not math.isnan(r["q25"]) else None
                col_profile["q75"] = round(float(r["q75"]), 2) if r["q75"] is not None and not math.isnan(r["q75"]) else None

        # Top Frequent Values
        top_df = con.execute(f"""
            SELECT "{col_name}" as val, COUNT(*) as cnt
            FROM read_parquet('{parquet_path}')
            WHERE "{col_name}" IS NOT NULL
            GROUP BY "{col_name}"
            ORDER BY cnt DESC
            LIMIT 8
        """).fetchdf()
        
        top_values = []
        for _, t_row in top_df.iterrows():
            cnt = int(t_row["cnt"])
            top_values.append({
                "value": str(t_row["val"]),
                "count": cnt,
                "pct": round((cnt / total_rows * 100), 2) if total_rows > 0 else 0
            })
        col_profile["topValues"] = top_values
        
        profiles.append(col_profile)
        
    con.close()
    return profiles


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python profiler.py <path_to_parquet_file>")
        sys.exit(1)
        
    path = sys.argv[1]
    results = profile_parquet_file(path)
    print(json.dumps(results, indent=2))
