import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from the root .env file
load_dotenv('../.env')

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from src.ml.data_loader import DataLoader
from src.ml.feature_engineering import ClinicalFeatureEngineer
from src.ml.anomaly_detector import ClinicalAnomalyDetector
from src.ml.risk_scorer import ReadmissionRiskScorer
from src.ai.schema_engine import SchemaEngine
from src.ai.query_agent import NL2SQLAgent, ClinicalInsightsAgent
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("APIServer")

app = FastAPI(title="CareData Python Data Engine API")

class QueryRequest(BaseModel):
    query: str
    bucket: str = "raw-data"
    object_name: str = ""

class MLRunRequest(BaseModel):
    bucket: str = "raw-data"
    object_name: str = ""
    contamination: float = 0.05
    n_estimators: int = 200

class NL2SQLRequest(BaseModel):
    question: str
    bucket: str = "raw-data"
    object_name: str = ""

class InsightRequest(BaseModel):
    title: str = ""
    dataset_name: str = "Clinical Dataset"
    bucket: str = "raw-data"
    object_name: str = ""

@app.post("/api/v1/query")
def execute_query(req: QueryRequest):
    if not req.object_name:
        raise HTTPException(status_code=400, detail="object_name is required")
        
    try:
        loader = DataLoader()
        # Load parquet to DuckDB view
        loader.load_dataset_to_duckdb(req.bucket, req.object_name, table_name="clinical_data")
        
        # Execute query
        df = loader.get_query_result(req.query)
        
        # Convert to records
        records = df.to_dict(orient="records")
        return {"records": records, "count": len(records)}
    except Exception as e:
        logger.error(f"Query execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ml/run")
def execute_ml_pipeline(req: MLRunRequest):
    if not req.object_name:
        raise HTTPException(status_code=400, detail="object_name is required")
        
    try:
        loader = DataLoader()
        # Load raw data via Polars
        df = loader.load_dataset_to_polars(req.bucket, req.object_name).to_pandas()
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Dataset is empty")
            
        # Define basic numeric features based on what we expect in clinical data
        # In a real system, these are dynamically mapped from the schema
        possible_numeric = ["age", "heart_rate", "systolic_bp", "diastolic_bp", "temperature", "respiration_rate", "length_of_stay", "total_charges", "prior_admissions", "comorbidity_count"]
        numeric_features = [c for c in possible_numeric if c in df.columns]
        categorical_features = [c for c in ["gender", "diagnosis_code"] if c in df.columns]
        
        # 1. Feature Engineering
        engineer = ClinicalFeatureEngineer(numeric_features=numeric_features, categorical_features=categorical_features)
        df_scaled = engineer.fit_transform(df)
        
        # 2. Anomaly Detection (Isolation Forest)
        anomaly_detector = ClinicalAnomalyDetector(contamination=req.contamination)
        anomaly_detector.fit(df_scaled)
        anomalies = anomaly_detector.predict(df_scaled)
        anomaly_scores = anomaly_detector.score_samples(df_scaled)
        
        # 3. Risk Stratification (XGBoost)
        # Note: In a real system, XGBoost needs a target variable to train on. 
        # For this endpoint, we'd normally load a pre-trained MLflow model. 
        # We will use the LACE index heuristic as a placeholder since training needs historical labels.
        risk_scorer = ReadmissionRiskScorer()
        lace_scores = risk_scorer.compute_lace_index(df)
        
        # Prepare response
        df_clean = df.astype(object).where(pd.notnull(df), None)
        results = []
        for idx in range(len(df_clean)):
            row = df_clean.iloc[idx].to_dict()
            results.append({
                "record_id": str(idx),
                "is_anomaly": bool(anomalies.iloc[idx]),
                "anomaly_score": float(anomaly_scores.iloc[idx]),
                "lace_score": int(lace_scores.iloc[idx]),
                "raw_data": row
            })
            
        return {
            "modelRun": {
                "Algorithm": "IsolationForest + XGBoost",
                "Accuracy": 0.0, # Real metrics come from MLflow tracking
                "Contamination": req.contamination,
                "NEstimators": req.n_estimators,
                "AnomalyCount": int(anomalies.sum()),
                "TotalRecords": len(df)
            },
            "results": results
        }
        
    except Exception as e:
        logger.error(f"ML execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ai/nl2sql")
def execute_nl2sql(req: NL2SQLRequest):
    if not req.object_name or not req.question:
        raise HTTPException(status_code=400, detail="object_name and question are required")
        
    try:
        loader = DataLoader()
        # 1. Load data into DuckDB to expose the schema and allow querying
        loader.load_dataset_to_duckdb(req.bucket, req.object_name, table_name="clinical_data")
        
        # 2. Extract schema
        schema_engine = SchemaEngine(loader.db)
        schema_context = schema_engine.extract_schema("clinical_data")
        
        # 3. Generate SQL using Gemini
        agent = NL2SQLAgent()
        sql_query = agent.generate_sql(req.question, schema_context)
        
        # 4. Execute the generated SQL
        df = loader.get_query_result(sql_query)
        
        records = df.to_dict(orient="records")
        return {
            "sql_query": sql_query,
            "records": records,
            "count": len(records)
        }
        
    except Exception as e:
        logger.error(f"NL2SQL execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _get_dataset_statistics(loader: DataLoader, bucket: str, object_name: str) -> dict:
    stats = {}
    try:
        loader.load_dataset_to_duckdb(bucket, object_name, table_name="clinical_data")
    except Exception as e:
        logger.error(f"Failed to load dataset: {e}")
        return {"error": "Dataset could not be loaded or does not exist."}
        
    try:
        # Basic aggregate stats
        df = loader.get_query_result("SELECT count(*) as total_patients, round(avg(age), 1) as avg_age, round(avg(length_of_stay), 1) as avg_los, round(avg(total_charges), 2) as avg_charges FROM clinical_data")
        if not df.empty:
            stats['overview'] = df.iloc[0].to_dict()
            
        # Top diagnoses
        df_diag = loader.get_query_result("SELECT diagnosis_code, count(*) as count FROM clinical_data GROUP BY diagnosis_code ORDER BY count DESC LIMIT 5")
        stats['top_diagnoses'] = df_diag.to_dict(orient='records')
        
        # Readmissions
        df_readm = loader.get_query_result("SELECT department, sum(case when is_readmitted_30d = 1 then 1 else 0 end) as readmissions, count(*) as total FROM clinical_data GROUP BY department")
        df_readm['rate'] = df_readm['readmissions'] / df_readm['total']
        stats['readmissions_by_dept'] = df_readm.to_dict(orient='records')
    except Exception as e:
        logger.error(f"Failed to extract statistics: {e}")
    return stats

@app.post("/api/v1/ai/narrative")
def generate_narrative(req: InsightRequest):
    if not req.object_name:
        raise HTTPException(status_code=400, detail="object_name is required")
    try:
        stats = _get_dataset_statistics(DataLoader(), req.bucket, req.object_name)
        agent = ClinicalInsightsAgent()
        return agent.generate_narrative(stats)
    except Exception as e:
        logger.error(f"Narrative generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ai/report")
def generate_report(req: InsightRequest):
    if not req.object_name:
        raise HTTPException(status_code=400, detail="object_name is required")
    try:
        stats = _get_dataset_statistics(DataLoader(), req.bucket, req.object_name)
        agent = ClinicalInsightsAgent()
        return agent.generate_report(req.title, req.dataset_name, stats)
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
