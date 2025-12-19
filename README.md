# Zenlytic RFI Assistant

> **TL;DR:** AI-powered tool for answering security questionnaires, RFIs, and vendor assessments. Uses Claude + Notion + Zenlytic docs to generate citation-backed responses. Restricted to @zenlytic.com Google accounts.

**Live:** https://zenlytic-rfi-assistant.netlify.app

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Knowledge Sources](#knowledge-sources)
- [Contributing](#contributing)

---

## Features

| Feature | Description |
|---------|-------------|
| **Ask** | Single question lookup with real-time AI responses |
| **Batch** | Upload Excel/CSV questionnaires, process all at once, download results |
| **Admin** | Manage approved Q&A pairs for common questions |
| **Google Auth** | Restricted to @zenlytic.com accounts only |
| **Citations** | Every response includes source citations |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Netlify (Hosting)                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite + Tailwind)                         │
│  └── packages/web/                                          │
├─────────────────────────────────────────────────────────────┤
│  Serverless Functions (Netlify Functions)                   │
│  └── netlify/functions/                                     │
│      ├── ask.ts          - Single question endpoint         │
│      ├── batch.ts        - Batch processing endpoint        │
│      ├── qa-pairs.ts     - Q&A management                   │
│      ├── auth-*.ts       - Google OAuth endpoints           │
│      └── _shared/                                           │
│          ├── claude.ts   - Claude API + tool orchestration  │
│          ├── notion-tools.ts - Notion search/fetch          │
│          ├── docs-tools.ts   - Docs search/fetch            │
│          └── auth.ts     - Auth middleware                  │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  ├── Claude API (Anthropic) - AI responses                  │
│  ├── Notion API - Internal policies & procedures            │
│  ├── Google OAuth - Authentication                          │
│  └── docs/ submodule - Public documentation                 │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Git
- Zenlytic Google account (@zenlytic.com)

### Installation

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/Zenlytic/rfi-assistent.git
cd rfi-assistent

# Install all dependencies
npm install
cd netlify/functions && npm install && cd ../..
cd packages/web && npm install && cd ../..

# Copy environment template
cp .env.example .env
```

### Configure Environment

Edit `.env` with your credentials (see [Environment Variables](#environment-variables)).

### Run Locally

```bash
# Option 1: Run servers separately (recommended for debugging)
# Terminal 1 - Functions
npx netlify functions:serve

# Terminal 2 - Frontend
cd packages/web && npm run dev

# Option 2: Run together via Netlify CLI
npx netlify dev
```

- Frontend: http://localhost:5173
- Functions: http://localhost:9999/.netlify/functions/

---

## Environment Variables

### Required for Core Functionality

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `ANTHROPIC_API_KEY` | Claude API key | [console.anthropic.com](https://console.anthropic.com) |
| `NOTION_TOKEN` | Notion integration token | [notion.so/my-integrations](https://notion.so/my-integrations) |

### Required for Authentication (Production)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console |
| `SESSION_SECRET` | Random 32+ char string for JWT signing | `openssl rand -hex 32` |
| `SITE_URL` | Production URL | `https://zenlytic-rfi-assistant.netlify.app` |

### Optional

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Slack bot integration |
| `SLACK_SIGNING_SECRET` | Slack webhook verification |
| `SLACK_APP_TOKEN` | Slack app-level token |

---

## Local Development

### Project Structure

```
rfi-assistent/
├── packages/web/           # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   └── hooks/          # Custom React hooks
│   └── vite.config.ts      # Vite configuration
├── netlify/functions/      # Serverless backend
│   ├── _shared/            # Shared utilities
│   └── *.ts                # API endpoints
├── docs/                   # Git submodule (zenlytic-docs)
├── config/                 # Static configuration
└── netlify.toml            # Netlify configuration
```

### Common Tasks

```bash
# Update docs submodule to latest
git submodule update --remote docs

# Type check
cd packages/web && npm run build

# Add new dependencies to functions
cd netlify/functions && npm install <package>
```

---

## Deployment

Deployment is automatic via Netlify:

1. **Push to `main`** → Production deploy
2. **Create PR** → Deploy preview (unique URL)
3. **Merge PR** → Production deploy

### Manual Deploy

Trigger from Netlify dashboard or:

```bash
npx netlify deploy --prod
```

### Environment Variables in Production

Set in Netlify Dashboard → Site settings → Environment variables.

---

## API Reference

All endpoints require authentication (session cookie).

### POST /api/ask

Ask a single question.

**Request:**
```json
{
  "question": "What encryption does Zenlytic use?",
  "context": "Optional context about the customer"
}
```

**Response:**
```json
{
  "answer": "Zenlytic uses AES-256 encryption...",
  "citations": ["Security Policy", "docs.zenlytic.com"],
  "searches": ["search_notion: encryption", "search_docs: encryption"]
}
```

### POST /api/batch

Process multiple questions (max 10).

**Request:**
```json
{
  "questions": [
    { "id": "1", "question": "SOC2 certified?", "context": "" },
    { "id": "2", "question": "Data retention policy?" }
  ]
}
```

**Response:**
```json
{
  "total": 2,
  "processed": 2,
  "results": [
    { "id": "1", "question": "...", "answer": "...", "citations": [] },
    { "id": "2", "question": "...", "answer": "...", "citations": [] }
  ]
}
```

### GET /api/auth-status

Check authentication status.

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "email": "user@zenlytic.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

### GET /api/auth-login

Redirects to Google OAuth.

### GET /api/auth-logout

Clears session and redirects to home.

---

## Knowledge Sources

The assistant searches these sources to answer questions:

### 1. Notion Workspace (Internal)

- **Employee Handbook** - HR policies, CC* controls, training
- **Security Homepage** - SOC2 reports, audit evidence
- **Engineering Wiki** - Architecture, technical documentation

### 2. Public Documentation (docs.zenlytic.com)

Synced via git submodule from [zenlytic-docs](https://github.com/Zenlytic/zenlytic-docs):

- `/data-sources/` - Database connection guides
- `/authentication-and-security/` - SSO, security features
- `/legal-and-support/` - Terms, DPA, subprocessors

### 3. Q&A Pairs (Cached Responses)

Pre-approved answers stored in `config/qa-pairs.json`. Manage via Admin page.

---

## Contributing

### Branch Protection

The `main` branch is protected:
- Requires pull request
- Requires 1 approval (bypass available for admins)
- No force pushes

### Workflow

1. Create feature branch from `main`
2. Make changes
3. Create PR
4. Admin review/bypass and merge

### Code Style

- TypeScript for all code
- React functional components with hooks
- Tailwind CSS for styling

---

## Security

- Authentication restricted to @zenlytic.com Google Workspace
- API keys stored in Netlify environment variables (not in code)
- Session tokens expire after 7 days
- All API routes protected with auth middleware

---

## License

Proprietary - Zenlytic Internal Use Only
