import math
from typing import Dict, Any, Tuple, List
import pandas as pd

class FeatureAutoMapper:
    """
    Dynamically maps arbitrary clinical schemas to semantic concepts.
    Preserves all numeric columns for automated feature engineering.
    """

    # Synonym dictionaries for known clinical concepts
    SYNONYMS = {
        "age": ["age", "patient_age", "dob", "birthdate", "age_yrs"],
        "systolic": ["systolic_bp", "systolicbp", "systolic", "sys_bp", "bp_sys"],
        "diastolic": ["diastolic_bp", "diastolicbp", "diastolic", "dia_bp", "bp_dia"],
        "heart_rate": ["heart_rate", "heartrate", "pulse", "hr"],
        "respiration": ["respiration_rate", "respirationrate", "respiration", "resp_rate"],
        "temperature": ["temperature", "temp"],
        "length_of_stay": ["length_of_stay", "los", "los_days", "lengthofstay", "stay_duration"],
        "total_charges": ["total_charges", "charges", "cost", "totalcharges", "billed_amount"],
        "prior_encounters": ["prior_encounters", "prior_admissions", "past_visits", "encounters_count"],
        "comorbidities": ["comorbidities", "comorbidity_count", "diagnoses_count"],
        "target": ["readmitted", "is_readmitted_30d", "readmission", "30d_readmit", "is_readmitted"],
        "gender": ["gender", "sex", "patient_sex", "patient_gender"],
        "patient_id": ["patient_id", "mrn", "id", "uuid", "patientid"],
        "patient_name": ["name", "patient_name", "full_name", "patientname"],
        "primary_diagnosis": ["primary_diagnosis", "diagnosis", "icd10_code", "diagnosis_code"]
    }

    # Default values for core heuristic features
    DEFAULTS = {
        "age": 52.0,
        "systolic": 120.0,
        "diastolic": 80.0,
        "heart_rate": 75.0,
        "respiration": 16.0,
        "temperature": 98.6,
        "length_of_stay": 3.5,
        "total_charges": 8500.0,
        "prior_encounters": 0.0,
        "comorbidities": 0.0
    }

    @staticmethod
    def extract_numeric(val: Any, default: float = 0.0) -> float:
        if val is None:
            return default
        if isinstance(val, (int, float)):
            if math.isnan(val):
                return default
            return float(val)
        
        clean = str(val).replace("$", "").replace(",", "").strip()
        try:
            return float(clean)
        except ValueError:
            return default

    @classmethod
    def find_key(cls, record: Dict[str, Any], semantic_type: str) -> Optional[str]:
        """Finds the actual key in the record matching the semantic type synonyms."""
        synonyms = cls.SYNONYMS.get(semantic_type, [])
        # Lowercase check
        keys_lower = {k.lower(): k for k in record.keys()}
        for syn in synonyms:
            if syn in keys_lower:
                return keys_lower[syn]
        return None

    @classmethod
    def map_record(cls, record: Dict[str, Any]) -> Tuple[Dict[str, float], Dict[str, Any], Optional[float]]:
        """
        Returns:
        1. core_features: Dictionary of guaranteed heuristic numeric features
        2. all_numeric_features: Dictionary of ALL numeric features for XGBoost (core + custom)
        3. target_val: The readmission target value (if present, else None)
        """
        core_features = {}
        all_numeric_features = {}
        
        # 1. Map core heuristic concepts
        for concept, default_val in cls.DEFAULTS.items():
            key = cls.find_key(record, concept)
            if key is not None:
                val = cls.extract_numeric(record[key], default_val)
                # Apply boundary cleanups for standard vitals
                if concept == "systolic" and (val < 40): val = 120.0
                if concept == "diastolic" and (val < 30): val = 80.0
                if concept == "heart_rate" and (val < 30): val = 75.0
                if concept == "respiration" and (val < 6): val = 16.0
                if concept == "temperature":
                    if val < 85: val = (val * 9/5) + 32.0 # Celsius to F
                    if val < 90 or val > 115: val = 98.6
                if concept == "length_of_stay" and (val <= 0): val = 1.0
                if concept == "total_charges" and (val <= 0): val = 8500.0
                core_features[concept] = val
                all_numeric_features[concept] = val
            else:
                # Need special handling for BP split if missing
                if concept in ["systolic", "diastolic"]:
                    bp_key = cls.find_key(record, "blood_pressure")
                    if bp_key and isinstance(record[bp_key], str) and "/" in record[bp_key]:
                        parts = record[bp_key].split("/")
                        if len(parts) == 2:
                            if concept == "systolic": val = cls.extract_numeric(parts[0], 120.0)
                            if concept == "diastolic": val = cls.extract_numeric(parts[1], 80.0)
                            core_features[concept] = val
                            all_numeric_features[concept] = val
                            continue
                
                core_features[concept] = default_val
                all_numeric_features[concept] = default_val

        # 2. Grab Target Variable
        target_val = None
        target_key = cls.find_key(record, "target")
        if target_key is not None:
            val = cls.extract_numeric(record[target_key], -1.0)
            if val in [0.0, 1.0]:
                target_val = val

        # 3. Harvest any remaining numeric variables for XGBoost
        # This auto-engineers features like "lab_glucose", "num_medications"
        for k, v in record.items():
            if k not in all_numeric_features and target_key != k:
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    if not math.isnan(v):
                        all_numeric_features[k] = float(v)
                elif isinstance(v, str):
                    clean = v.replace("$", "").replace(",", "").strip()
                    try:
                        parsed = float(clean)
                        if not math.isnan(parsed):
                            all_numeric_features[k] = parsed
                    except ValueError:
                        pass
                        
        return core_features, all_numeric_features, target_val

    @classmethod
    def extract_demographics(cls, record: Dict[str, Any], idx: int) -> Tuple[str, str, str, str]:
        """Extracts identifying demographic strings."""
        # Patient ID
        pid_key = cls.find_key(record, "patient_id")
        pid = str(record[pid_key]) if pid_key and record[pid_key] else f"MRN-UNKNOWN-{idx}"

        # Patient Name
        name_key = cls.find_key(record, "patient_name")
        name = str(record[name_key]) if name_key and record[name_key] else f"Patient {pid.split('-')[-1]}"

        # Gender
        gender_key = cls.find_key(record, "gender")
        gender = str(record[gender_key]).upper() if gender_key and record[gender_key] else "UNSPECIFIED"

        # Primary Diagnosis
        diag_key = cls.find_key(record, "primary_diagnosis")
        diag = str(record[diag_key]) if diag_key and record[diag_key] else "Clinical Encounter"

        return pid, name, gender, diag
