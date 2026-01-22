# ARC Platform Frontend

The official dashboard for ARC-Hawk, built with **Next.js 14**, **TypeScript**, and **ReactFlow**.

## 🌟 Features

- **Dashboard**: Real-time risk summary and scan status.
- **Findings Explorer**: comprehensive data grid with filtering (Risk, Asset, Status).
- **Lineage Graph**: Interactive **ReactFlow** visualization of data movement.
- **Compliance Center**: DPDPA readiness tracking.
- **Remediation**: One-click actions to mask or delete sensitive data.
- **Real-Time**: WebSocket connection for live scan progress updates.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + CSS Modules
- **State**: React Hooks + Context
- **Visuals**: ReactFlow, Recharts, Lucide Icons

## 📂 Project Structure

```
app/
├── components/         # Reusable UI components
│   ├── layout/         # GlobalLayout, Nav
│   ├── remediation/    # Action Modals
│   ├── sources/        # Connection Wizards
│   └── ui/             # Generic UI Kit
├── services/           # Typed API Clients
│   ├── findings.api.ts
│   ├── remediation.api.ts
│   └── ...
├── utils/              # Helpers
└── app/                # Next.js Pages
    ├── findings/
    ├── compliance/
    ├── reports/
    └── page.tsx        # Homepage
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- NPM / Yarn

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure Environment
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1" > .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws" >> .env.local

# 3. Run Development Server
npm run dev
```

Visit `http://localhost:3000` to access the dashboard.

## 🧪 Testing

We use a simple smoke test script to verify API connectivity:

```bash
npx ts-node scripts/smoke-test.ts
```

## 📦 Building for Production

The project is Dockerized for production deployment:

```bash
docker build -t arc-frontend .
```
