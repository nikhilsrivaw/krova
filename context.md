# KROVA — Complete Master Context Document
> Everything we planned, designed, and decided. The single source of truth for building KROVA.
> Generated: March 2026

---

## 1. The Name

**KROVA**

Invented word. Rooted in two ancient languages compressed into two syllables.

- Greek **KRONOS** — time, always present, eternal
- Sanskrit **VARA** — a blessing, a gift

**KROVA** — the AI that is always present, a gift to your business.

Nobody has used this name. It is completely ownable. Register `krova.ai` and `krova.in` immediately. File trademark in India under Class 42 (software and AI services) at ipindia.gov.in.

---

## 2. What KROVA Is

KROVA is an AI-powered autonomous business intelligence platform built specifically for Indian small and medium professional service businesses.

**The one sentence definition:**
> "The first software that comes to you instead of waiting for you."

**The three jobs KROVA does — simultaneously, always:**

1. **WATCH** — Monitors every channel (WhatsApp, Instagram, Email) 24 hours a day. No human input needed.
2. **UNDERSTAND** — Reads patterns, detects problems, identifies opportunities. Knows which lead is going cold, which client is at risk.
3. **ACT** — Takes action without being prompted. Sends follow-ups, alerts the owner, prepares daily briefings. Never waits.

**The core uniqueness — the hard problem nobody has solved:**

Three problems combined that no tool solves together:
- Context that never dies — remembers every customer, conversation, pattern, outcome permanently
- Acts without being asked — proactive not reactive. No prompt needed.
- Understands messy unstructured reality — WhatsApp chats, Instagram DMs, emails. No clean data required.

---

## 3. The Product — Three Surfaces, One Brain

### Surface 1: Mobile App
A conversational AI interface. The owner opens the app and simply asks — "Aaj kya hua?" The AI answers everything about their business in plain language. Like having a personal business analyst in their pocket available 24/7. Not a generic AI — an AI that knows only their specific business deeply.

### Surface 2: Web Dashboard
The full data analyst view. All stats, graphs, conversion rates, lead pipeline, revenue trends, customer health scores. This is where the data analyst identity of KROVA lives visually. No AI call needed — reads pre-computed analysis from database. Instant.

### Surface 3: The AI Brain
The intelligence layer powering both surfaces. Watches business data, processes nightly, feeds app and dashboard. Every night Claude Haiku reads all customer data, detects signals, and produces decisions. Who needs follow-up, who is going cold, who is about to convert, what message to send.

**The feedback loop:** Every action KROVA takes gets an outcome — customer replied, customer ignored, customer paid. That outcome feeds back into the brain so next time it makes a better decision for that customer.

---

## 4. Who KROVA Is For

**The one filter:** Do they lose money because they cannot see what is happening in their business?

**Target segments (prioritised):**

| Segment | Market Size | Pain | WTP | Priority |
|---|---|---|---|---|
| Digital Marketing Agencies | 10,000+ India, 38.9% CAGR | Very High | ₹2000-5000/mo | TOP PICK |
| Freelancers & Consultants | 15 million India | Very High | ₹499-1500/mo | TOP PICK |
| Coaching & Training | $6.5B market, 10.4% CAGR | High | ₹1000-3000/mo | TOP PICK |
| Recruitment Firms | $20B market, 13.2% CAGR | High | ₹2000-5000/mo | STRONG |
| CA & Legal Firms | 100,000+ firms | High | ₹1500-4000/mo | STRONG |
| Small Software Agencies | 25,000+ agencies | High | ₹2000-6000/mo | STRONG |

