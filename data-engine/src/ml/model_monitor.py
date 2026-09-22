import logging
import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset
from evidently.test_suite import TestSuite
from evidently.tests import TestNumberOfDriftedColumns

logger = logging.getLogger(__name__)

class ClinicalModelMonitor:
    """
    Enterprise Model Monitoring using Evidently AI.
    Monitors data drift and clinical feature shifts over time to prevent
    model degradation (e.g., changes in hospital demographics or billing codes).
    """
    def __init__(self):
        pass

    def run_drift_report(self, reference_data: pd.DataFrame, current_data: pd.DataFrame) -> dict:
        """
        Generates a comprehensive data drift report comparing incoming clinical data 
        against the historical training baseline.
        """
        logger.info(f"Running Data Drift Report: Reference({reference_data.shape[0]}) vs Current({current_data.shape[0]})")
        
        drift_report = Report(metrics=[DataDriftPreset()])
        drift_report.run(reference_data=reference_data, current_data=current_data)
        
        # Extract dictionary results
        results = drift_report.as_dict()
        
        # Summarize key metrics for API consumption
        dataset_drift = results['metrics'][0]['result']['dataset_drift']
        drifted_columns = results['metrics'][0]['result']['number_of_drifted_columns']
        total_columns = results['metrics'][0]['result']['number_of_columns']
        share_of_drifted = results['metrics'][0]['result']['share_of_drifted_columns']
        
        summary = {
            "dataset_drift_detected": dataset_drift,
            "drifted_features_count": drifted_columns,
            "total_features": total_columns,
            "drift_share": share_of_drifted,
            "feature_details": []
        }
        
        # Extract per-feature drift info
        feature_metrics = results['metrics'][1]['result']['drift_by_columns']
        for feature, data in feature_metrics.items():
            if data['drift_detected']:
                summary["feature_details"].append({
                    "feature": feature,
                    "drift_score": data['drift_score'],
                    "stat_test": data['stattest_name']
                })
                
        return summary

    def run_automated_tests(self, reference_data: pd.DataFrame, current_data: pd.DataFrame) -> bool:
        """
        Runs automated test suites to assert data quality.
        Can be used as a hard gate in an MLOps pipeline.
        Returns True if tests pass, False if severe drift is detected.
        """
        tests = TestSuite(tests=[
            TestNumberOfDriftedColumns(lt=0.3) # Fail if more than 30% of columns drifted
        ])
        
        tests.run(reference_data=reference_data, current_data=current_data)
        result = tests.as_dict()
        
        tests_passed = result['summary']['all_passed']
        
        if not tests_passed:
            logger.warning("Automated drift tests FAILED. Model retraining may be required.")
        else:
            logger.info("Automated drift tests PASSED.")
            
        return tests_passed
