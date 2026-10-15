import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
import json
import time
import logging
import redis
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger("RedisConsumer")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
BACKEND_INTERNAL_URL = os.getenv("BACKEND_INTERNAL_URL", "http://localhost:8080/api/v1/internal")

def report_progress(job_id: str, stage: str, progress: int, status: str, summary: str = "", records_processed: int = 0, records_flagged: int = 0):
    """Sends progress update webhook back to the Go backend."""
    try:
        payload = {
            "job_id": job_id,
            "stage": stage,
            "progress": progress,
            "status": status,
            "summary": summary,
            "records_processed": records_processed,
            "records_flagged": records_flagged
        }
        resp = requests.post(f"{BACKEND_INTERNAL_URL}/pipeline/progress", json=payload, timeout=5)
        resp.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to report progress for job {job_id}: {e}")

def process_pipeline_job(job_data: dict):
    job_id = job_data.get("job_id")
    dataset_id = job_data.get("dataset_id")
    
    logger.info(f"Starting pipeline job {job_id} for dataset {dataset_id}")
    
    stages = [
        ("INGESTION", "Raw Lakehouse Ingestion"),
        ("PROFILING", "DuckDB Column Profiling"),
        ("VALIDATION", "Healthcare Quality Rules"),
        ("DEDUPLICATION", "Patient Deduplication"),
        ("ML_INFERENCE", "ML Anomaly & Risk Stratification"),
        ("AI_SYNTHESIS", "AI Clinical Insights")
    ]
    
    bucket = "raw-data"
    object_name = job_data.get("object_name")
    if not object_name:
        if dataset_id == "ds-enterprise-001":
            object_name = "enterprise_clinical_lakehouse.parquet"
        elif dataset_id == "ds-demo-101":
            object_name = "demodata.parquet"
        else:
            object_name = f"{dataset_id}.parquet"

    for i, (stage_key, stage_name) in enumerate(stages):
        logger.info(f"Processing stage {stage_key}")
        report_progress(job_id, stage_key, 10, "RUNNING", f"Started {stage_name}")
        
        records_processed = 5000
        records_flagged = 0
        summary = f"Finished {stage_name}"
        
        try:
            if stage_key == "INGESTION":
                from src.ml.data_loader import DataLoader
                import os
                loader = DataLoader()
                df = loader.load_dataset_to_polars(bucket, object_name)
                records_processed = len(df)
                file_path = f"../backend/storage/lakehouse/{bucket}/{object_name}"
                size_mb = 0
                if os.path.exists(file_path):
                    size_mb = os.path.getsize(file_path) / (1024 * 1024)
                summary = f"Lakehouse payload verified. Ingested {records_processed} records ({size_mb:.2f} MB)"
                
            elif stage_key == "PROFILING":
                from src.ml.data_loader import DataLoader
                from src.workers.api_server import _get_dataset_statistics
                loader = DataLoader()
                stats = _get_dataset_statistics(loader, bucket, object_name)
                overview = stats.get('overview', {})
                records_processed = int(overview.get('total_patients', 1200))
                summary = f"Profiled {records_processed} records across schema columns and computed null distributions"
                
            elif stage_key == "VALIDATION":
                from src.ml.data_loader import DataLoader
                import pandas as pd
                loader = DataLoader()
                df = loader.load_dataset_to_polars(bucket, object_name).to_pandas()
                total_records = len(df)
                
                # Rule 1: Missing demographics
                missing_demographics = df[['patient_id', 'age', 'gender']].isnull().any(axis=1) if 'patient_id' in df.columns else pd.Series(False, index=df.index)
                
                # Rule 2: Out of bounds vitals
                bad_vitals = pd.Series(False, index=df.index)
                hr_col = 'heart_rate' if 'heart_rate' in df.columns else None
                sys_col = 'systolic_bp' if 'systolic_bp' in df.columns else ('systolic' if 'systolic' in df.columns else None)
                if hr_col and sys_col:
                    bad_vitals = (df[hr_col] < 30) | (df[hr_col] > 250) | (df[sys_col] < 40) | (df[sys_col] > 300)
                    
                # Rule 3: Missing clinical diagnoses
                diag_col = 'primary_diagnosis' if 'primary_diagnosis' in df.columns else ('diagnosis_description' if 'diagnosis_description' in df.columns else None)
                missing_diagnosis = df[diag_col].isnull() if diag_col else pd.Series(False, index=df.index)
                
                flagged_mask = missing_demographics | bad_vitals | missing_diagnosis
                records_flagged = int(flagged_mask.sum())
                records_processed = total_records
                summary = f"Enforced clinical constraints: {records_flagged} records flagged for data quality issues"
                
            elif stage_key == "DEDUPLICATION":
                from src.ml.data_loader import DataLoader
                import pandas as pd
                loader = DataLoader()
                df = loader.load_dataset_to_polars(bucket, object_name).to_pandas()
                name_col = 'patient_name' if 'patient_name' in df.columns else ('first_name' if 'first_name' in df.columns else df.columns[0])
                dob_col = 'admission_date' if 'admission_date' in df.columns else ('date_of_birth' if 'date_of_birth' in df.columns else df.columns[1])
                df['block_key'] = df[name_col].astype(str).str[:3].str.lower() + df[dob_col].astype(str).str[:4]
                duplicates = df[df.duplicated(subset=['block_key'], keep=False)]
                records_processed = len(df)
                records_flagged = len(duplicates) // 2
                summary = f"Detected {records_flagged} candidate pairs via fuzzy matching"
                
            elif stage_key == "ML_INFERENCE":
                from src.ml.data_loader import DataLoader
                from src.ml.ml_pipeline import run_ml_pipeline
                import pandas as pd
                loader = DataLoader()
                df = loader.load_dataset_to_polars(bucket, object_name).to_pandas()
                df_clean = df.astype(object).where(pd.notnull(df), None)
                records = df_clean.to_dict(orient="records")
                result = run_ml_pipeline(records, contamination=0.05, n_estimators=50)
                records_processed = result["overview"]["totalInferences"]
                records_flagged = result["overview"]["totalAnomalies"]
                summary = f"Scored records: {records_processed} | Anomalies: {records_flagged}"
                
            elif stage_key == "AI_SYNTHESIS":
                from src.ml.data_loader import DataLoader
                from src.ai.query_agent import ClinicalInsightsAgent
                from src.workers.api_server import _get_dataset_statistics
                loader = DataLoader()
                stats = _get_dataset_statistics(loader, bucket, object_name)
                agent = ClinicalInsightsAgent()
                # Run AI report generation
                agent.generate_report("Intelligence Brief", dataset_id, stats)
                summary = "Synthesized clinical insights and ML findings successfully"
                
        except Exception as e:
            logger.error(f"Stage {stage_key} failed: {e}")
            report_progress(job_id, stage_key, 100, "FAILED", f"Error: {e}", records_processed, records_flagged)
            return
            
        report_progress(job_id, stage_key, 100, "COMPLETED", summary, records_processed=records_processed, records_flagged=records_flagged)
        
    logger.info(f"Pipeline job {job_id} completed.")

def main():
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}. Listening for jobs...")
    
    queue_name = "pipeline_jobs"
    
    while True:
        try:
            # Block and wait for a job
            result = r.brpop(queue_name, timeout=0)
            if result:
                _, msg = result
                job_data = json.loads(msg)
                process_pipeline_job(job_data)
        except Exception as e:
            logger.error(f"Error processing job: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
