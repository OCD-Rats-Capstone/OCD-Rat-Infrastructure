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

**Choose your setup method:**
- **[Quick Start with Docker](#quick-start-with-docker)** (Recommended) - No local installs required
- **[Manual Setup](#manual-setup-legacy)** (Legacy) - For development without Docker

---

## Quick Start with Docker

**The fastest way to get RatBat 2 running.** This method requires only Docker and works on any platform.

### Prerequisites

- **Docker Desktop** (includes Docker Compose)
  - [Download for Mac](https://www.docker.com/products/docker-desktop)
  - [Download for Windows](https://www.docker.com/products/docker-desktop)
  - [Download for Linux](https://docs.docker.com/desktop/install/linux-install/)

---

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/OCD-Rats-Capstone/OCD-Rat-Infrastructure.git
   cd OCD-Rat-Infrastructure
   ```

2. **Create environment file** (optional)
   ```bash
   # Copy the example .env file
   cp .env.example .env

   # Or
   # just create a file called .env, this will contain keys, etc.

   
   # Edit if needed (defaults work fine)
   # Default password is "Gouda"
   ```

3. **Start the application**

   **Option A: Without LLM (faster startup)**
   ```bash
   docker-compose up -d --build
   ```

   **Option B: With LLM support (includes Ollama)**
   ```bash
   docker-compose --profile llm up -d --build

   Note: the start.sh within the src/ollama directory may need to
   be converted to unix to be compatible with a linux based container. Perform the command:

   dos2unix start.sh

   to make the shell script compatible.
   ```

4. **Access the application**
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:8000
   - **API Docs:** http://localhost:8000/docs
   - **Database:** localhost:5433 (if you need direct access)

---

### Common Commands

```bash
# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v

# Rebuild after code changes
docker-compose build
docker-compose up -d

# Restart a specific service
docker-compose restart backend
docker-compose restart frontend
```

---

### What's Running?

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| Frontend | `frontend` | 3000 | React UI |
| Backend | `backend` | 8000 | FastAPI server |
| Database | `db` | 5433 | PostgreSQL with data |
| LLM | `ollama` | 11434 | Ollama (optional) |

---

### Sample .ENV File (Nathan's .env on windows):

DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=Gouda
DB_NAME=postgres
DB_PORT=5432
OPENAI_API_KEY=ollama
LLM_BASE_URL=http://ollama:11434/v1 (may need to be localhost for some systems)
LLM_MODEL=qwen2.5-coder:7b

#####

### Troubleshooting

**Port conflicts:**
If ports 3000, 8000, or 5433 are already in use, edit `docker-compose.yml` to change the port mappings.

**LLM not responding:**
The first time you start with `--profile llm`, Ollama needs to download the model (~4GB). Check logs:
```bash
docker-compose logs ollama
```

**Database not initializing:**
If the database seems empty, check the initialization logs:
```bash
docker-compose logs db
```

---

## Manual Setup (Legacy)

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
