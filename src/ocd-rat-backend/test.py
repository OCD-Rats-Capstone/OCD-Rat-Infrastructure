
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv
import psycopg2

# Import the new LLM Service
from llm.llm_service import llm_service

load_dotenv()

def main(query_type, query_string):
    if query_type != "NLP":
         return
    
    df = None
    cnxn = None
    try:
        print("--- OCD Rat NLP Query Tester ---")
        print(f"Goal: {query_string}")
        
        # 1. Generate SQL using LLM Service
        print("\n[LLM] Generating SQL...")
        sql_query = llm_service.generate_sql(query_string)
        print(f"[LLM] Generated Query:\n{sql_query}\n")

        # 2. Execute Query
        print("[DB] Executing Query...")
        cnxn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                database=os.getenv("DB_NAME", "postgres"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", ""), # Often empty or specific password
                port=os.getenv("DB_PORT", "5432")
            )
        
        # Create a cursor? Pandas does this for us with read_sql_query
        
        pd.set_option('display.max_columns', None)
        pd.set_option('display.expand_frame_repr', False) # Don't wrap lines

        df = pd.read_sql_query(sql_query, cnxn)
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.fillna("None")

        print(f"\n[DB] Result ({len(df)} rows):")
        print(df.head(10)) # Show first 10 rows

    except psycopg2.Error as e:
        print(f"Error connecting/executing SQL: {e}")
    except Exception as e:
        print(f"General Error: {e}")

    finally:
        if cnxn:
            cnxn.close()
            print("\nPostgreSQL connection closed.")

    return df

if __name__ == "__main__":
    # Test query when running directly
    TEST_QUERY = "Show me all experimental sessions for rat with ID 300 using the open field apparatus."
    main("NLP", TEST_QUERY)
