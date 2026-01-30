# Database Schema Documentation

This document describes the complete database schema for the OCD-Rat Infrastructure project.

## Overview

The database is **session-centric**, meaning the `experimental_sessions` table is the hub connecting behavioral trials with subject information, drug data, testing conditions, and experimenter details.

---

## Core Tables

### 1. **experimental_sessions** (Central Table)
The heart of the database. Each record represents one behavioral experimental session for a subject rat.

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | INTEGER (PK) | Unique session primary key |
| `legacy_session_id` | VARCHAR(7) | Legacy alphanumeric session code |
| `rat_id` | INTEGER (FK) | Subject rat for this session → `rats.rat_id` |
| `session_type_id` | INTEGER (FK) | Session type/classification → `session_types.session_type_id` |
| `tester_id` | INTEGER (FK) | Tester/experimenter conducting session → `testers.tester_id` |
| `apparatus_id` | INTEGER (FK) | Behavioral apparatus used → `apparatuses.apparatus_id` |
| `pattern_id` | INTEGER (FK) | Apparatus pattern/configuration → `apparatus_patterns.pattern_id` |
| `room_id` | INTEGER (FK) | Room where session conducted → `testing_rooms.room_id` |
| `drug_rx_id` | INTEGER (FK) | Drug regimen administered → `drug_rx.drug_rx_id` |
| `effective_manipulation_id` | INTEGER (FK) | Surgical intervention → `brain_manipulations.manipulation_id` |
| `body_weight_grams` | DOUBLE PRECISION | Subject's weight during session |
| `cumulative_drug_injection_number` | INTEGER | Running count of total injections for rat in study |
| `session_timestamp` | TIMESTAMP | Date and time of session |
| `testing_lights_on` | BOOLEAN | Were testing/room lights on for this session? |
| `locale_in_room` | VARCHAR(10) | Locale or place ID in the room |
| `data_trial_id` | VARCHAR(28) | Equivalent to TRIAL_ID in SPSS where RAW Data is available |

---

## Subject Entity Tables

### 2. **rats**
Subject animals used in the experiments.

| Column | Type | Description |
|--------|------|-------------|
| `rat_id` | INTEGER (PK) | Unique rat identifier |
| `name` | VARCHAR(50) | Name or code of the rat |
| `sex` | VARCHAR(10) | Biological sex |
| `date_of_birth` | DATE | When the rat was born |
| `strain` | VARCHAR(50) | Genetic strain |
| `notes` | TEXT | Additional notes |

### 3. **brain_manipulations**
Surgical interventions performed on rats.

| Column | Type | Description |
|--------|------|-------------|
| `manipulation_id` | INTEGER (PK) | Unique manipulation identifier |
| `rat_id` | INTEGER (FK) | Rat that underwent surgery → `rats.rat_id` |
| `surgery_date` | DATE | Date of surgery |
| `surgeon` | VARCHAR(50) | Who performed surgery |
| `manipulation_type` | VARCHAR(50) | Type of manipulation (e.g., lesion, implant) |
| `brain_region` | VARCHAR(50) | Target brain region |
| `notes` | TEXT | Additional details |

---

## Experimenter & Equipment Tables

### 4. **testers**
List of experimenters who conducted sessions.

| Column | Type | Description |
|--------|------|-------------|
| `tester_id` | INTEGER (PK) | Unique tester identifier |
| `first_last_name` | VARCHAR(50) | Full name |
| `initials` | VARCHAR(10) | Initials or short code |

### 5. **apparatuses**
Testing equipment/behavioral chambers.

| Column | Type | Description |
|--------|------|-------------|
| `apparatus_id` | INTEGER (PK) | Unique apparatus identifier |
| `apparatus_name` | VARCHAR(50) | Name/label of apparatus |
| `apparatus_type` | VARCHAR(50) | Type of apparatus |
| `notes` | TEXT | Technical specifications |

