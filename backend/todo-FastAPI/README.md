# FastAPI Todo App

A production-ready Todo REST API built with **FastAPI**, **MongoDB (Beanie/Motor)** or **PostgreSQL (SQLAlchemy/asyncpg)**, optional **Redis caching**, optional **ARQ background jobs**, and full **pytest-asyncio** test coverage.

This is the Python/FastAPI equivalent of the companion NestJS SSR Todo app — same features, same production standards.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Module Structure](#module-structure)
- [Request Lifecycle](#request-lifecycle)
- [Redis Cache Flow](#redis-cache-flow)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Docker Compose](#docker-compose)
- [Testing](#testing)
- [Key Design Decisions](#key-design-decisions)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Client (HTTP)                                 │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────────┐
│                     FastAPI App (Uvicorn / ASGI)                     │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    Middleware Stack                           │   │
│  │  CorrelationIdMiddleware  ← stamps / echoes X-Request-Id     │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                  Exception Handlers                           │   │
│  │  HTTPException  │  RequestValidationError  │  Exception       │   │
│  │  (structured JSON + correlationId in every error response)   │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────┐   ┌───────────────────────────────┐    │
│  │   todos router           │   │   health router               │    │
│  │   POST   /api/todos      │   │   GET /health                 │    │
│  │   GET    /api/todos      │   └───────────────────────────────┘    │
│  │   GET    /api/todos/{id} │                                        │
│  │   PUT    /api/todos/{id} │                                        │
│  │   DELETE /api/todos/{id} │                                        │
│  └──────────┬───────────────┘                                        │
│             │                                                        │
│  ┌──────────▼───────────────────────────────────────────────────┐    │
│  │                      TodoService                             │    │
│  │  create / find_all / find_one / update / remove              │    │
│  └──────────┬────────────────────────────────────┬─────────────┘    │
│             │                                    │                   │
│  ┌──────────▼──────────┐           ┌─────────────▼───────────────┐  │
│  │     MongoDB          │           │     ARQ Job Queue           │  │
│  │  (Beanie + Motor)    │           │  (todo_created task)        │  │
│  │  todos collection    │           │  separate worker process    │  │
│  └─────────────────────┘           └─────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │          CacheService  (module-level singleton)               │   │
│  │  redis.asyncio  ──  or  ──  dict-based in-memory shim         │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Module Structure

```
app/
├── config.py               Pydantic BaseSettings (env validation at startup)
├── database.py             MongoDB / PostgreSQL init / teardown + ping helpers
├── main.py                 FastAPI factory, lifespan, middleware, exception handlers
│
├── common/
│   ├── middleware.py       CorrelationIdMiddleware (ASGI)
│   └── exceptions.py      Global HTTP / validation / unhandled exception handlers
│
├── todos/
│   ├── models.py           Beanie Document: Todo, TodoStatus enum
│   ├── schemas.py          Pydantic v2 request + response schemas
│   ├── service.py          Business logic — CRUD + optimistic concurrency
│   └── router.py           FastAPI router (prefix /api/todos)
│
├── cache/
│   └── service.py          CacheService — Redis-first, in-memory fallback
│
├── jobs/
│   ├── tasks.py            ARQ task definitions + enqueueing helper
│   └── worker.py           ARQ worker entry point (separate process)
│
└── health/
    └── router.py           GET /health — MongoDB + Redis status
```

---

## Request Lifecycle

```
Incoming HTTP Request
        │
        ▼
CorrelationIdMiddleware      ← attaches / generates X-Request-Id on request.state
        │
        ▼
  FastAPI router
        │
        ├── CacheService.get()   ← (list endpoint only) check cache first
        │
        ▼
  TodoService method
        │
        ├── Beanie / Motor       ← DB read / write
        │
        └── enqueue_todo_created ← (create only) fire-and-forget ARQ job
        │
        ▼
Exception handlers             ← HTTPException / ValidationError / unhandled
        │
        ▼
Response  (X-Request-Id header echoed back)
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
    ◄────┘    │
  return      ▼
 cached    TodoService.find_all()
 result         │
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
   TodoService mutation
         │
         ▼
   CacheService.scan_del('todos:list:*')
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [FastAPI](https://fastapi.tiangolo.com) 0.115+ |
| Server | Uvicorn (ASGI) |
| Language | Python 3.12 |
| Database | MongoDB 8 via [Beanie](https://beanie-odm.dev) + [Motor](https://motor.readthedocs.io), or PostgreSQL 17 via SQLAlchemy + asyncpg |
| Validation | Pydantic v2 |
| Config | pydantic-settings (BaseSettings) |
| Caching | redis.asyncio — optional, in-memory fallback |
| Job Queue | [ARQ](https://arq-docs.helpmanual.io) (Redis-backed async jobs) |
| Testing | pytest + pytest-asyncio + httpx + mongomock-motor + fakeredis |
| Containerisation | Docker (multi-stage) + Docker Compose |

---

## Project Structure

```
todo-FastAPI/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app factory + lifespan
│   ├── config.py                  # Pydantic BaseSettings
│   ├── database.py                # MongoDB / PostgreSQL connect / disconnect
│   ├── common/
│   │   ├── __init__.py
│   │   ├── middleware.py          # CorrelationIdMiddleware
│   │   └── exceptions.py          # Global exception handlers
│   ├── todos/
│   │   ├── __init__.py
│   │   ├── models.py              # Beanie Document (Todo)
│   │   ├── postgres_models.py     # SQLAlchemy model (PostgreSQL)
│   │   ├── mongo_repository.py    # MongoDB repository
│   │   ├── postgres_repository.py # PostgreSQL repository
│   │   ├── repository.py          # Repository ABC
│   │   ├── schemas.py             # Pydantic request/response schemas
│   │   ├── service.py             # CRUD + optimistic concurrency
│   │   └── router.py              # /api/todos endpoints
│   ├── cache/
│   │   ├── __init__.py
│   │   └── service.py             # CacheService (Redis + in-memory)
│   ├── jobs/
│   │   ├── __init__.py
│   │   ├── tasks.py               # ARQ task definitions
│   │   └── worker.py              # Worker entry point
│   └── health/
│       ├── __init__.py
│       └── router.py              # GET /health
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # mongomock + HTTPX fixtures
│   ├── test_todos_api.py          # Integration tests (HTTP layer)
│   └── test_todos_service.py      # Unit tests (service layer)
│
├── scripts/
│   ├── dev.sh                     # Local dev server (uvicorn --reload)
│   └── worker.sh                  # ARQ worker entry point
│
├── Dockerfile                     # Two-stage build
├── docker-compose.yml             # app + worker + mongodb/postgresql + redis
├── Makefile                       # dev, test, lint, docker-up shortcuts
├── pyproject.toml                 # pytest + ruff configuration
├── requirements.txt               # Runtime dependencies (Docker)
├── requirements-dev.txt           # Test + lint dependencies
├── env.example
└── .dockerignore
```

---

## Data Model

### Todo Document (MongoDB collection: `todos`)

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | MongoDB auto |
| `title` | string | yes | — | 1–500 chars, trimmed |
| `description` | string | no | `null` | — |
| `due_date` | datetime (UTC) | no | `null` | — |
| `status` | enum | yes | `todo` | `todo` \| `doing` \| `done` |
| `priority` | integer | yes | `3` | 1–5 |
| `revision` | integer | yes | `0` | Optimistic concurrency counter |
| `created_at` | datetime (UTC) | auto | `utcnow` | — |
| `updated_at` | datetime (UTC) | auto | `utcnow` | Updated on every write |

**Index**: `{ status: 1, due_date: 1 }` (compound)

**Optimistic Concurrency**: Send the current `revision` in PUT requests. The service uses an atomic `findOneAndUpdate` with `{ _id, revision }` as the filter. If `revision` has changed since the client read the document (concurrent write), the filter matches nothing → HTTP 409 Conflict.

---

## API Reference

Base path: `/api/todos`

### List Todos

```
GET /api/todos
```

**Query Parameters**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `page` | integer | `1` | ≥ 1 |
| `limit` | integer | `10` | 1–100 |
| `status` | string | — | `todo` \| `doing` \| `done` |

**Response `200`**

```json
{
  "items": [
    {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "title": "Buy groceries",
      "description": null,
      "due_date": null,
      "status": "todo",
      "priority": 3,
      "revision": 0,
      "created_at": "2026-06-07T06:30:00Z",
      "updated_at": "2026-06-07T06:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

> List responses are cached with TTL `CACHE_TTL_SECONDS`. Key: `todos:list:page:<p>:limit:<l>:status:<s>`.

---

### Get Single Todo

```
GET /api/todos/{id}
```

**Response `200`** — single todo object

**Response `404`**
```json
{ "statusCode": 404, "message": "Todo not found", "path": "...", "correlationId": "..." }
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
  "description": "Milk and eggs",
  "due_date": "2026-06-10T00:00:00Z",
  "status": "todo",
  "priority": 2
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | yes | 1–500 chars |
| `description` | string | no | — |
| `due_date` | ISO 8601 datetime | no | — |
| `status` | enum | no | default `todo` |
| `priority` | integer | no | 1–5, default 3 |

**Response `201`** — created todo

Triggers: cache invalidation (`todos:list:*`) + ARQ `todo_created` job.

---

### Update Todo

```
PUT /api/todos/{id}
Content-Type: application/json
```

All fields are optional. Include `revision` to enable optimistic concurrency.

```json
{
  "title": "Updated title",
  "status": "doing",
  "revision": 0
}
```

**Response `200`** — updated todo (with `revision` incremented by 1)

**Response `409`** — stale revision
```json
{ "statusCode": 409, "message": "Version conflict. Please reload and try again." }
```

Triggers: cache invalidation (`todos:list:*`).

---

### Delete Todo

```
DELETE /api/todos/{id}
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
  "redis": "disabled",
  "uptime": 42.3
}
```

When `DB_PROFILE=postgresql`, `mongodb` is `"disabled"` and a `postgresql` field is included (`"up"` or `"down"`).

---

## Environment Variables

Copy `env.example` to `.env`:

See `env.example` for the full template. Key variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `8000` | HTTP listen port |
| `DB_PROFILE` | no | `mongodb` | `mongodb` \| `postgresql` |
| `MONGODB_URI` | when `DB_PROFILE=mongodb` | — | Full MongoDB connection string |
| `POSTGRESQL_URI` | when `DB_PROFILE=postgresql` | — | SQLAlchemy asyncpg DSN |
| `REDIS_ENABLED` | no | `false` | Enable Redis caching + ARQ jobs |
| `REDIS_URL` | no | — | Full Redis URL (overrides HOST+PORT) |
| `REDIS_HOST` | no | `127.0.0.1` | Redis hostname |
| `REDIS_PORT` | no | `6379` | Redis port |
| `CACHE_TTL_SECONDS` | no | `30` | Cache TTL in seconds |

Settings are validated at startup via Pydantic `BaseSettings`. The app refuses to boot if the URI for the active `DB_PROFILE` is missing or any value is invalid.

---

## Getting Started

### Prerequisites

- Python 3.12+
- MongoDB 7 (local or remote)
- Redis 7 (optional)

### Local Development

```bash
# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 2. Install dependencies
make install-dev            # or: pip install -r requirements-dev.txt

# 3. Configure environment
cp env.example .env
# edit .env — set MONGODB_URI (or POSTGRESQL_URI when DB_PROFILE=postgresql)

# 4. Start the API server
make dev                    # or: ./scripts/dev.sh
```

API: `http://localhost:8000`
Swagger UI: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

### Running the ARQ Worker (optional, requires Redis)

```bash
make worker                 # or: ./scripts/worker.sh
```

---

## Docker Compose

Database switching uses `DB_PROFILE` and compose **profiles**:

```bash
# MongoDB (default)
make docker-up
# or: docker compose --profile mongodb up --build

# PostgreSQL
make docker-up-pg
# or: DB_PROFILE=postgresql docker compose --profile postgresql up --build
```

```
Services:
  app        → http://localhost:8000  (FastAPI server)
  worker     → (ARQ background worker, same image)
  mongodb    → localhost:27017        (mongo:8, profile: mongodb)
  postgresql → localhost:5432         (postgres:17, profile: postgresql)
  redis      → localhost:6379         (redis:7-alpine, AOF persistence)
```

Run without Redis:

```bash
REDIS_ENABLED=false docker compose --profile mongodb up app mongodb --build
```

---

## Testing

### Run all tests

```bash
make test                   # or: pytest
```

### With coverage

```bash
make test-cov               # or: pytest --cov=app --cov-report=term-missing
```

### Lint and format

```bash
make lint                   # ruff check
make format                 # ruff format
```

No real MongoDB or Redis is required — `mongomock_motor` and `fakeredis` provide in-memory alternatives.

### Test coverage

| File | What is tested |
|---|---|
| `test_todos_api.py` | Full HTTP layer: create, list (pagination, status filter, limit guard), get single, update, OCC conflict, delete, full e2e flow, correlation ID echoing, health endpoint |
| `test_todos_service.py` | Service layer directly: create, find_all pagination, find_one 404, update field changes, OCC conflict, remove, remove 404 |

---

## Key Design Decisions

### Beanie ODM

[Beanie](https://beanie-odm.dev) is the async equivalent of Mongoose: document-oriented, Pydantic v2-based, supports embedded documents, indexes, and migrations. `Todo` is a `beanie.Document` subclass — Beanie handles collection naming, index creation, and async CRUD.

### Optimistic Concurrency via `revision`

Python/Beanie has no built-in `optimisticConcurrency` flag like Mongoose. Instead:

1. Every `Todo` document has a `revision: int` field (default 0).
2. On `PUT`, the client optionally sends the current `revision`.
3. The service issues an atomic `findOneAndUpdate` with `{ _id, revision }` as the filter and `$inc: { revision: 1 }` in the update.
4. If no document matches → either it doesn't exist (404) or the revision was stale (409 Conflict).

This is equivalent to Mongoose's `VersionError` / `__v` pattern.

### CacheService Singleton

`CacheService` is instantiated once at module import and injected via `Depends(get_cache)`. `startup()` / `shutdown()` are called in the FastAPI `lifespan` context manager. This ensures a single Redis connection pool across all requests — equivalent to the NestJS `@Global() CacheModule`.

When `REDIS_ENABLED=false`, the service uses a `dict`-based in-memory store with `time.monotonic()`-based TTL — no Redis dependency at all.

### ARQ for Background Jobs

[ARQ](https://arq-docs.helpmanual.io) is a lightweight async Redis queue. The web process enqueues jobs via a shared `arq.ArqRedis` pool. A separate `worker` process (or Docker Compose service) consumes them. `enqueue_todo_created` is fire-and-forget: it silently no-ops when Redis is disabled and swallows exceptions so a Redis hiccup never fails a create request.

### Pydantic v2 Settings

`pydantic-settings` reads `.env` files and validates every variable at process startup. If `MONGODB_URI` is missing or `APP_ENV` is not one of `development/test/production`, the process exits with a clear error message — no silent misconfigurations in production.

### Correlation IDs

`CorrelationIdMiddleware` stamps every request with a UUID (or passes through a client-supplied `X-Request-Id`). The ID is stored on `request.state.correlation_id` and echoed back in the response header. All exception handlers include it in the error JSON body for end-to-end traceability.
