import pandas as pd
import numpy as np
import os
from urllib.request import urlretrieve
from services.nlp_service import execute_nlp_query
import shutil
import json
import base64
import math

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

    temp_dir = "../FRDR_Files" + job_id
    url_query = "SELECT repo_file_url FROM data_file_locations " \
    "LEFT OUTER JOIN session_data_files AS S1 ON S1.data_file_id = data_file_locations.data_file_id " \
    "WHERE S1.session_id IN %s AND S1.file_extension IN %s;"
    files_tuple = tuple(file_ids)
    types_tuple = tuple(file_exts)
    cursor.execute(url_query,(files_tuple,types_tuple))
    data = cursor.fetchall()
    print(data)
    filtered_data = []
    for item in data:
        if "https" not in str(item[0]):
            pass
        elif item[0] not in filtered_data:
            filtered_data.append(item[0])
    print(filtered_data)

    if os.path.isdir(temp_dir):
         shutil.rmtree(temp_dir)

    os.makedirs(temp_dir,exist_ok=True)

    count = 0
    for s in filtered_data:
        try:
            temp_file_name = str(s).split('/')[-1]
            urlretrieve(str(s),os.path.join(temp_dir, temp_file_name))
        except Exception as e:
            print(f"Error Downloading File: {e}")
        finally:
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

def single_smoothed_download(db_connection,session_id,job_id):

    cnxn = db_connection
    cursor = db_connection.cursor()
    
    temp_dir = "../media/Session_analysis" + job_id
    url_query = "SELECT repo_file_url FROM data_file_locations " \
    "LEFT OUTER JOIN session_data_files AS S1 ON S1.data_file_id = data_file_locations.data_file_id " \
    "WHERE S1.session_id = " + session_id + ";"
    cursor.execute(url_query)
    data = cursor.fetchall()
    print(data)
    filtered_data = []
    filtered_jpg = []

    for item in data:
        if "https" not in str(item[0]):
            pass
        elif item[0] not in filtered_data and "TrackFile.csv" in item[0]:
            filtered_data.append(item[0])
            break
    
    for item in data:
        if "https" not in str(item[0]):
            pass
        elif item[0] not in filtered_data and "gif" in item[0]:
            filtered_jpg.append(item[0])
            break


    print(filtered_data)

    if os.path.isdir(temp_dir):
         shutil.rmtree(temp_dir)

    os.makedirs(temp_dir,exist_ok=True)

    if (len(filtered_data) > 0):
        try:
            temp_file_name = filtered_data[0].split('/')[-1]
            urlretrieve(filtered_data[0],os.path.join(temp_dir, temp_file_name))

            temp_file_name_jpg = filtered_jpg[0].split('/')[-1]
            urlretrieve(filtered_jpg[0],os.path.join(temp_dir, temp_file_name_jpg))

            image_url = os.path.join(temp_dir, temp_file_name_jpg)[2:]

            with open(os.path.join(temp_dir, temp_file_name_jpg), "rb") as img_file:
                img_base64 = base64.b64encode(img_file.read()).decode("utf-8")



            skip = 0
            with open(os.path.join(temp_dir, temp_file_name), 'r') as f:
                while True:
                    content = f.readline()
                    if ('Time' in content and 'X' in content and 'Y' in content):
                        break
                    else:
                        skip+=1
                    
            
            df = pd.read_csv(os.path.join(temp_dir,temp_file_name),skiprows=skip)
            print(df)

            #Calculate Distance travelled
            X_values = df["X"].to_list()
            Y_values = df["Y"].to_list()
            print(df["X"])
            print(df["Y"])
            euclidian_dist = 0

            for i in range (len(X_values)-1):
                try:

                    #If next is invalid, don't update current value
                    if (X_travel == -1 and Y_travel == -1):
                        pass
                    else:
                        X_travel = abs(round(float(X_values[i]),2))
                        Y_travel = abs(round(float(Y_values[i]),2))


                    #Try to get next value
                    X_travel = abs(round(float(X_values[i+1]),2))
                    Y_travel = abs(round(float(Y_values[i+1]),2))

                    dist = math.sqrt(X_travel**2 + Y_travel**2)
                    euclidian_dist+=dist
                except Exception as e:
                    X_travel = -1
                    Y_travel = -1
                



            df_show = df.head(5000)
            df_show = df_show.to_dict(orient="records")

            index = 0
            for i, r in df.iterrows():
                if (r.iloc[0] == 1):
                    break
                else:
                    index+=1
            
            df = df.iloc[index:]

            return {"status": "success",
                    "data": df_show,
                    "distance": round(euclidian_dist,2),
                    "imageData": img_base64,
                    "imageType": "image/gif"}
            
        except Exception as e:
            print(f"Error Downloading File: {e}")
            return {"status":"Error",
                "data": None,
                "distance": None,
                "imageData": None,
                "imageType": None}
    else:
        return {"status":"No smoothed track file exists",
                "data": None,
                "distance": None,
                "imageData": None,
                "imageType": None}