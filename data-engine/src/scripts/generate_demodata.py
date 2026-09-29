import os
import random
import uuid
import pandas as pd
from minio import Minio
import psycopg2
from datetime import datetime, timedelta

def generate_npi(valid=True):
    if not valid:
        return str(random.randint(1000000000, 9999999999))
    while True:
        npi = str(random.randint(1000000000, 9999999999))
        full = "80840" + npi
        total = 0
        alt = False
        for i in range(len(full) - 1, -1, -1):
            digit = int(full[i])
            if alt:
                digit *= 2
                if digit > 9:
                    digit -= 9
            total += digit
            alt = not alt
        if total % 10 == 0:
            return npi

def generate_data(num_records=5000):
    print("Generating synthetic clinical data...")
    records = []
    
    first_names = [
        "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
        "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua",
        "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
        "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle",
        "Kenneth", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan",
        "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon",
        "Carol", "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura", "Cynthia", "Kathleen",
        "Amy", "Shirley", "Angela", "Helen", "Anna", "Brenda", "Pamela", "Nicole", "Emma", "Samantha",
        "Benjamin", "Samuel", "Gregory", "Frank", "Alexander", "Raymond", "Patrick", "Jack", "Dennis", "Jerry",
        "Tyler", "Aaron", "Jose", "Adam", "Henry", "Nathan", "Douglas", "Zachary", "Peter", "Kyle"
    ]
    last_names = [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
        "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
        "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
        "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
        "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
        "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes",
        "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper",
        "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson",
        "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
        "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross", "Foster", "Jimenez"
    ]
    
    # Generate 10,000 unique name combinations
    import itertools
    name_combinations = list(itertools.product(first_names, last_names))
    random.shuffle(name_combinations)
    
    streets = ["Main St", "High St", "Maple Ave", "Oak St", "Washington St", "Park Ave", "Elm St", "Walnut St", "Pine St", "Cedar Ln", "Lake St", "Hill St", "River Rd", "Meadow Ln", "Forest Ave"]
    cities = ["Boston", "Cambridge", "Worcester", "Springfield", "Lowell", "Quincy", "Lynn", "Brockton", "Newton", "Somerville", "Framingham", "Haverhill", "Waltham", "Malden", "Brookline"]
    diagnoses = ["I50.9", "J18.9", "J44.9", "A41.9", "E11.9", "I10", "I63.9"]
    departments = ["Cardiology", "Neurology", "Emergency", "Internal Medicine", "Surgery", "Oncology", "Pediatrics"]
    
    base_date = datetime.now() - timedelta(days=365)
    
    # Generate ~4850 unique patients and ~150 fuzzy duplicates
    num_unique = num_records - 150
    if num_unique < 0: num_unique = num_records
    
    unique_patients = []
    for i in range(num_unique):
        patient_id = f"PAT-{10000 + i}"
        age = random.randint(18, 90)
        dob = (datetime.now() - timedelta(days=age*365 + random.randint(0, 364))).strftime("%Y-%m-%d")
        
        fname, lname = name_combinations[i]
        address = f"{random.randint(1, 9999)} {random.choice(streets)}, {random.choice(cities)}, MA {random.randint(10000, 99999)}"
        phone = f"555-{random.randint(100,999)}-{random.randint(1000,9999)}"
        ssn = f"{random.randint(100,999)}-{random.randint(10,99)}-{random.randint(1000,9999)}"
        
        unique_patients.append({
            "patient_id": patient_id,
            "first_name": fname,
            "last_name": lname,
            "address": address,
            "phone_number": phone,
            "ssn": ssn,
            "age": age,
            "date_of_birth": dob
        })

    # Generate 150 fuzzy duplicates based on the unique patients
    duplicates = []
    if num_records > num_unique:
        for i in range(150):
            orig = random.choice(unique_patients)
            dup = orig.copy()
            # Give a new patient ID so deduplication finds them
            dup["patient_id"] = f"PAT-90000-{i}"
            
            # Introduce a fuzzy error
            error_type = random.randint(1, 5)
            if error_type == 1:
                # Name typo
                dup["first_name"] = dup["first_name"] + random.choice(["e", "a", "s"])
            elif error_type == 2:
                # Phone mismatch
                dup["phone_number"] = f"555-{random.randint(100,999)}-{random.randint(1000,9999)}"
            elif error_type == 3:
                # Address variation
                dup["address"] = dup["address"].replace("St", "Street").replace("Ave", "Avenue")
            elif error_type == 4:
                # SSN transposed
                parts = dup["ssn"].split("-")
                dup["ssn"] = f"{parts[0]}-{parts[2][:2]}-{parts[1]}{parts[2][2:]}"
            elif error_type == 5:
                # DOB slight shift
                dob_dt = datetime.strptime(dup["date_of_birth"], "%Y-%m-%d")
                dup["date_of_birth"] = (dob_dt + timedelta(days=random.randint(1, 5))).strftime("%Y-%m-%d")
            
            duplicates.append(dup)

    all_patient_profiles = unique_patients + duplicates
    random.shuffle(all_patient_profiles)
    
    for i, profile in enumerate(all_patient_profiles):
        los = random.randint(1, 10)
        admission_date = base_date + timedelta(days=random.randint(0, 350))
        discharge_date = admission_date + timedelta(days=los)
        
        heart_rate = random.randint(60, 100)
        sys_bp = random.randint(110, 140)
        dia_bp = random.randint(70, 90)
        temp = random.uniform(97.5, 99.5)
        resp = random.randint(12, 20)
        
        charges = random.uniform(5000, 30000)
        prior_adm = random.randint(0, 2)
        comorb = random.randint(0, 3)
        gender = random.choice(["M", "F"])
        diag = random.choice(diagnoses)
        dept = random.choice(departments)
        npi = generate_npi(valid=True)
        is_readmitted = 1 if prior_adm > 0 and random.random() < 0.3 else 0

        # Inject anomalies (~5% of records)
        is_anomaly = random.random() < 0.05
        if is_anomaly:
            anomaly_type = random.randint(1, 5)
            if anomaly_type == 1:
                heart_rate = random.randint(140, 250)
                sys_bp = random.randint(260, 300)
            elif anomaly_type == 2:
                discharge_date = admission_date - timedelta(days=random.randint(1, 5))
            elif anomaly_type == 3:
                diag = "INVALID-CODE-123"
            elif anomaly_type == 4:
                npi = generate_npi(valid=False)
            elif anomaly_type == 5:
                profile["patient_id"] = None
                
        records.append({
            "patient_id": profile["patient_id"],
            "first_name": profile["first_name"],
            "last_name": profile["last_name"],
            "date_of_birth": profile["date_of_birth"],
            "address": profile["address"],
            "phone_number": profile["phone_number"],
            "ssn": profile["ssn"],
            "admission_date": admission_date.strftime("%Y-%m-%d"),
            "discharge_date": discharge_date.strftime("%Y-%m-%d"),
            "provider_npi": npi,
            "age": profile["age"],
            "heart_rate": heart_rate,
            "systolic_bp": sys_bp,
            "diastolic_bp": dia_bp,
            "temperature": temp,
            "respiration_rate": resp,
            "length_of_stay": los,
            "total_charges": charges,
            "prior_admissions": prior_adm,
            "comorbidity_count": comorb,
            "gender": gender,
            "diagnosis_code": diag,
            "department": dept,
            "is_readmitted_30d": is_readmitted
        })
        
    return pd.DataFrame(records)

