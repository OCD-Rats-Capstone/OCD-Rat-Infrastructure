# from oaipmh_scythe import Scythe
# import xmltodict, json
import pandas as pd
import numpy as np
import os

#### Set API KEY, Enter secret key ###
#os.environ['OPENAI_API_KEY']

import psycopg2
from openai import OpenAI


### Init NLP stuff ###
client = OpenAI()
nlp_message = "Note the following query: SELECT * FROM ((((((((experimental_sessions as E1 LEFT" \
" OUTER JOIN rats as R1 ON R1.rat_id = E1.rat_id) " \
"LEFT OUTER JOIN brain_manipulations as B1 ON B1.rat_id = E1.rat_id) LEFT OUTER JOIN testers as T1 ON T1.tester_id = E1.tester_id) " \
"LEFT OUTER JOIN apparatuses as A1 ON A1.apparatus_ID = E1.apparatus_ID)" \
"LEFT OUTER JOIN apparatus_patterns as AP1 ON AP1.pattern_ID = E1.pattern_ID) " \
"LEFT OUTER JOIN testing_rooms as TR1 ON TR1.Room_ID = E1.Room_ID) " \
"LEFT OUTER JOIN session_drug_details as SDD1 ON SDD1.Session_ID = E1.Session_ID) "\
"LEFT OUTER JOIN session_data_files as SDF1 ON SDF1.Session_ID = E1.Session_ID). The user's input will be a natural language input"\
"that is meant to filter this query in some way. Please interpret the input and return a set "\
"of filters in this exact form [<Table Attribute>,<Operator>,<Relevant values ([low$high] for a range)>]. Seperate each filter as such [<filter1>];[<filter2>]."\
"Please ensure that the table attribute follows <Table Alias>.<Table Attribute> and the only acceptable operators are [=,>=,<=,>,<,IN]. "

operators = {
    "equal": "=",
    "gte": ">=",
    "lse": "<=",
    "gt": ">",
    "ls": "<",
    "range": "IN"
}

def query_filter_rules(query_filters):
    sql_extras = []
    filters = query_filters.split(";")

    for s in filters:
        print(s[1:-1])
        filter_components = s[1:-1].split(",")
        match filter_components[1]:
            case "IN":
                [low,high] = filter_components[2][1:-1].split("$")
                sql_extras.append(filter_components[0] + " >= "+low + " AND "+ filter_components[0] + " <= "+ high)
            case "=":
                sql_extras.append(filter_components[0] + " = "+filter_components[2])
            case ">=":
                sql_extras.append(filter_components[0] + " >= "+filter_components[2])
            case "<=":
                sql_extras.append(filter_components[0] + " <= "+filter_components[2])
    return sql_extras

def nlp_module(natural_input):
        response = client.responses.create(
            model="gpt-4.1",
            input=(nlp_message+natural_input)
        )
        print(f"ChatGPT: {response.output_text}")
        return response.output_text


### Add filters to master query ###
def augment_query(sql_query,extra_sql):
    if (extra_sql != ""):
        sql_query = sql_query + " WHERE("
        start_flag = 0
        for s in extra_sql:
            print(s)
            if start_flag == 1:
                sql_query = sql_query + " AND "
            sql_query = sql_query + s
            start_flag = 1
        sql_query = sql_query + ")"
    return sql_query

    

def main(query_type,query_string):

    #Only have NLP active for now
    if (query_type != "NLP"):
         return
    
    try:
    ### Connection to your local postgres SQL thing (may need to set own password)###
        cnxn = psycopg2.connect(
                host="localhost",
                database="postgres",
                user="postgres",
                password="Gouda",
                port=5432
            )
        print("Connection to PostgreSQL successful!")

        # You can now create a cursor and execute queries
        cursor = cnxn.cursor()

        ###Input filters manually, (requires table alias in <Filter Subject>)###

        #filters = str(input("Enter filters in the form [<Filter Subject>,<Operator>,<Relevant values ([low$high] for a range)>]. Seperate each filter as such [<filter1>];[<filter2>]"))

        ###Generate filters with NLP ###
        # natural_input = str(input("Enter Natural Language Filter"))
        filters = nlp_module(query_string)

        extra_sql = query_filter_rules(filters)


        ### Master Query ###
        sql_query = "SELECT * FROM ((((((((experimental_sessions as E1 LEFT" \
    " OUTER JOIN rats as R1 ON R1.rat_id = E1.rat_id) " \
    "LEFT OUTER JOIN brain_manipulations as B1 ON B1.rat_id = E1.rat_id) LEFT OUTER JOIN testers as T1 ON T1.tester_id = E1.tester_id) " \
    "LEFT OUTER JOIN apparatuses as A1 ON A1.apparatus_ID = E1.apparatus_ID)" \
    "LEFT OUTER JOIN apparatus_patterns as AP1 ON AP1.pattern_ID = E1.pattern_ID) " \
    "LEFT OUTER JOIN testing_rooms as TR1 ON TR1.Room_ID = E1.Room_ID) " \
    "LEFT OUTER JOIN session_drug_details as SDD1 ON SDD1.Session_ID = E1.Session_ID) "\
    "LEFT OUTER JOIN session_data_files as SDF1 ON SDF1.Session_ID = E1.Session_ID)" \
        
        sql_query = augment_query(sql_query,extra_sql)


        print(sql_query)

        ### Display all columns in panda df ###
        pd.set_option('display.max_columns', None)

        ### get query ###
        df = pd.read_sql_query(sql_query,cnxn)

        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.fillna("None")

        print(df)

    except psycopg2.Error as e:
            print(f"Error connecting to PostgreSQL: {e}")

    finally:
            if cnxn:
                cnxn.close()
                print("PostgreSQL connection closed.")

    return df




