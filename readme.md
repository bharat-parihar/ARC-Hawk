# ARC-Hawk Platform

<div align="center">

![Production Status](https://img.shields.io/badge/status-production--ready-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-Apache%202.0-lightgrey)

**Enterprise-grade PII Discovery, Classification, and Lineage Tracking Platform**

[Quick Start](#-quick-start) • [Documentation](#-documentation) • [Features](#-key-features) • [Architecture](#-architecture) • [Support](#-support)

</div>

---

## 🎯 What is ARC-Hawk?

ARC-Hawk is a **production-ready platform** that automatically discovers, validates, and tracks Personally Identifiable Information (PII) across your entire data infrastructure. Built with an **Intelligence-at-Edge** architecture, it provides:

- ✅ **Accurate PII Detection** - Mathematical validation (Verhoeff, Luhn algorithms) with 100% accuracy
- ✅ **Multi-Source Scanning** - Filesystem, PostgreSQL, MySQL, MongoDB, S3, GCS, Redis, and more
- ✅ **Semantic Lineage** - Visual graph showing where PII flows across your systems
- ✅ **Compliance Ready** - DPDPA 2023 (India) mapping with consent and retention tracking
- ✅ **Automated Remediation** - One-click masking and deletion of sensitive data
- ✅ **Real-Time Monitoring** - Live scan progress and system health tracking

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 4GB+ RAM recommended

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-org/arc-hawk.git
cd arc-hawk

# 2. Start the entire stack
docker-compose up -d --build

# 3. Access the Dashboard
# Open http://localhost:3000 in your browser
```

**That's it!** The system will automatically initialize:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:8080`
- **Temporal UI**: `http://localhost:8088` (Workflows)
- **Neo4j Browser**: `http://localhost:7474` (Graph DB)

---

## 🏗️ Architecture

ARC-Hawk uses a modern, distributed architecture:

```mermaid
graph TD
    Client[Frontend Dashboard] -->|HTTP/WS| API[Backend API]
    API -->|Manage| PG[(PostgreSQL)]
    API -->|Lineage| Graph[(Neo4j)]
    API -->|Trigger| Temporal[Temporal Workflow]
    
    Temporal -->|Orchestrate| Scanner[Scanner Worker]
    Scanner -->|Scan| Sources[Data Sources\n(S3, DBs, Files)]
    Scanner -->|Results| API
```

### Core Components

1.  **Frontend (Next.js)**: Real-time dashboard for managing scans, viewing lineage, and executing remediation.
2.  **Backend (Go)**: Modular monolith handling business logic, API, and WebSocket streaming.
3.  **Orchestrator (Temporal)**: Manages long-running workflows (Scans, Remediation) with reliable retries.
4.  **Scanner Example (Python)**: High-performance PII detection engine running as a worker.
5.  **Storage**:
    *   **PostgreSQL**: Relational data (Assets, Findings, Configs).
    *   **Neo4j**: Graph data (Lineage, Relationships).

---

## ✨ Key Features

### 🔍 Intelligent PII Detection
**11 Locked India-Specific PII Types** with mathematical validation (Aadhaar, PAN, Passport, etc.) ensuring **Zero False Positives**.

### 🌐 Multi-Source Scanning
Support for File Systems, S3, GCS, SQL Databases (Postgres, MySQL), NoSQL (MongoDB), and SaaS (Slack).

### 📊 Semantic Lineage Tracking
Interactive graph visualization showing exactly where PII flows: `System -> Asset -> Column -> PII Type`.

### 🛡️ Automated Remediation
- **Masking**: Redact sensitive data at the source.
- **Deletion**: Securely remove non-compliant data.
- **Audit Trail**: Full history of all remediation actions.

### ⚖️ Compliance Mapping
Built-in mapping for **DPDPA 2023** (India), including Consent Tracking and Data Retention policies.

---

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [**User Manual**](docs/USER_MANUAL.md): Guide for end-users.
- [**Architecture**](docs/architecture/ARCHITECTURE.md): Deep dive into system design.
- [**API Reference**](docs/development/TECHNICAL_SPECIFICATIONS.md): Endpoints and schemas.
- [**Failure Modes**](docs/FAILURE_MODES.md): Troubleshooting guide.

---

## 🛠️ Build from Source

If you want to run components individually for development:

### Backend (Go)
```bash
cd apps/backend
go mod download
go run cmd/server/main.go
```

### Frontend (Next.js)
```bash
cd apps/frontend
npm install
npm run dev
```

### Scanner (Python)
```bash
cd apps/scanner
pip install -r requirements.txt
python hawk_scanner/main.py --help
```

---

## 📝 License

This project is licensed under the **Apache License 2.0**.
