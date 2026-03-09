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
   ```bash
   docker-compose up -d --build
   ```

4. **Access the application**
   - **Frontend:** http://localhost:80
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
| Frontend | `frontend` | 80 | React UI |
| Backend | `backend` | 8000 | FastAPI server |
| Database | `db` | 5433 | PostgreSQL with data |

---

### Sample .ENV File:

```bash
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=Gouda
DB_NAME=postgres
DB_PORT=5432

# LLM Configuration (for cloud providers like OpenRouter)
OPENAI_API_KEY=your-api-key-here
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=your-model-name
```

---

### Troubleshooting

**Port conflicts:**
If ports 80, 8000, or 5433 are already in use, edit `docker-compose.yml` to change the port mappings.

**Database not initializing:**
If the database seems empty, check the initialization logs:
```bash
docker-compose logs db
```

---

## Testing

### Running Backend Tests

```
cd src/ocd-rat-backend
python3 -m pytest tests/ -v --tb=short
```

## License

This project is licensed under the [MIT License](LICENSE)
