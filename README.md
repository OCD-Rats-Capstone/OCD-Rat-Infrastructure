# RatBat 2

> A research data platform for OCD behavioral studies in rats

**Team Members:** Aidan Goodyer, Jeremy Orr, Leo Vugert, Nathan Perry, Timothy Pokanai  
**Project Start:** September 13th, 2025

---

## Introduction

**RatBat 2** is a comprehensive research data platform designed to support behavioral studies of rats with a focus on obsessive-compulsive disorder (OCD) research. The system enables researchers to explore, query, analyze, and visualize behavioral trial datasets in a flexible, secure, and reproducible environment.

### Key Goals

Built as a capstone project in collaboration with **Dr. Henry Szechtman** and **Dr. Anna Dvorkin-Gheva**, this platform serves as a unified solution for:

- Easy data ingestion from multiple sources
- Metadata normalization and schema standardization
- Advanced querying and filtering capabilities
- Data visualization and analysis tools
- Secure access and reproducible workflows

---

## Project Structure

```
OCD-Rat-Infrastructure/
├── docs/              # Documentation and guides
├── refs/              # Reference materials and papers
├── src/
│   ├── ocd-rat-backend/    # FastAPI backend
│   └── ocd-rat-frontend/   # React frontend
├── test/              # Test cases
└── README.md          # This file
```

---

## Getting Started

Follow these steps to set up the development environment on macOS.

### Prerequisites

- Node.js (for frontend)
- Python 3.x (for backend)
- PostgreSQL (for database)
- Homebrew (for macOS package management)

---

## Setup Instructions

### Local Database Setup

Install and start PostgreSQL:

```bash
brew install postgres
brew services restart postgresql
psql postgres
psql -U postgres
createdb postgres
```

Download the database export from [SharePoint](https://mcmasteru365-my.sharepoint.com/personal/szechtma_mcmaster_ca/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fszechtma%5Fmcmaster%5Fca%2FDocuments%2FCapstoneProject2024%2D25%2FPostgreSQL%2FExported%5Fszechtman%5Flab%5Fdatabase&viewid=4971addc%2Dbc56%2D49ba%2D8ac1%2Da8ad91132272&csf=1&web=1&e=r4ngWU&CID=82c9bc55%2D11d8%2D464d%2Daf27%2D22085573ed7f&FolderCTID=0x0120000D047C8EA8138E4F8A5F6E0E8106AF73&view=0)

Import the schema:

```bash
psql -U postgres -d postgres -f OneDrive_1_2025-11-18/szechtman_lab_schema.sql
```

**Troubleshooting:**
- List databases: `\l`
- List users: `\du`
- Select appropriate user if needed

### Backend Setup

Create and activate virtual environment:

```bash
cd src/ocd-rat-backend
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the server:

```bash
fastapi dev app.py
```

The API will be available at `http://localhost:8000`

For detailed API documentation, check [Pull Request #332](https://github.com/OCD-Rats-Capstone/OCD-Rat-Infrastructure/pull/332)

### Frontend Setup

Install Node.js:

```bash
brew install node
```

Install dependencies:

```bash
cd src/ocd-rat-frontend
npm install
npm install -g vite
```

Run the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (or as shown in your terminal)

---

## License

This project is licensed under the [MIT License](LICENSE)