### 6. **apparatus_patterns**
Object arrangement configurations within apparatuses.

| Column | Type | Description |
|--------|------|-------------|
| `pattern_id` | INTEGER (PK) | Unique pattern identifier |
| `pattern_name` | VARCHAR(50) | Name of configuration |
| `apparatus_id` | INTEGER (FK) | Apparatus this pattern belongs to → `apparatuses.apparatus_id` |
| `pattern_description` | TEXT | Description of object arrangement |

### 7. **testing_rooms**
Physical laboratory rooms where sessions occur.

| Column | Type | Description |
|--------|------|-------------|
| `room_id` | INTEGER (PK) | Unique room identifier |
| `room_name` | VARCHAR(50) | Lab room name/number |
| `room_notes` | TEXT | Room specifications |

---

## Drug & Treatment Tables

### 8. **drug_rx**
Drug regimen combinations administered to subjects.

| Column | Type | Description |
|--------|------|-------------|
| `drug_rx_id` | INTEGER (PK) | Unique regimen identifier |
| `drug_rx_notes` | TEXT | Description of drug combination |

### 9. **drug_rx_details**
Individual compound specifications within each regimen.

| Column | Type | Description |
|--------|------|-------------|
| `detail_id` | INTEGER (PK) | Unique detail identifier |
| `drug_rx_id` | INTEGER (FK) | Parent drug regimen → `drug_rx.drug_rx_id` |
| `compound_id` | INTEGER (FK) | Specific compound → `compounds.compound_id` |
| `dosage_mg_per_kg` | NUMERIC | Dose per kilogram body weight |
| `administration_route` | VARCHAR(50) | How administered (injection, oral, etc.) |
| `timing_relative_to_session_minutes` | INTEGER | Minutes before/after session |

### 10. **compounds**
Available pharmaceutical compounds.

| Column | Type | Description |
|--------|------|-------------|
| `compound_id` | INTEGER (PK) | Unique compound identifier |
| `compound_name` | VARCHAR(100) | Name of drug/compound |
| `compound_notes` | TEXT | Additional information |

---

## Session Classification Tables

### 11. **session_types**
Session classification codes.

| Column | Type | Description |
|--------|------|-------------|
| `session_type_id` | INTEGER (PK) | Unique type identifier |
| `type_name` | VARCHAR(100) | Classification name |
| `session_types_notes` | TEXT | Description |

---

## Data Support Tables

### 12. **session_observations**
Behavioral observations recorded during sessions.

| Column | Type | Description |
|--------|------|-------------|
| `observation_id` | INTEGER (PK) | Unique observation identifier |
| `session_id` | INTEGER (FK) | Session this observation belongs to → `experimental_sessions.session_id` |
| `observation_code` | VARCHAR(50) | Behavioral code |
| `frequency` | INTEGER | How many times observed |
| `duration_seconds` | INTEGER | How long observed (if applicable) |
| `timestamp_within_session` | TIMESTAMP | When during session |

### 13. **session_drug_details**
Drug administration details for specific sessions.

| Column | Type | Description |
|--------|------|-------------|
| `session_drug_detail_id` | INTEGER (PK) | Unique identifier |
| `session_id` | INTEGER (FK) | Session being documented → `experimental_sessions.session_id` |
| `compound_id` | INTEGER (FK) | Compound administered → `compounds.compound_id` |
| `actual_dose_mg_per_kg` | NUMERIC | Actual dose given |
| `administration_route` | VARCHAR(50) | Route used |
| `injection_time` | TIMESTAMP | When administered |

### 14. **session_data_files**
References to raw data files associated with sessions.

| Column | Type | Description |
|--------|------|-------------|
| `file_id` | INTEGER (PK) | Unique file reference identifier |
| `session_id` | INTEGER (FK) | Session this file documents → `experimental_sessions.session_id` |
| `file_path` | VARCHAR(255) | Location of raw data file |
| `file_type` | VARCHAR(50) | Format (CSV, JSON, binary, etc.) |
| `notes` | TEXT | Description of contents |

