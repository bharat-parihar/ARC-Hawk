# ARC Hawk Monorepo
![Production Status](https://img.shields.io/badge/status-verified-green)
![License](https://img.shields.io/badge/license-Apache%202.0-lightgrey)

Enterprise-grade monorepo containing the Hawk-Eye scanner, ARC Platform backend, and dashboard.

> **Production Verified**: System is fully operational and enterprise-ready.

## 📚 Documentation
**Everything you need to know is in the [Project Report](PROJECT_REPORT.md).**

The report covers:
- **Executive Summary**
- **System Architecture**
- **User Guide & Operations**
- **API Reference**
- **Failure Modes & Recovery**

## 📂 Repository Structure

- `apps/`
  - **Scanner**: Python-based PII detection engine.
  - **Backend**: Go-based central processing API.
  - **Frontend**: Next.js Enterprise Dashboard.
- `infra/`: Docker & Kubernetes definitions.
- `PROJECT_REPORT.md`: **The Single Source of Truth**.

## 🚀 Quick Start in 1 Minute

```bash
# 1. Start Infrastructure
docker-compose up -d postgres

# 2. Start Backend
cd apps/backend && go run cmd/server/main.go

# 3. Start Frontend
cd apps/frontend && npm run dev
```

Visit **http://localhost:3000** to access the dashboard.
