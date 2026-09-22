import os
import json
import time
import logging
import redis
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger("RedisConsumer")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
BACKEND_INTERNAL_URL = os.getenv("BACKEND_INTERNAL_URL", "http://localhost:8080/api/internal")

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
    
    # Simulate processing stages for now. The real data logic will be plugged in here in subsequent phases.
    for i, (stage_key, stage_name) in enumerate(stages):
        logger.info(f"Processing stage {stage_key}")
        report_progress(job_id, stage_key, 10, "RUNNING", f"Started {stage_name}")
        
        # Real work will happen here
        time.sleep(1) # Simulation placeholder until actual module integration
        
        report_progress(job_id, stage_key, 100, "COMPLETED", f"Finished {stage_name}", records_processed=1000, records_flagged=5)
        
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