### 15. **light_cycles**
Colony room light/dark cycles for context.

| Column | Type | Description |
|--------|------|-------------|
| `cycle_id` | INTEGER (PK) | Unique cycle identifier |
| `cycle_name` | VARCHAR(50) | Name of light schedule |
| `lights_on_hour` | INTEGER | Hour when lights turn on |
| `lights_off_hour` | INTEGER | Hour when lights turn off |

---

## Key Relationships

```
experimental_sessions (Central Hub)
├── rat_id → rats
│   └── manipulation_id → brain_manipulations
├── tester_id → testers
├── apparatus_id → apparatuses
│   └── pattern_id → apparatus_patterns
├── room_id → testing_rooms
├── drug_rx_id → drug_rx
│   └── drug_rx_details → compounds
├── session_type_id → session_types
└── References in related tables:
    ├── session_observations → (session_id)
    ├── session_drug_details → (session_id, compound_id)
    └── session_data_files → (session_id)
```

---

## Important Concepts

### Counters
- **`cumulative_drug_injection_number`**: Running total of injections for a rat across the entire study (never resets per session)

### Timestamps
- **`session_timestamp`**: Full date/time when session occurred
- **`surgery_date`** in brain_manipulations: When intervention performed
- **Injection times** in session_drug_details: Precise timing of drug administration

### Measurement Units
- **Body weight**: `body_weight_grams` in DOUBLE PRECISION
- **Drug dosage**: `dosage_mg_per_kg` in NUMERIC(10,2) format
- **Duration**: `duration_seconds` for behavioral observations

---

## Sample Queries

### Get all sessions for a specific rat with weight and injection count
```sql
SELECT 
  es.session_id,
  es.session_timestamp,
  es.body_weight_grams,
  es.cumulative_drug_injection_number,
  r.name AS rat_name
FROM experimental_sessions es
JOIN rats r ON es.rat_id = r.rat_id
WHERE es.rat_id = [RAT_ID]
ORDER BY es.session_timestamp DESC;
```

### Find sessions by apparatus with experimenter info
```sql
SELECT 
  es.session_id,
  a.apparatus_name,
  t.first_last_name AS tester,
  es.session_timestamp,
  st.type_name AS session_type
FROM experimental_sessions es
JOIN apparatuses a ON es.apparatus_id = a.apparatus_id
JOIN testers t ON es.tester_id = t.tester_id
JOIN session_types st ON es.session_type_id = st.session_type_id
WHERE es.apparatus_id = [APPARATUS_ID]
ORDER BY es.session_timestamp;
```

### Visualizations: Average body weight by rat
```sql
SELECT 
  r.rat_id,
  r.name,
  ROUND(AVG(es.body_weight_grams), 2) AS avg_weight_grams,
  COUNT(DISTINCT es.session_id) AS session_count
FROM experimental_sessions es
JOIN rats r ON es.rat_id = r.rat_id
GROUP BY r.rat_id, r.name
ORDER BY avg_weight_grams DESC;
```

---

## Statistics

- **Experimental Sessions**: ~20,491 records
- **Subjects (Rats)**: Multiple subjects tracked over time
- **Session Types**: Multiple behavioral classifications
- **Testers**: Multiple experimenters
- **Apparatuses**: Multiple testing chambers
- **Drug Regimens**: Various combinations tracked

---

## Access & Connection

### Docker Connection
```bash
docker exec -it ocd-rat-infrastructure-db-1 psql -U postgres -d postgres
```

### Connection Parameters
- **Host**: localhost (or db container when in Docker network)
- **Port**: 5433 (external) / 5432 (internal Docker)
- **User**: postgres
- **Database**: ocd_rat (primary) / postgres (initial)
- **Password**: Gouda

---

*Last Updated: January 2026*
*Schema Version: As deployed in production*
