# Paylio POS

Paylio POS is a full-stack restaurant billing and operations app built with React + Vite on the frontend and Node.js + Express on the backend.

The local development setup uses JSON files in `backend/data/*.json` as the active app datastore. MongoDB can still be configured, but the server now continues to run if MongoDB is unavailable.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, lucide-react
- Backend: Node.js, Express, Socket.IO
- Local data: JSON file store in `backend/data`
- Optional services: MongoDB, Redis/BullMQ, Cloudinary, SMTP

## Features

- POS billing for dine-in, takeaway, delivery, and pickup orders
- Cart management, discounts, split payments, held orders, and bill preview
- GST calculation standardized to 5%
- Table management with bulk creation, statuses, notes, and active/inactive toggle
- Kitchen display board and order status updates
- Inventory product/category management and stock movement tracking
- Reports for sales, tax, refunds, net sales, payment mix, and activity
- Auth flows for login, PIN login, registration OTP, password reset, token refresh, and logout

## Project Structure

```txt
Paylio POS/
├─ backend/
│  ├─ src/
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  ├─ models/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ utils/
│  │  ├─ app.js
│  │  └─ server.js
│  ├─ data/
│  ├─ .env.example
│  └─ package.json
├─ frontend/
│  ├─ src/
│  ├─ index.html
│  ├─ vite.config.js
│  └─ package.json
├─ .env.sample
└─ Reademe.md
```

## Prerequisites

- Node.js 18+; Node 20+ is recommended
- npm
- MongoDB is optional for local JSON-store development
- Redis is optional; without Redis, BullMQ workers are disabled

## Environment

Create a root `.env` from `.env.sample` and a backend `.env` from `backend/.env.example` when needed.

Important values:

```env
HOST=127.0.0.1
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/pos-app
GST_RATE=5
JWT_SECRET=replace-with-long-random-secret
JWT_REFRESH_SECRET=replace-with-long-random-refresh-secret
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Notes:

- `GST_RATE=5` keeps POS and reports aligned.
- `MONGO_URI` can point to a local or Docker Mongo instance, but the app can run without Mongo for local JSON-store usage.
- `REDIS_URL` is only required for background queue workers.

## Install And Run

Start the backend:

```bash
cd backend
npm install
npm run dev
```

Expected backend URL:

```txt
http://127.0.0.1:3001/
```

Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Expected frontend URL:

```txt
http://127.0.0.1:5173/
```

The Vite dev server proxies `/api/*` to `http://127.0.0.1:3001`.

## Verification

Backend health:

```bash
curl http://127.0.0.1:3001/health
```

Frontend build:

```bash
cd frontend
npm run build
```

Backend tests:

```bash
cd backend
npm test
```

## Data Store

Local app data lives in `backend/data/*.json`.

Keep these starter files populated so the app has a useful demo catalog:

- `categories.json`
- `products.json`
- `inventory.json`
- `tables.json`

Transient business/runtime files can be reset to `[]` during cleanup:

- `billing-invoices.json`
- `carts.json`
- `customers.json`
- `delivery-agents.json`
- `orders.json`
- `organizations.json`
- `otps.json`
- `outlet-stock.json`
- `print-jobs.json`
- `promo-codes.json`
- `recipes.json`
- `subscriptions.json`
- `users.json`

Reset `counters.json` to:

```json
{
  "invoice": {},
  "kot": {},
  "refund": {}
}
```

## Generated Files

These are generated or local-only and should not be committed:

- `node_modules/`
- `frontend/dist/`
- `backend/logs/`
- `.DS_Store`
- `.env`
- `backend/.env`

## Common Issues

### Vite proxy error: ECONNREFUSED 127.0.0.1:3001

The frontend is running but the backend is not.

Fix:

```bash
cd backend
npm run dev
```

Then check:

```bash
curl http://127.0.0.1:3001/health
```

### Port 3001 is already in use

Another backend process is already running. Stop the existing process or change `PORT` in the backend environment file.

### MongoDB unavailable warning

For local development this is non-fatal. The app continues using `backend/data/*.json`.

### Redis is not configured warning

This is non-fatal unless you need BullMQ background workers.

## API Highlights

- `GET /health`
- `POST /api/auth/login`
- `POST /api/auth/pin-login`
- `POST /api/auth/register`
- `POST /api/auth/refresh-token`
- `GET /api/public/menu`
- `POST /api/public/orders`
- `GET /api/public/orders`
- `GET /api/public/orders/summary`
- `GET /api/public/tables`
- `POST /api/public/tables`
- `PATCH /api/public/tables/:tableId/status`
- `GET /api/public/inventory/summary`
- `GET /api/public/inventory/daily-report`
- `GET /api/public/reports/overview`
- `GET /api/products`
- `POST /api/products`
- `GET /api/categories`
- `POST /api/categories`

## License

Private/internal project.
