"""
CareData Intelligence — Parquet Lakehouse Ingestion & Converter
Converts heterogeneous raw clinical datasets (CSV, JSON, NDJSON) into standardized,
compressed Apache Parquet partitions using Polars and PyArrow.
"""

import os
import sys
import argparse
import polars as pl
from pathlib import Path

def convert_to_parquet(input_path: str, output_parquet_path: str) -> dict:
    input_file = Path(input_path)
    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    ext = input_file.suffix.lower()
    print(f"[CareData Engine] Ingesting raw file: {input_path} ({ext})")

    # Read dataset using Polars for high performance
    if ext == ".csv":
        df = pl.read_csv(input_path, ignore_errors=True)
    elif ext == ".json":
        df = pl.read_json(input_path)
    elif ext in [".ndjson", ".jsonl"]:
        df = pl.read_ndjson(input_path)
    elif ext == ".parquet":
        df = pl.read_parquet(input_path)
    else:
        df = pl.read_csv(input_path, ignore_errors=True)

    # Ensure output directory exists
    output_file = Path(output_parquet_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Write compressed columnar Parquet
    df.write_parquet(
        output_parquet_path,
        compression="snappy",
        statistics=True,
        use_pyarrow=True
    )

    schema_info = [{"name": col, "dataType": str(dtype)} for col, dtype in zip(df.columns, df.dtypes)]
    preview_data = df.head(10).to_dicts()

    print(f"[CareData Engine] Successfully converted to Parquet: {output_parquet_path}")
    print(f"[CareData Engine] Total Rows: {df.height}, Columns: {df.width}")

    return {
        "rowCount": df.height,
        "columnCount": df.width,
        "schema": schema_info,
        "preview": preview_data,
        "parquetPath": output_parquet_path,
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert raw clinical files to Parquet")
    parser.add_argument("--input", required=True, help="Path to input raw file (CSV/JSON)")
    parser.add_argument("--output", required=True, help="Path to output Parquet file")
    args = parser.parse_args()

    result = convert_to_parquet(args.input, args.output)
    print(result)
