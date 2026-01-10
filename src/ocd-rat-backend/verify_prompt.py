
import os
import sys

# Ensure we can import from llm package
from llm.prompt_builder import build_system_prompt

try:
    print("Building System Prompt...")
    # Mocking DB connection env for local run
    if not os.getenv("DB_PORT"):
        print("WARNING: DB_PORT not set, defaulting to 5433 for local test")
        os.environ["DB_PORT"] = "5433"

    prompt = build_system_prompt()
    print("\n--- System Prompt Preview (First 500 chars) ---")
    print(prompt[:500])
    
    print("\n--- Model Schema Check ---")
    if "Table: experimental_sessions" in prompt:
        print("SUCCESS: 'experimental_sessions' found in prompt.")
    else:
        print("FAILURE: 'experimental_sessions' NOT found in prompt.")
        
    print(f"Total Prompt Length: {len(prompt)}")
    
except Exception as e:
    print(f"Error: {e}")
