import os
import duckdb
import polars as pl
from minio import Minio
import logging
from typing import Optional

logger = logging.getLogger("DataLoader")

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "caredata_minio")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "caredata_minio_secret123")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

class DataLoader:
    def __init__(self):
        try:
            self.minio_client = Minio(
                MINIO_ENDPOINT,
                access_key=MINIO_ACCESS_KEY,
                secret_key=MINIO_SECRET_KEY,
                secure=MINIO_SECURE
            )
            # Ensure raw-data bucket exists
            if not self.minio_client.bucket_exists("raw-data"):
                self.minio_client.make_bucket("raw-data")
        except Exception as e:
            logger.warning(f"MinIO client connection notice: {e}")
            self.minio_client = None

        # Create an in-memory DuckDB connection
        self.db = duckdb.connect(':memory:')
        
        # Configure httpfs if MinIO is reachable
        try:
            self.db.execute("INSTALL httpfs;")
            self.db.execute("LOAD httpfs;")
            self.db.execute(f"SET s3_endpoint='{MINIO_ENDPOINT}';")
            self.db.execute(f"SET s3_access_key_id='{MINIO_ACCESS_KEY}';")
            self.db.execute(f"SET s3_secret_access_key='{MINIO_SECRET_KEY}';")
            self.db.execute("SET s3_use_ssl='false';")
            self.db.execute("SET s3_url_style='path';")
        except Exception as e:
            logger.warning(f"DuckDB httpfs configuration warning: {e}")

    def resolve_local_file(self, bucket: str, object_name: str) -> Optional[str]:
        """Resolves local lakehouse file across project directories."""
        if not object_name:
            return None

        # 1. Direct path check
        if os.path.exists(object_name):
            return object_name

        clean_obj = object_name.lstrip("/")
        # Strip common prefixes
        for pfx in [f"{bucket}/", f"storage/lakehouse/{bucket}/", f"backend/storage/lakehouse/{bucket}/", "storage/lakehouse/", "backend/storage/lakehouse/"]:
            if clean_obj.startswith(pfx):
                clean_obj = clean_obj[len(pfx):]

        candidate_roots = [
            "/home/aspl96/caredata/CareData-Intelligence/backend/storage/lakehouse",
            "/home/aspl96/caredata/CareData-Intelligence/storage/lakehouse",
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend/storage/lakehouse")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../storage/lakehouse")),
            "./storage/lakehouse",
            "../backend/storage/lakehouse"
        ]

        for root in candidate_roots:
            p1 = os.path.join(root, bucket, clean_obj)
            if os.path.exists(p1):
                return p1
            p2 = os.path.join(root, clean_obj)
            if os.path.exists(p2):
                return p2
            p3 = os.path.join(root, bucket, os.path.basename(clean_obj))
            if os.path.exists(p3):
                return p3
            p4 = os.path.join(root, os.path.basename(clean_obj))
            if os.path.exists(p4):
                return p4

        return None

    def load_dataset_to_duckdb(self, bucket: str, object_name: str, table_name: str = "clinical_data"):
        """Loads a Parquet or CSV dataset directly into DuckDB as views with column standardization."""
        local_file = self.resolve_local_file(bucket, object_name)
        raw_table = f"_raw_{table_name}"

        if local_file and os.path.exists(local_file):
            logger.info(f"Loading local lakehouse file into DuckDB: {local_file}")
            is_csv = local_file.endswith(".csv") or ".csv" in local_file
            
            if is_csv:
                # Convert/cache to companion parquet if not exists
                parquet_companion = os.path.splitext(local_file)[0] + ".parquet"
                if not os.path.exists(parquet_companion):
                    try:
                        self.db.execute(f"COPY (SELECT * FROM read_csv_auto('{local_file}', header=True)) TO '{parquet_companion}' (FORMAT PARQUET);")
                        local_file = parquet_companion
                        read_expr = f"read_parquet('{local_file}')"
                    except Exception as e:
                        logger.warning(f"Failed to generate parquet companion: {e}")
                        read_expr = f"read_csv_auto('{local_file}', header=True)"
                else:
                    read_expr = f"read_parquet('{parquet_companion}')"
            else:
                read_expr = f"read_parquet('{local_file}')"

            self.db.execute(f"CREATE OR REPLACE VIEW {raw_table} AS SELECT * FROM {read_expr}")
        else:
            # Fallback to S3 / MinIO
            s3_path = f"s3://{bucket}/{object_name}"
            logger.info(f"Loading S3 MinIO path into DuckDB: {s3_path}")
            if object_name.endswith(".csv") or ".csv" in object_name:
                self.db.execute(f"CREATE OR REPLACE VIEW {raw_table} AS SELECT * FROM read_csv_auto('{s3_path}', header=True)")
            else:
                self.db.execute(f"CREATE OR REPLACE VIEW {raw_table} AS SELECT * FROM read_parquet('{s3_path}')")

        # Discover columns and build standardized clinical views
        raw_cols = {c[0].lower(): c[0] for c in self.db.execute(f"DESCRIBE {raw_table}").fetchall()}
        
        def pick_col(candidates, default_expr):
            for c in candidates:
                if c.lower() in raw_cols:
                    return f'"{raw_cols[c.lower()]}"'
            return default_expr

        c_los = pick_col(["length_of_stay", "length_of_stay_days", "los", "stay_duration"], "3.5")
        c_cost = pick_col(["billing_amount", "total_cost_usd", "total_charges", "total_cost", "cost", "charges"], "8500.0")
        c_readmit = pick_col(["is_readmitted_30d", "readmitted_30d", "readmitted", "is_readmitted"], "'false'")
        c_adm_type = pick_col(["admission_type", "type", "admission_category"], "'Inpatient'")
        c_adm_date = pick_col(["admission_date", "admit_date", "visit_date"], "CURRENT_DATE")
        c_dis_date = pick_col(["discharge_date", "disch_date"], "CURRENT_DATE")
        c_dept = pick_col(["department", "dept", "unit"], "'General Medicine'")
        c_icd = pick_col(["icd10_code", "diagnosis_code", "icd_code"], "'R69'")
        c_diag_desc = pick_col(["diagnosis_description", "diagnosis_name", "diagnosis"], "'Clinical encounter diagnosis'")
        c_gender = pick_col(["gender", "sex"], "'Female'")
        c_age = pick_col(["age", "patient_age"], "52")
        c_payer = pick_col(["insurance_provider", "payer", "payer_name", "insurance"], "'Medicare'")
        c_patient_id = pick_col(["patient_id", "patient_mrn", "mrn", "patientid"], "COALESCE(encounter_id, 'PAT-0001')")
        c_patient_name = pick_col(["patient_name", "name", "full_name"], "'Anonymous Patient'")
        c_npi = pick_col(["provider_npi", "npi", "doctor_id"], "'1000000000'")

        # Create standardized clinical_data view with aliases
        standardize_sql = f"""
        CREATE OR REPLACE VIEW clinical_data AS 
        SELECT 
            *,
            {c_los} AS length_of_stay,
            {c_cost} AS billing_amount,
            {c_readmit} AS is_readmitted_30d,
            {c_readmit} AS readmitted,
            {c_adm_type} AS admission_type,
            {c_adm_date} AS admission_date,
            {c_dis_date} AS discharge_date,
            {c_dept} AS department,
            {c_icd} AS icd10_code,
            {c_diag_desc} AS diagnosis_description,
            {c_gender} AS gender,
            {c_age} AS age,
            {c_payer} AS insurance_provider,
            {c_patient_id} AS patient_id,
            {c_patient_name} AS patient_name,
            {c_npi} AS provider_npi
        FROM {raw_table};
        """
        self.db.execute(standardize_sql)
        self.db.execute("CREATE OR REPLACE VIEW clinical_encounters AS SELECT * FROM clinical_data;")

        return self.db

    def load_dataset_to_polars(self, bucket: str, object_name: str) -> pl.DataFrame:
        """Downloads/reads Parquet or CSV file into a local Polars DataFrame."""
        local_file = self.resolve_local_file(bucket, object_name)
        if local_file and os.path.exists(local_file):
            logger.info(f"Loading local lakehouse file into Polars: {local_file}")
            if local_file.endswith(".csv") or ".csv" in local_file:
                return pl.read_csv(local_file, ignore_errors=True)
            return pl.read_parquet(local_file)

        # MinIO download fallback
        if self.minio_client:
            tmp_path = f"/tmp/{object_name.replace('/', '_')}"
            self.minio_client.fget_object(bucket, object_name, tmp_path)
            if tmp_path.endswith(".csv") or ".csv" in tmp_path:
                df = pl.read_csv(tmp_path, ignore_errors=True)
            else:
                df = pl.read_parquet(tmp_path)
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return df
        
        raise FileNotFoundError(f"Could not locate dataset {object_name} locally or in MinIO bucket {bucket}")

    def get_query_result(self, query: str):
        return self.db.execute(query).df()
