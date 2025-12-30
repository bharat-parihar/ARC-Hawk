# ARC Platform Frontend

Next.js 14 dashboard for Data Lineage and PII Classification visualization.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Vanilla CSS + CSS Modules (`globals.css`, `design-system/`)
- **Data Visualization:** ReactFlow (via `modules/lineage`)
- **State Management:** React Hooks
- **HTTP Client:** Axios (Centralized in `utils/api-client.ts`)

## Project Structure

- **`app/`** - Next.js App Router pages and layouts
- **`components/`** - Reusable React components (UI)
- **`services/`** - API Service Layer (Modular, Type-Safe)
    - `assets.api.ts`
    - `findings.api.ts`
    - `lineage.api.ts`
    - `classification.api.ts`
    - `scans.api.ts`
    - `health.api.ts`
- **`modules/`** - Complex feature modules (e.g., Lineage Graph)
- **`types/`** - TypeScript type definitions
- **`utils/`** - Shared utilities (`api-client.ts`)
- **`design-system/`** - Design tokens and theme constants (`colors.ts`, `themes.ts`)

## Key Features

1.  **Risk Summary Dashboard**: Real-time view of PII risks and scan status.
2.  **Interactive Lineage Graph**: ReactFlow-based visualization of data flow (System -> Asset -> Column).
3.  **Semantic Search**: Graph traversal for PII impact analysis.
4.  **Findings Explorer**: Detailed table of security findings with filtering.
5.  **Strict API Contract**:
    - Centralized `apiClient` with standardized error handling.
    - Explicit type mappings for all responses.
    - No "magic" data unwrapping (preventing metadata loss).

## Setup & Development

### Prerequisites
- Node.js 18+

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
# Access at http://localhost:3000
```

### Building for Production
```bash
npm run build
npm start
```

### Testing
Run smoke tests to verify API connectivity and contract health:
```bash
npx ts-node scripts/smoke-test.ts
```

## Architecture Notes

- **Service Layer Pattern**: direct `axios` calls in components are forbidden. All data fetching must go through `services/*.api.ts`.
- **Design System**: We do not use Tailwind CSS. All styling uses standard CSS variables defined in `:root`.
- **Error Handling**: The `apiClient` interceptors log standardized errors. Services should throw clean errors to the UI.

