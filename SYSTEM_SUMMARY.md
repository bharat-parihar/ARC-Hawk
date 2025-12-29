# ARC-Hawk System Summary

## 🏗️ System Architecture

The ARC-Hawk platform is an enterprise-grade Data Lineage and PII Classification system composed of four main components:

### 1. **Hawk-Eye Scanner (Python)**
- **Role**: The data ingestion engine.
- **Function**: Scans data sources (Filesystem, PostgreSQL, AWS S3, etc.) using regex and pattern matching to detect potential PII.
- **Output**: Generates a standardized JSON report containing "findings" (potential risks).
- **Configuration**: Managed via `connection.yml` to define targets and exclude patterns.

### 2. **Backend API (Go/Gin)**
- **Role**: The core processing and logic layer.
- **Function**:
  - **Ingestion API**: Receives scan results, sanitizes data (removes binary noise), and filters out non-PII.
  - **Classification Engine**: A strict, multi-signal engine that re-evaluates scanner findings. It checks patterns (Regex), context (File paths), and metadata to assign confidence scores (e.g., "Confirmed", "High Confidence").
  - **Lineage Service**: Constructs the dynamic lineage graph, linking Systems -> Assets -> Findings -> Classifications.
- **Port**: `8080`

### 3. **Database (PostgreSQL)**
- **Role**: The single source of truth.
- **Function**: Stores structured data:
  - `assets`: Files, tables, buckets.
  - `findings`: Detected PII instances.
  - `classifications`: The assigned PII category (e.g., "Sensitive Personal Data").
  - `scan_runs`: History of scans.
- **Integration**: Running via Docker Compose (`arc-platform-db`).
- **Status**: **REQUIRED** - System cannot operate without PostgreSQL.

### 4. **Frontend (Next.js / React Flow)**
- **Role**: The interactive user interface.
- **Function**:
  - **D3/Dagre Layout**: Automatically arranges the graph hierarchically (System -> Asset -> Finding).
  - **Visuals**: Displays gradient-colored nodes for Systems (Blue), Assets (Purple), Findings (Red/White), and Classifications (Green).
  - **Interactivity**: Allows users to expand/collapse nodes, view finding details, and explore data relationships.
- **Port**: `3000`

### 5. **Neo4j (Optional Graph Database)**
- **Role**: Enhanced semantic lineage visualization.
- **Function**: Stores aggregated knowledge graph (System → Asset → Data Category → Finding).
- **Status**: **OPTIONAL** - System gracefully falls back to PostgreSQL if unavailable.
- **Configuration**: Enable/disable via `NEO4J_ENABLED=true/false` in `.env`.
- **Ports**: `7474` (Browser), `7687` (Bolt)

### 6. **Presidio ML (Optional)**
- **Role**: Machine learning-based PII detection enhancement.
- **Function**: Provides ML confidence adjustments to rule-based classification.
- **Status**: **OPTIONAL** - System runs in rules-only mode if unavailable.
- **Configuration**: Enable/disable via `PRESIDIO_ENABLED=true/false` in `.env`.
- **Port**: `5001`

---

## 🔄 End-to-End Workflow

1.  **Scan Execution**:
    - You run `unified-scan.py`.
    - The scanner reads your file system (or DB) and finds patterns like "AWS Key" or "Email".
    - It sends a JSON payload to `POST /api/v1/scans/ingest`.

2.  **Ingestion & Classification**:
    - The Backend receives the payload.
    - **Sanitization**: It removes null bytes (`0x00`) to prevent DB errors.
    - **Classification**: The `ClassificationService` analyzes the finding.
      - *Example*: It sees "key" in a file path `config.py`. It confirms it as "Secrets" with High Confidence.
    - **Filtering**: If the finding is "Non-PII", it is **discarded** to keep the system clean.
    - **Storage**: Valid PII is saved to Postgres.

3.  **Visualization**:
    - You open `localhost:3000`.
    - The Frontend requests the graph via `GET /api/v1/lineage`.
    - The Backend builds the graph structure:
      - **System Node**: Grouping (e.g., "Mac-mini").
      - **Asset Node**: The file (e.g., `connection.yml`).
      - **Finding Node**: The detected PII (e.g., "AWS Access Key").
      - **Edges**: Lines drawing connections (`CONTAINS`, `EXPOSES`).
    - React Flow renders the graph with **smooth animations** and **strict hierarchy**.

---

## ✨ Key Features Implemented

- **Strict PII Engine**: Uses word boundaries (`\bpan\b`) to avoid false positives (e.g., "span" != "pan").
- **Smart Context**: Boosts confidence if PII is found in "auth", "billing", or "user" directories.
- **Clean Graph**: Un-nested nodes ensure visible connection lines, solving the "floating node" issue.
- **Sanitized Ingestion**: Handles binary files gracefully without crashing.
- **Premium UI**: Gradient nodes, glassmorphism effects, and animated edges for critical risks.

---

## 🚀 How to Run

1.  **Start DB**: `docker-compose up -d postgres`
2.  **Start Backend**: `cd apps/backend && go run cmd/server/main.go`
3.  **Run Scan**: `cd scripts/automation && python3 unified-scan.py`
4.  **View UI**: `cd apps/frontend && npm run dev` -> Open `http://localhost:3000`
