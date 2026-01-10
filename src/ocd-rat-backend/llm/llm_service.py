
import os
from openai import OpenAI
from .prompt_builder import build_system_prompt

class LLMService:
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "ollama"),
            base_url=os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
        )
        self.model = os.getenv("LLM_MODEL", "qwen2.5-coder:7b")

    def generate_sql(self, user_query: str) -> str:
        """
        Generates a SQL query from a natural language user query.
        """
        system_prompt = build_system_prompt()
        
        # Debug: Print prompt length or preview to ensure schema is loaded
        # print(f"DEBUG: System Prompt Length: {len(system_prompt)}") 
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query}
                ],
                temperature=0.1, # Low temperature for deterministic code generation
                stream=True
            )
            
            output = ""
            print("--- Streaming Generation ---")
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    print(content, end="", flush=True)
                    output += content
            print("\n-------------------------")
            
            # Basic cleanup: remove markdown code blocks if present
            cleaned_output = output.replace("```sql", "").replace("```", "").strip()
            
            return cleaned_output
            
        except Exception as e:
            print(f"Error generating SQL: {e}")
            return "-- Error generating query"

# Singleton instance
llm_service = LLMService()