**Never target:** Kirana stores, walk-in retail, restaurants (wrong pain, won't pay).

---

## 5. Pricing Strategy

Three tiers:

- **Starter:** ₹299/month — basic alerts, 50 customers, manual approval, WhatsApp channel
- **Growth:** ₹699/month — smart follow-ups, 200 customers, auto-send, mobile app access
- **Pro:** ₹1299/month — full AI brain, unlimited customers, all channels, web dashboard + reports

**Sales approach:** Never mention price first. Show value (3 cold leads detected from their own data). 2-week free trial. Then: "Kaam aaya na? Sirf ₹499 mahine ka hai."

**Unit economics at Pro (50 customers):**
- Claude API: ₹90/customer
- WhatsApp API: ₹160/customer
- Server: ₹20/customer
- Total cost: ₹270/customer
- Revenue: ₹1299/customer
- Profit: ₹1029/customer — **79% margin**

---

## 6. Data Collection Strategy

Three channels connected during onboarding (~15-20 minutes total):

### WhatsApp Business Cloud API (Meta)
- Owner migrates existing WhatsApp Business number to the API
- Every incoming message fires webhook to server in real time
- Free tier available
- No third-party intermediary — direct Meta API only

### Instagram Graph API (Meta)
- Owner connects Instagram Business account via OAuth
- Receives DMs, comments, mentions via webhooks
- Only post-connection data available (cannot read history)
- Permissions needed: instagram_basic, instagram_manage_messages, pages_messaging

### Gmail API (Google) + Microsoft Graph API (Outlook)
- Owner connects via OAuth
- Gmail push notifications via Google Cloud Pub/Sub alert server on new emails
- Claude classifies business vs irrelevant emails
- Irrelevant emails (newsletters, spam) are ignored automatically

---

## 7. Complete Data Flow

### Flow 1 — Data Collection (Real-time)
```
Customer messages → Meta/Google fires webhook 
→ FastAPI receives (under 5 seconds, returns 200 OK immediately)
→ drops job in BullMQ ingestion queue 
→ worker saves to DB under correct business + customer profile
Total: under 1 second end-to-end
```

### Flow 2 — Brain Processing (Nightly 10 PM)
```
n8n triggers at 10 PM 
→ FastAPI fetches all businesses 
→ builds Claude prompt per business (context + conversations + instructions) 
→ sends to Batch API (50% discount) 
→ Claude returns structured JSON (status, urgency, action, message per customer) 
→ saved back to DB with completion status
50 businesses = 3-5 minutes total
```

### Flow 3 — Owner Interaction (Real-time)
```
Mobile app question 
→ FastAPI fetches business context + last night's analysis + 20-message history 
→ sends to Claude Sonnet 
→ streams response back word by word
Under 2 seconds to first word

Web dashboard 
→ reads pre-computed analysis from DB directly
→ No AI call. Instant.

Owner taps approve 
→ action execution queue (high priority) 
→ Meta API sends message from owner's number to customer
```

---

## 8. Architecture — Scalability from Day One

### Core Principles (Non-negotiable)

1. **Never do synchronously what can be done asynchronously** — receive fast, process in background
2. **Every component is stateless** — no information stored in server memory between requests
3. **Separate every concern into its own service** — webhook workers, analysis workers, notification workers, API workers scale independently
4. **Design database for the queries you will run** — index on business_id everywhere, from day one
5. **Treat every external API as unreliable** — retry with exponential backoff, circuit breaker, dead letter queues
6. **Nightly analysis must be resumable** — track status per business, resume from failure point
7. **Cache aggressively, invalidate correctly** — explicit invalidation rules for every cached item
8. **Multi-tenancy from the very first table** — every table has business_id from day one
9. **Monitor everything before you need it** — Sentry, queue dashboards, database monitoring from day one
10. **Design for 10,000 users while building for 50** — UUIDs, timestamps, pagination, connection pooling everywhere

### Five Queue Architecture (BullMQ + Redis)

| Queue | Purpose | Workers | Priority |
|---|---|---|---|
| Message Ingestion | Receive all webhooks, save to DB | 3 → 20 as volume grows | Normal |
| AI Analysis | Nightly batch per business | 2, rate-limited | Normal |
| Notification | Morning briefings after analysis | 2 | Normal |
| Action Execution | Owner approves → send message | 5 | HIGH — 24/7 |
| Email Processing | Gmail classify + save | 2 | Normal |

### Database Architecture

- **Primary:** PostgreSQL 15 on Supabase — all writes
- **Read Replica:** Supabase read replica — all dashboard queries
- **Cache:** Redis 7 — frequently read data, token bucket rate limiter, BullMQ queues
- **Migrations:** Alembic — every schema change versioned
- **Connection Pooling:** PgBouncer (built into Supabase) — prevents connection limit exhaustion
- **Future Partitioning:** Partition messages table by business_id when hitting 10M records

### Critical Database Rules
- UUIDs not auto-incrementing integers as primary keys
- created_at and updated_at on every single table
- business_id column with index on every single table
- No N+1 queries — use joins and aggregations
- Pagination on every list endpoint — never return all records
- Filter by business_id in database query, never in application code

---

## 9. Complete Tech Stack

### Backend
| Technology | Choice | Reason |
|---|---|---|
| Language | Python 3.11 | Best AI ecosystem support |
| Framework | FastAPI | Async, handles concurrent webhooks |
| Server | Uvicorn + Gunicorn | Async + multi-process |
| Queue | BullMQ (Node.js) | Battle-tested, Redis-native |
| Scheduler | APScheduler | Nightly trigger inside FastAPI |
| Dependencies | Poetry | Better than pip for complex projects |
| Migrations | Alembic | Safe schema versioning |

### Database & Cache
| Technology | Choice | Reason |
|---|---|---|
| Primary DB | PostgreSQL 15 on Supabase | Relational, managed, free tier |
| Cache | Redis 7 on Railway | Queue + cache + rate limiter |
| Read Replica | Supabase built-in | Dashboard queries don't hit primary |

### AI Layer
| Use Case | Model | Reason |
|---|---|---|
| Nightly batch analysis | Claude Haiku 4.5 (Batch API) | Cheap, fast, 50% discount |
| Mobile app conversations | Claude Sonnet 4.5 | Best quality for real-time chat |
| Email classification | Claude Haiku 4.5 | Simple task, very cheap |
| Prompt storage | /prompts folder | Separate from business logic |

### Integrations
| Channel | Technology |
|---|---|
| WhatsApp | Meta WhatsApp Cloud API (direct, no middleman) |
| Instagram | Instagram Graph API |
| Gmail | Gmail API + Google Cloud Pub/Sub push notifications |
| Outlook | Microsoft Graph API |
| Automation | n8n self-hosted on Railway |

### Frontend
| Surface | Technology | Hosting |
|---|---|---|
| Mobile App | React Native 0.73 + Expo SDK 50 | App Store + Play Store |
| Web Dashboard | React 18 + TypeScript + Vite | Vercel |
| Landing Website | Next.js 14 (App Router) | Vercel |

### Mobile App Stack
- Navigation: React Navigation 6
- State: Zustand
- HTTP: Axios with interceptors
- Streaming: EventSource (server-sent events)
- Storage: AsyncStorage
- UI: React Native Paper

### Dashboard Stack
- Routing: React Router 6
- Data fetching: TanStack Query
- Charts: Recharts
- Components: Shadcn UI
- Styling: Tailwind CSS 3

### Infrastructure
| Layer | Technology |
|---|---|
| Backend hosting | Railway |
| Frontend hosting | Vercel |
| Auth | Supabase Auth |
| Encryption | Python cryptography (Fernet) |
| Error tracking | Sentry (all services) |
| CI/CD | GitHub Actions |
| Local dev | Docker Compose |
| API testing | Postman |
| Code quality | Black + Flake8 (Python), ESLint + Prettier (JS/TS) |

### Monthly Cost at 50 Customers
| Service | Cost |
|---|---|
| Railway (backend + n8n) | ₹3,000 |
| Claude API | ₹4,000 |
| WhatsApp API | ₹1,500 |
| Redis | ₹800 |
| Supabase | ₹0 (free tier) |
| Vercel | ₹0 (free tier) |
| **Total** | **~₹9,300/month** |
| Revenue (50 × ₹999) | ₹49,950 |
| **Profit** | **~₹40,000** |

---

## 10. Folder Structure

### Four Repositories

```
KROVA/
├── krova/                          # Main monorepo
│   ├── infrastructure/
│   │   ├── docker/
│   │   └── railway/
│   │       └── railway.toml
│   ├── services/
│   │   ├── ai-brain/
│   │   │   ├── analysis/
│   │   │   │   ├── classifier.py   # Classifies message types
│   │   │   │   ├── nightly.py      # Nightly batch analysis logic
│   │   │   │   └── realtime.py     # Real-time analysis for urgent signals
│   │   │   ├── claude/             # Claude API integration
│   │   │   ├── memory/             # Business context management
│   │   │   ├── prompts/            # All prompt templates
│   │   │   └── main.py
│   │   ├── api/
│   │   │   ├── dependencies/       # FastAPI dependencies (auth, db)
│   │   │   ├── middleware/         # Rate limiting, logging, CORS
│   │   │   ├── routers/            # All route handlers
│   │   │   └── main.py             # FastAPI app entry point
│   │   ├── data-ingestion/
│   │   │   ├── handlers/           # WhatsApp, Instagram, Gmail handlers
│   │   │   ├── queue/              # BullMQ job producers
│   │   │   ├── validators/         # Webhook payload validation
│   │   │   └── main.py
│   │   └── workers/
│   │       ├── action_worker.py    # Approve → send message
│   │       ├── analysis_worker.py  # Nightly AI analysis
│   │       ├── email_processor.py  # Gmail classify + save
│   │       ├── message_processor.py # Save incoming messages
│   │       └── notification_worker.py # Morning briefings
│   ├── shared/
│   │   ├── cache/                  # Redis caching helpers
│   │   ├── config/                 # All environment variables
│   │   ├── database/               # PostgreSQL connection + models
│   │   ├── encryption/             # Fernet encryption helpers
│   │   ├── integrations/           # WhatsApp, Instagram, Gmail clients
│   │   ├── queue/                  # BullMQ queue definitions
│   │   └── utils/                  # Shared utilities
│   ├── tests/
│   │   ├── fixtures/
│   │   └── unit/
│   ├── .env.example
│   ├── pyproject.toml
│   └── README.md
├── krova-dashboard/                # React TypeScript dashboard
├── krova-mobile/                   # React Native mobile app
└── krova-website/                  # Next.js landing website
```

---

## 11. Go-to-Market Strategy

### Four Phases

**Phase 1 (Months 1-3) — One city, 50 customers**
- One city only. Digital agencies + freelancers.
- Go door to door personally. Sit with owners.
- Show value in 15 minutes using their own data.
- 2-week free trial. Charge from week 3.
- Target: 50 paying customers.

**Phase 2 (Months 3-6) — Same product, every city**
- Use Phase 1 case studies as proof.
- Word of mouth drives growth.
- Target: 200 paying customers across 5 cities.

**Phase 3 (Months 6-12) — Add coaching and recruitment**
- New templates. Same AI brain.
- Each new segment adds market without rebuilding.
- Target: 500 customers total.

**Phase 4 (Year 2) — CA firms and software agencies**
- Higher ARPU segments.
- AI brain smarter from 500+ businesses of data.
- Target: 2,000 customers → ₹7.2 crore ARR.

### 24-Month Revenue Projection

| Milestone | Customers | Avg Revenue | Monthly Revenue | ARR |
|---|---|---|---|---|
| Month 3 | 50 | ₹1,500 | ₹75,000 | ₹9L |
| Month 6 | 200 | ₹1,800 | ₹3.6L | ₹43L |
| Month 12 | 500 | ₹2,000 | ₹10L | ₹1.2Cr |
| Month 18 | 1,000 | ₹2,500 | ₹25L | ₹3Cr |
| Month 24 | 2,000 | ₹3,000 | ₹60L | ₹7.2Cr |

---

## 12. Competitive Analysis

| Tool | What it does | What it misses | Threat to KROVA |
|---|---|---|---|
| Klaviyo | Autonomous AI for B2C ecommerce | US market, no WhatsApp, no India SMBs | WATCH |
| OpenClaw (YC) | AI workforce + CRM in comms channels | US legal firms, email not WhatsApp | WATCH |
| Gupshup | Conversational AI on WhatsApp | Reactive, enterprise pricing | LOW |
| WATI / Gallabox | WhatsApp automation | Zero AI brain, pure chatbot | LOW |
| HubSpot / Salesforce | CRM with AI | Manual data entry, too expensive | LOW |
| Agentic AI firms India | Custom AI agents | Enterprise only, crores to deploy | NONE |

**The gap KROVA fills:** Every tool shows data or waits for you to ask. Nobody watches your specific Indian small business, understands it deeply, and acts automatically without being asked on WhatsApp at ₹699/month.

**The three moats:**
1. **Data moat** — every business trains the AI to be smarter for the next similar business
2. **Relationship moat** — sold in person, owner's entire pipeline lives in KROVA, switching cost enormous
3. **Timing moat** — 18-24 month window before funded competitor enters this specific space

---

## 13. Coding Standards — Production Grade from Line One

Every file we write follows these rules without exception:

- Every function has type hints
- Every module has proper error handling
- Every external call has retry logic with exponential backoff
- Every secret comes from environment variables only
- Every database query uses connection pooling
- Every API endpoint has input validation (Pydantic)
- Every response has a consistent structure
- Every worker has graceful shutdown handling
- No hardcoded values anywhere
- No print statements — only Python logging module
- No bare except clauses
- No synchronous calls inside async functions
- UUIDs as primary keys everywhere
- business_id on every single database table
- Pagination on every list endpoint
- Sentry error tracking from day one

---

## 14. The One Rule

> Build only what owners actually ask for. No feature is added unless a real business owner described it as painful. Complexity is built when it solves a real problem — not because it sounds impressive.

This rule protects KROVA from becoming another overbuilt tool nobody uses. The product stays simple on the outside no matter how intelligent it becomes inside.

---

## 15. What We Build First — The Order

1. `shared/config/` — environment variables, all settings
2. `shared/database/` — PostgreSQL connection, base models
3. `shared/cache/` — Redis connection, caching helpers
4. `shared/queue/` — BullMQ queue definitions
5. `api/main.py` — FastAPI server boots and runs
6. `data-ingestion/handlers/` — WhatsApp webhook receives first message
7. `shared/integrations/` — WhatsApp, Instagram, Gmail clients
8. `workers/message_processor.py` — first message saved to database
9. `ai-brain/analysis/nightly.py` — first nightly analysis runs
10. `workers/analysis_worker.py` — analysis worker processes queue
11. `workers/notification_worker.py` — owner receives morning briefing
12. `workers/action_worker.py` — owner approves, message sent
13. Mobile app — chat interface connecting to backend
14. Web dashboard — reading analysis results from database
15. Landing website — credibility and conversion

---

## 16. Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Meta (WhatsApp + Instagram)
META_APP_ID=...
META_APP_SECRET=...
META_WEBHOOK_VERIFY_TOKEN=...

# Google (Gmail)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_PUBSUB_TOPIC=...

# Microsoft (Outlook)
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...

# Security
ENCRYPTION_KEY=...
JWT_SECRET=...

# Monitoring
SENTRY_DSN=...

# App
ENVIRONMENT=development
LOG_LEVEL=INFO
```

---

## 17. Key Decisions Locked

- **Name:** KROVA
- **Domain:** krova.ai (primary), krova.in (India)
- **Backend:** Python FastAPI — not Node.js, not Django
- **Queue:** BullMQ — not Celery, not RQ
- **Database:** PostgreSQL on Supabase — not MongoDB, not Firebase
- **AI:** Claude Haiku for batch, Claude Sonnet for real-time — not GPT-4, not Gemini
- **WhatsApp:** Meta Cloud API direct — not WATI, not Twilio
- **Mobile:** React Native + Expo — not Flutter, not native
- **Hosting:** Railway (backend) + Vercel (frontend) — not AWS, not GCP
- **Architecture:** Event-driven, stateless, queue-based from day one

---

*This document represents the complete planning, architecture, and strategy for KROVA. Every decision in here was made deliberately. Nothing is here by accident.*

*Last updated: March 2026*
*Status: Ready to build*