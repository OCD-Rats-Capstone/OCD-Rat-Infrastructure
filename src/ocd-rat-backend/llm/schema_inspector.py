
import os
import psycopg2
from typing import Dict, List, Any

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "Gouda"),
        port=os.getenv("DB_PORT", "5432")
    )

def inspect_schema() -> str:
    """
    Connects to the database and returns a string representation of the schema.
    Includes tables, columns with types, and foreign key relationships.
    """
    schema_output = []
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Get List of Tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cursor.fetchall()]

        for table_name in tables:
            table_section = f"Table: {table_name}"
            schema_output.append(table_section)

            # 2. Get Columns
            cursor.execute(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = %s
                ORDER BY ordinal_position;
            """, (table_name,))
            columns = cursor.fetchall()
            
            for col_name, data_type in columns:
                schema_output.append(f"  - {col_name} ({data_type})")

            # 3. Get Foreign Keys
            # This query finds constraints where the current table is the source (child)
            cursor.execute(f"""
                SELECT
                    kcu.column_name, 
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name 
                FROM 
                    information_schema.key_column_usage AS kcu
                    JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = kcu.constraint_name
                    JOIN information_schema.table_constraints AS tc
                    ON tc.constraint_name = kcu.constraint_name
                WHERE kcu.table_name = %s AND tc.constraint_type = 'FOREIGN KEY';
            """, (table_name,))
            
            fks = cursor.fetchall()
            if fks:
                schema_output.append("  Foreign Keys:")
                for col, f_table, f_col in fks:
                    schema_output.append(f"    - {col} -> {f_table}.{f_col}")
            
            schema_output.append("") # Empty line between tables

    except Exception as e:
        return f"Error inspecting schema: {str(e)}"
    finally:
        if conn:
            conn.close()

    return "\n".join(schema_output)

if __name__ == "__main__":
    # Test run
    print(inspect_schema())
