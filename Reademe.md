# Paylio POS

Paylio POS is a full-stack restaurant billing and operations platform built with React + Vite (frontend) and Node.js + Express (backend).

It focuses on fast billing, clean table operations, inventory flow, and daily business visibility.

## Tech Stack

- Frontend: React, Vite
- Backend: Node.js, Express
- Realtime: Socket.IO hooks
- Data: JSON file store (`backend/data/*.json`)
- Optional DB: MongoDB connection (graceful fallback if unavailable)

## Current Core Features

- POS billing (dine-in / takeaway / delivery)
- Cart, split payments, hold/split bill actions
- GST calculation standardized to 5%
- Table management:
  - status update (`free`, `occupied`, `reserved`, `cleaning`)
  - auto-occupy on dine-in order save
  - bulk table creation
  - table notes, active/inactive toggle
- Inventory:
  - product/category management
  - stock in/out movement
  - daily stock report
- Reports:
  - sales, tax, refunds, net sales
  - payment mix
  - daily snapshot + hourly revenue
- Auth flows (login/register/OTP routes available in backend)

## Project Structure

```txt
Paylio POS/
├─ backend/
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ models/
│  │  ├─ middlewares/
│  │  ├─ utils/
│  │  ├─ app.js
│  │  └─ index.js
│  ├─ data/
│  └─ package.json
├─ frontend/
│  ├─ src/
│  │  ├─ pages/
│  │  ├─ components/
│  │  ├─ context/
│  │  └─ app/
│  └─ package.json
├─ .env
└─ .env.sample
```

## Prerequisites

- Node.js 18+ (recommended: 20+)
- npm

## Environment Variables

Root `.env` (and `.env.sample`) contains:

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/pos-app
GST_RATE=5
ACCESS_TOKEN_SECRET=...
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=...
REFRESH_TOKEN_EXPIRY=10d
```

Notes:
- `GST_RATE` is set to `5` for app-wide tax behavior.
- Mongo is optional for this setup; JSON file store is actively used.

## Install & Run

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Expected:
- `Server running at http://127.0.0.1:3001/`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:
- `http://127.0.0.1:5173`

Vite proxy forwards `/api/*` to backend `http://127.0.0.1:3001`.

## Build

Frontend production build:

```bash
cd frontend
npm run build
```

## Data Reset (JSON Store)

Data is stored in:
- `backend/data/*.json`

To reset non-user data quickly:
- keep `users.json`
- reset others to `[]`
- set `counters.json` to:

```json
{
  "invoice": {},
  "kot": {},
  "refund": {}
}
```

## Common Issues

### Vite proxy error `ECONNREFUSED 127.0.0.1:3001`

Backend is not running on port 3001.

Fix:
1. Start backend (`cd backend && npm run dev`)
2. Verify health:
   - `curl http://127.0.0.1:3001/health`

### Tax mismatch between POS and reports

Ensure:
- `.env` has `GST_RATE=5`
- backend restarted after `.env` changes
- historical orders are recalculated if they were created with old tax rates

## API Highlights (Public)

- `GET /api/public/menu`
- `POST /api/public/orders`
- `GET /api/public/orders`
- `GET /api/public/orders/summary`
- `GET /api/public/tables`
- `POST /api/public/tables`
- `POST /api/public/tables/bulk`
- `PATCH /api/public/tables/:tableId`
- `PATCH /api/public/tables/:tableId/status`
- `GET /api/public/inventory/summary`
- `GET /api/public/inventory/daily-report`
- `GET /api/public/reports/overview`

## License

Private/internal project (add license details if needed).
