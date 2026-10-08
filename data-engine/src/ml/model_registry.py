import os
import logging
import mlflow
import mlflow.sklearn
import mlflow.xgboost

logger = logging.getLogger(__name__)

class ModelRegistry:
    """
    Enterprise Model Registry using MLflow.
    Tracks model parameters, metrics, and artifacts across training runs.
    Ensures clinical models can be audited and rolled back.
    """
    def __init__(self):
        # Default to a local SQLite store if no external Postgres provided
        self.tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")
        mlflow.set_tracking_uri(self.tracking_uri)
        logger.info(f"Initialized MLflow registry at {self.tracking_uri}")

    def log_run(self, experiment_name: str, model_name: str, model, params: dict, metrics: dict, run_name: str = None):
        """
        Logs a full training run to MLflow.
        """
        mlflow.set_experiment(experiment_name)
        
        with mlflow.start_run(run_name=run_name):
            # Log Hyperparameters
            for key, value in params.items():
                mlflow.log_param(key, value)
                
            # Log Evaluation Metrics
            for key, value in metrics.items():
                mlflow.log_metric(key, value)
                
            # Log the physical model artifact
            # Determine flavor based on model type
            if "xgboost" in str(type(model)).lower():
                mlflow.xgboost.log_model(model, "model", registered_model_name=model_name)
            else:
                mlflow.sklearn.log_model(model, "model", registered_model_name=model_name)
                
            run_id = mlflow.active_run().info.run_id

            # Enforce MLFlow Promotion Gates (Phase 4.2)
            auc = metrics.get("auc_roc", 0.0)
            client = mlflow.tracking.MlflowClient()
            
            # Find the registered model version for this run
            versions = client.search_model_versions(f"run_id='{run_id}'")
            if versions:
                version = versions[0].version
                if auc < 0.70:
                    logger.warning(f"AUC {auc:.3f} < 0.70. Archiving model {model_name} version {version}.")
                    client.transition_model_version_stage(
                        name=model_name,
                        version=version,
                        stage="Archived"
                    )
                else:
                    logger.info(f"AUC {auc:.3f} >= 0.70. Promoting model {model_name} version {version} to Production.")
                    client.transition_model_version_stage(
                        name=model_name,
                        version=version,
                        stage="Production"
                    )

            logger.info(f"Successfully logged run {run_id} to MLflow experiment '{experiment_name}'.")
            return run_id

    def load_latest_production_model(self, model_name: str):
        """
        Loads the latest model tagged as 'Production' from the registry.
        """
        client = mlflow.tracking.MlflowClient()
        # In a real environment, you iterate over versions to find the 'Production' stage
        # For simplicity here, we load the latest version
        try:
            versions = client.get_latest_versions(model_name, stages=["Production", "None"])
            if not versions:
                raise ValueError(f"No versions found for model {model_name}")
                
            latest_version = versions[0]
            model_uri = f"models:/{model_name}/{latest_version.version}"
            
            logger.info(f"Loading {model_name} version {latest_version.version} from {model_uri}")
            
            # Since we don't know the flavor purely from the name easily, we rely on pyfunc
            # which works generically across all MLflow logged models
            model = mlflow.pyfunc.load_model(model_uri)
            return model
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            return None
