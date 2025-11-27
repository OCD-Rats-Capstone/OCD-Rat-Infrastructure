# RatBat 2

Developer Names: Aidan Goodyer, Jeremy Orr, Leo Vugert, Nathan Perry, Timothy Pokanai

Date of project start: September 13th, 2025

## Introduction

Rat Bat 2 is a research data platform designed to support research based on behavioral trials of rats, with a focus on obsessive-compulsive disorder (OCD)–related behavioural studies. The primary goal of the system is to enable researchers to explore, query, analyze, and visualize behavioural trial datasets in a flexible, secure, and reproducible environment.

This project was initiated as part of our capstone commitment to build a web application with an infrastructure that allows easy ingestion of our supervisor's, Dr. Henry Szechtman and Dr. Anna Dvorkin-Gheva, datasets, normalization of metadata and schema, and subsequent analysis and visualization. We want OCD-Rat-System to serve as a unified platform where:

## Project Structure

The folders and files for this project are as follows:

docs - Documentation for the project
refs - Reference material used for the project, including papers
src - Source code
test - Test cases
etc.

## Project Setup

Follow these steps exactly in order to start the POC for Mac:

### Local database setup

brew install postgres

brew services restart postgresql

psql postgres

psql -U postgres

createdb postgres



Downlaod these files
https://mcmasteru365-my.sharepoint.com/personal/szechtma_mcmaster_ca/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fszechtma%5Fmcmaster%5Fca%2FDocuments%2FCapstoneProject2024%2D25%2FPostgreSQL%2FExported%5Fszechtman%5Flab%5Fdatabase&viewid=4971addc%2Dbc56%2D49ba%2D8ac1%2Da8ad91132272&csf=1&web=1&e=r4ngWU&CID=82c9bc55%2D11d8%2D464d%2Daf27%2D22085573ed7f&FolderCTID=0x0120000D047C8EA8138E4F8A5F6E0E8106AF73&view=0


psql -U postgres -d postgres -f OneDrive_1_2025-11-18/szechtman_lab_schema.sql

DEBUG
If this doesnt work go into 
\l
\du
- with du see what users you have, use the one us see
DEBUG

Should work

### Back end setup

Then make your own env 

python3 -m venv venv

source venv/bin/activate

pip install -r requirements.txt

Go here

https://github.com/OCD-Rats-Capstone/OCD-Rat-Infrastructure/pull/332


Run this: fastapi dev app.py 

Go to local server that is shows you



### Front end setup

brew install node

npm run dev 

npm install -g vite   

npm run dev    
