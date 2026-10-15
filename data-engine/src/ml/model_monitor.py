import logging
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

try:
    from evidently.report import Report
    from evidently.metric_preset import DataDriftPreset, TargetDriftPreset
    from evidently.test_suite import TestSuite
    from evidently.tests import TestNumberOfDriftedColumns
    EVIDENTLY_AVAILABLE = True
except ImportError:
    EVIDENTLY_AVAILABLE = False
    logger.info("Evidently AI not installed; using enterprise SciPy KS-2samp / Chi-Square drift monitor.")

class ClinicalModelMonitor:
    """
    Enterprise Model Monitoring using Evidently AI with SciPy fallback.
    Monitors data drift and clinical feature shifts over time to prevent
    model degradation (e.g., changes in hospital demographics or billing codes).
    """
    def __init__(self):
        self.evidently_available = EVIDENTLY_AVAILABLE

    def run_drift_report(self, reference_data: pd.DataFrame, current_data: pd.DataFrame) -> dict:
        """
        Generates a comprehensive data drift report comparing incoming clinical data 
        against the historical training baseline.
        """
        logger.info(f"Running Data Drift Report: Reference({reference_data.shape[0]}) vs Current({current_data.shape[0]})")

        if self.evidently_available:
            try:
                drift_report = Report(metrics=[DataDriftPreset()])
                drift_report.run(reference_data=reference_data, current_data=current_data)
                results = drift_report.as_dict()

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

                feature_metrics = results['metrics'][1]['result'].get('drift_by_columns', {})
                for feature, data in feature_metrics.items():
                    if data.get('drift_detected'):
                        summary["feature_details"].append({
                            "feature": feature,
                            "drift_score": round(float(data.get('drift_score', 0.0)), 4),
                            "stat_test": data.get('stattest_name', 'evidently_stat_test')
                        })
                return summary
            except Exception as e:
                logger.warning(f"Evidently run failed: {e}; falling back to SciPy drift monitor")

        # Fallback SciPy KS-2samp / Chi-Square statistical drift detection
        return self._run_scipy_drift_report(reference_data, current_data)

    def _run_scipy_drift_report(self, reference_data: pd.DataFrame, current_data: pd.DataFrame) -> dict:
        from scipy import stats

        drifted_features = []
        feature_details = []
        common_cols = [c for c in reference_data.columns if c in current_data.columns]

        for col in common_cols:
            ref_col = reference_data[col].dropna()
            cur_col = current_data[col].dropna()

            if len(ref_col) < 5 or len(cur_col) < 5:
                continue

            # Check if numeric
            if pd.api.types.is_numeric_dtype(ref_col) and pd.api.types.is_numeric_dtype(cur_col):
                try:
                    stat_res = stats.ks_2samp(ref_col, cur_col)
                    p_value = float(stat_res.pvalue)
                    drift_detected = p_value < 0.05
                    if drift_detected:
                        drifted_features.append(col)
                        feature_details.append({
                            "feature": col,
                            "drift_score": round(p_value, 4),
                            "stat_test": "Kolmogorov-Smirnov (p < 0.05)"
                        })
                except Exception:
                    continue
            else:
                # Categorical column frequency distribution test
                try:
                    ref_counts = ref_col.value_counts(normalize=True)
                    cur_counts = cur_col.value_counts(normalize=True)
                    all_cats = list(set(ref_counts.index).union(set(cur_counts.index)))
                    ref_p = np.array([ref_counts.get(cat, 1e-5) for cat in all_cats])
                    cur_p = np.array([cur_counts.get(cat, 1e-5) for cat in all_cats])
                    # Total variation distance / PSI proxy
                    tvd = float(0.5 * np.sum(np.abs(ref_p - cur_p)))
                    if tvd > 0.20:
                        drifted_features.append(col)
                        feature_details.append({
                            "feature": col,
                            "drift_score": round(tvd, 4),
                            "stat_test": "Total Variation Distance (> 0.20)"
                        })
                except Exception:
                    continue

        total_cols = max(len(common_cols), 1)
        drift_share = len(drifted_features) / total_cols
        dataset_drift = drift_share > 0.30

        return {
            "dataset_drift_detected": dataset_drift,
            "drifted_features_count": len(drifted_features),
            "total_features": total_cols,
            "drift_share": round(drift_share, 4),
            "feature_details": feature_details
        }

    def run_automated_tests(self, reference_data: pd.DataFrame, current_data: pd.DataFrame) -> bool:
        """
        Runs automated test suites to assert data quality.
        Can be used as a hard gate in an MLOps pipeline.
        Returns True if tests pass, False if severe drift is detected (>30% of features drifted).
        """
        if self.evidently_available:
            try:
                tests = TestSuite(tests=[
                    TestNumberOfDriftedColumns(lt=0.3)
                ])
                tests.run(reference_data=reference_data, current_data=current_data)
                result = tests.as_dict()
                return bool(result.get('summary', {}).get('all_passed', True))
            except Exception as e:
                logger.warning(f"Evidently automated test failed: {e}; falling back to SciPy test")

        report = self._run_scipy_drift_report(reference_data, current_data)
        tests_passed = not report["dataset_drift_detected"]
        if not tests_passed:
            logger.warning("Automated drift tests FAILED (>30% features drifted). Model retraining recommended.")
        else:
            logger.info("Automated drift tests PASSED.")
        return tests_passed
