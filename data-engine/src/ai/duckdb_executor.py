import duckdb
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

class DuckDBExecutor:
    """
    Executes LLM-generated SQL queries against real Parquet datasets using DuckDB.
    """
    def __init__(self, db_conn: duckdb.DuckDBPyConnection = None):
        if db_conn is None:
            self.db = duckdb.connect(database=":memory:")
        else:
            self.db = db_conn

    def execute_query(self, sql_query: str) -> Tuple[bool, List[Dict[str, Any]], str]:
        """
        Executes the given SQL query.
        Returns: (success, results_or_empty_list, error_message_if_any)
        """
        if not sql_query:
            return False, [], "Empty SQL query provided."
            
        try:
            # Execute the query and fetch results as a list of dictionaries
            df = self.db.execute(sql_query).df()
            
            # Convert Pandas DataFrame to list of dicts, replacing NaNs with None for JSON serialization
            import numpy as np
            df = df.replace({np.nan: None})
            
            results = df.to_dict(orient="records")
            return True, results, ""
            
        except duckdb.Error as e:
            error_msg = str(e)
            logger.error(f"DuckDB SQL Execution Error: {error_msg}\nQuery: {sql_query}")
            return False, [], error_msg
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Unexpected error executing SQL: {error_msg}\nQuery: {sql_query}")
            return False, [], error_msg
