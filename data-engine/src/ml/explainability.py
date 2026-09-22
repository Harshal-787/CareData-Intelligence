import logging
import shap
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

class ModelExplainer:
    """
    Enterprise-grade Explainable AI (XAI) using SHAP values.
    Crucial for clinical transparency to explain WHY a patient was flagged 
    as high risk or an anomaly.
    """
    def __init__(self, model):
        """
        Initializes the explainer.
        Args:
            model: A fitted scikit-learn or XGBoost model.
        """
        self.model = model
        # Try to determine the best explainer (TreeExplainer for XGBoost/IsolationForest)
        try:
            self.explainer = shap.TreeExplainer(self.model)
        except Exception:
            logger.warning("TreeExplainer failed, falling back to KernelExplainer. Performance may be degraded.")
            self.explainer = None

    def fit_fallback_explainer(self, background_data: pd.DataFrame):
        if self.explainer is None:
            # Use kmeans to summarize the background for performance
            summary = shap.kmeans(background_data, 25)
            self.explainer = shap.KernelExplainer(self.model.predict, summary)

    def explain_patient(self, patient_features: pd.DataFrame) -> dict:
        """
        Generates feature importance scores (SHAP values) for a specific patient.
        """
        if self.explainer is None:
            return {"error": "Explainer not initialized"}
            
        shap_values = self.explainer.shap_values(patient_features)
        
        # Format for API consumption
        # Depending on the model, shap_values might be a list (multiclass) or array (binary/regression)
        if isinstance(shap_values, list):
            shap_values = shap_values[1] # Take positive class for binary classification
            
        # Get the first (and only) patient's values
        patient_shap = shap_values[0]
        feature_names = patient_features.columns.tolist()
        
        # Sort by absolute impact
        impacts = [{"feature": f, "impact": float(v)} for f, v in zip(feature_names, patient_shap)]
        impacts.sort(key=lambda x: abs(x["impact"]), reverse=True)
        
        return {
            "top_drivers": impacts[:5], # Return top 5
            "base_value": float(self.explainer.expected_value[1] if isinstance(self.explainer.expected_value, list) else self.explainer.expected_value)
        }

    def global_feature_importance(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Computes global feature importance across the entire dataset using mean absolute SHAP values.
        """
        if self.explainer is None:
            raise RuntimeError("Explainer not initialized")
            
        shap_values = self.explainer.shap_values(X)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
            
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        
        df_importance = pd.DataFrame({
            "Feature": X.columns,
            "Importance": mean_abs_shap
        }).sort_values(by="Importance", ascending=False)
        
        return df_importance
