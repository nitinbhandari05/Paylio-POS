# Paylio POS Backend

Express API for Paylio POS. It serves authentication, public POS operations, product/category management, inventory, reports, payments, tables, and realtime Socket.IO events.

## Local Runtime

The backend is designed to work in local development with the JSON file store in `backend/data/*.json`.

MongoDB is optional for the current local setup. If MongoDB is unavailable, startup logs a warning and the server continues with JSON data. Redis is also optional; without `REDIS_URL`, BullMQ workers are disabled.

## Requirements

- Node.js 18+; Node 20+ recommended
- npm
- Optional: MongoDB
- Optional: Redis

## Environment

Copy `.env.example` to `.env` if you need backend-specific environment values.

```bash
cp .env.example .env
```

Important values:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/pos-app
REDIS_URL=
JWT_SECRET=replace-with-long-random-secret
JWT_REFRESH_SECRET=replace-with-long-random-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Notes:

- `MONGO_URI` is optional for JSON-store development.
- Leave `REDIS_URL` empty unless Redis is running.
- Keep real Cloudinary, SMTP, and JWT secrets out of committed files.

## Scripts

```bash
npm run dev
```

Runs the API with nodemon at `http://127.0.0.1:3001`.

```bash
npm start
```

Runs the API with Node.

```bash
npm test
```

Runs the Jest/Supertest backend test suite.

## Health Check

```bash
curl http://127.0.0.1:3001/health
```

Expected response:

```json
{
  "ok": true,
  "service": "smart-pos-backend"
}
```

## Data Files

The local data store lives in `data/*.json`.

Starter/demo data to keep:

- `categories.json`
- `products.json`
- `inventory.json`
- `tables.json`

Runtime data that can be cleared during cleanup:

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

## Main Routes

Auth:

- `POST /api/auth/register`
- `POST /api/auth/register/request-otp`
- `POST /api/auth/login`
- `POST /api/auth/pin-login`
- `POST /api/auth/forgot-password/request-otp`
- `POST /api/auth/forgot-password/reset`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/auth/profile`

Public POS:

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
- `GET /api/public/inventory/stock`
- `POST /api/public/inventory/movement`
- `GET /api/public/reports/overview`

Protected API:

- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

## Common Warnings

`MongoDB unavailable; continuing with local JSON data store`

This is okay for local development.

`Redis is not configured; BullMQ workers are disabled`

This is okay unless background jobs are required.

`EADDRINUSE 127.0.0.1:3001`

Another backend process is already using port `3001`. Stop it or change `PORT`.

## Generated Files

Do not commit:

- `node_modules/`
- `logs/`
- `.env`
