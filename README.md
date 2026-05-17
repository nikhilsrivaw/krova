# KROVA

AI Business Analyst for Indian SMBs. Reads every conversation across WhatsApp,
Instagram, Gmail and Outlook. Predicts what's at risk. Drafts what to do.

A product of **Aqirox Technology Pvt Ltd**.

## Layout

```
krova/                    FastAPI backend + workers + Alembic migrations
krova-website/            Next.js marketing site + web dashboard
krova-mobile/             Next.js PWA (installable chat app)
```

## Local dev

You need: Python 3.13, Node 20+, a Supabase project, an Anthropic API key,
(optional) Redis on `localhost:6379`.

```bash
# 1. Backend
cd krova
cp .env.example .env       # then fill in real values
pip install -r requirements.txt  # or use poetry
uvicorn services.api.main:app --reload --host 0.0.0.0 --port 8000

# 2. Website (port 3000)
cd ../krova-website
cp .env.example .env.local # then fill in real values
npm install
npm run dev

# 3. Mobile PWA (port 3001)
cd ../krova-mobile
npm install
npm run dev
```

Login at `localhost:3000/login` or `localhost:3001/login`.

## Seeding dev data

```bash
cd krova
python -m scripts.create_demo_user \
  --email demo@krova.in \
  --password demo1234 \
  --name "Demo Owner"
```

This creates the Supabase Auth user, links a KROVA row, and seeds 18 customers,
125 messages, 8 pending actions, predictions, commitments, revenue signals,
and a Business DNA profile.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for the full deployment guide.

Short version:
- **Website + Mobile PWA** → Vercel (separate projects per app)
- **Backend + Workers** → Railway
- **PostgreSQL** → Supabase (already provisioned)
- **Redis** → Upstash

One domain, three subdomains:
- `krova.in` → website
- `app.krova.in` → mobile PWA
- `api.krova.in` → backend
# krova
