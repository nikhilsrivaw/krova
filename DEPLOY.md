# Deploying KROVA

You need to deploy 3 services. Easiest path:

| Service | Where | Cost |
|---|---|---|
| Website (`krova-website`) | Vercel | Free |
| Mobile PWA (`krova-mobile`) | Vercel | Free |
| Backend + workers (`krova/`) | Railway | $5/mo |
| Postgres | Supabase (already on it) | Free tier |
| Redis | Upstash | Free tier |

## 0. Buy the domain

Cloudflare Registrar is cheapest for `.in` (~₹650/year). After purchase, log in
to the Cloudflare DNS panel — you'll add records here in step 5.

## 1. Push to GitHub (private)

```bash
cd D:\desktop\KROVA
git init
git branch -m main
git add .
git commit -m "Initial commit"

gh repo create krova --private --source=. --remote=origin --push
# OR manually create on github.com and:
# git remote add origin git@github.com:YOUR_USER/krova.git
# git push -u origin main
```

**Verify no secrets are tracked:**
```bash
git ls-files | grep -E "\.env(\.|$)" | grep -v "\.env\.example"
# Should print nothing. If anything shows up — stop and fix the .gitignore.
```

## 2. Deploy the backend first

The frontends need the backend URL to be live, so do this first.

**Railway:**
1. Sign up at [railway.app](https://railway.app) (sign in with GitHub)
2. New project → Deploy from GitHub repo → pick `krova`
3. Set the root directory to `krova/`
4. Railway auto-detects Python. You may need a `railway.json` or `Procfile`.

**Create `krova/Procfile`:**
```
web: uvicorn services.api.main:app --host 0.0.0.0 --port $PORT
worker: python -m services.workers.run_all
```

**Set env vars in Railway → Variables tab:**
```
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://postgres.<ref>:<password>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
REDIS_URL=<from Upstash — see step 3>
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<your anon key>
SUPABASE_SERVICE_KEY=<your service key>
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_HAIKU_MODEL=claude-haiku-4-5-20251001
CLAUDE_SONNET_MODEL=claude-sonnet-4-6
CLAUDE_RATE_LIMIT_TPM=100000
SKIP_SSL_VERIFY=0
LOG_LEVEL=INFO
```

After deploy, Railway gives you `<project>.up.railway.app`. Add custom domain
`api.krova.in` in Railway → Settings → Domains.

## 3. Provision Redis

[Upstash](https://upstash.com) → New Database → Mumbai region → copy the
**Redis URL** (starts with `rediss://`). Paste into Railway's `REDIS_URL` env var.

## 4. Deploy the website + PWA

**Vercel (one project per app):**

**Project 1 — Website:**
1. Sign up at [vercel.com](https://vercel.com) with GitHub
2. New Project → Import `krova` repo
3. **Root Directory:** `krova-website`
4. Framework: Next.js (auto-detected)
5. Environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
   NEXT_PUBLIC_API_URL=https://api.krova.in
   ```
6. Deploy. Add custom domain `krova.in` + `www.krova.in` in Vercel → Settings.

**Project 2 — Mobile PWA:**
Same flow but **Root Directory: `krova-mobile`** and custom domain `app.krova.in`.

## 5. Wire DNS

Cloudflare DNS panel for `krova.in`:

| Type | Name | Value | Source |
|---|---|---|---|
| CNAME | `@` | (whatever Vercel tells you) | Vercel |
| CNAME | `www` | (Vercel) | Vercel |
| CNAME | `app` | (Vercel) | Vercel |
| CNAME | `api` | (Railway) | Railway |

Both Vercel and Railway show you the exact records under their "Domain" UI.
Paste them in Cloudflare. DNS propagates in ~10 minutes.

## 6. Final config sweep

**Supabase Auth (Dashboard → Authentication → URL Configuration):**
Add to **Site URL** and **Redirect URLs**:
```
https://krova.in
https://www.krova.in
https://app.krova.in
```

Otherwise email-confirm + Google OAuth break in prod.

**FastAPI CORS (`krova/services/api/middleware/auth.py`):**
The production `ALLOWED_ORIGINS` list already includes `krova.in`-style entries.
Make sure your real domain is in there. Redeploy if you change it.

**Confirm `SKIP_SSL_VERIFY=0`** on Railway. That was a Windows-dev-only escape
hatch. Linux production never needs it.

## 7. Smoke-test

- `https://api.krova.in/health` → `{"status":"healthy", ...}`
- `https://krova.in` → homepage
- `https://app.krova.in` → splash → login
- Sign in → chat loads → "Aaj kya hua?" streams a response

## What about migrations?

Run Alembic against the prod DB once:
```bash
# Locally, pointed at prod DB
cd krova
DATABASE_URL=<prod url> alembic upgrade head
```

Or add a Railway "Pre-deploy command": `alembic upgrade head`.

## Cost

| Item | Monthly |
|---|---|
| Vercel | $0 (Hobby plan) |
| Railway | $5 (Hobby plan with $5 free credit) |
| Supabase | $0 (Free tier — DB, auth) |
| Upstash | $0 (Free tier — Redis) |
| Domain | ~₹55 (₹650/year ÷ 12) |
| **Total** | **~$6 / ~₹500 per month** |

When you outgrow free tiers (probably at a few hundred active users),
the next step is Supabase Pro ($25), Railway Pro ($20), and a CDN tier on
Vercel — call it ~$70/month at that point.
