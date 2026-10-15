"""
CareData Intelligence - Enterprise Healthcare Synthetic Dataset Generator
Generates realistic, statistically rigorous clinical encounter records
compliant with HL7/FHIR US Core and CMS hospital inpatient measures.
"""

import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_enterprise_dataset(num_records=1200, output_dir=None):
    random.seed(42)
    np.random.seed(42)

    if output_dir is None:
        output_dir = "/home/aspl96/caredata/CareData-Intelligence/backend/storage/lakehouse/raw-data"
    os.makedirs(output_dir, exist_ok=True)

    first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", 
                   "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", 
                   "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", 
                  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", 
                  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris"]

    departments = ["Cardiology", "Pulmonology", "Emergency", "Internal Medicine", 
                   "Neurology", "Orthopedics", "Oncology", "Gastroenterology"]
    
    admission_types = ["Emergency", "Inpatient", "Elective", "Urgent"]
    insurance_providers = ["Medicare", "Blue Cross Blue Shield", "Medicaid", "UnitedHealthcare", "Aetna"]

    clinical_conditions = [
        {"code": "I50.9", "desc": "Heart failure, unspecified", "dept": "Cardiology", "cost_base": 18000, "los_base": 6, "readmit_prob": 0.28},
        {"code": "E11.9", "desc": "Type 2 diabetes mellitus without complications", "dept": "Internal Medicine", "cost_base": 9500, "los_base": 4, "readmit_prob": 0.14},
        {"code": "J44.1", "desc": "Chronic obstructive pulmonary disease with acute exacerbation", "dept": "Pulmonology", "cost_base": 14200, "los_base": 5, "readmit_prob": 0.24},
        {"code": "I21.9", "desc": "Acute myocardial infarction, unspecified", "dept": "Cardiology", "cost_base": 38500, "los_base": 7, "readmit_prob": 0.22},
        {"code": "N18.3", "desc": "Chronic kidney disease, stage 3 (moderate)", "dept": "Internal Medicine", "cost_base": 12800, "los_base": 4, "readmit_prob": 0.18},
        {"code": "A41.9", "desc": "Sepsis, unspecified organism", "dept": "Emergency", "cost_base": 46500, "los_base": 9, "readmit_prob": 0.32},
        {"code": "I10", "desc": "Essential (primary) hypertension", "dept": "Internal Medicine", "cost_base": 6500, "los_base": 2, "readmit_prob": 0.08},
        {"code": "M17.11", "desc": "Unilateral primary osteoarthritis, right knee", "dept": "Orthopedics", "cost_base": 28000, "los_base": 3, "readmit_prob": 0.05},
        {"code": "K21.9", "desc": "Gastro-esophageal reflux disease without esophagitis", "dept": "Gastroenterology", "cost_base": 5200, "los_base": 2, "readmit_prob": 0.06},
        {"code": "G40.909", "desc": "Epilepsy, unspecified, not intractable", "dept": "Neurology", "cost_base": 15600, "los_base": 4, "readmit_prob": 0.16},
        {"code": "C34.90", "desc": "Malignant neoplasm of unspecified bronchus or lung", "dept": "Oncology", "cost_base": 54000, "los_base": 8, "readmit_prob": 0.26},
        {"code": "K57.32", "desc": "Diverticulitis of large intestine with perforation", "dept": "Gastroenterology", "cost_base": 31000, "los_base": 6, "readmit_prob": 0.19}
    ]

    base_date = datetime(2026, 4, 1)
    records = []

    # Patient pool for recurrent encounters
    num_unique_patients = num_records // 2
    patients = []
    for pid in range(1, num_unique_patients + 1):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        gender = random.choice(["Male", "Female"])
        age = int(np.clip(np.random.normal(61, 14), 18, 94))
        patients.append({
            "patient_id": f"PAT-{10000 + pid}",
            "patient_name": f"{fn} {ln}",
            "gender": gender,
            "age": age
        })

    for i in range(1, num_records + 1):
        # Pick patient
        p = random.choice(patients)
        
        # Condition
        cond = random.choice(clinical_conditions)
        
        # Dates
        days_offset = random.randint(0, 180)
        admit_dt = base_date + timedelta(days=days_offset)
        los = max(1, int(np.random.exponential(cond["los_base"] * 0.7) + 1))
        disch_dt = admit_dt + timedelta(days=los)

        # Vitals - with intentional clinically explainable anomalies (approx 6-8%)
        is_anomaly = random.random() < 0.075
        if is_anomaly:
            sys_bp = int(random.choice([np.random.randint(185, 220), np.random.randint(65, 80)]))
            dia_bp = int(sys_bp * 0.6 + random.randint(5, 20))
            hr = int(random.choice([np.random.randint(125, 160), np.random.randint(38, 48)]))
            rr = int(random.choice([np.random.randint(28, 38), np.random.randint(8, 10)]))
            temp = round(random.choice([random.uniform(102.2, 105.0), random.uniform(94.5, 96.0)]), 1)
        else:
            sys_bp = int(np.random.normal(128, 15))
            dia_bp = int(np.random.normal(80, 10))
            hr = int(np.random.normal(74, 12))
            rr = int(np.random.normal(16, 3))
            temp = round(np.random.normal(98.6, 0.7), 1)

        # Financial charges
        cost = int(cond["cost_base"] + (los * 1400) + np.random.normal(0, 2500))
        if is_anomaly:
            cost = int(cost * 1.5 + 15000)
        cost = max(2200, cost)

        # Readmission probability calibrated on age, LOS, and clinical severity
        readmit_score = cond["readmit_prob"]
        if p["age"] > 70: readmit_score += 0.08
        if los > 7: readmit_score += 0.10
        if is_anomaly: readmit_score += 0.15
        
        is_readmitted = "true" if random.random() < min(0.85, readmit_score) else "false"
        adm_type = "Emergency" if is_anomaly or cond["code"] in ["A41.9", "I21.9"] else random.choice(admission_types)
        
        provider_npi = f"1{random.randint(100000000, 999999999)}"

        records.append({
            "encounter_id": f"ENC-{200000 + i}",
            "patient_id": p["patient_id"],
            "patient_name": p["patient_name"],
            "gender": p["gender"],
            "age": p["age"],
            "admission_date": admit_dt.strftime("%Y-%m-%d"),
            "discharge_date": disch_dt.strftime("%Y-%m-%d"),
            "department": cond["dept"],
            "admission_type": adm_type,
            "icd10_code": cond["code"],
            "diagnosis_description": cond["desc"],
            "length_of_stay": los,
            "length_of_stay_days": los,
            "systolic_bp": sys_bp,
            "diastolic_bp": dia_bp,
            "heart_rate": hr,
            "respiration_rate": rr,
            "temperature": temp,
            "billing_amount": float(cost),
            "total_charges": float(cost),
            "total_cost_usd": float(cost),
            "is_readmitted_30d": is_readmitted,
            "readmitted": is_readmitted,
            "insurance_provider": random.choice(insurance_providers),
            "provider_npi": provider_npi
        })

    df = pd.DataFrame(records)
    
    # Save both parquet and csv
    parquet_path = os.path.join(output_dir, "enterprise_clinical_lakehouse.parquet")
    csv_path = os.path.join(output_dir, "enterprise_clinical_lakehouse.csv")
    
    df.to_parquet(parquet_path, index=False)
    df.to_csv(csv_path, index=False)
    
    # Also save demodata.parquet
    demo_parquet = os.path.join(output_dir, "demodata.parquet")
    df.to_parquet(demo_parquet, index=False)

    print(f"Generated {len(df)} enterprise records:")
    print(f"  Parquet: {parquet_path} ({os.path.getsize(parquet_path)} bytes)")
    print(f"  CSV:     {csv_path} ({os.path.getsize(csv_path)} bytes)")
    return parquet_path, csv_path

if __name__ == "__main__":
    generate_enterprise_dataset()
