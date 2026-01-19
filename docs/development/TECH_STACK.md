# Technology Stack

## Overview

This document provides a comprehensive breakdown of all technologies, frameworks, libraries, and tools used throughout the platform.

---

## Backend Technologies

### Core Language & Runtime

**Go 1.24**
- **Purpose**: Primary backend language
- **Why Chosen**:
  - High performance with low latency
  - Excellent concurrency support (goroutines)
  - Strong type safety
  - Fast compilation
  - Small binary size
  - Rich standard library
- **Use Cases**:
  - REST API server
  - Database operations
  - Business logic processing
  - Graph database synchronization

---

### Web Framework

**Gin 1.9.1**
- **Purpose**: HTTP web framework
- **Why Chosen**:
  - Fastest Go web framework (benchmarked)
  - Minimal overhead
  - Excellent routing capabilities
  - Built-in middleware support
  - JSON validation
- **Features Used**:
  - Route grouping (`/api/v1`)
  - Middleware (CORS, recovery, logging)
  - Request binding and validation
  - JSON serialization

**CORS Middleware** (`gin-contrib/cors 1.5.0`)
- **Purpose**: Cross-Origin Resource Sharing
- **Configuration**:
  - Allowed origins: `http://localhost:3000` (configurable)
  - Allowed methods: GET, POST, PUT, DELETE, OPTIONS
  - Credentials support enabled

---

### Database Drivers

**PostgreSQL Driver** (`lib/pq 1.10.9`)
- **Purpose**: PostgreSQL database connectivity
- **Why Chosen**:
  - Pure Go implementation
  - No CGO dependencies
  - Excellent performance
  - Full PostgreSQL feature support
- **Features Used**:
  - Connection pooling
  - Prepared statements
  - Transaction management
  - JSONB support

**Neo4j Driver** (`neo4j-go-driver/v5 5.28.4`)
- **Purpose**: Neo4j graph database connectivity
- **Why Chosen**:
  - Official Neo4j driver
  - Bolt protocol support
  - Session management
  - Transaction support
- **Features Used**:
  - Cypher query execution
  - Session pooling
  - Transaction management
  - Result streaming

---

### Database Migrations

**golang-migrate** (`v4.19.1`)
- **Purpose**: Database schema migrations
- **Why Chosen**:
  - Version-controlled migrations
  - Up/down migration support
  - Multiple database support
  - CLI and library interface
- **Migration Strategy**:
  - Versioned migrations (`000001_`, `000002_`, etc.)
  - Atomic transactions
  - Rollback support

---

### Utilities

**UUID Generator** (`google/uuid 1.6.0`)
- **Purpose**: Generate UUID v4 identifiers
- **Use Cases**:
  - Primary keys for database records
  - Unique identifiers for entities

**Environment Variables** (`joho/godotenv 1.5.1`)
- **Purpose**: Load environment variables from `.env` files
- **Use Cases**:
  - Development configuration
  - Secret management
  - Environment-specific settings

**YAML Parser** (`gopkg.in/yaml.v3`)
- **Purpose**: Parse YAML configuration files
- **Use Cases**:
  - Application configuration
  - Scanner configuration

---

## Frontend Technologies

### Core Framework

**Next.js 14.0.4**
- **Purpose**: React framework for production
- **Why Chosen**:
  - Server-side rendering (SSR) support
  - App Router for modern routing
  - Optimized production builds
  - Built-in TypeScript support
  - Excellent developer experience
- **Features Used**:
  - App Router (`app/` directory)
  - Client-side rendering (no SSR for sensitive data)
  - Static asset optimization
  - Hot module replacement (HMR)

**React 18.2.0**
- **Purpose**: UI library
- **Why Chosen**:
  - Component-based architecture
  - Virtual DOM for performance
  - Hooks for state management
  - Large ecosystem
- **Features Used**:
  - Functional components
  - React Hooks (useState, useEffect, useCallback)
  - Context API (minimal usage)

**TypeScript 5.3.3**
- **Purpose**: Type-safe JavaScript
- **Why Chosen**:
  - Static type checking
  - Better IDE support
  - Reduced runtime errors
  - Self-documenting code
- **Configuration**:
  - Strict mode enabled
  - ES2022 target
  - Module resolution: bundler

---

### Graph Visualization

**ReactFlow 11.10.3**
- **Purpose**: Interactive graph visualization
- **Why Chosen**:
  - React-native integration
  - Customizable nodes and edges
  - Zoom and pan controls
  - Layout algorithms
  - Performance optimized
- **Features Used**:
  - Custom node types (System, Asset, PII_Category)
  - Animated edges
  - Minimap
  - Controls (zoom, fit view)
  - Dagre layout algorithm

**Cytoscape 3.33.1**
- **Purpose**: Alternative graph visualization
- **Why Chosen**:
  - Advanced layout algorithms
  - Large graph support
  - Extensible architecture
- **Features Used**:
  - Dagre layout
  - Custom styling
  - Event handling

