import json
import time
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from both root and local .env files
load_dotenv('.env')
load_dotenv('../.env')
load_dotenv('../backend/.env')

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

class OverviewRequest(BaseModel):
    bucket: str = "raw-data"
    object_names: List[str] = []

class MLRunRequest(BaseModel):
    bucket: str = "raw-data"
    object_name: str = ""
    contamination: float = 0.05
    n_estimators: int = 200

class NL2SQLRequest(BaseModel):
    question: str
    bucket: str = "raw-data"
    object_name: str = ""
    model: str = "gemini-2.5-flash"

class InsightRequest(BaseModel):
    title: str = ""
    dataset_name: str = "Clinical Dataset"
    bucket: str = "raw-data"
    object_name: str = ""
    model: str = "gemini-2.5-flash"

@app.post("/api/v1/query")
def execute_query(req: QueryRequest):
    if not req.object_name:
        raise HTTPException(status_code=400, detail="object_name is required")
        
    try:
        import time
        start = time.time()
        loader = DataLoader()
        # Load parquet to DuckDB view
        loader.load_dataset_to_duckdb(req.bucket, req.object_name, table_name="clinical_data")
        loader.load_dataset_to_duckdb(req.bucket, req.object_name, table_name="clinical_encounters")
        
        # Execute query
        df = loader.get_query_result(req.query)
        
        # Convert to records
        records = df.to_dict(orient="records")
        duration_ms = (time.time() - start) * 1000.0
        return {"records": records, "count": len(records), "execution_time_ms": duration_ms}
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
            
        df_clean = df.astype(object).where(pd.notnull(df), None)
        records = df_clean.to_dict(orient="records")
        
        from src.ml.ml_pipeline import run_ml_pipeline
        result = run_ml_pipeline(records, contamination=req.contamination, n_estimators=req.n_estimators)
        
        return result
        
    except Exception as e:
        logger.error(f"ML execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ai/nl2sql")
