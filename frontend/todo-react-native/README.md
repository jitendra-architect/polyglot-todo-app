# todo-react-native — Architectural Design Document

**Framework:** React Native 0.85 · Expo 56 · TypeScript 6  
**Platforms:** iOS · Android · Expo Web  
**Part of:** [polyglot-todo-app](../../README.md)

> **Backend-agnostic mobile client.** Connects to **whichever single backend** you have running. Update `API_BASE_URL` in `src/constants/api.ts` — no other code changes required.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Flow](#3-data-flow)
4. [Tech Stack](#4-tech-stack)
5. [Project Structure](#5-project-structure)
6. [API Integration](#6-api-integration)
7. [Domain Types](#7-domain-types)
8. [Screen & Component Map](#8-screen--component-map)
9. [Features](#9-features)
10. [Getting Started](#10-getting-started)
11. [Connecting to a Backend](#11-connecting-to-a-backend)
12. [Platform Notes](#12-platform-notes)
13. [Key Design Decisions](#13-key-design-decisions)

---

## 1. System Overview

`todo-react-native` is the **mobile client** for the polyglot Todo application — a cross-platform Expo app that consumes the same `/api/todos` REST contract as the React web client and all four backends.

| Attribute | Value |
|---|---|
| Platform | iOS, Android (Expo managed workflow) |
| Rendering | React Native + NativeWind (Tailwind for RN) |
| Data layer | TanStack React Query v5 + Axios |
| Forms | React Hook Form + Zod 4 |
| Navigation | Single-screen (`TodoListScreen`) — React Navigation available in deps |
| Backend coupling | **None** — `API_BASE_URL` is the only switch point |

**Scope:** List, filter, paginate, create, edit, delete todos with pull-to-refresh and optimistic concurrency (`__v`).

**Non-scope:** Authentication, offline persistence, push notifications.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Expo App (React Native 0.85)                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  App.tsx                                                      │   │
│  │  GestureHandlerRootView → QueryClientProvider → TodoListScreen│   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                         │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  screens/                                                     │   │
│  │  TodoListScreen — FlatList, filters, pagination, modals       │   │
│  │  TodoFormModal  — create/edit bottom sheet                    │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                         │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  components/ — TodoCard, TodoFilters, EmptyState, etc.        │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                         │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  hooks/useTodos.ts — identical pattern to todo-react        │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                         │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │  api/todos.ts → constants/api.ts (API_BASE_URL)             │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────┼─────────────────────────────────────────┘
                              │  HTTP (direct — no dev proxy)
┌─────────────────────────────▼─────────────────────────────────────────┐
│              ONE active backend (NestJS · Express · FastAPI · Spring)    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Parity with React Web

Both frontends share the same architectural layers:

| Layer | Web (`todo-react`) | Mobile (`todo-react-native`) |
|---|---|---|
| Types | `types/todo.ts` | `types/todo.ts` (identical) |
| API client | `api/todos.ts` | `api/todos.ts` (identical logic) |
| Hooks | `hooks/useTodos.ts` | `hooks/useTodos.ts` (identical) |
| List UI | CSS Grid + modals | `FlatList` + `Modal` |
| Styling | Tailwind v4 | NativeWind v4 |

---

## 3. Data Flow

### Read (list + pull-to-refresh)

```
TodoListScreen mounts / user pulls to refresh
        │
        ▼
useTodoList({ page: 1, limit: 10, status: filter })
        │
        ▼
GET {API_BASE_URL}/todos?page=&limit=&status=
        │
        ▼
FlatList renders TodoCard items
        │
        ▼
RefreshControl → refetch() on pull-down
```

### Write (modal form)

```
User taps "+ New" or Edit on TodoCard
        │
        ▼
TodoFormModal opens (create | edit mode)
        │
        ▼
Zod-validated submit → useCreateTodo | useUpdateTodo
        │
        ▼
POST | PUT → invalidate list cache → modal closes
```

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Expo 56 (managed workflow) |
| UI | React Native 0.85 |
| Language | TypeScript 6 |
| Styling | NativeWind 4 + Tailwind CSS 3 |
| Server state | TanStack React Query 5 |
| HTTP | Axios |
| Forms | React Hook Form 7 + Zod 4 |
| Gestures | react-native-gesture-handler 3 |
| Animation | react-native-reanimated 4 |
| Safe areas | react-native-safe-area-context |
| Navigation | @react-navigation (installed; single-screen for now) |
| Bundler | Metro (Expo default) |

---

## 5. Project Structure

```
todo-react-native/
├── App.tsx                       # Root: QueryClient + GestureHandler
├── index.ts                      # Expo entry point
├── app.json                      # Expo config (icons, orientation)
├── global.css                    # NativeWind / Tailwind entry
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── nativewind-env.d.ts
├── assets/                       # App icons, splash, favicon
└── src/
    ├── constants/
    │   └── api.ts                # API_BASE_URL (platform-aware host)
    ├── api/
    │   └── todos.ts              # Axios API client
    ├── hooks/
    │   └── useTodos.ts           # React Query hooks
    ├── types/
    │   ├── todo.ts               # Domain interfaces
    │   └── global.d.ts
    ├── screens/
    │   ├── TodoListScreen.tsx    # Main screen — FlatList + state
    │   └── TodoFormModal.tsx     # Create/edit modal form
    └── components/
        ├── TodoCard.tsx
        ├── TodoCardSkeleton.tsx
        ├── TodoFilters.tsx
        ├── StatusBadge.tsx
        ├── PriorityDots.tsx
        ├── EmptyState.tsx
        └── ConfirmDialog.tsx
```

---

## 6. API Integration

Same [unified contract](../../README.md#the-unified-api-contract) as the web client.

```typescript
// constants/api.ts
const LOCAL_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_BASE_URL = `http://${LOCAL_HOST}:3000/api`;

// api/todos.ts
const http = axios.create({ baseURL: API_BASE_URL });
```

Unlike the web app, mobile makes **direct HTTP requests** to the backend host — there is no dev proxy. The machine running the backend must be reachable from the simulator/device.

| Method | Path | Hook |
|---|---|---|
| `GET` | `/todos` | `useTodoList` |
| `GET` | `/todos/:id` | `useTodoDetail` |
| `POST` | `/todos` | `useCreateTodo` |
| `PUT` | `/todos/:id` | `useUpdateTodo` |
| `DELETE` | `/todos/:id` | `useDeleteTodo` |

---

## 7. Domain Types

Identical to `todo-react/src/types/todo.ts`:

```typescript
interface Todo {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'todo' | 'doing' | 'done';
  priority: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
```

Updates include `__v` from the loaded todo for optimistic concurrency on PUT.

---

## 8. Screen & Component Map

### Screens

| Screen | Responsibility |
|---|---|
| `TodoListScreen` | Header, stats strip, `FlatList`, filters, inline pagination, error banner, modals |
| `TodoFormModal` | Full-screen modal; RHF + Zod; `KeyboardAvoidingView` for iOS |

### Components

| Component | Role |
|---|---|
| `TodoCard` | Native card with edit/delete touch targets |
| `TodoFilters` | Horizontal status filter chips |
| `TodoCardSkeleton` | Loading placeholder rows |
| `EmptyState` | Empty list messaging |
| `ConfirmDialog` | Delete confirmation overlay |
| `StatusBadge` | Status colour pill |
| `PriorityDots` | Priority indicator |

### List configuration

| Setting | Value |
|---|---|
| Page size | 10 items |
| List component | `FlatList` with `RefreshControl` |
| Pagination | Inline prev/next in `ListFooterComponent` |
| Loading | Skeleton `FlatList` with 6 placeholder rows |

---

## 9. Features

- **Pull-to-refresh** — `RefreshControl` tied to React Query `refetch`
- **Status filtering** — All / To Do / Doing / Done; resets page to 1
- **Pagination** — Prev/Next footer when `totalPages > 1`
- **Create / edit modal** — `TodoFormModal` with platform keyboard handling
- **Delete confirmation** — `ConfirmDialog` with pending state
- **Error banner** — Tap-to-retry on fetch failure
- **Safe area** — `SafeAreaView` for notch/home indicator insets
- **Skeleton loading** — dedicated loading `FlatList` during initial fetch
- **Optimistic `__v`** — sent on edit to detect 409 conflicts from backend

---

## 10. Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI (via `npx expo`)
- **One** running backend
- iOS Simulator (Xcode) or Android Emulator (Android Studio), or Expo Go on a physical device

### Local Development

```bash
cd frontend/todo-react-native
npm install
npm start          # Expo dev server

# Then press:
#   i  → iOS Simulator
#   a  → Android Emulator
#   w  → Expo Web
```

### Scripts

| Script | Description |
|---|---|
| `npm start` | Expo dev server (Metro) |
| `npm run ios` | Start + open iOS simulator |
| `npm run android` | Start + open Android emulator |
| `npm run web` | Start + open in browser |

---

## 11. Connecting to a Backend

Run **one** backend. Update `src/constants/api.ts`:

```typescript
// Default: NestJS on port 3000
export const API_BASE_URL = `http://${LOCAL_HOST}:3000/api`;
```

| Backend | Port | `API_BASE_URL` suffix |
|---|---|---|
| NestJS | 3000 | `:3000/api` |
| Express | 3001 | `:3001/api` |
| FastAPI | 8000 | `:8000/api` |
| Spring Boot | 3001 | `:3001/api` |

Example — point at Express:

```typescript
export const API_BASE_URL = `http://${LOCAL_HOST}:3001/api`;
```

Restart Metro after changing `api.ts` (`r` in Expo terminal).

---

## 12. Platform Notes

### Host resolution

| Environment | `LOCAL_HOST` | Why |
|---|---|---|
| iOS Simulator | `localhost` | Simulator shares host network |
| Android Emulator | `10.0.2.2` | Emulator alias for host `localhost` |
| Physical device | Your machine's LAN IP | e.g. `192.168.1.42` |

```typescript
// Physical device example
const LOCAL_HOST = '192.168.1.42';  // your dev machine IP
export const API_BASE_URL = `http://${LOCAL_HOST}:3000/api`;
```

### Android cleartext HTTP

Local backends use `http://` (not HTTPS). Android 9+ blocks cleartext by default. For development, Expo handles this in the managed workflow; for standalone builds, configure `android:usesCleartextTraffic` in `app.json` if needed.

### Expo SDK

This project targets **Expo SDK 56**. Refer to [Expo v56 docs](https://docs.expo.dev/versions/v56.0.0/) when upgrading or adding native modules.

---

## 13. Key Design Decisions

### Shared hooks pattern with web

`useTodos.ts` is structurally identical to the React web client — same `TODO_KEYS`, same invalidation strategy. Developers can reason about both clients with one mental model.

### `API_BASE_URL` constant (not env file)

A single `constants/api.ts` file makes the backend switch obvious for mobile dev. No `.env` parsing required in Expo managed workflow. Upgrade to `expo-constants` + `app.config.js` for per-environment builds when needed.

### Platform-aware localhost

`10.0.2.2` for Android emulator is a common gotcha — baked into `api.ts` with a comment for physical device override.

### NativeWind over StyleSheet-only

Tailwind utility classes mirror the web app's design language. `TodoListScreen` uses `StyleSheet` for complex layout; components can use `className` via NativeWind where appropriate.

### Single-screen architecture

`TodoListScreen` owns all navigation state (modals, filters). React Navigation is in `package.json` for future multi-screen flows (detail view, settings) without restructuring the data layer.

### Direct HTTP (no proxy)

Mobile apps cannot use Vite-style proxies. Backend must bind to `0.0.0.0` (not just `127.0.0.1`) when testing from a physical device on the same network.

### GestureHandlerRootView wrapper

Required by `react-native-gesture-handler` and Reanimated — wraps the entire app in `App.tsx` to prevent gesture conflicts with `FlatList` and modals.

---

<p align="center">
  <a href="../../README.md">← Polyglot Todo App (root)</a> ·
  <a href="../todo-react/README.md">React Web</a> ·
  <a href="../../backend/todo-nestjs/README.md">NestJS</a> ·
  <a href="../../backend/todo-express/README.md">Express</a>
</p>
