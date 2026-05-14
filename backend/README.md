# Smart POS Backend

Production-oriented Node.js, Express, MongoDB, Redis, Socket.IO, BullMQ backend for POS, inventory, payments, invoices, and analytics.

## Setup

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

API docs are served at `http://127.0.0.1:3001/api/docs`.

## Main Modules

- JWT auth with refresh tokens and role-based access: `admin`, `manager`, `cashier`
- User, product, category, customer, order, payment, refund, inventory, coupon, notification, audit schemas
- Product image upload through Cloudinary
- Inventory transactions for `ADD`, `REMOVE`, `SALE`, `RETURN`
- GST/tax, coupon, discount, invoice PDF generation
- Redis caching for product, report, and dashboard APIs
- BullMQ queues for invoices, notifications, refunds, and scheduled reports
- Socket.IO events: `new-order`, `order-completed`, `payment-success`, `low-stock-alert`
- Winston request/error logging, Helmet, CORS, rate limiting, validation

## Docker

```bash
docker compose up --build
```

## Tests

```bash
npm test
```
