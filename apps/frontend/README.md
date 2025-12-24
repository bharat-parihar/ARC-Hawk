# ARC Platform Frontend

Next.js 14 dashboard for Data Lineage and PII Classification visualization.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** CSS
- **Data Visualization:** ReactFlow (lineage graph)
- **HTTP Client:** Axios

## Project Structure

- **`app/`** - Next.js App Router pages and layouts
- **`components/`** - Reusable React components
- **`lib/`** - Utilities and helpers
- **`types/`** - TypeScript type definitions
- **`utils/`** - Utility functions

## Prerequisites

- Node.js 18+ and npm/yarn

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with backend API URL
   ```

## Running

**Development mode:**
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

**Production build:**
```bash
npm run build
npm start
```

## Features

- Single-page dashboard with summary cards
- Interactive data lineage graph visualization
- PII findings table with filtering
- Real-time data from backend API

## Development

The app uses TypeScript path aliases (`@/*`) for cleaner imports.

Example:
```typescript
import { MyComponent } from '@/components/MyComponent'
```
