# 🦅 Hawk-Eye Scanner

High-performance PII & Secret detection engine for the ARC-Hawk Platform.

> **Note**: While Hawk-Eye can be used as a standalone CLI tool, it is designed to be the scanning engine for the **ARC-Hawk Platform**.

## 🌟 Capabilities

- **11+ PII Types**: Validated implementation for Aadhaar, PAN, Passport, etc.
- **Deep Scanning**: OCR support for images, archive extraction (zip/tar), and PDF parsing.
- **Multi-Source**: Unified interface for S3, GCS, SQL, and Local Files.
- **High Performance**: Multithreaded scanning engine.

## 🤝 Platform Integration

When running as part of ARC-Hawk, the scanner operates in **Worker Mode**:

1.  **Trigger**: The Backend (via Temporal) triggers a scan job.
2.  **Execution**: The scanner pod starts, configured via Environment Variables.
3.  **Ingestion**: Results are POSTed back to the backend via `hawk_scanner/internals/auto_ingest.py`.

### Key Integration Environment Variables

| Variable | Purpose |
|----------|---------|
| `SCAN_ID` | Unique ID for the scan session (Provided by Backend) |
| `API_URL` | ARC-Hawk Backend URL (e.g., `http://backend:8080`) |
| `CONNECTION_CONFIG` | JSON string containing source credentials |

## 🚀 Standalone Usage (CLI)

You can also use Hawk-Eye directly in your terminal for ad-hoc scans.

### Installation

```bash
pip3 install -r requirements.txt
python3 -m spacy download en_core_web_sm
```

### Basic Commands

**Scan a Local Directory:**
```bash
python3 hawk_scanner/main.py fs --path /path/to/scan --json output.json
```

**Scan an S3 Bucket:**
```bash
python3 hawk_scanner/main.py s3 --bucket my-bucket --connection config.yml
```

### Configuration (`connection.yml`)

Create a `connection.yml` file to store credentials for reusable profiles:

```yaml
sources:
  s3:
    my_profile:
      access_key: "..."
      secret_key: "..."
      bucket_name: "prod-data"
  mysql:
    prod_db:
      host: "localhost"
      user: "admin"
      ...
```

See `connection.yml.sample` for all options.

## 🛡️ Supported Data Sources

- **Filesystem** (Local, Network Mounts)
- **AWS S3**
- **Google Cloud Storage (GCS)**
- **PostgreSQL**
- **MySQL**
- **MongoDB**
- **Redis**
- **Slack** (Message History)
- **Firebase**

## 📝 License

Apache License 2.0
