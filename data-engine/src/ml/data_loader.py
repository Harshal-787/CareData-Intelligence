import os
import duckdb
import polars as pl
from minio import Minio

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "caredata_minio")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "caredata_minio_secret123")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

class DataLoader:
    def __init__(self):
        self.minio_client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE
        )
        # Create an in-memory DuckDB connection, or file-backed if needed
        self.db = duckdb.connect(':memory:')
        
        # Install and load AWS extension for DuckDB to read from S3/MinIO
        self.db.execute("INSTALL httpfs;")
        self.db.execute("LOAD httpfs;")
        self.db.execute(f"SET s3_endpoint='{MINIO_ENDPOINT}';")
        self.db.execute(f"SET s3_access_key_id='{MINIO_ACCESS_KEY}';")
        self.db.execute(f"SET s3_secret_access_key='{MINIO_SECRET_KEY}';")
        self.db.execute("SET s3_use_ssl='false';")
        self.db.execute("SET s3_url_style='path';")

    def load_dataset_to_duckdb(self, bucket: str, object_name: str, table_name: str = "clinical_data"):
        """Loads a Parquet file from MinIO directly into DuckDB as a table/view."""
        s3_path = f"s3://{bucket}/{object_name}"
        query = f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM read_parquet('{s3_path}')"
        self.db.execute(query)
        return self.db

    def load_dataset_to_polars(self, bucket: str, object_name: str) -> pl.DataFrame:
        """Downloads a Parquet file from MinIO into a local Polars DataFrame."""
        tmp_path = f"/tmp/{object_name.replace('/', '_')}"
        self.minio_client.fget_object(bucket, object_name, tmp_path)
        df = pl.read_parquet(tmp_path)
        os.remove(tmp_path)
        return df

    def get_query_result(self, query: str):
        return self.db.execute(query).df()
