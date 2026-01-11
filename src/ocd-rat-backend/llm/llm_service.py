
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

    def ask_question(self, user_question: str):
        """
        Generator that yields tokens for a general conversational query.
        
        Args:
            user_question: The user's question about the research or tool
            
        Yields:
            str: Tokens as they arrive from the LLM
        """
        system_prompt = """You are a helpful research assistant for the Szechtman Lab's OCD rat behavioral database.

You can help users:
- Understand the research project and experimental design
- Learn how to use the query tool
- Interpret experimental results
- Understand behavioral paradigms and drug treatments
- Explain database schema and available data

Be concise, friendly, and scientifically accurate. If you don't know something, say so."""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_question}
                ],
                temperature=0.7,  # Higher temperature for conversational responses
                stream=True
            )
            
            print(f"[Ask] Processing question: {user_question}")
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    yield content
                    
        except Exception as e:
            print(f"Error in ask_question: {e}")
            yield f"Error: {str(e)}"

# Singleton instance
llm_service = LLMService()
