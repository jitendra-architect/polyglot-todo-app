# todo-nestjs — Architectural Design Document

**Framework:** NestJS 11 · TypeScript 5  
**Default port:** `3000`  
**Part of:** [polyglot-todo-app](../../README.md)

> **Drop-in backend alternative.** Deploy this **instead of** Express, FastAPI, or Spring Boot — not alongside them. Connect to **one** database via `DB_PROFILE` (MongoDB *or* PostgreSQL). Unique among the four backends: includes **EJS server-side rendering** at `/todos/*`.

A production-ready, full-stack Todo application — REST API + SSR pages, optional Redis caching, optional BullMQ jobs, Jest + Supertest coverage.

---

## Table of Contents

- [Position in Monorepo](#position-in-monorepo)
- [Architecture Overview](#architecture-overview)
- [Module Dependency Graph](#module-dependency-graph)
- [Request Lifecycle](#request-lifecycle)
- [Redis Cache Flow](#redis-cache-flow)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Profile](#database-profile)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [SSR Routes](#ssr-routes)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Docker Compose](#docker-compose)
- [Testing](#testing)
- [Key Design Decisions](#key-design-decisions)

---

## Position in Monorepo

| Attribute | Value |
|---|---|
| Role | Reference implementation — REST API **and** SSR |
| Clients | React Web (`/api` proxy → `:3000`), React Native, browser SSR |
| Persistence | `DB_PROFILE=mongodb` (Mongoose) **or** `postgresql` (TypeORM) |
| Switching | Stop other backends; point clients at port `3000` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (Browser / API)                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │  HTTP
┌────────────────────────────▼────────────────────────────────────────┐
│                         NestJS App (Express)                        │
│                                                                     │
│  ┌──────────────────┐     ┌─────────────────────────────────────┐   │
│  │  Global Middleware│     │        Global Pipes & Filters       │   │
│  │  CorrelationId   │────▶│  ValidationPipe  AllExceptionsFilter │   │
│  │  (stamps X-Req-Id│     │  (whitelist, transform, forbidExtra) │   │
│  └──────────────────┘     └─────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                       Controllers                            │   │
│  │                                                              │   │
│  │  ┌──────────────────────┐   ┌──────────────────────────┐    │   │
│  │  │  TodosApiController  │   │  TodosViewController     │    │   │
│  │  │  GET  /api/todos     │   │  GET  /todos             │    │   │
│  │  │  GET  /api/todos/:id │   │  GET  /todos/:id         │    │   │
│  │  │  POST /api/todos     │   │  GET  /todos/new         │    │   │
│  │  │  PUT  /api/todos/:id │   │  GET  /todos/:id/edit    │    │   │
│  │  │  DEL  /api/todos/:id │   │  POST /todos             │    │   │
│  │  └──────────┬───────────┘   │  POST /todos/:id/update  │    │   │
│  │             │               │  POST /todos/:id/delete  │    │   │
│  │             │               └──────────┬───────────────┘    │   │
│  └─────────────┼──────────────────────────┼────────────────────┘   │
│                │                          │                         │
│  ┌─────────────▼──────────────────────────▼────────────────────┐   │
│  │                       TodosService                           │   │
│  │  create / findAll / findOne / update / remove               │   │
│  └──────────┬───────────────────────────────────────┬──────────┘   │
│             │                                        │              │
│  ┌──────────▼──────────┐              ┌─────────────▼────────────┐ │
│  │  ONE database        │              │     TodoQueueService     │ │
│  │  MongoDB or PG       │              │  (BullMQ — Redis queue)  │ │
│  └─────────────────────┘              └──────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │            CacheService  (@Global — single instance)         │   │
│  │  Redis (ioredis)  ──  or  ──  In-memory Map (shim)           │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Dependency Graph

```
AppModule (root)
├── ConfigModule        (isGlobal: true)  ← env vars + Joi validation
├── MongooseModule      (forRootAsync)    ← MongoDB connection
├── CacheModule         (@Global)         ← single Redis / in-memory instance
│     └── CacheService
├── HealthModule
│     └── HealthController               ← GET /health
├── TodosModule
│     ├── TodosApiController             ← REST API
│     ├── TodosViewController            ← SSR pages
│     ├── TodosService
│     └── JobsModule (imported)
└── JobsModule
      └── TodoQueueService               ← BullMQ worker + queue
```

---

## Request Lifecycle

```
Incoming HTTP Request
        │
        ▼
CorrelationIdMiddleware          ← attaches/generates X-Request-Id on req
        │
        ▼
CorrelationIdInterceptor         ← echoes X-Request-Id back in response header
        │
        ▼
ValidationPipe                   ← validates & transforms DTO (whitelist, transform)
        │
        ▼
  Controller method
        │
        ├─── CacheService.get()  ← (list endpoint only) check cache first
        │
        ▼
  TodosService method
        │
        ├─── Mongoose Model      ← DB read / write
        │
        └─── TodoQueueService    ← (create only) enqueue todo_created job
        │
        ▼
AllExceptionsFilter              ← catches all errors
        │                           • /api/* → JSON error response
        │                           • /todos/* → renders error.ejs view
        ▼
HTTP Response
```

---

## Redis Cache Flow

```
GET /api/todos?page=1&limit=10&status=todo
         │
         ▼
   Build cache key:
   todos:list:page:1:limit:10:status:todo
         │
         ▼
   CacheService.get(key)
         │
    ┌────┴────┐
    │  HIT?   │
    └────┬────┘
   YES   │   NO
    ◄────┘   │
   return    ▼
  cached   TodosService.findAll()
  result       │
               ▼
            MongoDB query
               │
               ▼
         CacheService.set(key, result, ttl)
               │
               ▼
            return result

POST / PUT / DELETE /api/todos
         │
         ▼
   TodosService mutation
         │
         ▼
   CacheService.scanDel('todos:list:*')
   (SCAN + DEL all list cache keys)
```

---

## Tech Stack

| Layer               | Technology                                           |
| ------------------- | ---------------------------------------------------- |
| Framework           | [NestJS](https://nestjs.com) 11 (Platform: Express)  |
| Language            | TypeScript 5                                         |
| Database            | MongoDB (Mongoose 8) **or** PostgreSQL (TypeORM) — one via `DB_PROFILE` |
| Templating (SSR)    | EJS + express-ejs-layouts                            |
| Caching             | Redis (ioredis) — optional, falls back to in-memory  |
| Job Queue           | BullMQ (optional, requires Redis)                    |
| Config / Validation | @nestjs/config + Joi                                 |
| Security            | helmet                                               |
| Testing             | Jest + Supertest + mongodb-memory-server             |
| Containerisation    | Docker (multi-stage) + Docker Compose                |

---

## Project Structure

```
todo-app/
├── src/
│   ├── app.module.ts                         # Root module
│   ├── main.ts                               # Bootstrap (helmet, EJS, pipes, filters)
│   │
│   ├── config/
│   │   ├── configuration.ts                  # Typed config factory
│   │   └── validation.ts                     # Joi env-var schema
│   │
│   ├── common/
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts      # Global error handler (JSON + SSR)
│   │   ├── interceptors/
│   │   │   └── correlation-id.interceptor.ts # Echo X-Request-Id header
│   │   ├── middleware/
│   │   │   └── correlation-id.middleware.ts  # Stamp X-Request-Id on request
│   │   └── interfaces/
│   │       └── correlated-request.interface.ts
│   │
│   ├── health/
│   │   ├── health.controller.ts              # GET /health
│   │   └── health.module.ts
│   │
│   ├── jobs/
│   │   ├── jobs.module.ts
│   │   └── todo.queue.ts                     # BullMQ queue + worker
│   │
│   ├── services/
│   │   ├── cache.module.ts                   # @Global CacheModule
│   │   └── cache.service.ts                  # Redis / in-memory cache
│   │
│   └── modules/
│       └── todos/
│           ├── todos.module.ts
│           ├── schemas/
│           │   └── todo.schema.ts            # Mongoose schema + TodoStatus enum
│           ├── dtos/
│           │   ├── create-todo.dto.ts
│           │   ├── update-todo.dto.ts
│           │   └── list-todos.dto.ts
│           ├── interfaces/
│           │   └── todo-response.interface.ts # TodoResponse, TodoListResult, DeleteResult
│           ├── controllers/
│           │   ├── todos.api.controller.ts   # REST API
│           │   └── todos.view.controller.ts  # SSR pages
│           └── services/
│               ├── todos.service.ts
│               └── todos.service.spec.ts
│
├── views/
│   ├── layout.ejs                            # Shared HTML shell
│   ├── error.ejs                             # Error page
│   └── todos/
│       ├── index.ejs                         # Todo list + pagination
│       ├── detail.ejs                        # Single todo detail
│       └── form.ejs                          # Create / edit form
│
├── public/
│   └── styles.css
│
├── test/
│   ├── app.e2e-spec.ts                       # E2E: create → list → delete
│   └── jest-e2e.json
│
├── Dockerfile                                # Multi-stage (deps → build → runner)
├── docker-compose.yml                        # app + mongodb + redis
├── env.example
├── jest.config.ts
├── nest-cli.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## Database Profile

Exactly **one** database is active per deployment.

```
DB_PROFILE=mongodb      →  MongooseModule + MongoTodosRepository
DB_PROFILE=postgresql   →  TypeOrmModule  + TypeOrmTodosRepository
```

| Rule | Detail |
|---|---|
| **Pick one** | `DB_PROFILE=mongodb` or `DB_PROFILE=postgresql` — never both |
| **URI** | `MONGODB_URI` or `POSTGRESQL_URI` — only the active profile's URI is required |
| **Switching** | Restart with new profile; data does not auto-migrate between databases |
| **API** | Identical `/api/todos` contract — clients unchanged |

```bash
# MongoDB (default)
DB_PROFILE=mongodb
MONGODB_URI=mongodb://localhost:27017/todos

# PostgreSQL
DB_PROFILE=postgresql
POSTGRESQL_URI=postgresql://postgres:postgres@localhost:5432/todos
```

---

## Data Model

### Todo Document

| Field         | Type     | Required | Default | Constraints                    |
| ------------- | -------- | -------- | ------- | ------------------------------ |
| `_id`         | ObjectId | auto     | —       | Mongoose auto                  |
| `title`       | string   | yes      | —       | trimmed                        |
| `description` | string   | no       | —       | trimmed                        |
| `dueDate`     | Date     | no       | —       | —                              |
| `status`      | enum     | yes      | `todo`  | `todo` \| `doing` \| `done`    |
| `priority`    | number   | yes      | `3`     | min 1, max 5                   |
| `createdAt`   | Date     | auto     | —       | Mongoose timestamps            |
| `updatedAt`   | Date     | auto     | —       | Mongoose timestamps            |
| `__v`         | number   | auto     | `0`     | Optimistic concurrency version |

**Index**: `{ status: 1, dueDate: 1 }` (compound)

**Optimistic Concurrency**: The schema uses `optimisticConcurrency: true`. When a client edits a document, it submits the current `__v`. If another write incremented `__v` in the meantime, Mongoose throws a `VersionError` which the service catches and re-raises as HTTP 409 Conflict.

---

## API Reference

Base path: `/api/todos`

### List Todos

```
GET /api/todos
```

**Query Parameters**

| Param    | Type    | Default | Constraints                 |
| -------- | ------- | ------- | --------------------------- |
| `page`   | integer | `1`     | min 1                       |
| `limit`  | integer | `10`    | min 1, max 100              |
| `status` | string  | —       | `todo` \| `doing` \| `done` |

**Response `200`**

```json
{
  "items": [
    {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "title": "Buy groceries",
      "description": "Milk, eggs, bread",
      "dueDate": "2026-06-10T00:00:00.000Z",
      "status": "todo",
      "priority": 2,
      "createdAt": "2026-06-07T06:30:00.000Z",
      "updatedAt": "2026-06-07T06:30:00.000Z",
      "__v": 0
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

> List responses are cached in Redis (or in-memory) with a TTL of `CACHE_TTL_SECONDS` (default 30 s). Cache key: `todos:list:page:<p>:limit:<l>:status:<s>`.

---

### Get Single Todo

```
GET /api/todos/:id
```

**Response `200`** — single `TodoResponse` object (same shape as an item above)

**Response `404`**

```json
{
  "statusCode": 404,
  "message": "Todo not found",
  "path": "/api/todos/bad-id",
  "correlationId": "uuid"
}
```

---

### Create Todo

```
POST /api/todos
Content-Type: application/json
```

**Request Body**

```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "dueDate": "2026-06-10",
  "status": "todo",
  "priority": 2
}
```

| Field         | Type                        | Required | Constraints    |
| ------------- | --------------------------- | -------- | -------------- |
| `title`       | string                      | yes      | non-empty      |
| `description` | string                      | no       | —              |
| `dueDate`     | ISO 8601 date string        | no       | —              |
| `status`      | `todo` \| `doing` \| `done` | no       | default `todo` |
| `priority`    | integer                     | no       | 1–5, default 3 |

**Response `201`** — created `TodoResponse`

Triggers: cache invalidation (`todos:list:*`) + BullMQ `todo_created` job.

---

### Update Todo

```
PUT /api/todos/:id
Content-Type: application/json
```

All fields are optional. Send `__v` to enable optimistic concurrency checking.

```json
{
  "title": "Buy organic groceries",
  "status": "doing",
  "priority": 1,
  "__v": 0
}
```

**Response `200`** — updated `TodoResponse`

**Response `409`** — version conflict (another writer updated the document first)

```json
{ "statusCode": 409, "message": "Version conflict. Please reload and try again." }
```

Triggers: cache invalidation (`todos:list:*`).

---

### Delete Todo

```
DELETE /api/todos/:id
```

**Response `200`**

```json
{ "status": "ok" }
```

Triggers: cache invalidation (`todos:list:*`).

---

### Health Check

```
GET /health
```

**Response `200`**

```json
{
  "status": "ok",
  "mongodb": "up",
  "redis": "up",
  "uptime": 142.5
}
```

`redis` is `"disabled"` when `REDIS_ENABLED=false`.

---

## SSR Routes

All SSR routes render EJS templates wrapped in `views/layout.ejs`.

| Method | Path                | Template       | Description                            |
| ------ | ------------------- | -------------- | -------------------------------------- |
| `GET`  | `/`                 | —              | Redirects to `/todos`                  |
| `GET`  | `/todos`            | `todos/index`  | Paginated list with status filter      |
| `GET`  | `/todos/new`        | `todos/form`   | Create form                            |
| `GET`  | `/todos/:id`        | `todos/detail` | Todo detail view                       |
| `GET`  | `/todos/:id/edit`   | `todos/form`   | Edit form (pre-filled, includes `__v`) |
| `POST` | `/todos`            | —              | Submit create → redirect to detail     |
| `POST` | `/todos/:id/update` | —              | Submit edit → redirect to detail       |
| `POST` | `/todos/:id/delete` | —              | Submit delete → redirect to list       |

> HTML forms use `POST` for all mutations (browser compatibility). The `__v` hidden field on the edit form enables optimistic concurrency for SSR edits.

---

## Environment Variables

Copy `env.example` to `.env`:

Copy `env.example` to `.env`:

| Variable            | Required | Default       | Description                             |
| ------------------- | -------- | ------------- | --------------------------------------- |
| `NODE_ENV`          | no       | `development` | `development` \| `test` \| `production` |
| `PORT`              | no       | `3000`        | HTTP listen port                        |
| `DB_PROFILE`        | no       | `mongodb`     | **Active** DB: `mongodb` or `postgresql` |
| `MONGODB_URI`       | when `mongodb` | —         | MongoDB connection string               |
| `POSTGRESQL_URI`    | when `postgresql` | —      | PostgreSQL connection string            |
| `REDIS_ENABLED`     | no       | `false`       | Enable Redis caching and BullMQ jobs    |
| `REDIS_URL`         | no       | —             | Full Redis URL (overrides HOST+PORT)    |
| `REDIS_HOST`        | no       | `127.0.0.1`   | Redis hostname                          |
| `REDIS_PORT`        | no       | `6379`        | Redis port                              |
| `CACHE_TTL_SECONDS` | no       | `30`          | Cache entry TTL in seconds              |

Env vars are validated at startup via Joi. The URI for the **active** `DB_PROFILE` must be set or the app refuses to boot.

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 7+ **or** PostgreSQL 17+ (one, matching `DB_PROFILE`)
- Redis 7 (optional)

### Local Development

```bash
# 1. Install dependencies
npm ci

# 2. Configure environment
cp env.example .env
# edit .env — set MONGODB_URI at minimum

# 3. Start in watch mode
npm run start:dev
```

App available at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

### Available Scripts

| Script              | Description                           |
| ------------------- | ------------------------------------- |
| `npm run start:dev` | Start with hot-reload (ts-node watch) |
| `npm run build`     | Compile TypeScript to `dist/`         |
| `npm start`         | Run compiled production build         |
| `npm run lint`      | ESLint check                          |
| `npm run format`    | Prettier format all sources           |
| `npm test`          | Unit tests                            |
| `npm run test:cov`  | Unit tests with coverage report       |
| `npm run test:e2e`  | End-to-end tests                      |

---

## Docker Compose

Use **one** Compose profile per deployment:

```bash
# MongoDB (default)
docker compose --profile mongodb up --build

# PostgreSQL
DB_PROFILE=postgresql docker compose --profile postgresql up --build

# Redis disabled
REDIS_ENABLED=false docker compose --profile mongodb up --build
```

```
Services:
  app        → http://localhost:3000
  mongodb    → :27017  (profile: mongodb)
  postgresql → :5432   (profile: postgresql)
  redis      → :6379   (optional)
```

Do **not** activate both database profiles together.

The app's **Dockerfile** is a three-stage build:

```
Stage 1 — deps     : npm ci (install only)
Stage 2 — builder  : copy deps + source, npm run build
Stage 3 — runner   : copy dist/ + public/ + views/, node dist/main.js
```

Final image is minimal (`node:20-alpine`) — no source, no devDependencies.

---

## Testing

### Unit Tests

```bash
npm test
```

`src/modules/todos/services/todos.service.spec.ts` — tests `TodosService` against a real in-memory MongoDB (mongodb-memory-server):

- `create` — persists a todo and returns the full response shape
- `findAll` — correct total and pagination

### End-to-End Tests

```bash
npm run test:e2e
```

`test/app.e2e-spec.ts` — full HTTP flow via Supertest against an in-memory MongoDB:

1. `POST /api/todos` → 201, verifies response body
2. `GET /api/todos` → 200, verifies created item appears in list
3. `DELETE /api/todos/:id` → 200
4. `GET /api/todos` → 200, verifies item is gone

Both test suites use `REDIS_ENABLED=false` — no Redis required to run tests.

---

## Key Design Decisions

### `@Global()` CacheModule

`CacheService` is registered once in a `@Global()` `CacheModule` imported by `AppModule`. This ensures a **single Redis connection** (or single in-memory Map) across the entire application. Previously, registering `CacheService` as a provider in multiple modules created duplicate connections.

### Why EJS for SSR?

EJS is a simple, zero-client-side-framework templating engine with seamless Express/NestJS integration, minimal learning curve, and no build step. Ideal for server-rendered forms where React/Vue would be over-engineering.

### Optimistic Concurrency

Mongoose's `optimisticConcurrency: true` uses `__v` as a version counter. On `save()`, Mongoose adds `__v: <current>` to the WHERE clause. If a concurrent update already incremented `__v`, the save matches zero documents and throws a `VersionError`. The service catches `VersionError` and re-raises as HTTP 409 Conflict. The SSR edit form includes a hidden `__v` field so concurrent browser edits are also protected.

### Cache Invalidation Strategy

On any mutation (create / update / delete) the app calls `CacheService.scanDel('todos:list:*')`. With Redis, this issues a non-blocking SCAN + DEL. With the in-memory shim, it iterates the Map. This is a **cache-aside with write-through invalidation** pattern: reads populate the cache, writes invalidate all affected keys.

### Correlation IDs

Every request is stamped with a UUID in `CorrelationIdMiddleware`. If the client already sends `X-Request-Id`, that value is reused (pass-through). The interceptor echoes the ID back in the response header. Every log line and error payload carries the same ID for end-to-end traceability.

### BullMQ Jobs

`TodoQueueService` is a no-op when Redis is disabled (`REDIS_ENABLED=false`) — the `enqueueTodoCreated` method returns immediately if the queue was never initialised. This means the job system adds zero overhead and zero failure risk in environments without Redis.

---

<p align="center">
  <a href="../../README.md">← Polyglot Todo App (root)</a> ·
  <a href="../todo-express/README.md">Express</a> ·
  <a href="../todo-FastAPI/README.md">FastAPI</a> ·
  <a href="../todo-spring/README.md">Spring Boot</a>
</p>
