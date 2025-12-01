# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AnythingLLM is a full-stack application for creating private AI chat experiences with document context. It supports 40+ LLM providers, multiple vector databases, and includes multi-user support with role-based access control.

## Development Commands

```bash
# Initial setup (installs deps, creates .env files, runs prisma migrations)
yarn setup

# Development (run each in separate terminals, or use dev:all)
yarn dev:server      # Node server on port 3001
yarn dev:frontend    # Vite frontend on port 3000
yarn dev:collector   # Document processor
yarn dev:all         # All three in parallel

# Production
yarn prod:server     # Start server in production mode
yarn prod:frontend   # Build frontend

# Database
yarn prisma:generate # Generate Prisma client
yarn prisma:migrate  # Run migrations
yarn prisma:setup    # Generate + migrate + seed
yarn prisma:reset    # Reset database

# Code quality
yarn lint            # Prettier on all code
yarn test            # Jest tests
```

## Architecture

```
/server              # Node.js Express API (port 3001)
├── endpoints/       # REST API routes (admin, chat, workspaces, system, etc.)
├── models/          # Prisma database models (31 models)
├── utils/
│   ├── AiProviders/ # 35+ LLM provider implementations
│   ├── agents/      # Agent framework (aibitat)
│   ├── vectorDbProviders/  # 12 vector DB backends
│   ├── EmbeddingEngines/   # Embedding providers
│   └── middleware/  # Auth, validation, role-based access
├── prisma/          # Schema and migrations
└── storage/         # Local storage (docs, vectors, models, SQLite DB)

/frontend            # React + Vite + Tailwind (port 3000)
├── src/components/  # 30 component directories
├── src/pages/       # Admin, WorkspaceChat, Settings, Login, Onboarding
├── src/hooks/       # 18 custom React hooks
├── src/models/      # Frontend API models
└── src/locales/     # i18n (27 languages)

/collector           # Node.js document processing service
├── processSingleFile/  # Document parsing
├── processLink/        # Web scraping
└── utils/              # PDF, DOCX, image OCR, audio transcription

/docker              # Docker build and compose files
```

## Key Patterns

**API Architecture:**
- REST API with Express.js
- Server-Sent Events (SSE) for chat streaming
- JWT-based authentication with role-based access control

**Database:**
- SQLite by default (PostgreSQL optional)
- Prisma ORM with schema at `/server/prisma/schema.prisma`

**Middleware chain (common pattern):**
```javascript
validatedRequest,      // JWT validation
flexUserRoleValid([ROLES.admin, ROLES.manager]),  // Role check
validWorkspaceSlug,    // Workspace membership
```

**LLM/Vector DB providers:**
- Each provider is a class in `server/utils/AiProviders/` or `server/utils/vectorDbProviders/`
- Consistent interface pattern across all providers

## Environment

- Node.js version: 18.18.0 (see `.nvmrc`)
- Package manager: Yarn
- Frontend build: Vite
- Code style: Prettier (2-space indent, semicolons, trailing commas ES5)

**Environment files to configure:**
- `server/.env.development` - Server config (required for dev)
- `frontend/.env` - Frontend config (VITE_API_BASE)
- `collector/.env` - Collector config

## Contributing Notes

- PRs require a corresponding GitHub issue (except translations)
- Use conventional commit messages: `feat:`, `fix:`, `docs:`
- Security issues: Report via Huntr, not public issues
- Integrations (LLM, Vector DB) are reviewed at maintainer discretion
