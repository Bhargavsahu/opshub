# Architecture

## Overview

OpsHub is a monorepo with two npm workspaces: `backend` (Express API) and `frontend` (React SPA). They communicate over REST + Socket.IO (WebSocket).

## Backend Layers

1. **Routes** — Express routers per module, Zod-validated request bodies
2. **Services** — business logic (leave balance calculation, stock transactions, task state machine)
3. **Prisma** — type-safe database access, transactional writes
4. **Middleware** — authentication (JWT), authorization (role guard), audit logging, error handling

## Auth Flow

1. Frontend gets a Google ID token via `@react-oauth/google`
2. `POST /api/auth/google` — backend verifies with `google-auth-library`, creates/finds user, issues JWT access token + httpOnly refresh cookie
3. Access token (15 min) stored in memory; refresh token (7 days) rotated on each use
4. Socket.IO authenticates with access token on `connection`

## Role-Based Access

| Endpoint pattern | EMPLOYEE | MANAGER | ADMIN |
|-----------------|----------|---------|-------|
| Own leave/tasks | ✅ | ✅ | ✅ |
| Team leave/tasks | ❌ | ✅ (own reports) | ✅ (all) |
| Leave approve/reject | ❌ | ✅ | ✅ |
| Inventory write | ❌ | ✅ | ✅ |
| User management | ❌ | ❌ | ✅ |
| Audit log | ❌ | ❌ | ✅ |

## AI Assistant

- Gemini Flash with function calling
- 5 read-only tools, each scoped to the authenticated user's role
- No raw SQL, no write operations
- Responses audited in AuditLog

## Real-time

- Socket.IO for chat messages and live notifications
- JWT verified on WebSocket handshake
- Channels: `general`, future per-team channels
