# KROVA — All Keys & Credentials Required

Status legend: ✅ Done · ⏳ Needed to run · 🔁 Needed for that feature only

---

## CURRENT STATUS

| Service | Status | Notes |
|---|---|---|
| Supabase (DB + Auth) | ✅ Done | Database, anon key, service key, JWT secret all set |
| Encryption key | ✅ Done | Generated and set in `.env` |
| Redis | ✅ Done | Runs locally via Docker or `redis-server` |
| Anthropic (Claude AI) | ⏳ Needed | Core AI — nothing works without this |
| Meta (WhatsApp + Instagram) | 🔁 Feature | Only needed when connecting those channels |
| Google (Gmail) | 🔁 Feature | Only needed when connecting Gmail |
| Microsoft (Outlook) | 🔁 Feature | Only needed when connecting Outlook |
| Sentry | 🔁 Optional | Error monitoring — skip in dev |

---

## 1. ANTHROPIC — Claude AI ⏳ NEEDED FIRST

**Why:** Every AI feature — nightly analysis, suggested replies, chat, email classification — calls Claude. Without this key, the entire AI brain is dead.

**Get it:**
1. Go to https://console.anthropic.com
2. Sign up / log in
3. Settings → API Keys → Create Key
4. Copy the key (starts with `sk-ant-api03-...`)

**Paste into `krova/.env`:**
```
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
```

**Cost estimate:** Claude Haiku is ~$0.25/million tokens. For 100 customers analysed nightly = ~$0.05/day. Very cheap.

---

## 2. META — WhatsApp + Instagram 🔁 FEATURE

**Why:** Receiving WhatsApp messages and Instagram DMs from customers.

**Get it:**
1. Go to https://developers.facebook.com
2. Create a new App → Business type
3. Add products: WhatsApp + Instagram
4. Settings → Basic → copy App ID and App Secret

**For WhatsApp specifically:**
- WhatsApp → Getting Started → create a test number
- Copy the **Phone Number ID** and **Temporary Access Token**
- Configure webhook URL: `https://your-api-domain.com/webhooks/whatsapp`
- Verify token: use the value in your `.env` for `META_WEBHOOK_VERIFY_TOKEN`

**Paste into `krova/.env`:**
```
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_WEBHOOK_VERIFY_TOKEN=krova_webhook_secret_change_this
```

**Note:** For production you need a real Meta Business account and go through their app review process. For testing, the sandbox works immediately.

---

## 3. GOOGLE — Gmail 🔁 FEATURE

**Why:** Receiving customer emails from Gmail into KROVA.

**Get it:**
1. Go to https://console.cloud.google.com
2. Create a new project (e.g. "KROVA")
3. Enable these APIs:
   - Gmail API
   - Cloud Pub/Sub API
4. Credentials → Create OAuth 2.0 Client ID → Web application
   - Authorised redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
5. Copy Client ID and Client Secret

**Pub/Sub setup (for real-time Gmail notifications):**
1. Pub/Sub → Topics → Create topic: `gmail-notifications`
2. Subscriptions → Create → Push → endpoint: `https://your-api-domain.com/webhooks/gmail`
3. Copy the full topic name: `projects/YOUR_PROJECT_ID/topics/gmail-notifications`

**Paste into `krova/.env`:**
```
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
GOOGLE_PUBSUB_TOPIC=projects/YOUR_GCP_PROJECT_ID/topics/gmail-notifications
```

---

## 4. MICROSOFT — Outlook 🔁 FEATURE

**Why:** Receiving customer emails from Outlook/Office 365 into KROVA.

**Get it:**
1. Go to https://portal.azure.com
2. Azure Active Directory → App registrations → New registration
   - Name: KROVA
   - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
   - Redirect URI: `http://localhost:8000/api/v1/auth/microsoft/callback`
3. Copy Application (client) ID
4. Certificates & secrets → New client secret → Copy the value

**Permissions needed:**
- `Mail.Read` (delegated)
- `offline_access` (delegated)

**Paste into `krova/.env`:**
```
MICROSOFT_CLIENT_ID=your_application_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret_value
MICROSOFT_REDIRECT_URI=http://localhost:8000/api/v1/auth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

---

## 5. SENTRY — Error Monitoring 🔁 OPTIONAL

**Why:** Captures crashes across all workers and the API in production. Not needed locally.

**Get it:**
1. Go to https://sentry.io
2. Create a new project → Python → FastAPI
3. Copy the DSN (looks like `https://abc123@o123.ingest.sentry.io/456`)

**Paste into `krova/.env`:**
```
SENTRY_DSN=https://your_key@o123456.ingest.sentry.io/123456
```

---

## 6. GITHUB SECRETS — For CI/CD Deploy

Only needed when you push to GitHub and want auto-deploy. Set these in:
**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | What it is | Where to get it |
|---|---|---|
| `RAILWAY_TOKEN` | Deploy token for Railway | railway.app → Account Settings → Tokens |
| `VERCEL_TOKEN` | Deploy token for Vercel | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | Your Vercel team/org ID | Vercel → Settings → General → Team ID |
| `VERCEL_PROJECT_ID_DASHBOARD` | Dashboard project ID | Vercel project → Settings → General → Project ID |
| `DATABASE_URL` | Same as in your `.env` | Already have it |

---

## QUICK START ORDER

To get KROVA minimally working right now:

```
Step 1: Get Anthropic API key → paste into .env        (5 min)
Step 2: Run: alembic upgrade head                       (creates DB tables)
Step 3: Run: uvicorn services.api.main:app --reload     (start API)
Step 4: Run: python -m services.workers.message_processor (start worker)
Step 5: Open dashboard at http://localhost:5173
```

That gives you: auth, dashboard UI, AI chat, pipeline, analytics.

WhatsApp/Instagram/Gmail/Outlook can be added one by one later — each is independent.

---

## FULL ENV FILE — CURRENT STATE

```
✅  DATABASE_URL              set
✅  SUPABASE_URL              set
✅  SUPABASE_ANON_KEY         set
✅  SUPABASE_SERVICE_KEY      set
✅  JWT_SECRET                set
✅  ENCRYPTION_KEY            set
✅  ANTHROPIC_API_KEY         set
🔁  META_APP_ID               fill in when adding WhatsApp/Instagram
🔁  META_APP_SECRET           fill in when adding WhatsApp/Instagram
🔁  GOOGLE_CLIENT_ID          fill in when adding Gmail
🔁  GOOGLE_CLIENT_SECRET      fill in when adding Gmail
🔁  GOOGLE_PUBSUB_TOPIC       fill in when adding Gmail
🔁  MICROSOFT_CLIENT_ID       fill in when adding Outlook
🔁  MICROSOFT_CLIENT_SECRET   fill in when adding Outlook
🔁  SENTRY_DSN                fill in when deploying to production
```
