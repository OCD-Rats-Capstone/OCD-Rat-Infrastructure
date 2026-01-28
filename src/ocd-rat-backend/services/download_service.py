import pandas as pd
import numpy as np
import os
from urllib.request import urlretrieve
from services.nlp_service import execute_nlp_query
import shutil

def NLP_FileDownload(db_connection,file_types: list):

    trimmed_type = []
    print(file_types)
    for t in file_types:
        if t[1] == 'true':
            trimmed_type.append(t[0])
    print(trimmed_type)
            
     
    with open("NLP_query.txt", "r", encoding="utf-8") as f:
        content = f.read()

    results = execute_nlp_query(content + " Take this exact query and change nothing except that"
    "only the session ids are selected",db_connection)

    id_list = [item['session_id'] for item in results['results']]

    print(id_list)
    FRDR_download(db_connection,db_connection.cursor(),id_list,trimmed_type)

    return results

def FRDR_download(cnxn,cursor,file_ids,file_exts):

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
    for s in filtered_data:
          print("downloading" + s)
          temp_file_name = str(s).split('/')[-1]
          urlretrieve(str(s),os.path.join(temp_dir, temp_file_name))