def main():
    df = generate_data()
    file_path = "/tmp/demodata.parquet"
    df.to_parquet(file_path, engine="pyarrow")
    
    # Also copy to backend's local storage for Go backend
    import shutil
    import os
    backend_storage_dir = os.path.join(os.path.dirname(__file__), "../../../backend/storage/lakehouse/raw-data")
    os.makedirs(backend_storage_dir, exist_ok=True)
    shutil.copy(file_path, os.path.join(backend_storage_dir, "demodata.parquet"))

    # 1. Upload to MinIO
    print("Uploading to MinIO...")
    client = Minio(
        "localhost:9000",
        access_key="caredata_minio",
        secret_key="caredata_minio_secret123",
        secure=False
    )
    bucket_name = "raw-data"
    
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)
        print(f"Created bucket {bucket_name}")
        
    client.fput_object(bucket_name, "demodata.parquet", file_path)
    print("Uploaded demodata.parquet to MinIO")
    
    # 2. Seed Postgres
    print("Seeding Postgres 'datasets' table...")
    conn = psycopg2.connect(
        dbname="caredata_db",
        user="caredata_admin",
        password="caredata_secure_pass123",
        host="localhost",
        port=5432
    )
    cur = conn.cursor()
    dataset_id = "ds-demo-101"
    org_id = "org-default-001"
    now = datetime.now()
    
    # Insert dataset record
    cur.execute("""
        INSERT INTO datasets (
            id, organization_id, uploaded_by, name, file_name, file_size, mime_type, 
            file_type, storage_path, status, total_records, columns_count, 
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) ON CONFLICT (id) DO NOTHING
    """, (
        dataset_id, org_id, "usr-super-001", "Clinical Demo Lake", "demodata.parquet", os.path.getsize(file_path),
        "application/vnd.apache.parquet", "parquet", "demodata.parquet",
        "READY", len(df), len(df.columns), now, now
    ))
    conn.commit()
    cur.close()
    conn.close()
    print("Database seeded successfully.")
    
if __name__ == "__main__":
    main()
