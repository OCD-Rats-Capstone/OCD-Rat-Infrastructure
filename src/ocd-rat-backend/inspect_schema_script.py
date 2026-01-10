
import psycopg2
import os

def get_schema():
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="postgres",
            user="postgres",
            password="Gouda",
            port="5433"
        )
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cursor.fetchall()
        
        schema_text = ""
        
        for table in tables:
            table_name = table[0]
            schema_text += f"Table: {table_name}\n"
            
            # Get columns
            cursor.execute(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}'
            """)
            columns = cursor.fetchall()
            for col in columns:
                schema_text += f"  - {col[0]} ({col[1]})\n"
            
            # Get Foreign Keys
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
                WHERE kcu.table_name = '{table_name}' AND tc.constraint_type = 'FOREIGN KEY'
            """)
            fks = cursor.fetchall()
            if fks:
                schema_text += "  Foreign Keys:\n"
                for fk in fks:
                    schema_text += f"    - {fk[0]} -> {fk[1]}.{fk[2]}\n"
            
            schema_text += "\n"
            
        print(schema_text)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    get_schema()
