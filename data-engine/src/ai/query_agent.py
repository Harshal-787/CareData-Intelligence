import os
import logging
import json
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class NL2SQLAgent:
    """
    Agentic AI engine powered by Google's Gemini API.
    Translates Natural Language questions into precise, executable DuckDB SQL queries
    based on dynamic schema context.
    """
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY environment variable is not set. NL-to-SQL will fail.")
            self.client = None
        else:
            self.client = genai.Client(api_key=api_key)
        
    def generate_sql(self, question: str, schema_context: str) -> str:
        """
        Takes a user's natural language question and the exact database schema,
        and prompts Gemini to return ONLY the raw SQL query.
        """
        if not self.client:
            raise RuntimeError("NL-to-SQL AI Engine failure: GEMINI_API_KEY not configured.")
            
        logger.info(f"Generating SQL for question: '{question}'")
        
        system_instruction = """You are an expert Data Engineer and clinical data analyst.
Your goal is to write a highly optimized DuckDB SQL query that answers the user's question.

CRITICAL INSTRUCTIONS:
1. ONLY return the raw, executable SQL query.
2. DO NOT include markdown formatting (like ```sql).
3. DO NOT include explanations, preambles, or postambles.
4. If a calculation is requested, ensure NULLs are handled properly.
5. The main table you must query from is called 'clinical_data'."""

        prompt = f"""DATABASE SCHEMA AND SAMPLE DATA:
{schema_context}

USER QUESTION:
{question}"""

        try:
            response = self.client.models.generate_content(
                model='gemini-3.6-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.0
                )
            )
            sql_query = response.text.strip()
            
            # Clean up markdown if the LLM hallucinated it despite instructions
            if sql_query.startswith("```sql"):
                sql_query = sql_query[6:]
            if sql_query.startswith("```"):
                sql_query = sql_query[3:]
            if sql_query.endswith("```"):
                sql_query = sql_query[:-3]
                
            sql_query = sql_query.strip()
            
            logger.info(f"Generated SQL: {sql_query}")
            return sql_query
            
        except Exception as e:
            logger.error(f"Failed to generate SQL via Gemini: {e}")
            raise RuntimeError(f"NL-to-SQL AI Engine failure: {e}")

class ClinicalInsightsAgent:
    """
    Generates Clinical Narratives and Reports using Gemini based on aggregated DB statistics.
    """
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY environment variable is not set. Insights will fail.")
            self.client = None
        else:
            self.client = genai.Client(api_key=api_key)
            
    def generate_narrative(self, stats: dict) -> dict:
        if not self.client:
            raise RuntimeError("Insights AI Engine failure: GEMINI_API_KEY not configured.")
            
        system_instruction = """You are CareData AI, an expert clinical intelligence officer. 
Write a highly professional, concise Clinical Narrative Insight based ONLY on the provided dataset statistics.
Return a JSON object matching this structure EXACTLY:
{
    "executiveSummary": "A concise 1-2 sentence executive summary of the data.",
    "keyFindings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4"],
    "strategicRisks": ["Risk 1", "Risk 2"],
    "recommendedActions": ["Action 1", "Action 2", "Action 3"]
}"""

        prompt = f"DATASET STATISTICS:\n{json.dumps(stats, indent=2)}"
        
        response = self.client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text.strip())

    def generate_report(self, title: str, dataset_name: str, stats: dict) -> dict:
        if not self.client:
            raise RuntimeError("Insights AI Engine failure: GEMINI_API_KEY not configured.")
            
        system_instruction = """You are CareData AI, an expert clinical intelligence officer. 
Write a professional Markdown Clinical Intelligence Report based ONLY on the provided statistics.
Return a JSON object matching this structure EXACTLY:
{
    "executiveSummary": "A concise summary",
    "keyFindings": ["Finding 1", "Finding 2"],
    "strategicRisks": ["Risk 1", "Risk 2"],
    "recommendedActions": ["Action 1", "Action 2"],
    "markdownContent": "The full markdown string of the report containing sections for Executive Summary, Key Findings, Data Quality, ML Risk Stratification, and Actionable AI Recommendations. Use professional healthcare terminology."
}"""

        prompt = f"TITLE: {title}\nDATASET: {dataset_name}\nSTATISTICS:\n{json.dumps(stats, indent=2)}"
        
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model='gemini-3.6-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                        response_mime_type="application/json"
                    )
                )
                return json.loads(response.text.strip())
            except Exception as e:
                logger.warning(f"Attempt {attempt+1} failed: {e}")
                if attempt == max_retries - 1:
                    logger.error("All retries failed. Returning fallback report.")
                    return {
                        "executiveSummary": "Dataset overview successfully compiled. (Fallback mode active due to AI demand)",
                        "keyFindings": ["Dataset processed successfully", "Key statistics extracted"],
                        "strategicRisks": ["AI models currently experiencing high demand"],
                        "recommendedActions": ["Review raw statistics manually", "Retry intelligence brief generation later"],
                        "markdownContent": f"# {title}\n\n## Executive Summary\nDataset overview successfully compiled. (Fallback mode active due to AI demand)\n\n## Raw Statistics\n```json\n{json.dumps(stats, indent=2)}\n```"
                    }
                time.sleep(2 ** attempt)
