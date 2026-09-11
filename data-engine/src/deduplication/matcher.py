"""
CareData Intelligence — RapidFuzz Demographic Patient Matcher & Deduplication Engine
Performs multi-attribute phonetic blocking and fuzzy demographic similarity scoring
over healthcare clinical feeds to generate candidate duplicate pairs and golden record consolidations.
"""

import sys
import os
import json
import re
from typing import Dict, Any, List, Tuple

try:
    from rapidfuzz import fuzz, distance
except ImportError:
    fuzz = None
    distance = None

try:
    import polars as pl
except ImportError:
    pl = None

try:
    import duckdb
except ImportError:
    duckdb = None


def soundex(text: str) -> str:
    """Computes standard Soundex phonetic encoding."""
    if not text:
        return ""
    text = re.sub(r"[^A-Z]", "", text.upper())
    if not text:
        return ""
    
    mapping = {
        'B': '1', 'F': '1', 'P': '1', 'V': '1',
        'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
        'D': '3', 'T': '3',
        'L': '4',
        'M': '5', 'N': '5',
        'R': '6'
    }
    
    code = [text[0]]
    prev = mapping.get(text[0], '0')
    
    for char in text[1:]:
        curr = mapping.get(char, '0')
        if curr != '0':
            if curr != prev:
                code.append(curr)
                prev = curr
        else:
            prev = '0'
        if len(code) == 4:
            break
            
    while len(code) < 4:
        code.append('0')
        
    return "".join(code)


def sanitize_digits(text: str) -> str:
    return re.sub(r"\D", "", str(text or ""))


def compute_string_similarity(s1: str, s2: str) -> float:
    if not s1 or not s2:
        return 0.0
    s1, s2 = s1.strip().lower(), s2.strip().lower()
    if s1 == s2:
        return 1.0
    if distance and hasattr(distance, 'JaroWinkler'):
        return distance.JaroWinkler.similarity(s1, s2)
    if fuzz:
        return fuzz.ratio(s1, s2) / 100.0
    # Fallback simple ratio
    return 1.0 if s1 == s2 else 0.0


def extract_patient_demographics(row: Dict[str, Any], index: int) -> Dict[str, Any]:
    patient = {
        "index": index,
        "id": f"row-{index+1}",
        "firstName": "",
        "lastName": "",
        "dob": "",
        "phone": "",
        "address": "",
        "mrn": "",
        "gender": "",
        "email": "",
        "rawData": row
    }
    
    for k, v in row.items():
        if v is None:
            continue
        val_str = str(v).strip()
        clean_key = re.sub(r"[_\-\s]", "", k.lower())
        
        if any(w in clean_key for w in ["firstname", "first", "fname", "givenname"]):
            patient["firstName"] = val_str
        elif any(w in clean_key for w in ["lastname", "last", "lname", "surname", "familyname"]):
            patient["lastName"] = val_str
        elif any(w in clean_key for w in ["patientname", "fullname", "name"]):
            if not patient["firstName"] and not patient["lastName"]:
                parts = val_str.split()
                if len(parts) == 1:
                    patient["lastName"] = parts[0]
                elif len(parts) >= 2:
                    patient["firstName"] = parts[0]
                    patient["lastName"] = " ".join(parts[1:])
        elif any(w in clean_key for w in ["dob", "birthdate", "dateofbirth", "birth"]):
            patient["dob"] = val_str
        elif any(w in clean_key for w in ["phone", "mobile", "contact"]):
            patient["phone"] = val_str
        elif any(w in clean_key for w in ["address", "street", "addr", "city"]):
            patient["address"] = (patient["address"] + " " + val_str).strip()
        elif clean_key in ["mrn", "patientid", "medicalrecord", "ssn", "nationalid"]:
            patient["mrn"] = val_str
            patient["id"] = val_str
        elif any(w in clean_key for w in ["gender", "sex"]):
            patient["gender"] = val_str
        elif any(w in clean_key for w in ["email", "mail"]):
            patient["email"] = val_str
            
    return patient


