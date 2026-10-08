import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
import json
import time
import logging
import redis
import traceback

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger("MLWorker")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

def process_ml_job(job_data: dict, r: redis.Redis):
    job_id = job_data.get("job_id")
    bucket = job_data.get("bucket", "raw-data")
    object_name = job_data.get("object_name")
    contamination = job_data.get("contamination", 0.05)
    n_estimators = job_data.get("n_estimators", 200)

    logger.info(f"Starting ML job {job_id} for dataset {object_name}")

    try:
        from src.ml.data_loader import DataLoader
        loader = DataLoader()
        df = loader.load_dataset_to_polars(bucket, object_name).to_pandas()
        
        import pandas as pd
        df_clean = df.astype(object).where(pd.notnull(df), None)
        records = df_clean.to_dict(orient="records")
        
        # Evidently AI Drift check
        from src.ml.model_monitor import ClinicalModelMonitor
        monitor = ClinicalModelMonitor()
        drift_summary = None
        try:
            # For demonstration, we compare the first half vs second half to detect statistical drift
            half = len(df) // 2
            if half > 0:
                report = monitor.run_drift_report(df.iloc[:half], df.iloc[half:])
                logger.info(f"Evidently AI Drift check completed. Drifted Features: {report.get('drifted_features_count', 0)}")
                tests_passed = monitor.run_automated_tests(df.iloc[:half], df.iloc[half:])
                logger.info(f"Automated Tests Passed: {tests_passed}")
                drift_summary = report
                drift_summary["tests_passed"] = tests_passed
        except Exception as e:
            logger.warning(f"Evidently AI Drift check failed: {e}")

        from src.ml.ml_pipeline import run_ml_pipeline
        result = run_ml_pipeline(records, contamination=contamination, n_estimators=n_estimators)
        
        if drift_summary:
            if "modelRun" in result:
                result["modelRun"]["driftReport"] = drift_summary
        
        # Save result back to Redis
        r.set(f"ml_result:{job_id}", json.dumps(result), ex=3600)
        logger.info(f"ML job {job_id} completed successfully.")
    except Exception as e:
        logger.error(f"ML job {job_id} failed: {e}")
        logger.error(traceback.format_exc())
        r.set(f"ml_result:{job_id}", json.dumps({"error": str(e)}), ex=3600)

def main():
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True, health_check_interval=30)
    logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}. Listening for ML jobs...")
    
    queue_name = "ml_jobs"
    
    while True:
        try:
            result = r.brpop(queue_name, timeout=0)
            if result:
                _, msg = result
                job_data = json.loads(msg)
                process_ml_job(job_data, r)
        except Exception as e:
            logger.error(f"Error processing job: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
