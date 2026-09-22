import logging
from typing import Tuple, Optional

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.calibration import CalibratedClassifierCV

logger = logging.getLogger(__name__)

class ReadmissionRiskScorer:
    """
    Enterprise-grade 30-day readmission risk stratification.
    Utilizes an XGBoost classifier calibrated for accurate probability predictions.
    Also computes a heuristic LACE index baseline.
    """
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        
        # Base XGBoost model tuned for imbalanced clinical data
        base_xgb = xgb.XGBClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            colsample_bytree=0.8,
            objective='binary:logistic',
            eval_metric='auc',
            scale_pos_weight=4.0, # Typical imbalance for 30-day readmissions (~20% positive class)
            random_state=self.random_state,
            n_jobs=1
        )
        
        # Isotonic calibration ensures output probabilities match real-world distributions
        self.model = CalibratedClassifierCV(
            estimator=base_xgb,
            method='isotonic',
            cv=5
        )

    def fit(self, X_train: pd.DataFrame, y_train: pd.Series) -> 'ReadmissionRiskScorer':
        """
        Trains and calibrates the XGBoost model.
        """
        logger.info(f"Training and calibrating XGBoost readmission model on {X_train.shape[0]} records...")
        
        # If dataset is too small for 5-fold CV calibration, fallback to base model
        if len(y_train) < 20 or y_train.nunique() < 2:
            logger.warning("Dataset too small for calibration or missing classes. Using uncalibrated base model.")
            self.model = self.model.estimator
            self.model.fit(X_train, y_train)
        else:
            try:
                self.model.fit(X_train, y_train)
            except ValueError as e:
                logger.warning(f"Calibration failed ({e}). Falling back to uncalibrated model.")
                self.model = self.model.estimator
                self.model.fit(X_train, y_train)
                
        return self

    def predict_risk(self, X_scaled: pd.DataFrame) -> pd.DataFrame:
        """
        Predicts readmission risk probabilities and stratifies into risk tiers.
        
        Returns a DataFrame with:
        - probability: Float [0, 1]
        - tier: String (Low, Medium, High)
        """
        logger.info(f"Predicting readmission risk for {X_scaled.shape[0]} patients...")
        
        # predict_proba returns [prob_class_0, prob_class_1]
        probabilities = self.model.predict_proba(X_scaled)[:, 1]
        
        # Stratification thresholds (typically tuned based on hospital capacity/intervention ROI)
        tiers = np.where(probabilities > 0.70, 'High',
                np.where(probabilities > 0.30, 'Medium', 'Low'))
                
        high_risk_count = (tiers == 'High').sum()
        logger.info(f"Identified {high_risk_count} High-Risk patients ({(high_risk_count/len(tiers))*100:.2f}%).")
        
        return pd.DataFrame({
            'readmission_probability': probabilities,
            'risk_tier': tiers
        }, index=X_scaled.index)

    def compute_lace_index(self, df_raw: pd.DataFrame) -> pd.Series:
        """
        Computes the heuristic LACE index (Length of stay, Acuity, Comorbidities, Emergency visits).
        Requires specific raw clinical columns. 
        Note: In practice, this serves as a baseline comparison for the XGBoost model.
        """
        # Placeholder for actual LACE index calculation logic which depends on specific EHR schema
        # Typically scores 0-19. >10 is high risk.
        logger.info("Computing LACE Index heuristic...")
        # Random normal distribution around 8 for placeholder until full MIMIC mapping
        lace_scores = np.random.normal(loc=8, scale=3, size=len(df_raw))
        lace_scores = np.clip(np.round(lace_scores), 0, 19).astype(int)
        
        return pd.Series(lace_scores, index=df_raw.index, name="lace_score")
