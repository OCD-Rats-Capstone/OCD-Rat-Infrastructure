"""
visualization.py - Data retrieval functions for brain lesion visualizations
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
import os
from typing import Dict, List, Optional

# Database configuration - update these values
DB_CONFIG = {
    'dbname': os.environ.get('DB_NAME', 'postgres'),
    'user': os.environ.get('DB_USER', 'postgres'),
    'password': os.environ.get('DB_PASSWORD', 'Gouda'),
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': int(os.environ.get('DB_PORT', 5432))
}

def get_db_connection():
    """Create and return a database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to PostgreSQL: {e}")
        raise

def get_brain_lesion_data() -> Dict:
    """
    Get brain lesion data grouped by drug for visualization.
    Returns data structure compatible with React visualization component.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                d.drug_id,
                d.drug_name,
                d.drug_abbreviation,
                d.drug_is_active,
                hr.left_percent_damage,
                hr.right_percent_damage,
                br.region_name,
                br.region_abbreviation,
                r.legacy_rat_id,
                r.rat_id,
                es.session_id,
                es.session_timestamp,
                bm.manipulation_id,
                bm.surgery_type,
                bm.surgery_date,
                sdd.dose_given,
                sdd.dose_unit
            FROM histology_results hr
            INNER JOIN brain_manipulations bm ON hr.manipulation_id = bm.manipulation_id
            INNER JOIN experimental_sessions es ON es.effective_manipulation_id = bm.manipulation_id
            INNER JOIN session_drug_details sdd ON sdd.session_id = es.session_id
            INNER JOIN drugs d ON sdd.drug_id = d.drug_id
            INNER JOIN brain_regions br ON bm.target_region_id = br.region_id
            INNER JOIN rats r ON bm.rat_id = r.rat_id
            WHERE hr.left_percent_damage IS NOT NULL 
                AND hr.right_percent_damage IS NOT NULL
                AND d.drug_is_active = TRUE
            ORDER BY d.drug_name, r.legacy_rat_id, es.session_timestamp;
        """
        
        cur.execute(query)
        rows = cur.fetchall()
        
        cur.close()
        conn.close()
        
        if not rows:
            return {
                'success': True,
                'message': 'No data found in database',
                'drug_count': 0,
                'total_sessions': 0,
                'data': []
            }
        
        # Group by drug
        drugs = {}
        for row in rows:
            key = row['drug_abbreviation'] or row['drug_name']
            
            if key not in drugs:
                drugs[key] = {
                    'drug_name': row['drug_name'],
                    'drug_abbreviation': row['drug_abbreviation'],
                    'drug_id': row['drug_id'],
                    'sessions': []
                }
            
            drugs[key]['sessions'].append({
                'left_damage': float(row['left_percent_damage']) if row['left_percent_damage'] else 0,
                'right_damage': float(row['right_percent_damage']) if row['right_percent_damage'] else 0,
                'region': row['region_name'],
                'region_abbr': row['region_abbreviation'],
                'rat_id': row['legacy_rat_id'],
                'session_id': row['session_id'],
                'manipulation_id': row['manipulation_id'],
                'surgery_type': row['surgery_type'],
                'surgery_date': str(row['surgery_date']) if row['surgery_date'] else None,
                'dose_given': float(row['dose_given']) if row['dose_given'] else None,
                'dose_unit': row['dose_unit'],
                'session_date': str(row['session_timestamp']) if row['session_timestamp'] else None
            })
        
        formatted_data = list(drugs.values())
        
        return {
            'success': True,
            'drug_count': len(formatted_data),
            'total_sessions': len(rows),
            'data': formatted_data
        }
        
    except Exception as e:
        print(f"Error in get_brain_lesion_data: {str(e)}")
        return {
            'success': False,
            'error': 'Database query failed',
            'details': str(e),
            'data': []
        }

