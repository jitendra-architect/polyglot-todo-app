# todo-spring — Architectural Design Document

**Version:** 1.0.0-SNAPSHOT  
**Framework:** Spring Boot 4.0.6 · Java 25  
**Last Updated:** June 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Design (HLD)](#2-high-level-design-hld)
   - 2.1 [System Context](#21-system-context)
   - 2.2 [Architecture Style](#22-architecture-style)
   - 2.3 [Component Overview](#23-component-overview)
   - 2.4 [Data Flow](#24-data-flow)
   - 2.5 [Cross-Cutting Concerns](#25-cross-cutting-concerns)
   - 2.6 [Technology Choices & Rationale](#26-technology-choices--rationale)
3. [Low-Level Design (LLD)](#3-low-level-design-lld)
   - 3.1 [Package Structure](#31-package-structure)
   - 3.2 [Layer Responsibilities](#32-layer-responsibilities)
   - 3.3 [Domain Model](#33-domain-model)
   - 3.4 [API Contract](#34-api-contract)
   - 3.5 [Service Layer — Business Logic](#35-service-layer--business-logic)
   - 3.6 [Caching Strategy](#36-caching-strategy)
   - 3.7 [Optimistic Concurrency Control](#37-optimistic-concurrency-control)
   - 3.8 [Async Event Pipeline](#38-async-event-pipeline)
   - 3.9 [Request Correlation](#39-request-correlation)
   - 3.10 [Exception Handling & Error Taxonomy](#310-exception-handling--error-taxonomy)
   - 3.11 [Validation Strategy](#311-validation-strategy)
   - 3.12 [Configuration Management](#312-configuration-management)
4. [Database Design](#4-database-design)
5. [Testing Strategy](#5-testing-strategy)
6. [Deployment & Operations](#6-deployment--operations)
7. [Extension Points](#7-extension-points)
8. [ADRs — Architecture Decision Records](#8-adrs--architecture-decision-records)

---

## 1. System Overview

`todo-spring` is a production-grade, synchronous REST API backend for a Todo application.
It is the **Spring Boot 4 implementation** of a backend that also exists in NestJS and Express,
all sharing the same HTTP contract so any frontend (React, React Native) can switch backends
without code changes.

**Scope:** CRUD operations for Todo items, with pagination, status filtering, cache-aside
reads, optimistic concurrency control, and async post-write event processing.

**Non-scope:** Authentication, authorization, multi-tenancy, file attachments.

---

## 2. High-Level Design (HLD)

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│   React Web App    React Native App    cURL / Postman / API GW  │
└──────────────────────────────┬──────────────────────────────────┘
                               │  HTTP/REST  (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    todo-spring  (Port 3001)                      │
│                   Spring Boot 4  ·  Java 25                     │
└───────────────────────┬──────────────────────┬──────────────────┘
                        │                      │
              MongoDB   │                      │ Caffeine
        ┌───────────────▼──────┐    ┌──────────▼───────────┐
        │  MongoDB 7+           │    │  In-Process Cache    │
        │  Collection: todos    │    │  (Caffeine, 500 max) │
        └───────────────────────┘    └──────────────────────┘
                                              │
                              Optional future │
                        ┌─────────────────────▼──────────┐
                        │  Redis  (CACHE_TYPE=redis)      │
                        │  Distributed cache / queues     │
                        └────────────────────────────────┘
```

### 2.2 Architecture Style

| Attribute | Decision |
|---|---|
| Style | Monolithic RESTful service (12-Factor App) |
| Communication | Synchronous HTTP/REST |
| Internal events | Asynchronous (Spring ApplicationEvent, thread pool) |
| Persistence | Document store (MongoDB) |
| Caching | Cache-aside with write-through eviction |
| Deployment target | JVM process (Jar), Docker-ready |

### 2.3 Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        todo-spring                              │
│                                                                  │
│  ┌─────────────────────┐     ┌──────────────────────────────┐   │
│  │   Cross-Cutting     │     │      Controller Layer        │   │
│  │                     │     │                              │   │
│  │  CorrelationFilter  │────▶│  TodoController              │   │
│  │  GlobalExHandler    │     │  HealthController            │   │
│  │  ApiError           │     └──────────────┬───────────────┘   │
│  └─────────────────────┘                    │                   │
│                                             ▼                   │
│  ┌─────────────────────┐     ┌──────────────────────────────┐   │
│  │   Configuration     │     │       Service Layer          │   │
│  │                     │     │                              │   │
│  │  AppProperties      │────▶│  TodoService (interface)     │   │
│  │  AsyncConfig        │     │  TodoServiceImpl             │   │
│  │  MongoConfig        │     └──────────────┬───────────────┘   │
│  │  WebConfig          │                    │                   │
│  └─────────────────────┘          ┌─────────┴──────────┐       │
│                                   │                     │       │
│                           ┌───────▼──────┐   ┌─────────▼────┐  │
│                           │  Repository  │   │    Cache     │  │
│                           │    Layer     │   │   Manager    │  │
│                           │              │   │  (Caffeine)  │  │
│                           │TodoRepository│   └──────────────┘  │
│                           └───────┬──────┘                     │
│                                   │                            │
│  ┌─────────────────────┐  ┌───────▼──────────────────────┐    │
│  │   Async Pipeline    │  │        Model Layer            │    │
│  │                     │  │                               │    │
│  │  TodoCreatedEvent   │  │  Todo (@Document)             │    │
│  │  TodoEventListener  │  │  TodoStatus (enum)            │    │
│  └─────────────────────┘  └───────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Data Flow

**Read (GET /api/todos):**
```
Client
  │
  ▼  HTTP GET ?page=1&limit=10&status=todo
CorrelationIdFilter ──► attach/generate X-Request-Id
  │
  ▼
TodoController.list()
  │
  ▼
TodoServiceImpl.findAll()
  │
  ├──► CacheManager.get("list:p1:l10:stodo")
  │         │
  │    Hit ─┘ ──────────────────────────────────► return cached response
  │
  └── Miss ──► TodoRepository.findAllByStatus(DONE, pageable)
                    │
                    ▼  MongoDB query with pagination + sort
               Page<Todo>
                    │
                    ▼
               TodoMapper.toResponse()  [entity → DTO]
                    │
                    ▼
               CacheManager.put(key, result)
                    │
                    ▼
               TodoListResponse ──────────────────► 200 OK
```

**Write (POST /api/todos):**
```
Client
  │
  ▼  HTTP POST + JSON body
CorrelationIdFilter ──► X-Request-Id
  │
  ▼
TodoController.create()
  │  @Valid → Jakarta Bean Validation
  ▼
TodoServiceImpl.create()
  │
  ├──► new Todo() ──► TodoRepository.save() ──► MongoDB insert
  │
  ├──► CacheManager.getCache("todos").clear()   [evict all list pages]
  │
  ├──► ApplicationEventPublisher.publishEvent(TodoCreatedEvent)
  │         └──► (async, asyncExecutor thread pool)
  │              TodoEventListener.onTodoCreated() ──► log
  │
  └──► TodoMapper.toResponse() ──────────────────────► 201 Created
```

### 2.5 Cross-Cutting Concerns

| Concern | Mechanism | Where |
|---|---|---|
| Request tracing | `X-Request-Id` header — generate if absent | `CorrelationIdFilter` |
| Error handling | `@RestControllerAdvice` catches typed exceptions | `GlobalExceptionHandler` |
| Validation — body | `@Valid` + Jakarta Bean Validation | `TodoController` |
| Validation — query/path | `@Validated` + `@Min`/`@Max` | `TodoController` |
| Caching | Cache-aside via `CacheManager` | `TodoServiceImpl` |
| Async processing | `@Async` + `ApplicationEventPublisher` | `TodoEventListener` |
| Auditing | `@CreatedDate`, `@LastModifiedDate` | `Todo` (Mongo Auditing) |
| Config binding | `@ConfigurationProperties` | `AppProperties` |
| Observability | Spring Actuator `/actuator/health`, `/actuator/info` | Auto-config |

### 2.6 Technology Choices & Rationale

| Technology | Version | Why |
|---|---|---|
| Spring Boot | 4.0.6 | Latest GA; Spring 7 / Jakarta EE 11 baseline |
| Java | 25 | LTS; records, sealed types, virtual threads ready |
| Spring Data MongoDB | BOM-managed | Declarative repository pattern, Mongo Auditing |
| Caffeine | BOM-managed | High-performance in-process W-TinyLFU cache; zero infra |
| Jakarta Bean Validation | 3.x | Declarative, annotation-driven input validation |
| Spring Actuator | BOM-managed | Production health/info endpoints out-of-the-box |
| Lombok | BOM-managed | Eliminate boilerplate (`@Data`, `@RequiredArgsConstructor`) |
| JUnit 5 + Mockito | BOM-managed | Standard Spring test stack |
| Flapdoodle Embed Mongo | 4.24.0 | Real MongoDB 7 in-process for integration tests |

---

## 3. Low-Level Design (LLD)

### 3.1 Package Structure

```
com.todo/
├── TodoApplication.java              # @SpringBootApplication entry point
│
├── controller/                       # HTTP layer — routes, request parsing, response codes
│   ├── TodoController.java           # /api/todos (CRUD)
│   └── HealthController.java         # /health
│
├── service/                          # Business logic contract
│   ├── TodoService.java              # Interface — decouples controller from impl
│   └── impl/
│       └── TodoServiceImpl.java      # Implementation — cache + events + concurrency
│
├── repository/                       # Data access layer
│   └── TodoRepository.java           # MongoRepository — DB operations
│
├── model/                            # Domain documents
│   ├── Todo.java                     # @Document with @Version for optimistic locking
│   └── TodoStatus.java               # Enum: TODO / DOING / DONE
│
├── dto/                              # Transport objects (never pass domain models to client)
│   ├── request/
│   │   ├── CreateTodoRequest.java    # POST body with validation annotations
│   │   └── UpdateTodoRequest.java    # PUT body — all fields optional
│   └── response/
│       ├── TodoResponse.java         # Single todo, maps _id and __v
│       ├── TodoListResponse.java     # Paginated list wrapper
│       ├── DeleteResponse.java       # { "status": "ok" }
│       └── HealthResponse.java       # Java record for /health
│
├── mapper/                           # Entity → DTO conversion
│   └── TodoMapper.java               # @Component, injected into service
│
├── event/                            # Async post-write pipeline
│   ├── TodoCreatedEvent.java         # Carries todoId + title
│   └── TodoEventListener.java        # @Async handler on asyncExecutor
│
├── exception/                        # Domain exceptions
│   └── TodoNotFoundException.java    # RuntimeException → 404
│
├── config/                           # Spring configuration beans
│   ├── AppProperties.java            # @ConfigurationProperties(prefix="app")
│   ├── AsyncConfig.java              # ThreadPoolTaskExecutor (core=4, max=8, queue=50)
│   ├── MongoConfig.java              # @EnableMongoAuditing
│   └── WebConfig.java                # String→TodoStatus formatter
│
└── common/                           # Cross-cutting infrastructure
    ├── ApiError.java                 # Structured error envelope (Lombok @Builder)
    ├── CorrelationIdFilter.java      # OncePerRequestFilter for X-Request-Id
    └── GlobalExceptionHandler.java   # @RestControllerAdvice — exception → HTTP code
```

**Dependency Rule:** Each layer may only depend on layers below it.

```
controller  →  service (interface)  →  repository  →  model
                     │
                     └──→  mapper  →  dto
                     └──→  event
                     └──→  exception
```
`common` and `config` are infrastructure — any layer may depend on them.

---

### 3.2 Layer Responsibilities

#### Controller Layer
- Parse and validate HTTP input (`@Valid`, `@Validated`, `@RequestParam`, `@PathVariable`)
- Delegate all business logic to `TodoService` — zero business logic here
- Map service exceptions to HTTP codes (via `GlobalExceptionHandler`)
- Set correct HTTP status codes (`201 Created`, `200 OK`, `204`)

#### Service Layer
- Own all business decisions: field-level partial-update logic, cache eviction timing,
  version injection, event publishing
- Return DTOs — never expose domain objects to callers
- Be the sole writer to the cache: `put` after reads, `clear` after writes

#### Repository Layer
- Provides declarative database access via Spring Data MongoDB
- No business logic — only queries
- `findAllByStatus(status, pageable)` delegates filtered pagination to MongoDB

#### Model Layer
- Represents the persisted document structure, not the API contract
- `@Version` drives optimistic locking at the framework level
- `@CreatedDate` / `@LastModifiedDate` populated automatically by Mongo Auditing

#### DTO Layer
- **Request DTOs** carry validation annotations — the controller's trust boundary
- **Response DTOs** define the API contract — isolate internal model changes from clients
- `TodoResponse` maps `id` → `_id` and `version` → `__v` via `@JsonProperty` for
  backward compatibility with NestJS/Express clients

---

### 3.3 Domain Model

```
┌─────────────────────────────────────────────┐
│                  Todo                        │
│  (MongoDB Collection: todos)                 │
├──────────────┬──────────────────────────────┤
│ Field        │ Type / Constraint             │
├──────────────┼──────────────────────────────┤
│ _id          │ String (MongoDB ObjectId)     │
│ title        │ String, required, max 200     │
│ description  │ String, optional, max 1000    │
│ dueDate      │ Instant, optional             │
│ status       │ TodoStatus enum, default=TODO │
│ priority     │ int, 1–5, default=3           │
│ createdAt    │ Instant, @CreatedDate (auto)  │
│ updatedAt    │ Instant, @LastModifiedDate    │
│ __v          │ Long, @Version (auto-inc)     │
└──────────────┴──────────────────────────────┘

TodoStatus Enum:
  TODO  → "todo"
  DOING → "doing"
  DONE  → "done"

Index: { status: 1, dueDate: 1 }  — compound, supports status-filtered sorted queries
```

---

### 3.4 API Contract

All endpoints are under the base path `/api/todos`.
Response bodies use `application/json`. Null fields are omitted (`non_null` Jackson config).

#### Endpoints

| Method | Path | Description | Success |
|---|---|---|---|
| `GET` | `/api/todos` | Paginated, filterable list | `200 OK` |
| `GET` | `/api/todos/{id}` | Single todo by ID | `200 OK` |
| `POST` | `/api/todos` | Create new todo | `201 Created` |
| `PUT` | `/api/todos/{id}` | Partial update | `200 OK` |
| `DELETE` | `/api/todos/{id}` | Hard delete | `200 OK` |
| `GET` | `/health` | System health probe | `200 OK` |

#### Query Parameters — GET /api/todos

| Param | Type | Default | Validation | Description |
|---|---|---|---|---|
| `page` | int | `1` | `min=1` | 1-indexed page number |
| `limit` | int | `10` | `min=1, max=100` | Items per page |
| `status` | string | — | `todo`/`doing`/`done` | Filter by status |

#### Request Body — POST /api/todos

```jsonc
{
  "title": "Buy milk",          // required, max 200 chars
  "description": "...",         // optional, max 1000 chars
  "dueDate": "2026-06-15T00:00:00Z",  // optional, ISO-8601
  "status": "todo",             // optional, default "todo"
  "priority": 3                 // optional, 1–5, default 3
}
```

#### Request Body — PUT /api/todos/{id}

All fields optional. Only provided fields are updated (partial update / PATCH semantics).

```jsonc
{
  "title": "Updated title",
  "status": "doing",
  "__v": 0                      // include for optimistic concurrency check
}
```

#### Response — Single Todo

```jsonc
{
  "_id": "6654abc123def456",
  "title": "Buy milk",
  "description": "From the corner shop",
  "status": "todo",
  "priority": 3,
  "dueDate": "2026-06-15T00:00:00Z",
  "createdAt": "2026-06-07T08:00:00Z",
  "updatedAt": "2026-06-07T08:05:00Z",
  "__v": 2
}
```

#### Response — Paginated List

```jsonc
{
  "items": [ /* array of Todo */ ],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

#### Error Response Shape

All errors return a consistent `ApiError` envelope:

```jsonc
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": {
    "title": "Title is required"
  },
  "path": "/api/todos",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-06-07T08:00:00Z"
}
```

#### HTTP Status Code Reference

| Code | Trigger |
|---|---|
| `200 OK` | Successful GET / PUT / DELETE |
| `201 Created` | Successful POST |
| `400 Bad Request` | Query/path param constraint violation (`@Max`, `@Min`) |
| `404 Not Found` | `TodoNotFoundException` — document does not exist |
| `409 Conflict` | `OptimisticLockingFailureException` — stale `__v` on PUT |
| `422 Unprocessable Entity` | `MethodArgumentNotValidException` — body validation |
| `500 Internal Server Error` | Unhandled exception |

---

### 3.5 Service Layer — Business Logic

**`TodoServiceImpl`** is the only `@Service` bean in the application. It implements
the `TodoService` interface so callers (controllers, future tests) depend on the
abstraction, not the implementation.

**Partial Update Logic (PUT):**
Fields are updated only if non-null in the request — preserving existing values.
```
if (request.getTitle() != null)    todo.setTitle(request.getTitle().trim());
if (request.getPriority() != null) todo.setPriority(request.getPriority());
```
This avoids a separate PATCH endpoint while keeping the PUT idempotent on unchanged fields.

**Title Trimming:**
Both `create` and `update` call `.trim()` on the title before persisting — prevents
leading/trailing whitespace from being stored silently.

---

### 3.6 Caching Strategy

**Pattern:** Cache-aside (read-through + write-invalidate)  
**Provider:** Caffeine (in-process, W-TinyLFU eviction)  
**Cache name:** `todos`

```
Cache Key format: "list:p{page}:l{limit}:s{status|all}"
Example: "list:p1:l10:stodo"
         "list:p2:l20:sall"
```

**Read path:**
1. Compute cache key from `(page, limit, status)`
2. Check `CacheManager.getCache("todos").get(key, TodoListResponse.class)`
3. On HIT → return immediately (no DB call)
4. On MISS → query MongoDB → map to DTOs → `cache.put(key, result)` → return

**Write-invalidation (eviction):**
Every write (create / update / delete) calls `cache.clear()` on the `todos` region.
This is a broad eviction — all cached pages are dropped. Acceptable for a CRUD API
with low write volume; for high-write systems, key-level eviction could be added.

**Configuration:**
```yaml
spring:
  cache:
    type: caffeine               # swap to 'redis' to use distributed cache
    caffeine:
      spec: maximumSize=500,expireAfterWrite=30s
```

**TTL:** 30 seconds (configurable via `CACHE_TTL_SECONDS` env var)  
**Max entries:** 500 list-page variants

---

### 3.7 Optimistic Concurrency Control

**Mechanism:** Spring Data MongoDB `@Version` annotation on `Todo.version`

**How it works:**
1. Client reads a Todo → receives the document with `"__v": N`
2. Client sends a PUT with `"__v": N` in the body
3. `TodoServiceImpl.update()` injects `N` back onto the document: `todo.setVersion(N)`
4. `todoRepository.save()` issues a MongoDB `findAndModify` with
   `{ version: { $eq: N } }` as an extra predicate
5. If another write incremented the version to `N+1` in the meantime,
   MongoDB finds no matching document → Spring throws `OptimisticLockingFailureException`
6. `GlobalExceptionHandler` maps this to **HTTP 409 Conflict**

**When to include `__v`:** Only when the client needs conflict detection (e.g., concurrent editors).
If `__v` is omitted from the PUT body, the save proceeds without the version check.

```
Client A                  MongoDB               Client B
  │ GET /todos/1 → v=0        │                   │
  │                           │ GET /todos/1 → v=0 │
  │                           │                   │
  │ PUT /todos/1 {"__v":0}    │                   │
  │ ───────────────────────── ▶ save(v=0 → v=1)   │
  │ 200 OK                    │                   │
                              │                   │
                              │  PUT /todos/1 {"__v":0}
                              │ ◀──────────────────
                              │  v=0 mismatch! → throws
                              │  → 409 Conflict ──▶│
```

---

### 3.8 Async Event Pipeline

An event-driven pipeline replaces the BullMQ job queue of the NestJS/Express backends.

```
TodoServiceImpl.create()
      │
      └──► eventPublisher.publishEvent(new TodoCreatedEvent(this, id, title))
                │
                │  (non-blocking — returns immediately to request thread)
                │
                ▼  asyncExecutor thread pool (core=4, max=8, queue=50)
         TodoEventListener.onTodoCreated(event)
                │
                └──► log.info("Processed event: todo_created id=... title=...")
```

**Thread pool config** (`AsyncConfig`):

| Parameter | Value | Rationale |
|---|---|---|
| `corePoolSize` | 4 | Handles typical burst without creating threads |
| `maxPoolSize` | 8 | Allows scale-up under load |
| `queueCapacity` | 50 | Bounded queue — prevents memory exhaustion |
| `threadNamePrefix` | `async-` | Identifiable in thread dumps / logs |

**Failure handling:**  
`AsyncConfig.getAsyncUncaughtExceptionHandler()` logs the exception without propagating
it to the request thread — consistent with fire-and-forget semantics.

**Extension:** Replace `TodoEventListener` with a BullMQ/Kafka producer to externalize the
pipeline without any changes to `TodoServiceImpl`.

---

### 3.9 Request Correlation

Every HTTP request carries an `X-Request-Id` header for distributed tracing.

```
Request ─────────────────────────────────────────────────────────────►
         ┌────────────────────────────────────────┐
         │  CorrelationIdFilter (OncePerRequestFilter)  │
         │  1. Read X-Request-Id header                  │
         │  2. If absent → generate UUID v4              │
         │  3. Store in request attributes               │
         │  4. Set X-Request-Id on response              │
         └────────────────────────────────────────┘
                              │
         All log lines and ApiError responses include correlationId
```

Clients can supply their own `X-Request-Id` (e.g., API Gateway propagation).
If absent, the service generates one. The same ID appears in:
- `X-Request-Id` response header
- Every structured log line: `log.warn("404 {} [{}] ...", msg, correlationId, ...)`
- `ApiError.correlationId` field in error response bodies

---

### 3.10 Exception Handling & Error Taxonomy

`GlobalExceptionHandler` (`@RestControllerAdvice`) provides a single point of error
translation. Exceptions are caught in order of specificity.

```
Exception Hierarchy → HTTP Mapping

TodoNotFoundException (RuntimeException)
    └──► 404 Not Found

OptimisticLockingFailureException (Spring DataAccessException)
    └──► 409 Conflict

MethodArgumentNotValidException (body @Valid failures)
    └──► 422 Unprocessable Entity
         └──► errors: { fieldName: "message", ... }

ConstraintViolationException (query/path @Min @Max failures)
    └──► 400 Bad Request
         └──► errors: { paramName: "message", ... }

Exception (catch-all)
    └──► 500 Internal Server Error
         └──► "Internal server error" (no stack trace leaked)
```

**Design principle:** The `500` handler explicitly does NOT expose stack traces or
internal messages to the client — only a generic message. Full details are logged.

---

### 3.11 Validation Strategy

Two distinct validation paths exist in Spring MVC, handled by separate mechanisms:

| Location | Annotation | Exception | HTTP |
|---|---|---|---|
| Request body (`@RequestBody`) | `@Valid` on parameter | `MethodArgumentNotValidException` | 422 |
| Query/path params (`@RequestParam`, `@PathVariable`) | `@Validated` on class + `@Min`/`@Max` on param | `ConstraintViolationException` | 400 |

**Request body validation — `CreateTodoRequest`:**
```
@NotBlank  title           — must not be null/empty/whitespace
@Size(max=200) title       — maximum length
@Size(max=1000) description
@Min(1) @Max(5) priority   — business range constraint
```

**Query param validation — `TodoController.list()`:**
```
@Min(1) int page           — must be ≥ 1
@Min(1) @Max(100) int limit — 1 to 100 items per page
```

**Custom type conversion:**  
`WebConfig` registers a `String → TodoStatus` converter so lowercase query params
(`?status=done`) are accepted. Spring's `ConversionService` is used for query params,
not Jackson — they are separate pipelines.

---

### 3.12 Configuration Management

All configuration follows the **12-Factor App** principle — config from the environment.

```yaml
# application.yml (defaults)                  Environment Variable
spring.data.mongodb.uri          ←────────    MONGODB_URI
server.port                      ←────────    PORT
spring.cache.type                ←────────    CACHE_TYPE
spring.cache.caffeine.spec       ←────────    CACHE_TTL_SECONDS (injected into spec)
app.redis.enabled                ←────────    REDIS_ENABLED
```

**`AppProperties`** (`@ConfigurationProperties(prefix="app")`) provides typed access:
```java
props.getRedis().isEnabled()      // boolean
props.getCache().getTtlSeconds()  // int
```

No magic string lookups with `@Value` in business code — all config flows through
`AppProperties`, making it easily mockable in tests.

**Profile-based override:**  
`application-test.yml` is activated by `@ActiveProfiles("test")` in test classes.
It disables Redis, uses Caffeine with a generous TTL, and lets Flapdoodle autoconfigure
the embedded MongoDB URI automatically.

---

## 4. Database Design

### Collection: `todos`

```
Document Shape:
{
  _id:         ObjectId   (generated by MongoDB)
  title:       String     [required]
  description: String     [optional]
  dueDate:     Date       [optional, ISODate]
  status:      String     ["todo"|"doing"|"done"]
  priority:    Int32      [1..5]
  createdAt:   Date       [auto, @CreatedDate]
  updatedAt:   Date       [auto, @LastModifiedDate]
  __v:         Int64      [auto-incremented by Spring Data @Version]
}
```

### Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| `_id_` | `_id` | Primary | Default MongoDB primary key |
| `status_dueDate` | `{ status: 1, dueDate: 1 }` | Compound | Accelerates status-filtered + date-sorted queries |

**Index rationale:**  
The most common query pattern is "show all `todo` items sorted by due date".
The compound index `{ status: 1, dueDate: 1 }` covers this with a single index scan.

**Optimistic Locking:**  
The `__v` field is managed by Spring Data MongoDB's `@Version` mechanism.
No application code touches it except to inject the client-supplied version during updates.
MongoDB's atomic `findAndModify` with a version predicate ensures no lost-update anomaly.

---

## 5. Testing Strategy

### Test Pyramid

```
         ┌─────────────────────────────────┐
         │   Integration Tests  (15)        │ @SpringBootTest + MockMvc
         │   TodoControllerIntegrationTest  │ + Flapdoodle MongoDB 7
         └────────────────┬────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │   Unit Tests  (10)               │ Mockito + no Spring context
         │   TodoServiceTest                │ Fast, isolated
         └────────────────┬────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │   Context Test  (1)              │ @SpringBootTest smoke test
         │   TodoSpringbootApplicationTests │ Verifies context loads
         └─────────────────────────────────┘

Total: 26 tests — 0 failures
```

### Unit Tests — `TodoServiceTest`

**Location:** `src/test/java/com/todo/service/TodoServiceTest.java`  
**Framework:** JUnit 5 + Mockito (`@ExtendWith(MockitoExtension.class)`)  
**Scope:** `TodoServiceImpl` in isolation — all collaborators mocked

| Test | What it verifies |
|---|---|
| `create() → saves and publishes event` | `repo.save()` called; `TodoCreatedEvent` published with correct payload; cache evicted |
| `findAll() → cache miss` | MongoDB queried; result cached; page/total correct |
| `findAll() → cache hit` | No DB call on cache hit |
| `findById() → found` | Correct DTO returned |
| `findById() → not found` | `TodoNotFoundException` thrown |
| `update() → partial fields` | Only provided fields updated; cache evicted |
| `update() → version conflict` | `OptimisticLockingFailureException` propagated |
| `update() → not found` | `TodoNotFoundException` thrown |
| `delete() → deletes` | `repo.deleteById()` called; cache evicted |
| `delete() → not found` | `TodoNotFoundException` thrown |

### Integration Tests — `TodoControllerIntegrationTest`

**Location:** `src/test/java/com/todo/controller/TodoControllerIntegrationTest.java`  
**Framework:** `@SpringBootTest` + `@AutoConfigureMockMvc` + Flapdoodle Embedded MongoDB 7  
**Scope:** Full Spring context — HTTP in, MongoDB out

| Test Group | Tests |
|---|---|
| `POST /api/todos` | 201 created; 422 blank title; 422 priority out of range |
| `GET /api/todos` | empty list; pagination; status filter; 400 bad limit |
| `GET /api/todos/{id}` | returns existing; 404 unknown id |
| `PUT /api/todos/{id}` | updates fields; 404 unknown id; 409 version conflict |
| `DELETE /api/todos/{id}` | deletes and returns 404 after; 404 unknown id |
| `GET /health` | `status=ok`, `mongodb=up`, `redis=disabled` |

**Test isolation:** `@BeforeEach` calls `todoRepository.deleteAll()` — each test starts
with a clean collection.

**No mocking of MongoDB:** Flapdoodle downloads and runs a real MongoDB 7 binary in-process.
This catches real query behavior, index usage, and Spring Data mapping issues.

### Running Tests

```bash
./mvnw test                          # all 26 tests
./mvnw test -pl . -Dtest=TodoServiceTest          # unit tests only
./mvnw test -pl . -Dtest=TodoControllerIntegrationTest  # integration tests only
```

---

## 6. Deployment & Operations

### Prerequisites

- Java 25+ (Amazon Corretto 25 recommended)
- MongoDB 7.x running and accessible

### Local Development

```bash
# Start MongoDB (Docker)
docker run -d -p 27017:27017 --name mongo mongo:7

# Run application
./mvnw spring-boot:run
# Server: http://localhost:3001
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP server port |
| `MONGODB_URI` | `mongodb://localhost:27017/todos` | MongoDB connection string |
| `CACHE_TYPE` | `caffeine` | Cache provider: `caffeine` or `redis` |
| `CACHE_TTL_SECONDS` | `30` | Cache entry TTL in seconds |
| `REDIS_ENABLED` | `false` | Redis feature toggle |

### Build Fat Jar

```bash
./mvnw package -DskipTests
java --enable-preview -jar target/todo-spring-1.0.0-SNAPSHOT.jar
```

### Docker

```dockerfile
FROM eclipse-temurin:25-jre
COPY target/todo-spring-1.0.0-SNAPSHOT.jar app.jar
ENTRYPOINT ["java", "--enable-preview", "-jar", "/app.jar"]
```

### Health & Observability

| Endpoint | Purpose |
|---|---|
| `GET /health` | Custom: MongoDB ping + Redis toggle status |
| `GET /actuator/health` | Spring Actuator: detailed component health |
| `GET /actuator/info` | Application metadata |

**Graceful Shutdown:**  
`server.shutdown: graceful` — Spring waits for in-flight requests to complete
before stopping. Set `spring.lifecycle.timeout-per-shutdown-phase` (default 30s)
to tune the drain window.

**Logging:**
- Package `com.todo` → `DEBUG` in development, recommend `INFO` in production
- All log lines include `correlationId` for distributed trace linkage
- MongoDB driver logs at `INFO` to reduce noise

---

## 7. Extension Points

The following extension points are explicitly designed into the codebase.

### 7.1 Distributed Cache (Redis)

**Current:** Caffeine (in-process, single JVM)  
**Extension:** Swap `CACHE_TYPE=redis`, add `spring-boot-starter-data-redis` to `pom.xml`,
implement a `RedisConnectionFactory` bean. Zero changes to `TodoServiceImpl` — it uses
the `CacheManager` abstraction.

### 7.2 Upgrade Async to Message Broker (Kafka / RabbitMQ)

**Current:** `ApplicationEventPublisher` (in-process)  
**Extension:** Replace `TodoEventListener` with a Kafka producer.
`TodoServiceImpl.create()` only calls `eventPublisher.publishEvent()` —
the publisher implementation is swappable via Spring's DI.

### 7.3 Additional Query Filters

**Current:** Filter by `status` only  
**Extension:** Add `priority`, `dueDate` range, `title` search to `TodoRepository`
and `TodoController.list()`. The cache key builder would include new parameters
— existing cache entries remain valid.

### 7.4 Swap Persistence (SQL / Cassandra)

**Current:** Spring Data MongoDB `MongoRepository`  
**Extension:** `TodoRepository` extends `MongoRepository`. To switch to JPA,
implement `JpaRepository<Todo, String>` and update `Todo` annotations.
`TodoServiceImpl` depends only on `TodoRepository` (interface) — no other changes
to business logic.

### 7.5 Authentication / Authorization

**Current:** No auth  
**Extension:** Add `spring-boot-starter-security`. `TodoController` methods
can be annotated with `@PreAuthorize`. The `CorrelationIdFilter` can be extended
to extract the user ID from JWT claims.

---

## 8. ADRs — Architecture Decision Records

### ADR-001: Spring Boot 4 over Spring Boot 3

**Status:** Accepted  
**Context:** User requested Spring Boot 4 (latest version).  
**Decision:** Use Spring Boot 4.0.6 (GA as of June 2026).  
**Consequences:**
- Requires Jackson 3 (`tools.jackson.databind.ObjectMapper` for `ObjectMapper` in tests;
  annotations remain in `com.fasterxml.jackson.annotation` at 2.x)
- `@AutoConfigureMockMvc` moved to `org.springframework.boot.webmvc.test.autoconfigure` —
  requires `spring-boot-starter-webmvc-test` as explicit test dep
- Flapdoodle dependency renamed `spring3x` → `spring4x`
- All of the above are one-time migration costs

---

### ADR-002: Interface + Implementation for Service Layer

**Status:** Accepted  
**Context:** Whether `TodoService` should be a concrete `@Service` class or an interface.  
**Decision:** `TodoService` is an interface; `TodoServiceImpl` is the implementation.  
**Rationale:**
- Controllers depend on the abstraction, not the implementation
- Allows Mockito to mock `TodoService` directly in controller tests
- Enables alternative implementations (e.g., read-replica routing) without touching the controller
- Consistent with Spring best practice for service beans

---

### ADR-003: Caffeine as Default Cache, not Redis

**Status:** Accepted  
**Context:** NestJS and Express backends use Redis for caching (with in-memory fallback).  
**Decision:** Default to Caffeine in-process cache; Redis is a documented extension.  
**Rationale:**
- No external dependency for local development or CI
- Caffeine's W-TinyLFU is optimal for temporal locality of list queries
- `CacheManager` abstraction makes the swap to Redis a config-only change
- A single JVM instance (the typical initial deployment) gains nothing from Redis round-trips

---

### ADR-004: Broad Cache Eviction (clear all) vs Key-Level Eviction

**Status:** Accepted  
**Context:** On write, should we evict only affected cache keys or the entire region?  
**Decision:** `cache.clear()` evicts the entire `todos` region on every write.  
**Rationale:**
- A create/update/delete may affect every page (e.g., total count changes, sort order shifts)
- Computing all affected keys is complex and error-prone
- For a CRUD API with moderate write rates, a full evict is safe and simple
- **Trade-off accepted:** A high write rate will cause cache thrashing; key-level eviction is
  the documented upgrade path

---

### ADR-005: `__v` field for Optimistic Concurrency

**Status:** Accepted  
**Context:** How to expose the optimistic-locking version in the API.  
**Decision:** Map `Todo.version` (`@Version Long`) to JSON field `__v` via `@JsonProperty("__v")`.  
**Rationale:**
- NestJS and Express backends use Mongoose's default `__v` key
- Frontend clients (React, React Native) already read and send `__v`
- Using `@JsonProperty` is a zero-cost serialization alias — no domain model changes

---

### ADR-006: No Authentication in this Service

**Status:** Accepted  
**Context:** Should this service include JWT / session auth?  
**Decision:** No authentication — auth is an orthogonal concern.  
**Rationale:**
- Follows Single Responsibility; auth can be added via a Spring Security filter without
  touching business logic
- In a microservices deployment, an API Gateway handles auth upstream
- Extension point documented in Section 7.5

---

*End of Architecture Document*
