import os
import re
import json
import logging
import google.generativeai as genai
from typing import Dict, Any, Tuple, Optional, List

from src.ai.duckdb_executor import DuckDBExecutor
try:
    from src.ai.sql_validator import SQLValidator
except ImportError:
    from sql_validator import SQLValidator
try:
    from src.ai.schema_engine import SchemaEngine
except ImportError:
    from schema_engine import SchemaEngine

logger = logging.getLogger(__name__)

class AgenticSQLEngine:
    """
    Self-correcting AI agent that uses the Gemini API to translate natural language to SQL,
    validates the SQL, executes it against DuckDB, and self-corrects on errors.
    """
    
    def __init__(self, db_conn, max_retries: int = 3):
        self.executor = DuckDBExecutor(db_conn)
        self.validator = SQLValidator()
        self.schema_engine = SchemaEngine(db_conn)
        self.max_retries = max_retries
        
        # Configure Gemini
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY environment variable is missing!")
        genai.configure(api_key=api_key)
        
        # Models
        model_name = os.environ.get("GEMINI_MODEL", "gemini-1.5-pro")
        self.sql_model = genai.GenerativeModel(model_name)
        self.narrative_model = genai.GenerativeModel("gemini-1.5-flash")

    def _extract_sql(self, text: str) -> str:
        """Extracts SQL code block from LLM response."""
        match = re.search(r"```sql\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        # Fallback if the LLM forgot to add markdown blocks
        return text.strip()

    def process_query(self, question: str, target_table: str = "clinical_data") -> Dict[str, Any]:
        """
        End-to-end loop: Generate SQL -> Validate -> Execute -> (Retry if fail) -> Synthesize Narrative.
        """
        schema_context = self.schema_engine.extract_schema(target_table)
        
        prompt = f"""
You are an expert clinical data analyst. Your job is to translate the following natural language question into a safe, optimized SQL query (DuckDB dialect).

DATABASE SCHEMA:
{schema_context}

RULES:
1. Return ONLY the SQL query enclosed in ```sql ... ``` code block. No explanations.
2. Only generate SELECT queries.
3. Keep column aliases clear and human-readable.

QUESTION: {question}
"""
        
        attempt = 0
        current_prompt = prompt
        sql_query = ""
        results = []
        error_msg = ""
        is_safe = False
        
        while attempt < self.max_retries:
            attempt += 1
            try:
                response = self.sql_model.generate_content(current_prompt)
                sql_query = self._extract_sql(response.text)
                
                # 1. Validate AST for Safety
                is_safe, val_msg = self.validator.validate_query(sql_query)
                if not is_safe:
                    error_msg = f"Security/Validation Error: {val_msg}"
                    logger.warning(f"Attempt {attempt}: {error_msg}")
                    current_prompt += f"\n\nERROR on previous attempt: {error_msg}. Please fix the query."
                    continue
                
                # 2. Execute on real DuckDB
                success, results, exec_err = self.executor.execute_query(sql_query)
                if success:
                    break # Loop successful!
                else:
                    error_msg = f"DuckDB Execution Error: {exec_err}"
                    logger.warning(f"Attempt {attempt}: {error_msg}")
                    current_prompt += f"\n\nERROR on previous attempt: {error_msg}. Please fix the query schema or syntax."
                    
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Gemini API Error on attempt {attempt}: {error_msg}")
                current_prompt += f"\n\nAPI Error occurred. Try a simpler query."
        
        # If we failed after max retries
        if attempt >= self.max_retries and (not is_safe or not results):
            return {
                "question": question,
                "generatedSql": sql_query,
                "error": f"Failed to generate valid SQL after {self.max_retries} attempts. Last error: {error_msg}",
                "rows": [],
                "answer": "I was unable to answer this question due to a schema or syntax error. Please try rephrasing."
            }
            
        # 3. Dynamic Narrative Synthesis
        synthesis_prompt = f"""
You are a clinical executive presenting data findings.
QUESTION: {question}
SQL QUERY EXECUTED: {sql_query}
QUERY RESULTS (JSON): {json.dumps(results[:5])} # Truncated to 5 rows for brevity

Task: Provide a short 2-3 sentence clinical explanation and summary of these findings. Do not mention SQL or databases, just interpret the data.
"""
        try:
            narrative_resp = self.narrative_model.generate_content(synthesis_prompt)
            narrative = narrative_resp.text.strip()
        except Exception as e:
            logger.error(f"Narrative synthesis failed: {e}")
            narrative = "Query executed successfully against clinical data lake."
            
        # Return structured output mimicking the original response structure
        columns = []
        if results:
            for k, v in results[0].items():
                col_type = "VARCHAR"
                if isinstance(v, int):
                    col_type = "INTEGER"
                elif isinstance(v, float):
                    col_type = "FLOAT"
                elif isinstance(v, bool):
                    col_type = "BOOLEAN"
                columns.append({"name": k, "dataType": col_type})

        return {
            "question": question,
            "answer": narrative,
            "generatedSql": sql_query,
            "columns": columns,
            "rows": results,
            "rowCount": len(results),
            "engine": "Gemini API (Agentic Loop)"
        }
