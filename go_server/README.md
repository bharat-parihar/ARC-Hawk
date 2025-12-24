# Hawk Scanner API Wrapper

This is a Golang REST API wrapper for the Hawk Scanner.

## Prerequisites
- Go 1.21+
- Python 3 with Hawk Scanner dependencies installed (in `../.venv`)
- Hawk Scanner configuration files (`../connection.yml`, `../fingerprint.yml`)

## Build and Run
```bash
go build -o server .
./server
```
The server runs on port 8090.

## API Endpoints

### 1. Add Connection
Update `connection.yml`.
**POST** `/connection`
```json
{
  "postgresql": {
     "my_db": {
       "host": "localhost",
       "user": "admin",
       ...
     }
  }
}
```

### 2. Add Regex
Update `fingerprint.yml`.
**POST** `/regex`
```json
{
  "pattern_name": "MyCustomSecret",
  "regex": "secret-[0-9]+",
  "description": "Finds custom secrets"
}
```

### 3. Start Scan
Run the scanner.
**POST** `/scan`
```json
{
  "command": "fs",
  "connection_file": "connection.yml"
}
```

### 4. Fetch Results
Get JSON results.
**GET** `/results`

### 5. Export CSV
Download CSV output.
**GET** `/export/csv`

### 6. Data Lineage
Generate lineage graph from results.
**POST** `/lineage`
```json
{
  "scan_result_file": "output.json" 
}
```

## Directory Structure
- `main.go`: Entry point.
- `handlers.go`: API implementation.
- `types.go`: JSON structures.