**Dagre 0.8.5**
- **Purpose**: Directed graph layout algorithm
- **Why Chosen**:
  - Hierarchical layout
  - Automatic node positioning
  - Minimal edge crossings
- **Use Cases**:
  - Lineage graph layout
  - System-Asset-PII hierarchy visualization

---

### HTTP Client

**Axios 1.6.2**
- **Purpose**: HTTP client for API requests
- **Why Chosen**:
  - Promise-based API
  - Request/response interceptors
  - Automatic JSON transformation
  - Error handling
  - Browser and Node.js support
- **Features Used**:
  - GET/POST requests
  - Query parameters
  - Error handling
  - Response transformation

---

### Styling

**CSS Modules**
- **Purpose**: Component-scoped CSS
- **Why Chosen**:
  - No global namespace pollution
  - Automatic class name generation
  - Better maintainability
  - No runtime overhead
- **Approach**:
  - Vanilla CSS (no preprocessors)
  - Modern CSS features (Grid, Flexbox, CSS Variables)
  - Responsive design

---

## Scanner Technologies

### Core Language

**Python 3.9+**
- **Purpose**: Scanner implementation language
- **Why Chosen**:
  - Rich NLP ecosystem
  - Easy integration with diverse data sources
  - Rapid development
  - Excellent library support
- **Use Cases**:
  - PII detection
  - Data source scanning
  - Validation logic
  - Result generation

---

### NLP & Entity Recognition

**spaCy 3.x**
- **Purpose**: Natural Language Processing library
- **Why Chosen**:
  - Fast and efficient
  - Pre-trained models
  - Custom entity recognition
  - Production-ready
- **Model Used**: `en_core_web_sm`
  - Small footprint (~12 MB)
  - English language support
  - Memory efficient (~500-800 MB RAM)

**Custom Pattern Recognizers**
- **Purpose**: Detect 11 locked PII types
- **Implementation**: Custom `PatternRecognizer` classes
- **Patterns**:
  - Regex-based detection
  - Context-aware matching
  - Format validation

---

### Validation Libraries

**Custom Validators**
- **Verhoeff Algorithm**: Aadhaar validation
- **Luhn Algorithm**: Credit card validation
- **Weighted Modulo 26**: PAN validation
- **Regex Validators**: Email, phone, UPI, IFSC, etc.

**hashlib** (Python Standard Library)
- **Purpose**: SHA-256 hashing for PII values
- **Use Cases**:
  - Value hashing (never store raw PII)
  - Stable ID generation

---

### Data Source Connectors

**PostgreSQL** (`psycopg2-binary`)
- **Purpose**: PostgreSQL database scanning
- **Features**: Table scanning, column analysis

**MySQL** (`mysql-connector-python`)
- **Purpose**: MySQL database scanning

**MongoDB** (`pymongo`)
- **Purpose**: MongoDB collection scanning

**Redis** (`redis-py`)
- **Purpose**: Redis key-value scanning

**AWS S3** (`boto3`)
- **Purpose**: S3 bucket scanning

**Google Cloud Storage** (`google-cloud-storage`)
- **Purpose**: GCS bucket scanning

**File System** (Python Standard Library)
- **Purpose**: Local file system scanning
- **Supported Formats**: Text, CSV, PDF, DOCX, XLSX, images

---

## Database Technologies

### Relational Database

**PostgreSQL 15**
- **Purpose**: Primary data store
- **Why Chosen**:
  - ACID compliance
  - JSONB support for flexible metadata
  - Excellent performance
  - Rich indexing capabilities
  - Mature ecosystem
- **Features Used**:
  - UUID primary keys
  - JSONB columns
  - Full-text search (future)
  - Triggers for timestamp management
  - Cascading deletes
  - Connection pooling

**Extensions**:
- `uuid-ossp`: UUID generation

---

### Graph Database

**Neo4j 5.15 Community**
- **Purpose**: Semantic lineage graph storage
- **Why Chosen**:
  - Native graph database
  - Cypher query language
  - Excellent traversal performance
  - APOC library support
  - Visualization tools
- **Configuration**:
  - Heap size: 2GB
  - APOC plugin enabled
  - Bolt protocol (port 7687)
  - HTTP browser (port 7474)
- **Features Used**:
  - Node creation (System, Asset, PII_Category)
  - Relationship creation (SYSTEM_OWNS_ASSET, ASSET_CONTAINS_PII)
  - Cypher queries
  - Indexes on key properties

---

## Infrastructure Technologies

### Containerization

**Docker 24+**
- **Purpose**: Container runtime
- **Why Chosen**:
  - Consistent environments
  - Easy deployment
  - Resource isolation
  - Portability
- **Containers**:
  - PostgreSQL
  - Neo4j
  - NLP Engine (optional)

**Docker Compose 2.x**
- **Purpose**: Multi-container orchestration
- **Why Chosen**:
  - Simple configuration
  - Service dependencies
  - Volume management
  - Network isolation
