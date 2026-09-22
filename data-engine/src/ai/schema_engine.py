import logging
import duckdb
from typing import Dict, List

logger = logging.getLogger(__name__)

class SchemaEngine:
    """
    Dynamically extracts schema definition (tables, columns, types) 
    from the active DuckDB connection. Crucial context for the Gemini NL-to-SQL Agent.
    """
    def __init__(self, db_conn: duckdb.DuckDBPyConnection):
        self.db = db_conn

    def extract_schema(self, table_name: str = "clinical_data") -> str:
        """
        Extracts the schema for a given table and formats it into a concise
        string representation suitable for LLM injection.
        """
        try:
            # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
            schema_df = self.db.execute(f"PRAGMA table_info('{table_name}')").df()
            
            if schema_df.empty:
                return f"Table '{table_name}' is empty or does not exist."
                
            schema_lines = [f"Table Name: {table_name}"]
            schema_lines.append("Columns:")
            
            for _, row in schema_df.iterrows():
                col_name = row['name']
                col_type = row['type']
                schema_lines.append(f"  - {col_name} ({col_type})")
                
            # Grab a sample of 3 rows to give the LLM concrete examples of the data
            sample_df = self.db.execute(f"SELECT * FROM {table_name} LIMIT 3").df()
            
            schema_lines.append("\nSample Data (First 3 rows):")
            # Convert sample rows to a dictionary list and format as string
            records = sample_df.to_dict(orient="records")
            for i, record in enumerate(records):
                schema_lines.append(f"  Row {i+1}: {record}")
                
            final_schema = "\n".join(schema_lines)
            logger.info(f"Successfully extracted schema for '{table_name}'.")
            return final_schema
            
        except Exception as e:
            logger.error(f"Failed to extract schema for '{table_name}': {e}")
            return f"Error extracting schema: {e}"
