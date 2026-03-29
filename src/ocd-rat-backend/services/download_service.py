import pandas as pd
import numpy as np
import os
from urllib.request import urlretrieve
from services.nlp_service import execute_nlp_query
import shutil
import json
import base64
import math
from services.summary_service import total_distance_for_session, total_checks_for_session

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

    try:

        aliased_columns = {
            "session_id": "Session ID",
    "legacy_session_id": "Legacy Session ID",
    "type_name": "Session Type",
    "strain": "Rat Strain",
    "body_weight_grams": "Body Weight (Grams)",
    "rx_label": "Drug Regiment Label",
    "first_last_name": "Tester Name",
    "surgery_type": "Surgery Type",
    "apparatus_name": "Apparatus",
    "pattern_description": "Apparatus Pattern",
    "locale_in_room": "Locale In Room" ,
    "room_name": "Room Name",
    "testing_lights_on": "Lights On?",
    "session_timestamp": "Time Stamp",
    "data_trial_id": "Trial ID",
    "cumulative_drug_injection_number": "Cumulative Drug Injection Number"
        }

        cursor = db_connection.cursor()
        
        temp_dir = "../media/Session_analysis" + job_id
        url_query = "SELECT repo_file_url FROM data_file_locations " \
        "LEFT OUTER JOIN session_data_files AS S1 ON S1.data_file_id = data_file_locations.data_file_id " \
        "WHERE S1.session_id = %s;"

        info_query = "SELECT " \
        "E.session_id, E.legacy_session_id, ST.type_name, " \
        "R.strain, E.body_weight_grams, DX.rx_label, T.first_last_name, BM.surgery_type, " \
        "A.apparatus_name, AP.pattern_description, E.locale_in_room, " \
        "TR.room_name, E.testing_lights_on, " \
        "E.session_timestamp, E.data_trial_id, " \
        "E.cumulative_drug_injection_number  FROM experimental_sessions AS E " \
        "LEFT JOIN session_types AS ST ON ST.session_type_id = E.session_type_id " \
        "LEFT JOIN rats AS R ON R.rat_id = E.rat_id " \
        "LEFT JOIN drug_rx AS DX ON DX.drug_rx_id = E.drug_rx_id " \
        "LEFT JOIN testers AS T ON T.tester_id = E.tester_id " \
        "LEFT JOIN brain_manipulations AS BM ON BM.manipulation_id = E.effective_manipulation_id " \
        "LEFT JOIN apparatus_patterns AS AP ON AP.pattern_id = E.pattern_id " \
        "LEFT JOIN apparatuses AS A ON A.apparatus_id = E.apparatus_id " \
        "LEFT JOIN testing_rooms AS TR ON TR.room_id = E.room_id " \
        "WHERE session_id = %s;"

        cursor.execute(url_query,(session_id,))
        data = cursor.fetchall()

        

        print(data)
        filtered_data = []
        filtered_jpg = []
        filtered_smooth = []

        cursor.execute(info_query,(session_id,))
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        df_info = [dict(zip(columns, row)) for row in rows]

        df_info = pd.DataFrame(df_info)

        df_info.rename(columns=aliased_columns,inplace=True)

        df_info = json.loads(df_info.to_json(orient='records'))
        print(df_info)

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
        
        for item in data:
            if "https" not in str(item[0]):
                pass
            elif item[0] not in filtered_data and "smoothed.csv" in item[0]:
                filtered_smooth.append(item[0])
                break


        if os.path.isdir(temp_dir):
            shutil.rmtree(temp_dir)

        os.makedirs(temp_dir,exist_ok=True)
    
    except Exception as e:
        print(f"Error Fetching data: {e}")
        return {"status":"Error",
                "data": None,
                "session_info": None,
                "distance": None,
                "totalChecks": None,
                "checkDuration": None,
                "total_distance":None,
                "imageData": None,
                "imageType": None}

    if (len(filtered_data) > 0):
        try:
            temp_file_name = filtered_data[0].split('/')[-1]
            urlretrieve(filtered_data[0],os.path.join(temp_dir, temp_file_name))

            temp_file_name_jpg = filtered_jpg[0].split('/')[-1]
            urlretrieve(filtered_jpg[0],os.path.join(temp_dir, temp_file_name_jpg))

            temp_file_name_smoothed = filtered_smooth[0].split('/')[-1]
            urlretrieve(filtered_smooth[0],os.path.join(temp_dir, temp_file_name_smoothed))

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
            df_smooth = pd.read_csv(os.path.join(temp_dir,temp_file_name_smoothed))


            points = df_smooth.iloc[:,[1,2]].astype(float).to_numpy()

            distances = np.sqrt(np.sum(np.diff(points,axis=0)**2, axis=1))
            distances = np.round(distances,8)
            total_distance = distances.sum()/100
                

            try:
                distance = total_distance_for_session(db_connection,session_id)
            except Exception as e:
                distance = "N/A"

            try:
                total_checks = total_checks_for_session(db_connection,session_id)
            except Exception as e:
                total_checks = "N/A"


            try:
                check_duration = total_checks_for_session(db_connection,session_id,measure="Length of Check")
            except Exception as e:
                check_duration = "N/A"

            df_show = df.iloc[::4].copy()  # take every 4th row

            # Convert columns to numeric, non-numeric become NaN
            df_show['X'] = pd.to_numeric(df_show['X'], errors='coerce')
            df_show['Y'] = pd.to_numeric(df_show['Y'], errors='coerce')

            # Optional: drop rows where X or Y are NaN
            df_show = df_show.dropna(subset=['X', 'Y'])

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
                    "session_info": df_info,
                    "distance": distance,
                    "totalChecks": total_checks,
                    "checkDuration": check_duration,
                    "total_distance": total_distance,
                    "imageData": img_base64,
                    "imageType": "image/gif"}
            
        except Exception as e:
            print(f"Error Downloading File: {e}")
            return {"status":"Error",
                "data": None,
                "session_info": None,
                "distance": None,
                "totalChecks": None,
                "checkDuration": None,
                "total_distance":None,
                "imageData": None,
                "imageType": None}
    else:
        return {"status":"No smoothed track file exists",
                "data": None,
                "session_info": None,
                "distance": None,
                "totalChecks": None,
                "checkDuration": None,
                "total_distance":None,
                "imageData": None,
                "imageType": None}
    
