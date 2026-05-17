# KROVA — Complete Setup & Run Guide

> Everything you need to understand, set up, and run the full KROVA stack.

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [Project Structure](#2-project-structure)
3. [How Everything Connects](#3-how-everything-connects)
4. [Prerequisites](#4-prerequisites)
5. [Environment Variables](#5-environment-variables)
6. [Running the Backend](#6-running-the-backend)
7. [Viewing the Web Dashboard](#7-viewing-the-web-dashboard)
8. [Viewing the Mobile App](#8-viewing-the-mobile-app)
9. [Known Gaps & Next Steps](#9-known-gaps--next-steps)

---

## 1. What Was Built

KROVA is an AI-powered business intelligence platform for Indian SMBs. It has **four surfaces** sharing one backend:

| Surface | Tech | What it does |
|---|---|---|
| **Backend API** | Python + FastAPI | Receives webhooks, serves all data, runs workers |
| **AI Workers** | Python (async) | Processes messages, runs nightly analysis, sends actions |
| **Web Dashboard** | React 18 + Vite + Tailwind | Visual analytics for the owner — pipeline, customers, charts |
| **Mobile App** | React Native + Expo | Conversational AI interface — chat with KROVA about your business |

### What the system does end-to-end

```
Customer sends WhatsApp message
  → Meta fires webhook to FastAPI
  → Worker saves customer + message to PostgreSQL
  → APScheduler triggers at 10 PM
  → Claude Batch API analyses every customer overnight
  → Owner wakes up to WhatsApp briefing at 8 AM
  → Owner opens mobile app → asks "Aaj kya hua?"
  → KROVA answers with real business data, streamed word-by-word
  → Owner taps HAAN on a suggested follow-up
  → Customer receives the message within 5 seconds
```

---

## 2. Project Structure

```
KROVA/
├── KROVA_COMPLETE_BIBLE.md     ← Full product spec (read this first)
├── SETUP_GUIDE.md              ← This file
│
├── krova/                      ← Python monorepo (backend + workers)
│   ├── .env.example            ← Copy this to .env and fill values
│   ├── pyproject.toml          ← Python dependencies (Poetry)
│   │
│   ├── shared/                 ← Code shared by all services
│   │   ├── config/settings.py  ← All env vars (Pydantic BaseSettings)
│   │   ├── database/
│   │   │   ├── connection.py   ← PostgreSQL async engine + session
│   │   │   ├── base.py         ← SQLAlchemy base (UUID PK, timestamps)
│   │   │   └── models/         ← 7 models: Business, Customer, Message,
│   │   │                           Action, AnalysisResult, ConversationSession, User
│   │   ├── cache/
│   │   │   ├── redis_client.py ← Redis connection + get/set/invalidate
│   │   │   └── keys.py         ← All cache key definitions (no magic strings)
│   │   ├── queue/
│   │   │   ├── bullmq_client.py ← LPUSH/BRPOP queue (enqueue/dequeue)
│   │   │   ├── job_types.py    ← Typed Pydantic job models
│   │   │   └── rate_limiter.py ← Redis token bucket for Claude API
│   │   ├── claude/
│   │   │   ├── client.py       ← Claude Sonnet (streaming, real-time chat)
│   │   │   ├── batch.py        ← Claude Batch API (nightly analysis, 50% cheaper)
│   │   │   └── streaming.py    ← SSE helper for FastAPI StreamingResponse
│   │   ├── prompts/
│   │   │   ├── nightly_analysis.py ← The main brain prompt (sent to Claude every night)
│   │   │   ├── conversation.py     ← Mobile app chat prompt
│   │   │   └── email_classifier.py ← Email: business enquiry vs spam
│   │   ├── context/builder.py  ← Builds full business context for Claude
│   │   ├── encryption/tokens.py ← Fernet encrypt/decrypt for stored API tokens
│   │   └── integrations/
│   │       ├── whatsapp/       ← Meta WhatsApp Cloud API client + validator
│   │       ├── instagram/      ← Instagram Graph API client
│   │       ├── gmail/          ← Gmail API client (OAuth + history API)
│   │       └── outlook/        ← Microsoft Graph API client
│   │
│   ├── services/
│   │   ├── api/                ← FastAPI application
│   │   │   ├── main.py         ← App entry point: middleware, routers, scheduler
│   │   │   ├── middleware/     ← CORS, rate limiting (slowapi), request logging
│   │   │   ├── dependencies/   ← auth.py (JWT → CurrentUser), database.py
│   │   │   └── routers/
│   │   │       ├── webhooks.py     ← WhatsApp/Instagram/Gmail incoming webhooks
│   │   │       ├── auth.py         ← POST /auth/register
│   │   │       ├── businesses.py   ← GET/POST/PATCH /businesses/me
│   │   │       ├── customers.py    ← GET /customers, /customers/{id}, /customers/{id}/messages
│   │   │       ├── conversations.py ← POST /conversations, /conversations/{id}/chat (SSE)
│   │   │       ├── actions.py      ← GET /actions/pending, POST approve/reject
│   │   │       ├── insights.py     ← GET /insights/summary, hot-leads, at-risk
│   │   │       └── analytics.py    ← GET /analytics/overview, channels, pipeline
│   │   │
│   │   └── workers/            ← Background job processors (run separately)
│   │       ├── message_processor.py  ← Saves WhatsApp/Instagram messages
│   │       ├── email_processor.py    ← Classifies + saves Gmail messages
│   │       ├── analysis_worker.py    ← Nightly Claude Batch analysis
│   │       ├── notification_worker.py ← Morning briefing to owner WhatsApp
│   │       └── action_worker.py      ← Sends approved follow-up messages
│
├── krova-dashboard/            ← React web dashboard
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx       ← Email + password (Supabase Auth)
│   │   │   ├── OverviewPage.tsx    ← Morning briefing + stat grid + hot leads
│   │   │   ├── PipelinePage.tsx    ← Kanban: New → Hot → Warm → Cold → Converted → Lost
│   │   │   ├── CustomersPage.tsx   ← Filterable table + customer detail panel
│   │   │   └── AnalyticsPage.tsx   ← Channel bar chart + status donut + KPI table
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         ← Dark nav sidebar
│   │   │   ├── StatCard.tsx        ← Metric card (accent = purple)
│   │   │   └── HealthBadge.tsx     ← Green/yellow/red health indicator
│   │   ├── lib/
│   │   │   ├── api.ts              ← Axios with JWT auto-attach + 401 refresh
│   │   │   └── supabase.ts         ← Supabase client
│   │   └── hooks/useAuth.ts        ← Auth state subscription
│   └── package.json
│
└── krova-mobile/               ← React Native mobile app (Expo)
    ├── src/
    │   ├── screens/
    │   │   ├── SplashScreen.tsx    ← Checks session → Login or Chat
    │   │   ├── LoginScreen.tsx     ← Email + password + sign up toggle
    │   │   ├── OnboardingScreen.tsx ← 5-step business setup flow
    │   │   ├── ChatScreen.tsx      ← Conversational AI with word-by-word streaming
    │   │   └── ApprovalsScreen.tsx ← Pending follow-ups with HAAN/NAHI buttons
    │   ├── components/
    │   │   ├── ChatBubble.tsx      ← User (purple right) + KROVA (white left) bubbles
    │   │   └── ActionCard.tsx      ← Approval card with approve/reject
    │   ├── services/
    │   │   ├── api.ts              ← Axios with JWT interceptor
    │   │   ├── supabase.ts         ← Supabase with AsyncStorage persistence
    │   │   └── streaming.ts        ← fetch + ReadableStream SSE parser
    │   ├── store/useStore.ts       ← Zustand: auth + conversation + approvals state
    │   └── navigation/AppNavigator.tsx ← Stack nav (auth flow) + Tab nav (main app)
    └── package.json
```

---

## 3. How Everything Connects

```
                     ┌──────────────────────┐
                     │   Supabase Auth      │  ← Handles login for both
                     │   (JWT tokens)       │    mobile + dashboard
                     └──────────┬───────────┘
                                │ Bearer JWT on every request
                     ┌──────────▼───────────┐
                     │   FastAPI Backend     │  ← api.krova.ai (Railway)
                     │   :8000              │
                     └──────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
    ┌─────────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
    │  PostgreSQL DB  │  │    Redis     │  │  5 Workers   │
    │  (Supabase)     │  │  (Railway)   │  │  (Railway)   │
    └─────────────────┘  └──────────────┘  └──────────────┘
              ▲                 ▲
              │                 │ Job queues (LPUSH/BRPOP)
    ┌─────────┴──────┐  ┌───────┴──────┐
    │ Web Dashboard  │  │  Mobile App  │
    │ localhost:3000  │  │  Expo Go     │
    └────────────────┘  └──────────────┘
```

---

## 4. Prerequisites

Install these before anything else:

| Tool | Version | Install |
|---|---|---|
| Python | 3.11+ | `pyenv install 3.11` |
| Poetry | Latest | `curl -sSL https://install.python-poetry.org \| python3 -` |
| Node.js | 18+ | `nvm install 18` |
| Redis | 7+ | `brew install redis` (Mac) or Docker |
| PostgreSQL | 15+ | Use Supabase free tier (recommended) |
| Expo CLI | Latest | `npm install -g expo-cli` |
| Expo Go app | — | Install on your phone from App Store / Play Store |

---

## 5. Environment Variables

### Backend (`krova/.env`)

Copy `krova/.env.example` to `krova/.env` and fill in:

```env
# ── App ─────────────────────────────────
ENVIRONMENT=development
LOG_LEVEL=DEBUG
APP_VERSION=0.1.0

# ── Database (get from Supabase project settings → Database → Connection string) ──
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# ── Redis (get from Railway Redis service → Connect tab) ──
REDIS_URL=redis://default:[PASSWORD]@[HOST]:[PORT]

# ── Supabase (get from Supabase project settings → API) ──
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# ── JWT (copy from Supabase project settings → API → JWT Settings) ──
JWT_SECRET=[your-supabase-jwt-secret]
JWT_ALGORITHM=HS256

# ── Anthropic ────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_HAIKU_MODEL=claude-haiku-4-5-20251001
CLAUDE_SONNET_MODEL=claude-sonnet-4-6

# ── Meta (WhatsApp + Instagram) ──────────
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=any-random-string-you-choose
META_API_VERSION=v18.0

# ── Google (Gmail) ───────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
GOOGLE_PUBSUB_TOPIC=

# ── Encryption ───────────────────────────
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=

# ── Rate Limiting ────────────────────────
API_RATE_LIMIT_PER_MINUTE=60
WEBHOOK_RATE_LIMIT_PER_MINUTE=1000

# ── Sentry (optional for dev) ────────────
SENTRY_DSN=
```

### Dashboard (`krova-dashboard/.env.local`)

Create the file `krova-dashboard/.env.local`:

```env
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8000
```

### Mobile App (`krova-mobile/.env`)

Create `krova-mobile/.env` — Expo reads `EXPO_PUBLIC_*` automatically:

```env
EXPO_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=http://YOUR-LOCAL-IP:8000
```

> **Important for mobile:** Use your machine's local network IP (e.g. `192.168.1.5:8000`), not `localhost`. Your phone and your computer are different devices on the same network. Find your IP with `ipconfig` (Windows) or `ifconfig` (Mac).

---

## 6. Running the Backend

### Step 1 — Install Python dependencies

```bash
cd krova
poetry install
```

### Step 2 — Set up the database

The database tables need to be created. Until Alembic migrations are written (Week 12 task), create them directly:

```bash
# Start a Python shell inside the Poetry env
poetry run python

# Inside the shell:
from shared.database.connection import engine
from shared.database.base import KrovaBase
from shared.database.models import *  # imports all models
import asyncio
asyncio.run(KrovaBase.metadata.create_all(engine))
exit()
```

Or if you prefer SQL, run this in your Supabase SQL editor — the tables will be created automatically by SQLAlchemy when you run the command above.

### Step 3 — Start Redis locally (if not using Railway)

```bash
redis-server
```

### Step 4 — Start the API server

```bash
cd krova
poetry run uvicorn services.api.main:app --reload --port 8000
```

You should see:
```
INFO:     KROVA API starting
INFO:     Redis connection OK
INFO:     KROVA API ready
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 5 — Start workers (each in a separate terminal)

```bash
# Terminal 2 — handles WhatsApp + Instagram messages
cd krova && poetry run python -m services.workers.message_processor

# Terminal 3 — handles Gmail classification
cd krova && poetry run python -m services.workers.email_processor

# Terminal 4 — HIGH PRIORITY: fires approved messages to customers
cd krova && poetry run python -m services.workers.action_worker

# Terminal 5 — nightly Claude Batch analysis (only runs when jobs are queued)
cd krova && poetry run python -m services.workers.analysis_worker

# Terminal 6 — sends morning WhatsApp briefings
cd krova && poetry run python -m services.workers.notification_worker
```

### Verify the backend is running

Open your browser or Postman:

```
GET http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "environment": "development",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

API docs (development only):
```
http://localhost:8000/docs
```

---

## 7. Viewing the Web Dashboard

### Step 1 — Install dependencies

```bash
cd krova-dashboard
npm install
```

### Step 2 — Create environment file

```bash
# krova-dashboard/.env.local
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8000
```

### Step 3 — Start the dev server

```bash
npm run dev
```

### Step 4 — Open in browser

```
http://localhost:3000
```

### What you will see

**Login page** → Enter your Supabase Auth email + password

After login, the sidebar appears with 4 sections:

| Page | URL | What it shows |
|---|---|---|
| **Overview** | `/` | Morning briefing, 8 KPI cards, hot leads with suggested messages |
| **Lead Pipeline** | `/pipeline` | Horizontal kanban — 6 columns (New / Hot / Warm / Cold / Converted / Lost). Click any card to open a detail panel with the customer's AI analysis, notes, and suggested message |
| **Customers** | `/customers` | Searchable table of all customers. Filter by status or channel. Click any row → full profile panel with message history |
| **Analytics** | `/analytics` | Bar chart (messages by channel), donut chart (customer status split), channel breakdown table with share percentages |

> **Note:** Until real data flows in through webhooks, all charts and counts will show zero. To see the dashboard with real data, you need at least one WhatsApp message to arrive via the webhook flow.

---

## 8. Viewing the Mobile App

The mobile app runs on your actual phone using the **Expo Go** app. No build required for development.

### Step 1 — Install dependencies

```bash
cd krova-mobile
npm install
```

### Step 2 — Create environment file

```bash
# krova-mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=http://192.168.1.X:8000   ← your machine's local IP
```

### Step 3 — Find your local IP address

```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4
```

Use the IP shown (e.g. `192.168.1.45`). Your phone must be on the same Wi-Fi network.

### Step 4 — Start Expo

```bash
npx expo start
```

A QR code will appear in your terminal.

### Step 5 — Open on your phone

1. **iPhone** — Open the built-in Camera app → point at QR code → tap the Expo Go banner
2. **Android** — Open the **Expo Go** app → tap "Scan QR code" → scan the code

The app will load on your phone in 10–20 seconds.

### What you will see

**Splash screen** → checks if you are logged in

If not logged in → **Login screen**
- Enter email + password (same Supabase account as dashboard)
- Tap Login
- If first time → **Onboarding** (5 questions about your business)

After login → **Main app with 2 tabs:**

| Tab | What it shows |
|---|---|
| **💬 Chat** | The conversational AI. Type anything about your business — "Aaj kya hua?", "Who are my hot leads?", "What should I do today?" — KROVA answers with real data, words streaming in real-time |
| **✅ Approvals** | All follow-up messages KROVA has suggested. Each card shows the customer name and the exact message. Tap **HAAN** to send it (fires within 5 seconds). Tap **NAHI** to dismiss |

### Testing the streaming chat without backend data

You can test the chat even with zero customers. Ask:
- *"What can you do?"*
- *"How does KROVA work?"*

Claude will answer using the system prompt context. The streaming (word-by-word) experience works regardless of whether you have customer data.

---

## 9. Known Gaps & Next Steps

These are the remaining tasks before KROVA is production-ready (Week 12):

### Critical (must fix before first real user)

| Gap | What to do |
|---|---|
| **Alembic migrations** | Run `poetry run alembic init alembic`, write migration from the SQLAlchemy models, `alembic upgrade head` |
| **`pyproject.toml` dependencies** | Run `poetry add fastapi uvicorn sqlalchemy asyncpg redis anthropic python-jose slowapi apscheduler sentry-sdk cryptography aiohttp` and all other deps |
| **`GmailEmailJob` field mismatch** | The job has `gmail_message_id`/`business_id` but the worker reads `email_address`/`history_id` — fix the processor to use the right fields |
| **`GET /auth/me`** | Returns 501 — needs to return the current user's profile |

### Important (needed for full feature set)

| Gap | What to do |
|---|---|
| **OAuth callbacks** | `GET /auth/google/callback` and `GET /auth/microsoft/callback` — needed to connect Gmail/Outlook during onboarding |
| **WhatsApp verification webhook** | Test end-to-end with Meta's webhook verification (`?hub.challenge` response) |
| **Alembic migrations** | Without these, deploying to Railway will fail silently |
| **Docker Compose** | Local dev with all services (API + 5 workers + Redis + PostgreSQL) started with one command |

### Nice to have

| Item | Notes |
|---|---|
| **Landing website** (Week 11) | Next.js 14 — not yet built |
| **GitHub Actions CI/CD** | Auto-deploy to Railway on `git push` |
| **Sentry full integration** | DSN is wired in backend — just needs a real Sentry project |
| **`GET /customers` filter bug** | The count query has a Python `True` condition instead of SQLAlchemy condition — fix the `if customer_status` / `if channel` logic |

---

## Quick Reference — All Running Services

| Service | Command | Port |
|---|---|---|
| FastAPI backend | `poetry run uvicorn services.api.main:app --reload` | 8000 |
| API docs | (auto from above) | 8000/docs |
| Web dashboard | `npm run dev` (in krova-dashboard/) | 3000 |
| Mobile app | `npx expo start` (in krova-mobile/) | Expo Go on phone |
| Redis | `redis-server` | 6379 |
| Message worker | `poetry run python -m services.workers.message_processor` | — |
| Email worker | `poetry run python -m services.workers.email_processor` | — |
| Analysis worker | `poetry run python -m services.workers.analysis_worker` | — |
| Notification worker | `poetry run python -m services.workers.notification_worker` | — |
| Action worker | `poetry run python -m services.workers.action_worker` | — |

---

*Built with FastAPI · PostgreSQL · Redis · Claude AI · React Native · Expo · React · Vite · Tailwind*
