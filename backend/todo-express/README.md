# todo-express

Production-ready Todo REST API built with **Express 5 + TypeScript**, mirroring the feature set of `todo-nestjs`.

## Stack

| Concern | Library |
|---|---|
| Framework | Express 5 |
| Language | TypeScript 5 |
| Database | MongoDB (Mongoose 8) |
| Validation | Zod 3 |
| Cache | Redis (ioredis) + in-memory fallback |
| Job queue | BullMQ (Redis-optional) |
| Logging | Winston |
| Security | Helmet |
| Testing | Vitest + mongodb-memory-server + Supertest |

## Endpoints

```
GET    /health
GET    /api/todos?page=&limit=&status=
GET    /api/todos/:id
POST   /api/todos
PUT    /api/todos/:id
DELETE /api/todos/:id
```

## Setup

```bash
cp .env.example .env
# Edit MONGODB_URI (required). Set REDIS_ENABLED=true to activate cache + jobs.

npm install
npm run dev          # tsx watch — hot reload
npm run build        # compile to dist/
npm start            # run compiled output
```

## Testing

```bash
npm test             # run all tests once
npm run test:watch   # watch mode
npm run test:cov     # coverage report
```

## Key design decisions

- **Express 5** — async error propagation via `next(err)` works natively; no need for `express-async-errors`.
- **Zod** replaces NestJS `class-validator`/`class-transformer` decorators; schema is the single source of truth for types and runtime validation.
- **`req.query` read-only** — Express 5 exposes `req.query` as a getter. Validated/coerced query values are stored in `res.locals.validated.query` and read by route handlers.
- **Optimistic concurrency** — same `__v` / Mongoose `VersionError` mechanism as NestJS version.
- **Redis-optional** — `REDIS_ENABLED=false` (default) uses an in-memory Map for caching; BullMQ jobs are silently skipped.
- **Graceful shutdown** — SIGTERM/SIGINT closes the HTTP server and BullMQ workers before exit.