def execute_nl2sql(req: NL2SQLRequest):
    if not req.object_name or not req.question:
        raise HTTPException(status_code=400, detail="object_name and question are required")
        
    try:
        t0 = time.time()
        loader = DataLoader()
        # 1. Load data into DuckDB to expose the schema and allow querying
        loader.load_dataset_to_duckdb(req.bucket, req.object_name, table_name="clinical_data")
        loader.load_dataset_to_duckdb(req.bucket, req.object_name, table_name="clinical_encounters")
        
        # 2. Extract schema
        schema_engine = SchemaEngine(loader.db)
        schema_context = schema_engine.extract_schema("clinical_data")
        
        # 3. Generate SQL using Gemini
        agent = NL2SQLAgent()
        sql_query = agent.generate_sql(req.question, schema_context, req.model)
        
        if not sql_query:
            return {
                "sql_query": "",
                "records": [],
                "count": 0,
                "columns": [],
                "execution_time_ms": 0.0,
                "is_conversational": True
            }

        # 4. Execute the generated SQL
        df = loader.get_query_result(sql_query)
        elapsed_ms = round((time.time() - t0) * 1000, 2)
        
        records = df.to_dict(orient="records")
        columns = [{"name": str(c), "dataType": str(df[c].dtype)} for c in df.columns]
        return {
            "sql_query": sql_query,
            "records": records,
            "count": len(records),
            "columns": columns,
            "execution_time_ms": elapsed_ms,
            "is_conversational": False
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
        # 1. Comprehensive aggregate stats
        q_overview = """
            SELECT 
                cast(count(*) as bigint) as total_patients,
                round(avg(age), 1) as avg_age,
                round(avg(length_of_stay), 1) as avg_los,
                round(avg(COALESCE(total_charges, billing_amount, 0)), 2) as avg_charges,
                round(sum(COALESCE(total_charges, billing_amount, 0)), 2) as total_charges_sum,
                cast(sum(case when cast(is_readmitted_30d as varchar) in ('true', '1') then 1 else 0 end) as bigint) as readmission_count,
                round(avg(case when cast(is_readmitted_30d as varchar) in ('true', '1') then 1.0 else 0.0 end) * 100, 1) as readmission_rate_pct,
                cast(sum(case when lower(admission_type) like '%emerg%' then 1 else 0 end) as bigint) as emergency_count,
                round(avg(case when lower(admission_type) like '%emerg%' then 1.0 else 0.0 end) * 100, 1) as emergency_rate_pct,
                cast(sum(case when systolic_bp > 155 or diastolic_bp > 95 or heart_rate > 105 then 1 else 0 end) as bigint) as vital_outliers_count
            FROM clinical_data
        """
        df = loader.get_query_result(q_overview)
        if not df.empty:
            stats['overview'] = df.iloc[0].to_dict()
            
        # 2. Top diagnoses with descriptions and metrics
        q_diag = """
            SELECT 
                COALESCE(icd10_code, 'Unknown') as diagnosis_code,
                COALESCE(diagnosis_description, 'Unspecified Condition') as diagnosis_description,
                count(*) as count,
                round(count(*) * 100.0 / (SELECT count(*) FROM clinical_data), 1) as pct_cohort,
                round(avg(length_of_stay), 1) as avg_los,
                round(avg(COALESCE(total_charges, billing_amount, 0)), 2) as avg_cost,
                cast(sum(case when cast(is_readmitted_30d as varchar) in ('true', '1') then 1 else 0 end) as bigint) as readmission_count
            FROM clinical_data 
            GROUP BY 1, 2 
            ORDER BY count DESC 
            LIMIT 5
        """
        df_diag = loader.get_query_result(q_diag)
        stats['top_diagnoses'] = df_diag.to_dict(orient='records')
        
        # 3. Departmental flow and acuity breakdown
        q_dept = """
            SELECT 
                department, 
                count(*) as volume, 
                round(avg(length_of_stay), 1) as avg_los, 
                round(sum(case when cast(is_readmitted_30d as varchar) in ('true', '1') then 1 else 0 end) * 100.0 / count(*), 1) as readmission_pct, 
                round(avg(COALESCE(total_charges, billing_amount, 0)), 2) as avg_cost, 
                round(sum(COALESCE(total_charges, billing_amount, 0)), 2) as total_charges
            FROM clinical_data 
            WHERE department IS NOT NULL AND department != '' 
            GROUP BY department 
            ORDER BY volume DESC 
            LIMIT 6
        """
        df_dept = loader.get_query_result(q_dept)
        dept_records = df_dept.to_dict(orient='records')
        stats['departments'] = dept_records
        stats['readmissions_by_dept'] = dept_records
    except Exception as e:
        logger.error(f"Failed to extract statistics: {e}")
    return stats

@app.post("/api/v1/analytics/overview")
def get_analytics_overview(req: OverviewRequest):
    if not req.object_names:
        return {}
        
    try:
        loader = DataLoader()
        loader.load_dataset_to_duckdb(req.bucket, req.object_names[0], table_name="clinical_data")
        
        # KPIs
        kpi_query = """
        SELECT 
            count(*) as total_encounters,
            count(distinct patient_id) as active_patients,
            count(distinct provider_npi) as unique_providers,
            avg(length_of_stay) as avg_los,
            avg(case when cast(is_readmitted_30d as varchar) = 'true' or cast(is_readmitted_30d as varchar) = '1' then 1.0 else 0.0 end)*100 as readmission_pct,
            avg(case when lower(admission_type) like '%emerg%' then 1.0 else 0.0 end)*100 as emergency_pct,
            sum(billing_amount) as total_cost,
            avg(billing_amount) as avg_cost
        FROM clinical_data
        """
        df_kpi = loader.get_query_result(kpi_query)
        
        # Top Diagnoses
        diag_query = """
        SELECT 
            icd10_code,
            diagnosis_description as diagnosis_name,
            count(*) as count,
            avg(length_of_stay) as avg_los,
            avg(case when cast(is_readmitted_30d as varchar) = 'true' or cast(is_readmitted_30d as varchar) = '1' then 1.0 else 0.0 end)*100 as readmission_rate,
            avg(billing_amount) as avg_cost
        FROM clinical_data
        GROUP BY icd10_code, diagnosis_description
        ORDER BY count DESC LIMIT 10
        """
        df_diag = loader.get_query_result(diag_query)
        
        # Departments
        dept_query = """
        SELECT
            department,
            count(*) as count,
            avg(length_of_stay) as avg_los,
            avg(billing_amount) as avg_cost,
            sum(billing_amount) as total_cost,
            avg(case when cast(is_readmitted_30d as varchar) = 'true' or cast(is_readmitted_30d as varchar) = '1' then 1.0 else 0.0 end)*100 as readmission_rate
        FROM clinical_data
        GROUP BY department
        ORDER BY count DESC
        """
        df_dept = loader.get_query_result(dept_query)
        
        # Gender
        gender_query = "SELECT gender, count(*) as count FROM clinical_data GROUP BY gender"
        df_gender = loader.get_query_result(gender_query)
        
        # Age Cohorts
        age_query = """
        SELECT 
            CASE 
                WHEN age < 18 THEN '< 18'
                WHEN age <= 35 THEN '18–35'
                WHEN age <= 50 THEN '36–50'
                WHEN age <= 65 THEN '51–65'
                ELSE '65+'
            END as cohort_label,
            count(*) as count,
            avg(length_of_stay) as avg_los,
            sum(billing_amount) as total_cost
        FROM clinical_data
        GROUP BY 1
        """
        df_age = loader.get_query_result(age_query)
        
        # Payer mix
        payer_query = """
        SELECT insurance_provider as payer_name, count(*) as count, sum(billing_amount) as total_billed
        FROM clinical_data GROUP BY insurance_provider
        """
        df_payer = loader.get_query_result(payer_query)
        
        # Volume Trends
        trend_query = """
        SELECT 
            substring(cast(admission_date as varchar) from 1 for 7) as period,
            count(*) as total_volume,
            sum(case when cast(is_readmitted_30d as varchar) = 'true' or cast(is_readmitted_30d as varchar) = '1' then 1 else 0 end) as discharges,
            sum(case when lower(admission_type) like '%emerg%' then 1 else 0 end) as emergency,
            sum(case when lower(admission_type) like '%inpatient%' then 1 else 0 end) as inpatient,
            sum(case when lower(admission_type) like '%inpatient%' then 1 else 0 end) as admissions,
            sum(case when lower(admission_type) not like '%emerg%' and lower(admission_type) not like '%inpatient%' then 1 else 0 end) as outpatient
        FROM clinical_data
        GROUP BY 1
        ORDER BY 1 ASC
        """
        df_trend = loader.get_query_result(trend_query)
        
        return {
            "kpis": df_kpi.fillna(0).to_dict(orient="records")[0] if not df_kpi.empty else {},
            "top_diagnoses": df_diag.fillna(0).to_dict(orient="records"),
            "departments": df_dept.fillna(0).to_dict(orient="records"),
            "gender_breakdown": df_gender.fillna(0).to_dict(orient="records"),
            "age_cohorts": df_age.fillna(0).to_dict(orient="records"),
            "payer_mix": df_payer.fillna(0).to_dict(orient="records"),
            "volume_trends": df_trend.fillna(0).to_dict(orient="records"),
        }
    except Exception as e:
        logger.error(f"Overview generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ai/narrative")
def generate_narrative(req: InsightRequest):
    if not req.object_name:
        raise HTTPException(status_code=400, detail="object_name is required")
    try:
        stats = _get_dataset_statistics(DataLoader(), req.bucket, req.object_name)
        agent = ClinicalInsightsAgent()
        return agent.generate_narrative(stats, req.model)
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
        md_content = agent.generate_report(req.title, req.dataset_name, stats, req.model)
        insights = agent.generate_narrative(stats, req.model)
        return {
            "title": req.title,
            "datasetName": req.dataset_name,
            "executiveSummary": insights.get("executiveSummary", "Automated clinical intelligence report profiling patient encounter patterns, financial acuity, and readmissions."),
            "keyFindings": insights.get("keyFindings", []),
            "strategicRisks": insights.get("strategicRisks", []),
            "recommendedActions": insights.get("recommendedActions", []),
            "markdownContent": md_content
        }
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("DATA_ENGINE_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
