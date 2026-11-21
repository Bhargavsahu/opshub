# OpsHub

> A small-business operations suite — leave management, inventory tracking, task management, team chat, dashboards and an AI assistant. Built with React, Express, PostgreSQL and Socket.IO.

![CI](https://github.com/YOUR_USERNAME/opshub/actions/workflows/ci.yml/badge.svg)

## Live Demo

🔗 **[https://your-subdomain.yourdomain.com](https://your-subdomain.yourdomain.com)**

Use the **demo login** buttons on the login page to try each role (Admin, Manager, Employee) with pre-seeded data.

## Features

| Module | Description |
|--------|-------------|
| **Auth** | Google OAuth login, JWT access + rotating refresh tokens, role-based access (Admin / Manager / Employee) |
| **Leave** | Apply for leave → manager approval workflow with balance tracking and status transitions |
| **Inventory** | SKU-based stock tracking with IN/OUT/ADJUST movements, low-stock alerts, audit trail |
| **Tasks** | Task list with status buttons (Todo → In Progress → Review → Done), priority, assignees |
| **Chat** | Real-time team chat via Socket.IO with channels |
| **Dashboards** | Role-based summary cards and charts (headcount, stock levels, task throughput) |
| **AI Assistant** | Gemini-powered natural language queries over your data with role-checked access |
| **Admin** | User management, audit log viewer, demo data reset |

## Tech Stack

**Backend:** Express · TypeScript · Prisma · PostgreSQL · Socket.IO · Zod · Vitest  
**Frontend:** React · Vite · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query · Recharts  
**AI:** Google Gemini (function calling, role-scoped read-only tools)  
**Infra:** Docker · nginx · Let's Encrypt · EC2 · Neon (prod DB) · GitHub Actions CI

## Architecture

```
┌─────────────┐     HTTPS      ┌───────────┐      ┌──────────────┐
│   Browser    │◄──────────────►│   nginx   │─────►│  Express API │
│  React SPA   │   WebSocket    │  (reverse │      │  + Socket.IO │
└─────────────┘                 │   proxy)  │      └──────┬───────┘
                                └───────────┘             │
                                                    ┌─────▼──────┐
                                                    │ PostgreSQL  │
                                                    │   (Neon)    │
                                                    └─────┬──────┘
                                                          │
                                                    ┌─────▼──────┐
                                                    │  Gemini AI  │
                                                    │  (optional) │
                                                    └────────────┘
```

## Quick Start (Development)

### Prerequisites

- Node.js ≥ 20
- Docker Desktop (for PostgreSQL)
- Google Cloud OAuth Client ID
- Gemini API key (optional, for AI features)

### Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/opshub.git
cd opshub

# Start PostgreSQL
docker compose -f docker/docker-compose.dev.yml up -d

# Install dependencies
npm install

# Configure environment
cp .env.development.example .env.development
# Edit .env.development with your credentials
# Generate JWT secrets:
npm run generate-secrets
# Paste the output into .env.development

# Run database migrations and seed
npm run db:migrate
npm run db:seed

# Start both servers
npm run dev:backend   # API on :3001
npm run dev:frontend  # Vite on :5173
```

## Project Structure

```
opshub/
├── backend/          # Express API
│   ├── src/
│   │   ├── modules/  # auth, users, leave, inventory, tasks, chat, dashboard, ai
│   │   ├── middleware/# authenticate, requireRole, validate, error, audit
│   │   ├── config/   # env, database
│   │   └── utils/    # helpers
│   └── prisma/       # schema, migrations, seed
├── frontend/         # React SPA
│   └── src/
│       ├── features/ # auth, leave, inventory, tasks, chat, dashboard, assistant, admin
│       ├── components/# shared UI (shadcn)
│       └── lib/      # API client, auth context
├── docs/             # Architecture, API docs, deploy guide, AI usage
├── docker/           # Compose files, nginx, Dockerfiles, SSL init
└── .github/          # CI workflow, PR template, issue templates, CODEOWNERS
```

## Testing

```bash
# Run all tests
npm test

# Backend only
npm run test --workspace=backend

# Frontend only
npm run test --workspace=frontend
```

## Deployment

See [docs/deploy.md](docs/deploy.md) for the full EC2 + Docker + nginx + SSL deployment guide.

## Contributors

| Role | Person | Focus |
|------|--------|-------|
| Person A | [@YOUR_USERNAME](https://github.com/YOUR_USERNAME) | Backend, DB, Auth, AI, Docker, Deploy |
| Person B | [@TEAMMATE_USERNAME](https://github.com/TEAMMATE_USERNAME) | Frontend, UI, Charts, Chat UI, Tests |

## License

MIT
