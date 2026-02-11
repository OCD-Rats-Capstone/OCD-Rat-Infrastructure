import pandas as pd
import numpy as np
import os
from urllib.request import urlretrieve
from services.nlp_service import execute_nlp_query
import shutil
import json

def NLP_FileDownload(db_connection,file_types: list,job_id: str):

    trimmed_type = []
    print(file_types)
    for t in file_types:
        if t[1] == 'true':
            trimmed_type.append(t[0])
    print(trimmed_type)
            
     
    with open("NLP_query.json", "r", encoding="utf-8") as f:
        content = json.load(f)

    results = execute_nlp_query(content + " Take this exact query and change nothing except that"
    "only the session ids are selected",db_connection)

    id_list = [item['session_id'] for item in results['results']]

    print(id_list)
    FRDR_download(db_connection,db_connection.cursor(),id_list,trimmed_type,job_id)

    return results

def FILTERS_FileDownload(db_connection,file_types: list,job_id: str):

    trimmed_type = []
    print(file_types)
    for t in file_types:
        if t[1] == 'true':
            trimmed_type.append(t[0])
    print(trimmed_type)
            
     
    with open("Filter_sessions.json", "r", encoding="utf-8") as f:
        id_list = json.load(f)

    print(id_list)
    FRDR_download(db_connection,db_connection.cursor(),id_list,trimmed_type,job_id)

    return id_list

def FRDR_download(cnxn,cursor,file_ids,file_exts,job_id):

    temp_dir = "../FRDR_Files"
    url_query = "SELECT repo_file_url FROM data_file_locations " \
    "LEFT OUTER JOIN session_data_files AS S1 ON S1.data_file_id = data_file_locations.data_file_id " \
    "WHERE data_file_locations.data_file_id IN %s AND S1.file_extension IN %s;"
    files_tuple = tuple(file_ids)
    types_tuple = tuple(file_exts)
    cursor.execute(url_query,(files_tuple,types_tuple))
    data = cursor.fetchall()
    print(data)
    filtered_data = []
    for item in data:
        if "https" not in str(item[0]):
            pass
        else:
            filtered_data.append(item[0])
    print(filtered_data)

    if os.path.isdir(temp_dir):
         shutil.rmtree(temp_dir)

    os.makedirs(temp_dir,exist_ok=True)

    count = 0
    for s in filtered_data:
          temp_file_name = str(s).split('/')[-1]
          urlretrieve(str(s),os.path.join(temp_dir, temp_file_name))
          count+=1

          status_json = {job_id: {"status":"in progress",
                   "num_files": len(filtered_data),
                   "completed": count}}
          
          with open("status_buffer.json", "w") as f:
            json.dump(status_json,f)
          
    status_json = {job_id: {"status":"ready",
                   "num_files": len(filtered_data),
                   "completed": count}}
    
    with open("status_buffer.json", "w") as f:
        json.dump(status_json,f)