def test_connection() -> Dict:
    """Test database connection and return status"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT NOW()')
        result = cur.fetchone()
        cur.close()
        conn.close()
        
        return {
            'status': 'Connected',
            'timestamp': str(result[0]),
            'message': 'Database connection successful'
        }
    except Exception as e:
        return {
            'status': 'Failed',
            'error': str(e),
            'message': 'Database connection failed'
        }

def get_database_stats() -> Dict:
    """Get summary statistics about the database"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                COUNT(DISTINCT d.drug_id) as total_active_drugs,
                COUNT(DISTINCT r.rat_id) as total_rats,
                COUNT(DISTINCT es.session_id) as total_sessions,
                COUNT(DISTINCT hr.histology_id) as total_histology_records,
                COUNT(DISTINCT bm.manipulation_id) as total_manipulations,
                COUNT(DISTINCT br.region_id) as total_brain_regions
            FROM drugs d
            LEFT JOIN session_drug_details sdd ON d.drug_id = sdd.drug_id
            LEFT JOIN experimental_sessions es ON sdd.session_id = es.session_id
            LEFT JOIN brain_manipulations bm ON es.effective_manipulation_id = bm.manipulation_id
            LEFT JOIN histology_results hr ON bm.manipulation_id = hr.manipulation_id
            LEFT JOIN rats r ON bm.rat_id = r.rat_id
            LEFT JOIN brain_regions br ON bm.target_region_id = br.region_id
            WHERE d.drug_is_active = TRUE;
        """
        
        cur.execute(query)
        result = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return {
            'success': True,
            'statistics': dict(result)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': 'Failed to fetch statistics',
            'details': str(e)
        }

def validate_data() -> Dict:
    """Validate that database has required data for visualizations"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        checks = []
        
        # Check 1: Sessions with histology results
        cur.execute("""
            SELECT COUNT(*) as count
            FROM experimental_sessions es
            INNER JOIN brain_manipulations bm ON es.effective_manipulation_id = bm.manipulation_id
            INNER JOIN histology_results hr ON bm.manipulation_id = hr.manipulation_id
            WHERE hr.left_percent_damage IS NOT NULL 
                AND hr.right_percent_damage IS NOT NULL;
        """)
        result = cur.fetchone()
        checks.append({
            'check': 'Sessions with complete histology data',
            'count': int(result['count']),
            'status': 'Pass' if result['count'] > 0 else 'Warning'
        })
        
        # Check 2: Active drugs with sessions
        cur.execute("""
            SELECT COUNT(DISTINCT d.drug_id) as count
            FROM drugs d
            INNER JOIN session_drug_details sdd ON d.drug_id = sdd.drug_id
            WHERE d.drug_is_active = TRUE;
        """)
        result = cur.fetchone()
        checks.append({
            'check': 'Active drugs with experimental sessions',
            'count': int(result['count']),
            'status': 'Pass' if result['count'] > 0 else 'Warning'
        })
        
        # Check 3: Complete data chain
        cur.execute("""
            SELECT COUNT(*) as count
            FROM histology_results hr
            INNER JOIN brain_manipulations bm ON hr.manipulation_id = bm.manipulation_id
            INNER JOIN experimental_sessions es ON es.effective_manipulation_id = bm.manipulation_id
            INNER JOIN session_drug_details sdd ON sdd.session_id = es.session_id
            INNER JOIN drugs d ON sdd.drug_id = d.drug_id
            WHERE hr.left_percent_damage IS NOT NULL 
                AND d.drug_is_active = TRUE;
        """)
        result = cur.fetchone()
        checks.append({
            'check': 'Complete data chain for visualization',
            'count': int(result['count']),
            'status': 'Pass' if result['count'] > 0 else 'Warning'
        })
        
        cur.close()
        conn.close()
        
        overall_status = 'Ready' if all(c['status'] == 'Pass' for c in checks) else 'Check Warnings'
        
        return {
            'success': True,
            'validation_checks': checks,
            'overall_status': overall_status
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': 'Failed to validate data',
            'details': str(e)
        }

def get_drugs_list() -> Dict:
    """Get list of all drugs in the database"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                drug_id,
                drug_name,
                drug_abbreviation,
                drug_is_active,
                dose_unit
            FROM drugs
            ORDER BY drug_name;
        """)
        
        drugs = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return {
            'success': True,
            'count': len(drugs),
            'drugs': [dict(drug) for drug in drugs]
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': 'Failed to fetch drugs',
            'details': str(e)
        }

def get_brain_regions_list() -> Dict:
    """Get list of all brain regions in the database"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                region_id,
                region_name,
                region_abbreviation
            FROM brain_regions
            ORDER BY region_name;
        """)
        
        regions = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return {
            'success': True,
            'count': len(regions),
            'regions': [dict(region) for region in regions]
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': 'Failed to fetch brain regions',
            'details': str(e)
        }