def generate_velocity_profile(
    db_connection,
    session_id: str,
    location_x: float,
    location_y: float,
    radius: float,
    max_frames: int = 150,
    min_trip_frames: int = 5,
):
    """
    Compute velocity profiles for move segments entering/exiting a user-defined zone.

    Each out-of-zone trip produces two aligned segments:
      - Exiting: frame 0 = zone exit (first out-of-zone frame), frames increase rightward.
      - Entering: frame 0 = zone entry (first in-zone frame), frames run negative leftward.

    Trips shorter than min_trip_frames are excluded (lingering filter).
    Each segment side is capped at max_frames data points.
    """
    cursor = db_connection.cursor()

    url_query = (
        "SELECT repo_file_url FROM data_file_locations "
        "LEFT OUTER JOIN session_data_files AS S1 "
        "  ON S1.data_file_id = data_file_locations.data_file_id "
        "WHERE S1.session_id = %s AND repo_file_url LIKE %s;"
    )
    cursor.execute(url_query, (session_id, "%smoothed.csv"))
    rows = cursor.fetchall()

    url = None
    for row in rows:
        if row[0] and "https" in str(row[0]):
            url = row[0]
            break

    if not url:
        return {
            "status": "No smoothed track file exists",
            "exiting_segments": [],
            "entering_segments": [],
            "session_frames": 0,
            "total_trips": 0,
        }

    try:
        import tempfile as _tempfile

        with _tempfile.TemporaryDirectory() as tmp_dir:
            filename = url.split("/")[-1]
            local_path = os.path.join(tmp_dir, filename)
            urlretrieve(url, local_path)
            df_raw = pd.read_csv(local_path)

        # Columns: index 1 = X, index 2 = Y (consistent with existing usage)
        x_arr = pd.to_numeric(df_raw.iloc[:, 1], errors="coerce").to_numpy(dtype=float)
        y_arr = pd.to_numeric(df_raw.iloc[:, 2], errors="coerce").to_numpy(dtype=float)

        valid = ~(np.isnan(x_arr) | np.isnan(y_arr))
        x_arr = x_arr[valid]
        y_arr = y_arr[valid]
        n = len(x_arr)

        if n < 2:
            return {
                "status": "Insufficient trajectory data",
                "exiting_segments": [],
                "entering_segments": [],
                "session_frames": n,
                "total_trips": 0,
            }

        # Per-frame velocity: coordinate units per frame interval
        vel = np.sqrt(np.diff(x_arr) ** 2 + np.diff(y_arr) ** 2)
        vel_full = np.concatenate([[0.0], vel])  # vel_full[i] ≈ speed leaving frame i

        # Zone membership per frame
        dist_from_loc = np.sqrt((x_arr - location_x) ** 2 + (y_arr - location_y) ** 2)
        in_zone = dist_from_loc <= radius

        # Find zone-boundary crossings
        exits = [i + 1 for i in range(n - 1) if in_zone[i] and not in_zone[i + 1]]
        entries = [i + 1 for i in range(n - 1) if not in_zone[i] and in_zone[i + 1]]

        exiting_segments: list = []
        entering_segments: list = []
        trip_id = 0
        entry_ptr = 0

        for exit_frame in exits:
            # Advance past entries that precede this exit
            while entry_ptr < len(entries) and entries[entry_ptr] <= exit_frame:
                entry_ptr += 1

            entry_frame = entries[entry_ptr] if entry_ptr < len(entries) else n
            trip_length = entry_frame - exit_frame

            if trip_length < min_trip_frames:
                continue  # skip lingering

            # --- Exiting segment: frame 0 = zone exit ---
            seg_len = min(trip_length, max_frames)
            exit_data = [
                {"frame": j, "velocity": round(float(vel_full[exit_frame + j]), 4)}
                for j in range(seg_len)
                if exit_frame + j < n
            ]

            # --- Entering segment: frame 0 = zone entry (entry_frame) ---
            enter_seg_len = min(trip_length, max_frames)
            enter_start = entry_frame - enter_seg_len
            enter_data = [
                {
                    "frame": (enter_start + j) - entry_frame,
                    "velocity": round(float(vel_full[enter_start + j]), 4),
                }
                for j in range(enter_seg_len)
                if 0 <= enter_start + j < n
            ]
            # Append zone-entry moment as frame 0
            if entry_frame < n:
                enter_data.append(
                    {"frame": 0, "velocity": round(float(vel_full[entry_frame]), 4)}
                )

            if exit_data:
                exiting_segments.append(
                    {
                        "trip_id": trip_id,
                        "temporal_order": trip_id,
                        "total_segments": 0,
                        "segment_data": exit_data,
                    }
                )
            if enter_data:
                entering_segments.append(
                    {
                        "trip_id": trip_id,
                        "temporal_order": trip_id,
                        "total_segments": 0,
                        "segment_data": enter_data,
                    }
                )

            trip_id += 1

        total_trips = trip_id
        for seg in exiting_segments:
            seg["total_segments"] = total_trips
        for seg in entering_segments:
            seg["total_segments"] = total_trips

        return {
            "status": "success",
            "exiting_segments": exiting_segments,
            "entering_segments": entering_segments,
            "session_frames": n,
            "total_trips": total_trips,
        }

    except Exception as exc:
        # Log detailed error information on the server side only.
        print(f"[generate_velocity_profile] Error: {exc}")
        # Return a generic error message to avoid exposing internal details.
        return {
            "status": "An internal error occurred while generating the velocity profile.",
            "exiting_segments": [],
            "entering_segments": [],
            "session_frames": 0,
            "total_trips": 0,
        }


