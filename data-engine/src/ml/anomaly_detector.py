import logging
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

class ClinicalAnomalyDetector:
    """
    Enterprise-grade anomaly detection using Isolation Forest.
    Designed to identify statistical outliers in clinical data (e.g., impossible vitals, extreme lab values).
    """
    def __init__(self, contamination: float = 'auto', random_state: int = 42):
        """
        Args:
            contamination: The proportion of outliers in the data set. 'auto' determines it based on paper heuristics.
                           For healthcare billing/vitals, 0.05 (5%) is often a safe upper bound if not auto.
        """
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            n_estimators=200,          # More estimators for stability in high-dim clinical data
            max_samples='auto',
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1                  # Utilize all cores
        )

    def fit(self, X_scaled: pd.DataFrame) -> 'ClinicalAnomalyDetector':
        """
        Trains the Isolation Forest model on scaled feature data.
        """
        logger.info(f"Training IsolationForest on {X_scaled.shape[0]} scaled clinical records...")
        self.model.fit(X_scaled)
        return self

    def predict(self, X_scaled: pd.DataFrame) -> pd.Series:
        """
        Predicts anomalies.
        Returns a boolean series where True indicates an anomaly.
        """
        logger.info(f"Predicting anomalies for {X_scaled.shape[0]} records...")
        
        # IsolationForest returns -1 for outliers and 1 for inliers.
        # We map this to True (anomaly) and False (normal).
        preds = self.model.predict(X_scaled)
        anomalies = (preds == -1)
        
        anomaly_count = anomalies.sum()
        logger.info(f"Detected {anomaly_count} anomalies ({(anomaly_count/len(preds))*100:.2f}% of batch).")
        
        return pd.Series(anomalies, index=X_scaled.index, name="is_anomaly")

    def score_samples(self, X_scaled: pd.DataFrame) -> pd.Series:
        """
        Returns the anomaly score for each sample.
        The lower (more negative), the more abnormal.
        """
        scores = self.model.score_samples(X_scaled)
        return pd.Series(scores, index=X_scaled.index, name="anomaly_score")