- **Services Defined**:
  - `postgres`: PostgreSQL database
  - `neo4j`: Neo4j graph database
  - `presidio-analyzer`: NLP engine (optional)

---

### NLP Engine (Optional)

**Microsoft Presidio Analyzer**
- **Purpose**: Advanced PII detection (optional)
- **Why Chosen**:
  - Pre-built PII recognizers
  - Extensible architecture
  - REST API
- **Note**: Scanner SDK has built-in detection; Presidio is optional

---

## Development Tools

### Version Control

**Git 2.30+**
- **Purpose**: Source code version control
- **Workflow**: Feature branches, pull requests

---

### Build Tools

**Go Build**
- **Purpose**: Compile Go backend
- **Commands**:
  - `go build ./cmd/server`
  - `go run cmd/server/main.go`

**npm 9+**
- **Purpose**: Node.js package manager
- **Commands**:
  - `npm install`
  - `npm run dev`
  - `npm run build`

**pip 23+**
- **Purpose**: Python package manager
- **Commands**:
  - `pip install -r requirements.txt`

---

### Testing (Future Enhancement)

**Go Testing**
- `testing` (standard library)
- `testify` (assertions)

**React Testing**
- Jest
- React Testing Library

**Python Testing**
- pytest
- unittest

---

## Monitoring & Logging (Future Enhancement)

### Logging

**Backend**: Structured JSON logs to stdout  
**Frontend**: Browser console (development)  
**Scanner**: Verbose debug logs (optional `--debug` flag)

### Monitoring (Planned)

**Prometheus**: Metrics collection  
**Grafana**: Metrics visualization  
**Jaeger**: Distributed tracing

---

## Security Technologies

### Encryption

**TLS/SSL**: Network encryption (production)  
**SHA-256**: PII value hashing  
**Database Encryption**: At-rest encryption (production)

### Authentication (Future)

**JWT**: Token-based authentication  
**OAuth 2.0**: Third-party authentication

---

## Technology Decision Matrix

| Requirement | Technology | Alternatives Considered | Why Chosen |
|-------------|------------|-------------------------|------------|
| Backend Language | Go | Java, Python, Node.js | Performance, concurrency |
| Web Framework | Gin | Echo, Fiber, Chi | Speed, simplicity |
| Frontend Framework | Next.js | Create React App, Gatsby | SSR, App Router |
| Graph Visualization | ReactFlow | D3.js, Vis.js | React integration, ease of use |
| Relational DB | PostgreSQL | MySQL, MariaDB | JSONB, performance |
| Graph DB | Neo4j | ArangoDB, OrientDB | Cypher, maturity |
| NLP Library | spaCy | NLTK, Stanford NLP | Speed, production-ready |
| Containerization | Docker | Podman, LXC | Ecosystem, tooling |

---

## Dependency Management

### Backend (Go)
```
go.mod
├── github.com/gin-gonic/gin v1.9.1
├── github.com/lib/pq v1.10.9
├── github.com/neo4j/neo4j-go-driver/v5 v5.28.4
├── github.com/google/uuid v1.6.0
├── github.com/joho/godotenv v1.5.1
├── github.com/golang-migrate/migrate/v4 v4.19.1
└── gopkg.in/yaml.v3 v3.0.1
```

### Frontend (Node.js)
```
package.json
├── next@14.0.4
├── react@18.2.0
├── react-dom@18.2.0
├── reactflow@11.10.3
├── cytoscape@3.33.1
├── dagre@0.8.5
├── axios@1.6.2
└── typescript@5.3.3
```

### Scanner (Python)
```
requirements.txt
├── spacy>=3.0.0
├── presidio-analyzer>=2.2.0 (optional)
├── psycopg2-binary>=2.9.0
├── mysql-connector-python>=8.0.0
├── pymongo>=4.0.0
├── redis>=4.0.0
├── boto3>=1.26.0
└── google-cloud-storage>=2.0.0
```

---

## Technology Versions

| Component | Version | Release Date | EOL Date |
|-----------|---------|--------------|----------|
| Go | 1.24.0 | 2024-02 | 2026-02 |
| Node.js | 18.x LTS | 2022-10 | 2025-04 |
| Python | 3.9+ | 2020-10 | 2025-10 |
| PostgreSQL | 15 | 2022-10 | 2027-11 |
| Neo4j | 5.15 | 2023-11 | 2028-11 |
| Next.js | 14.0.4 | 2023-11 | Active |
| React | 18.2.0 | 2022-06 | Active |

---

## Conclusion

The technology stack is carefully curated for:
1. **Performance**: Fast execution and low latency
2. **Scalability**: Horizontal and vertical scaling support
3. **Maintainability**: Clear separation of concerns
4. **Developer Experience**: Modern tooling and frameworks
5. **Production Readiness**: Battle-tested technologies

All technologies are actively maintained with long-term support commitments.