def compare_records(p1: Dict[str, Any], p2: Dict[str, Any], weights: Dict[str, float] = None) -> Tuple[float, List[Dict[str, Any]]]:
    if weights is None:
        weights = {
            "firstName": 0.20,
            "lastName": 0.25,
            "dob": 0.25,
            "phone": 0.10,
            "address": 0.10,
            "mrn": 0.05,
            "gender": 0.05
        }
        
    field_scores = []
    total_weight = 0.0
    weighted_sum = 0.0
    
    # 1. First Name
    if p1["firstName"] and p2["firstName"]:
        sim = compute_string_similarity(p1["firstName"], p2["firstName"])
        field_scores.append({
            "fieldName": "First Name",
            "score": round(sim * 100, 2),
            "match": sim >= 0.85,
            "valA": p1["firstName"],
            "valB": p2["firstName"]
        })
        w = weights.get("firstName", 0.20)
        total_weight += w
        weighted_sum += sim * w
        
    # 2. Last Name (+ Soundex)
    if p1["lastName"] and p2["lastName"]:
        sim = compute_string_similarity(p1["lastName"], p2["lastName"])
        if soundex(p1["lastName"]) == soundex(p2["lastName"]):
            sim = min(1.0, sim + 0.05)
        field_scores.append({
            "fieldName": "Last Name",
            "score": round(sim * 100, 2),
            "match": sim >= 0.85,
            "valA": p1["lastName"],
            "valB": p2["lastName"]
        })
        w = weights.get("lastName", 0.25)
        total_weight += w
        weighted_sum += sim * w
        
    # 3. DOB
    if p1["dob"] and p2["dob"]:
        d1 = sanitize_digits(p1["dob"])
        d2 = sanitize_digits(p2["dob"])
        sim = 1.0 if d1 == d2 else compute_string_similarity(p1["dob"], p2["dob"])
        field_scores.append({
            "fieldName": "Date of Birth",
            "score": round(sim * 100, 2),
            "match": sim >= 0.90,
            "valA": p1["dob"],
            "valB": p2["dob"]
        })
        w = weights.get("dob", 0.25)
        total_weight += w
        weighted_sum += sim * w
        
    # 4. Phone
    if p1["phone"] and p2["phone"]:
        ph1 = sanitize_digits(p1["phone"])
        ph2 = sanitize_digits(p2["phone"])
        sim = 1.0 if ph1 == ph2 else (0.90 if len(ph1) >= 7 and len(ph2) >= 7 and ph1[-7:] == ph2[-7:] else compute_string_similarity(ph1, ph2))
        field_scores.append({
            "fieldName": "Phone Number",
            "score": round(sim * 100, 2),
            "match": sim >= 0.85,
            "valA": p1["phone"],
            "valB": p2["phone"]
        })
        w = weights.get("phone", 0.10)
        total_weight += w
        weighted_sum += sim * w
        
    # 5. Address (Token Sort)
    if p1["address"] and p2["address"]:
        if fuzz and hasattr(fuzz, "token_sort_ratio"):
            sim = fuzz.token_sort_ratio(p1["address"], p2["address"]) / 100.0
        else:
            sim = compute_string_similarity(p1["address"], p2["address"])
        field_scores.append({
            "fieldName": "Address",
            "score": round(sim * 100, 2),
            "match": sim >= 0.80,
            "valA": p1["address"],
            "valB": p2["address"]
        })
        w = weights.get("address", 0.10)
        total_weight += w
        weighted_sum += sim * w
        
    # 6. MRN / ID
    if p1["mrn"] and p2["mrn"]:
        sim = 1.0 if p1["mrn"].upper() == p2["mrn"].upper() else compute_string_similarity(p1["mrn"], p2["mrn"])
        field_scores.append({
            "fieldName": "Medical Record # (MRN)",
            "score": round(sim * 100, 2),
            "match": sim >= 0.90,
            "valA": p1["mrn"],
            "valB": p2["mrn"]
        })
        w = weights.get("mrn", 0.05)
        total_weight += w
        weighted_sum += sim * w
        
    final_confidence = (weighted_sum / total_weight) if total_weight > 0 else 0.0
    return round(final_confidence, 4), field_scores


def run_deduplication(rows: List[Dict[str, Any]], threshold: float = 0.65) -> List[Dict[str, Any]]:
    patients = [extract_patient_demographics(r, i) for i, r in enumerate(rows)]
    candidate_pairs = []
    
    # Pairwise comparison
    for i in range(len(patients)):
        for j in range(i + 1, len(patients)):
            p1, p2 = patients[i], patients[j]
            conf, scores = compare_records(p1, p2)
            if conf >= threshold:
                candidate_pairs.append({
                    "recordAId": p1["id"],
                    "recordBId": p2["id"],
                    "recordAData": p1["rawData"],
                    "recordBData": p2["rawData"],
                    "confidenceScore": conf,
                    "fieldScores": scores,
                    "status": "PENDING"
                })
                
    return candidate_pairs


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python matcher.py <input_json_or_csv_file> [threshold]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.65
    
    if input_file.endswith(".json"):
        with open(input_file, "r") as f:
            data = json.load(f)
            if isinstance(data, list):
                results = run_deduplication(data, threshold)
                print(json.dumps(results, indent=2))
    else:
        print("Supported format for direct CLI: JSON array of patient objects")
