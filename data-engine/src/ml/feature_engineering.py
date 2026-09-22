import logging
from typing import List, Optional

import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.preprocessing import RobustScaler, OneHotEncoder

logger = logging.getLogger(__name__)

class ClinicalFeatureEngineer:
    """
    Professional enterprise-grade feature engineering pipeline for clinical datasets (e.g., MIMIC-IV).
    Handles missing data imputation, robust scaling for outliers, and categorical encoding.
    """
    def __init__(self, numeric_features: List[str], categorical_features: List[str]):
        self.numeric_features = numeric_features
        self.categorical_features = categorical_features
        self.pipeline = self._build_pipeline()

    def _build_pipeline(self) -> ColumnTransformer:
        """Constructs the scikit-learn ColumnTransformer."""
        
        # Numeric pipeline: KNN Imputation for clinical accuracy (better than mean for vitals/labs)
        # Followed by RobustScaler to handle severe clinical outliers (e.g., extreme blood pressure spikes)
        numeric_transformer = Pipeline(steps=[
            ('imputer', KNNImputer(n_neighbors=5, weights='distance')),
            ('scaler', RobustScaler())
        ])

        # Categorical pipeline: Constant imputation for missing values, then OneHotEncoding
        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])

        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, self.numeric_features),
                ('cat', categorical_transformer, self.categorical_features)
            ],
            remainder='drop'
        )

        return preprocessor

    def fit(self, X: pd.DataFrame) -> 'ClinicalFeatureEngineer':
        """Fits the feature engineering pipeline to the training dataset."""
        logger.info(f"Fitting ClinicalFeatureEngineer on {X.shape[0]} records...")
        self.pipeline.fit(X)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        """Transforms the dataset using the fitted pipeline."""
        if not hasattr(self.pipeline, 'transformers_'):
            raise RuntimeError("Pipeline must be fitted before calling transform().")
            
        logger.info(f"Transforming {X.shape[0]} records...")
        transformed_array = self.pipeline.transform(X)
        
        # Reconstruct DataFrame with feature names
        feature_names = self.get_feature_names_out()
        
        # In case remainder='passthrough' adds columns not in feature_names
        num_cols_returned = transformed_array.shape[1]
        if len(feature_names) != num_cols_returned:
            # Fallback for passthrough columns
            feature_names = [f"feature_{i}" for i in range(num_cols_returned)]
            
        return pd.DataFrame(transformed_array, columns=feature_names, index=X.index)

    def fit_transform(self, X: pd.DataFrame) -> pd.DataFrame:
        """Fits and transforms the dataset in one step."""
        self.fit(X)
        return self.transform(X)

    def get_feature_names_out(self) -> List[str]:
        """Retrieves the feature names after transformation."""
        if not hasattr(self.pipeline, 'transformers_'):
            return []
            
        feature_names = []
        for name, transformer, features in self.pipeline.transformers_:
            if name == 'num':
                feature_names.extend(features)
            elif name == 'cat':
                # Extract one-hot encoded column names
                cat_encoder = transformer.named_steps['onehot']
                cat_features = cat_encoder.get_feature_names_out(features)
                feature_names.extend(cat_features)
        return feature_names
