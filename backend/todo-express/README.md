# todo-express — Architectural Design Document

**Framework:** Express 5 · TypeScript 5  
**Default port:** `3001`  
**Part of:** [polyglot-todo-app](../../README.md)

> **Drop-in backend alternative.** Deploy this **instead of** NestJS, FastAPI, or Spring Boot — not alongside them. Connect to **one** database via `DB_PROFILE` (MongoDB *or* PostgreSQL).

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Request Lifecycle](#3-request-lifecycle)
4. [Tech Stack](#4-tech-stack)
5. [Project Structure](#5-project-structure)
6. [Database Profile](#6-database-profile)
7. [Data Model](#7-data-model)
8. [API Reference](#8-api-reference)
9. [Environment Variables](#9-environment-variables)
10. [Getting Started](#10-getting-started)
11. [Docker Compose](#11-docker-compose)
12. [Testing](#12-testing)
13. [Key Design Decisions](#13-key-design-decisions)

---

## 1. System Overview

`todo-express` is the **minimal, framework-free** implementation of the polyglot Todo API — same HTTP contract as `todo-nestjs`, `todo-FastAPI`, and `todo-spring`, built with raw Express 5 and explicit factory wiring.

| Attribute | Value |
|---|---|
| Style | Monolithic REST API (12-Factor) |
| Persistence | MongoDB (Mongoose) **or** PostgreSQL (TypeORM) — one active |
| Caching | Cache-aside; Redis optional, in-memory fallback |
| Jobs | BullMQ (optional, requires Redis) |
| Clients | React Web, React Native — no changes when pointing here |

**Scope:** CRUD, pagination, status filtering, optimistic concurrency (`__v`), correlation IDs, structured errors.

**Non-scope:** SSR pages, authentication, multi-tenancy.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│              Client (React / React Native / cURL)                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │  HTTP/REST
┌────────────────────────────▼────────────────────────────────────────┐
│                     Express 5 App (TypeScript)                        │
│                                                                     │
│  ┌──────────────────┐     ┌─────────────────────────────────────┐   │
│  │  Middleware       │     │  Zod validate → res.locals.validated │   │
│  │  helmet           │     │  correlation-id                      │   │
│  │  express.json()   │     │  global error handler                │   │
│  └──────────────────┘     └─────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Routes                                                       │   │
│  │  GET  /health          GET/POST/PUT/DELETE  /api/todos       │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                         │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  TodosController → TodosService → ITodosRepository           │   │
│  └──────────┬───────────────────────────────┬─────────────────┘   │
│             │                               │                       │
│  ┌──────────▼──────────┐         ┌──────────▼──────────┐           │
│  │  ONE database       │         │  CacheService        │           │
│  │  MongoDB or PG      │         │  TodoQueueService    │           │
│  └─────────────────────┘         └─────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Factory Pattern

`createApp(cfg, todosRepo)` wires the Express app without side effects — ideal for Supertest integration tests. `server.ts` handles bootstrap, DB connection, graceful shutdown.

```
server.ts
  ├── read config (Joi-validated)
  ├── connect DB based on DB_PROFILE
  ├── instantiate MongoTodosRepository | PostgresTodosRepository
  ├── createApp(config, repo)
  ├── queue.start()
  └── listen + SIGTERM/SIGINT shutdown
```

---

## 3. Request Lifecycle

```
HTTP Request
     │
     ▼
helmet + body parser
     │
     ▼
correlationIdMiddleware     ← X-Request-Id (generate or pass-through)
     │
     ▼
Zod validate middleware     ← body / query / params → res.locals.validated
     │
     ▼
TodosController
     │
     ├── GET list  → CacheService.get(key) ──hit──► return
     │                    miss → TodosService.findAll() → cache.set()
     │
     ├── POST      → TodosService.create() → queue.enqueue() → cache.scanDel()
     └── PUT/DEL   → TodosService → cache.scanDel()
     │
     ▼
errorHandlerMiddleware      ← HttpError → structured JSON + correlationId
```

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Express](https://expressjs.com) 5 |
| Language | TypeScript 5 |
| MongoDB ODM | Mongoose 8 |
| PostgreSQL ORM | TypeORM + pg |
| Validation | Zod 3 (schema = types + runtime) |
| Config | Joi env validation at startup |
| Caching | ioredis — optional; in-memory Map fallback |
| Job Queue | BullMQ — optional, requires Redis |
| Logging | Winston |
| Security | Helmet |
| Testing | Vitest + Supertest + mongodb-memory-server |
| Containerisation | Docker multi-stage + Compose profiles |

---

## 5. Project Structure

```
todo-express/
├── src/
│   ├── server.ts                         # Bootstrap + graceful shutdown
│   ├── app.ts                            # createApp() factory
│   ├── config/
│   │   └── configuration.ts              # Typed config + Joi validation
│   ├── db/
│   │   ├── mongoose.ts                   # MongoDB connect/disconnect
│   │   └── postgres.ts                   # PostgreSQL / TypeORM DataSource
│   ├── common/
│   │   ├── logger.ts                     # Winston instance
│   │   ├── errors/http-error.ts          # Typed HTTP errors
│   │   └── middleware/
│   │       ├── correlation-id.middleware.ts
│   │       ├── validate.middleware.ts    # Zod wrapper
│   │       └── error-handler.middleware.ts
│   ├── services/
│   │   ├── cache.service.ts              # Redis / in-memory cache-aside
│   │   └── todo-queue.service.ts         # BullMQ worker + queue
│   ├── health/
│   │   └── health.router.ts              # GET /health
│   └── modules/todos/
│       ├── controllers/todos.controller.ts
│       ├── service/todos.service.ts
│       ├── router/todos.router.ts
│       ├── validators/todo.validators.ts # Zod schemas
│       ├── schemas/todo.model.ts         # Mongoose schema + TodoStatus
│       └── repository/
│           ├── todos-repository.interface.ts
│           ├── mongo-todos.repository.ts
│           └── postgres-todos.repository.ts
├── test/
│   └── todos.spec.ts                     # HTTP integration tests
├── Dockerfile
├── docker-compose.yml                    # Compose profiles: mongodb | postgresql
├── .env.example
├── vitest.config.ts
└── package.json
```

---

## 6. Database Profile

Exactly **one** database is active per deployment.

```
DB_PROFILE=mongodb      →  MONGODB_URI      →  MongoTodosRepository (Mongoose)
DB_PROFILE=postgresql   →  POSTGRESQL_URI   →  PostgresTodosRepository (TypeORM)
```

| Rule | Detail |
|---|---|
| **Pick one** | Set `DB_PROFILE` to `mongodb` or `postgresql` — never both |
| **Connection** | Only the URI matching the active profile is used |
| **Switching** | Stop server, change `DB_PROFILE` + URI, restart — no auto-migration |
| **API unchanged** | Clients see the same JSON contract regardless of database |

```bash
# MongoDB (default)
DB_PROFILE=mongodb
MONGODB_URI=mongodb://localhost:27017/todos

# PostgreSQL
DB_PROFILE=postgresql
POSTGRESQL_URI=postgresql://postgres:postgres@localhost:5432/todos
```

---

## 7. Data Model

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | string | auto | — | ObjectId (Mongo) or UUID (PG) |
| `title` | string | yes | — | trimmed, max 200 |
| `description` | string | no | — | |
| `dueDate` | ISO-8601 | no | — | |
| `status` | enum | yes | `todo` | `todo` \| `doing` \| `done` |
| `priority` | integer | yes | `3` | 1–5 |
| `createdAt` | ISO-8601 | auto | — | |
| `updatedAt` | ISO-8601 | auto | — | |
| `__v` | integer | auto | `0` | Optimistic concurrency |

**Index:** `{ status: 1, dueDate: 1 }`

Mongoose uses `optimisticConcurrency: true` with `versionKey: '__v'`. PostgreSQL uses a `version` column mapped to `__v` in API responses. Stale `__v` on PUT → **409 Conflict**.

---

## 8. API Reference

Base path: `/api/todos`

| Method | Path | Success |
|---|---|---|
| `GET` | `/health` | `200` |
| `GET` | `/api/todos` | `200` |
| `GET` | `/api/todos/:id` | `200` / `404` |
| `POST` | `/api/todos` | `201` |
| `PUT` | `/api/todos/:id` | `200` / `404` / `409` |
| `DELETE` | `/api/todos/:id` | `200` / `404` |

### Query Parameters — `GET /api/todos`

| Param | Default | Constraints |
|---|---|---|
| `page` | `1` | min 1 |
| `limit` | `10` | 1–100 |
| `status` | — | `todo` \| `doing` \| `done` |

### Create — `POST /api/todos`

```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs",
  "dueDate": "2026-06-15T00:00:00Z",
  "status": "todo",
  "priority": 2
}
```

### Update — `PUT /api/todos/:id`

All fields optional. Include `__v` for optimistic concurrency.

```json
{ "title": "Updated", "status": "doing", "__v": 0 }
```

### List Response

```json
{
  "items": [{ "_id": "...", "title": "...", "status": "todo", "priority": 3, "__v": 0 }],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

### Error Envelope

```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": { "title": "Title is required" },
  "path": "/api/todos",
  "correlationId": "uuid",
  "timestamp": "2026-06-07T08:00:00Z"
}
```

List responses are cached (`todos:list:page:<p>:limit:<l>:status:<s>`, TTL 30s). Mutations invalidate `todos:list:*`.

---

## 9. Environment Variables

Copy `.env.example` to `.env`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `3001` | HTTP listen port |
| `DB_PROFILE` | no | `mongodb` | **Active** DB: `mongodb` or `postgresql` |
| `MONGODB_URI` | when `mongodb` | — | MongoDB connection string |
| `POSTGRESQL_URI` | when `postgresql` | — | PostgreSQL connection string |
| `REDIS_ENABLED` | no | `false` | Enable Redis cache + BullMQ |
| `REDIS_URL` | no | — | Full Redis URL (overrides HOST+PORT) |
| `REDIS_HOST` | no | `127.0.0.1` | Redis hostname |
| `REDIS_PORT` | no | `6379` | Redis port |
| `CACHE_TTL_SECONDS` | no | `30` | List cache TTL |

Joi validates all variables at startup. Missing URI for the active `DB_PROFILE` prevents boot.

---

## 10. Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 7+ **or** PostgreSQL 17+ (one, matching `DB_PROFILE`)
- Redis 7+ (optional)

### Local Development

```bash
cp .env.example .env
# Set DB_PROFILE + matching URI

npm install
npm run dev          # tsx watch — http://localhost:3001
```

### Production

```bash
npm run build
npm start            # node dist/server.js
```

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Hot reload via tsx |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled output |
| `npm test` | Vitest integration tests |
| `npm run test:cov` | Coverage report |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## 11. Docker Compose

Use **one** Compose profile per deployment:

```bash
# MongoDB (default)
docker compose --profile mongodb up --build

# PostgreSQL
DB_PROFILE=postgresql docker compose --profile postgresql up --build

# With Redis
REDIS_ENABLED=true docker compose --profile mongodb up --build
```

```
Services (per profile):
  app        → http://localhost:3001
  mongodb    → :27017  (profile: mongodb)
  postgresql → :5432   (profile: postgresql)
  redis      → :6379   (optional)
```

Do **not** activate both `mongodb` and `postgresql` profiles together.

---

## 12. Testing

```bash
npm test
npm run test:cov
```

`test/todos.spec.ts` — full HTTP flow via Supertest + mongodb-memory-server:

- Create validation (422 empty title, priority range)
- CRUD happy paths
- Pagination and status filter
- Optimistic concurrency (409 stale `__v`)
- Health endpoint

Tests run with `REDIS_ENABLED=false` — no external Redis required.

---

## 13. Key Design Decisions

### Express 5 native async errors

Async route handlers propagate rejections without `express-async-errors`. Errors reach `errorHandlerMiddleware` via Express 5's built-in promise handling.

### Zod as single source of truth

Validation schemas in `todo.validators.ts` define runtime rules and infer TypeScript types. No duplicate DTO classes.

### Read-only `req.query` (Express 5)

Express 5 exposes `req.query` as a getter. Validated query values are stored in `res.locals.validated.query` and read by controllers — avoids mutating the read-only object.

### Repository interface

`ITodosRepository` decouples `TodosService` from persistence. `server.ts` injects the correct implementation based on `DB_PROFILE` — same pattern as NestJS/FastAPI/Spring.

### Redis-optional by design

`CacheService` falls back to an in-memory `Map`. `TodoQueueService.enqueueTodoCreated()` no-ops when Redis is disabled — zero overhead in local dev.

### Graceful shutdown

SIGTERM/SIGINT → close HTTP server → stop BullMQ workers → disconnect DB → exit. 10s force-kill timeout prevents hung processes.

---

<p align="center">
  <a href="../../README.md">← Polyglot Todo App (root)</a> ·
  <a href="../todo-nestjs/README.md">NestJS</a> ·
  <a href="../todo-FastAPI/README.md">FastAPI</a> ·
  <a href="../todo-spring/README.md">Spring Boot</a>
</p>
