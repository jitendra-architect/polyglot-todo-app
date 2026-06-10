# todo-react — Architectural Design Document

**Framework:** React 19 · Vite 8 · TypeScript 6  
**Default port:** `5173` (dev)  
**Part of:** [polyglot-todo-app](../../README.md)

> **Backend-agnostic web client.** Connects to **whichever single backend** you have running (NestJS, Express, FastAPI, or Spring Boot). Change the Vite proxy target — no application code changes required.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Flow](#3-data-flow)
4. [Tech Stack](#4-tech-stack)
5. [Project Structure](#5-project-structure)
6. [API Integration](#6-api-integration)
7. [Domain Types](#7-domain-types)
8. [Component Map](#8-component-map)
9. [Features](#9-features)
10. [Getting Started](#10-getting-started)
11. [Connecting to a Backend](#11-connecting-to-a-backend)
12. [Build & Deploy](#12-build--deploy)
13. [Key Design Decisions](#13-key-design-decisions)

---

## 1. System Overview

`todo-react` is the **web client** for the polyglot Todo application — a single-page app that consumes the unified `/api/todos` REST contract shared by all four backend implementations.

| Attribute | Value |
|---|---|
| Platform | Browser (desktop + mobile responsive) |
| Rendering | Client-side React (CSR) |
| Data layer | TanStack React Query v5 + Axios |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` |
| Forms | React Hook Form + Zod 4 |
| Backend coupling | **None** — proxy URL is the only switch point |

**Scope:** List, filter, paginate, create, edit, and delete todos with optimistic concurrency (`__v` on updates).

**Non-scope:** Authentication, offline sync, routing (single-page orchestration in `App.tsx`).

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (React 19)                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  App.tsx — page state (page, filter, modals)                 │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                         │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  Components                                                   │   │
│  │  TodoCard · TodoForm · TodoFilters · Pagination · EmptyState │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                         │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  hooks/useTodos.ts — React Query hooks                        │   │
│  │  useTodoList · useCreateTodo · useUpdateTodo · useDeleteTodo  │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                         │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  api/todos.ts — Axios client (baseURL: /api)                  │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────┼─────────────────────────────────────────┘
                              │
              Dev: Vite proxy /api → backend
              Prod: reverse proxy or same-origin /api
                              │
┌─────────────────────────────▼─────────────────────────────────────────┐
│              ONE active backend (NestJS · Express · FastAPI · Spring)    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| `App.tsx` | UI state: current page, status filter, form/delete modals |
| `components/` | Presentational + light interaction; no direct API calls |
| `hooks/useTodos.ts` | Server state: queries, mutations, cache invalidation |
| `api/todos.ts` | HTTP transport; maps to REST endpoints |
| `types/todo.ts` | Shared domain types mirroring backend contract |

---

## 3. Data Flow

### Read (list with filter + pagination)

```
User changes filter or page
        │
        ▼
useTodoList({ page, limit, status })
        │
        ▼
queryKey: ['todos', 'list', { page, limit, status }]
        │
        ▼
todosApi.list() → GET /api/todos?page=&limit=&status=
        │
        ▼
React Query cache (staleTime: 30s, keepPreviousData on page change)
        │
        ▼
App.tsx renders TodoCard grid or skeletons
```

### Write (create / update / delete)

```
User submits TodoForm or confirms delete
        │
        ▼
useCreateTodo | useUpdateTodo | useDeleteTodo
        │
        ▼
POST | PUT | DELETE /api/todos[/:id]
        │
        ▼
onSuccess → invalidateQueries(['todos', 'list'])
        │
        ▼
List refetches; modal closes
```

### Optimistic concurrency (edit)

On update, `App.tsx` passes `__v` from the loaded todo into the PUT payload. If the backend returns **409 Conflict**, React Query surfaces the mutation error (extend with toast/retry as needed).

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 |
| Build | Vite 8 + `@vitejs/plugin-react` |
| Language | TypeScript 6 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Server state | TanStack React Query 5 |
| HTTP | Axios |
| Forms | React Hook Form 7 + `@hookform/resolvers` |
| Validation | Zod 4 |
| Icons | Lucide React |
| Utilities | clsx |
| Linting | ESLint 10 + typescript-eslint |

---

## 5. Project Structure

```
todo-react/
├── public/
│   └── icons.svg
├── src/
│   ├── main.tsx                  # QueryClientProvider bootstrap
│   ├── App.tsx                   # Root page orchestration
│   ├── index.css                 # Tailwind v4 entry + theme
│   ├── api/
│   │   └── todos.ts              # Axios API client
│   ├── hooks/
│   │   └── useTodos.ts           # React Query hooks + cache keys
│   ├── types/
│   │   └── todo.ts               # Domain interfaces
│   └── components/
│       ├── TodoCard.tsx          # Card with edit/delete actions
│       ├── TodoCardSkeleton.tsx  # Loading placeholder
│       ├── TodoForm.tsx          # Create/edit modal + Zod form
│       ├── TodoFilters.tsx       # Status filter tabs
│       ├── Pagination.tsx        # Page controls
│       ├── StatusBadge.tsx       # todo / doing / done badge
│       ├── PriorityDots.tsx      # 1–5 priority indicator
│       ├── EmptyState.tsx        # No todos / filtered empty
│       └── ConfirmDialog.tsx     # Delete confirmation
├── index.html
├── vite.config.ts                # Dev server + API proxy
├── tsconfig.json
├── tsconfig.app.json
├── eslint.config.js
└── package.json
```

---

## 6. API Integration

The client speaks the [unified API contract](../../README.md#the-unified-api-contract). All requests use relative `/api` paths.

| Method | Path | Hook |
|---|---|---|
| `GET` | `/api/todos` | `useTodoList` |
| `GET` | `/api/todos/:id` | `useTodoDetail` |
| `POST` | `/api/todos` | `useCreateTodo` |
| `PUT` | `/api/todos/:id` | `useUpdateTodo` |
| `DELETE` | `/api/todos/:id` | `useDeleteTodo` |

```typescript
// api/todos.ts
const http = axios.create({ baseURL: '/api' });
```

In development, Vite proxies `/api` to the backend:

```typescript
// vite.config.ts
proxy: {
  '/api': { target: 'http://localhost:3000', changeOrigin: true },
}
```

---

## 7. Domain Types

```typescript
// types/todo.ts — mirrors NestJS / Express / Spring JSON shape
interface Todo {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'todo' | 'doing' | 'done';
  priority: number;       // 1 (highest) – 5 (lowest)
  createdAt: string;
  updatedAt: string;
  __v: number;            // optimistic concurrency version
}

interface TodoListResult {
  items: Todo[];
  total: number;
  page: number;
  limit: number;
}
```

> **FastAPI note:** The Python backend uses snake_case (`due_date`, `revision`). If targeting FastAPI, add response transformers or update types — NestJS/Express/Spring use camelCase + `__v`.

---

## 8. Component Map

| Component | Role |
|---|---|
| `App` | Sticky header, stats strip, filter, grid, pagination, modal orchestration |
| `TodoCard` | Displays todo; edit/delete action buttons |
| `TodoForm` | Modal form; Zod validation; passes `__v` on edit |
| `TodoFilters` | Tab filter: All / To Do / Doing / Done |
| `Pagination` | Previous / next page controls |
| `TodoCardSkeleton` | 9-cell loading grid |
| `EmptyState` | Contextual empty message (filtered vs global) |
| `ConfirmDialog` | Delete confirmation with loading state |
| `StatusBadge` | Coloured status pill |
| `PriorityDots` | Visual priority 1–5 |

### React Query cache keys

```typescript
TODO_KEYS = {
  all:    ['todos'],
  lists:  ['todos', 'list'],
  list:   ['todos', 'list', { page, limit, status }],
  detail: ['todos', 'detail', id],
}
```

Mutations invalidate `lists()` — detail cache updated optimistically on successful edit.

---

## 9. Features

- **Responsive grid** — 1 / 2 / 3 columns (sm / lg breakpoints)
- **Status filtering** — `all` \| `todo` \| `doing` \| `done`; resets to page 1
- **Pagination** — 9 items per page; `keepPreviousData` prevents flicker
- **CRUD modals** — create and edit in `TodoForm`; delete via `ConfirmDialog`
- **Skeleton loading** — full-grid placeholders during initial fetch
- **Error + retry** — banner with manual refetch; header refresh button with spin animation
- **Optimistic `__v`** — included on PUT to detect concurrent edits
- **Form validation** — client-side Zod before API call (title required, priority 1–5)

---

## 10. Getting Started

### Prerequisites

- Node.js 20+
- **One** running backend (see [root README](../../README.md#quick-start))

### Local Development

```bash
cd frontend/todo-react
npm install
npm run dev
# → http://localhost:5173
```

Ensure your backend is running and the Vite proxy `target` matches its port (default: NestJS on `3000`).

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | TypeScript check + production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |

---

## 11. Connecting to a Backend

Run **one** backend. Update the Vite proxy `target` in `vite.config.ts`:

| Backend | Proxy target | Default port |
|---|---|---|
| NestJS | `http://localhost:3000` | 3000 |
| Express | `http://localhost:3001` | 3001 |
| FastAPI | `http://localhost:8000` | 8000 |
| Spring Boot | `http://localhost:3001` | 3001 |

```typescript
// vite.config.ts — example: Express backend
proxy: {
  '/api': { target: 'http://localhost:3001', changeOrigin: true },
}
```

For production, serve the static build behind nginx/Caddy with `/api` routed to your chosen backend — no rebuild needed if the API contract is unchanged.

---

## 12. Build & Deploy

```bash
npm run build    # output → dist/
npm run preview  # local smoke test
```

Deploy `dist/` to any static host (Vercel, Netlify, S3 + CloudFront, nginx). Configure the host to proxy `/api/*` to your active backend.

**Environment:** No `.env` required for dev — proxy is in `vite.config.ts`. For production API URL override, set Axios `baseURL` via `import.meta.env.VITE_API_URL` if needed.

---

## 13. Key Design Decisions

### TanStack React Query over Redux

Server state (todos) is fetched data with cache TTL — React Query handles stale/refetch, deduplication, and mutation invalidation without boilerplate. Local UI state (modals, page) stays in `useState`.

### Relative `/api` base URL

Using `/api` instead of hardcoded `localhost:3000` keeps the app deployable behind any reverse proxy. Dev proxy and prod gateway handle routing.

### Zod + React Hook Form

Form schemas validate before network calls, matching backend 422 rules. `zodResolver` bridges Zod 4 with RHF — single schema for types and runtime checks.

### `keepPreviousData` on list query

Pagination feels instant — previous page data stays visible while the next page loads.

### No client-side router

Single `App.tsx` orchestrates all UI. Sufficient for a focused todo board; add React Router when multi-page navigation is needed.

### Mirrored types (not shared package)

Types in `types/todo.ts` mirror the backend contract by convention — same approach as `todo-react-native`. Keeps each frontend self-contained.

---

<p align="center">
  <a href="../../README.md">← Polyglot Todo App (root)</a> ·
  <a href="../todo-react-native/README.md">React Native</a> ·
  <a href="../../backend/todo-nestjs/README.md">NestJS</a> ·
  <a href="../../backend/todo-express/README.md">Express</a>
</p>