def generate_distance(db_connection,session_id,job_id,legacySession,dataTrial):

    try:

        cnxn = db_connection
        cursor = db_connection.cursor()
        
        temp_dir = "../media/Session_analysis" + job_id
        url_query = "SELECT repo_file_url, S1.data_file_id FROM data_file_locations " \
        "LEFT OUTER JOIN session_data_files AS S1 ON S1.data_file_id = data_file_locations.data_file_id " \
        "WHERE S1.session_id = " + session_id + " AND repo_file_url LIKE 'https%moothed.csv';"
        cursor.execute(url_query)
        data = cursor.fetchall()
        print(data)
        filtered_smooth = [data[0][0]]
        file_id = data[0][1]


    
        temp_file_name_smoothed = filtered_smooth[0].split('/')[-1]
        urlretrieve(filtered_smooth[0],os.path.join(temp_dir, temp_file_name_smoothed))


                        

        df_smooth = pd.read_csv(os.path.join(temp_dir,temp_file_name_smoothed))


        points = df_smooth.iloc[:,[1,2]].astype(float).to_numpy()

        distances = np.sqrt(np.sum(np.diff(points,axis=0)**2, axis=1))
        distances = np.round(distances,8)
        total_distance = np.round(distances.sum()/100,8)

        sm_id_query = "SELECT COALESCE(MAX(sm_id), 0) + 1 FROM session_sm_locomotion;"
        cursor.execute(sm_id_query)
        sm_id = cursor.fetchone()[0]

        insert_query = f"INSERT INTO session_sm_locomotion (sm_id, session_id, legacy_session_id, data_trial_id, data_file_id, checking_component," \
        f"component_measure, measure_variable, variable_name, measure_value, source_file) "\
        f"VALUES ({sm_id}, {session_id}, {legacySession}, '{dataTrial}', {file_id}, "\
        f"'Routes of travel', 'Amount of locomotion', 'Total distance (m)', 'DST_m', 232.1329512, '{temp_file_name_smoothed}')"

        cursor.execute(insert_query)

        db_connection.commit()

        print("Success: Data uploaded")

        return total_distance

    except Exception as e:
        print(f"Error: {e}")
        return "N/A"



            