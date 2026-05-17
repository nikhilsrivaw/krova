# KROVA — Complete Product, Technical & Strategic Bible
> Every decision. Every surface. Every detail. The single source of truth.
> Version 2.0 — April 2026

---

## TABLE OF CONTENTS

1. The Name & Origin
2. What KROVA Is — The Complete Definition
3. The Three Surfaces — Built in Full Detail
   - 3A. The AI Brain
   - 3B. The Mobile App
   - 3C. The Web Dashboard
4. The Landing Website
5. How All Three Connect
6. Data Collection — How KROVA Gets Business Data
7. The Complete Data Flow
8. Who KROVA Is For — Target Markets
9. Pricing Strategy
10. Onboarding Experience
11. Go-to-Market Strategy
12. Competitive Analysis & Uniqueness
13. Complete Architecture & Scalability
14. Complete Tech Stack
15. Complete Folder Structure
16. Five Queue Architecture
17. Database Design Rules
18. Coding Standards
19. Environment Variables
20. Build Order
21. Revenue Projections
22. The One Rule

---

## 1. THE NAME & ORIGIN

**KROVA**

A completely invented word rooted in two ancient languages compressed into two syllables.

- Greek **KRONOS** — time, always present, eternal
- Sanskrit **VARA** — a blessing, a gift

**KROVA** = The AI that is always present, a blessing to your business.

Nobody has used this name anywhere in the tech or startup world. It is completely ownable.

**Immediate actions needed:**
- Register `krova.ai` — primary domain
- Register `krova.in` — Indian market domain
- Register `@krovaai` on Instagram, Twitter, LinkedIn
- File trademark in India under Class 42 (software and AI services) at ipindia.gov.in — costs ~₹4500 for a startup

---

## 2. WHAT KROVA IS — THE COMPLETE DEFINITION

KROVA is an AI-powered autonomous business intelligence platform built specifically for Indian small and medium professional service businesses.

**The one sentence that defines everything:**
> "The first software that comes to you instead of waiting for you."

**The three jobs KROVA does — simultaneously, always, without being asked:**

1. **WATCH** — Monitors every channel 24 hours a day. WhatsApp messages, Instagram DMs, emails, payment records. Every single thing that happens in the business flows into KROVA automatically. No human input needed.

2. **UNDERSTAND** — Reads patterns, detects signals, identifies opportunities and risks. Knows which lead went cold. Knows which client has not been contacted in 30 days. Knows which proposal was sent but never followed up on. Knows what the business revenue looks like this month vs last.

3. **ACT** — Takes action without being prompted. Sends follow-ups automatically. Alerts the owner about urgent situations. Prepares complete daily briefings. Suggests specific messages for specific customers. Never waits to be told.

**What makes KROVA different from every other tool:**

Every other tool in existence — HubSpot, Zoho, ChatGPT, Power BI, WATI, Gallabox — does one of two things. It either shows you data and waits for you to ask questions. Or it automates simple pre-defined rules.

KROVA does neither of those things. KROVA watches your specific business, understands the context of every relationship, and decides on its own what needs attention — without you asking, without you prompting, without you doing anything at all.

**The three hard problems KROVA solves that nobody else has combined:**

1. **Context that never dies** — Every other AI tool forgets everything when you close it. KROVA permanently remembers every customer, every conversation, every pattern, every outcome. Intelligence that compounds over time.

2. **Acts without being asked** — Every tool today is reactive. You ask, it answers. KROVA is proactive. It watches, detects, decides, and acts. Completely on its own.

3. **Works on messy unstructured data** — Business data does not live in clean databases. It lives in WhatsApp chats, Instagram DMs, emails, voice notes, and notebooks. KROVA connects to all of these without the owner doing any data entry.

---

## 3. THE THREE SURFACES — BUILT IN FULL DETAIL

KROVA has one AI brain powering three different surfaces. The brain is the product. The surfaces are how the owner interacts with it.

---

### 3A. THE AI BRAIN

The brain is the foundation. Everything else depends on it being correct.

**What the brain is technically:**
A combination of a PostgreSQL database that stores everything about a business and Claude AI that reads that data and produces structured decisions.

**What the brain stores:**
- The business profile — type, goals, channels, context from onboarding
- Every customer profile built over time — name, phone, email, history, status, tone, last contact, signals
- Every message ever received — from WhatsApp, Instagram, Gmail — tagged to the right business and customer
- Every analysis result — what Claude decided for each customer each night
- Every action taken — what was sent, when, what the outcome was

**How the brain works — nightly at 10 PM:**

1. n8n triggers the nightly job at exactly 10 PM
2. FastAPI fetches all businesses from the database
3. For each business it builds a complete Claude prompt containing:
   - The business context (type, goals, what a good lead looks like, what a lost customer looks like)
   - Every customer and their recent conversation history
   - All signals detected (message count dropping, no response in X days, payment overdue etc.)
   - Instructions for what Claude should decide
4. Sends all businesses as a batch to Claude Haiku via the Batch API (50% cheaper)
5. Claude reads everything and returns structured JSON for each customer:
   ```json
   {
     "customer_id": "uuid",
     "status": "hot | warm | cold | lost | converted",
     "urgency": "high | medium | low",
     "suggested_action": "follow_up | check_in | close | nothing",
     "suggested_message": "Exact message to send in their language and tone",
     "reasoning": "Why Claude made this decision"
   }
   ```
6. For the business overall Claude also returns:
   ```json
   {
     "revenue_signal": "up | down | stable",
     "top_priority_today": "What the owner must focus on",
     "leads_at_risk": ["customer ids"],
     "opportunities": ["specific opportunities detected"],
     "morning_briefing": "Plain language summary for WhatsApp"
   }
   ```
7. All decisions saved back to database with status = completed
8. Notification queue triggered to send morning briefing to owner at 8 AM

**The feedback loop:**
Every action KROVA takes gets an outcome stored — did the customer reply, did they pay, did they convert, did they go cold after the follow-up. This outcome feeds back into the brain so every decision for that customer next time is informed by what worked before. The brain gets smarter every night.

**The brain's rate limiting:**
Claude API has rate limits on tokens per minute. A Redis token bucket tracks consumption. Every analysis worker checks available tokens before calling Claude. If the bucket is empty the worker waits. This prevents hitting rate limits and ensures reliable nightly processing regardless of how many businesses are on the platform.

**Resumable analysis:**
If the nightly job crashes halfway through — server crash, API outage, network failure — it can resume from exactly where it stopped. Every business has a status field: pending → processing → completed → failed. When the job restarts it skips completed businesses and retries failed ones. No business is ever missed.

---

### 3B. THE MOBILE APP

**The identity of the mobile app:**
The mobile app is KROVA's most unique surface. It is not a dashboard. It is not a chatbot. It is a conversational AI that knows the owner's specific business as deeply as the owner does — and answers questions about it in plain language.

**The simplest description:**
The owner opens the app. Types or says "Aaj kya hua?" The AI answers everything about what happened in their business today, in plain Hindi or English, with specific names, specific numbers, specific recommendations. Like having a senior business partner who was watching their business all night and is ready to brief them every morning.

**What makes this different from ChatGPT or Claude:**
ChatGPT knows nothing about your business. Every conversation starts from zero. The KROVA mobile app AI knows your specific business completely — your customers' names, their history, what they said last week, who owes you money, who is about to leave. It never forgets. It never starts from zero.

**How this works technically:**
1. Owner types a question in the app
2. App sends the question to FastAPI backend
3. FastAPI fetches three things from database:
   - Complete business context (who they are, their goals, their customer types)
   - Last night's analysis results (what Claude decided about every customer)
   - Last 20 messages of the current conversation session (for context continuity)
4. Builds a comprehensive prompt: business context + analysis results + conversation history + owner's question
5. Sends to Claude Sonnet (best quality model for real-time conversation)
6. Claude responds specifically about that business using the actual data
7. Response streams back word by word using server-sent events
8. Owner sees the answer appearing in real time — under 2 seconds to first word

**What the owner can ask:**
- "Aaj kya hua?" — full daily briefing
- "Kaun se leads hot hain abhi?" — current hot leads
- "Rahul ne kab last message kiya tha?" — specific customer lookup
- "Is mahine revenue kaisa hai?" — revenue summary
- "Aaj mujhe kya karna chahiye?" — priority recommendations
- "Priya ko kya message karoon?" — suggested message for specific customer
- "Kitne leads is hafte aaye?" — weekly lead count
- "Koi urgent cheez hai jo miss ho rahi ho?" — urgent alerts

**The one-tap approve feature:**
When KROVA suggests a follow-up message, the owner sees it in the app. If it is good, they tap HAAN (Yes). The message goes out immediately from their WhatsApp Business number to the customer. The owner does not type anything. One tap. Done.

**The streaming experience:**
Responses appear word by word exactly like Claude.ai does. This makes the app feel alive and intelligent. The owner can see Claude thinking and responding in real time. It is not a loading spinner followed by a wall of text. It is a real conversation.

**Mobile app tech stack:**
- React Native 0.73 + Expo SDK 50 (one codebase for iOS and Android)
- React Navigation 6 (screen navigation)
- Zustand (global state — current user, business context, conversation)
- Axios with interceptors (API calls, auto token refresh)
- EventSource API (streaming server-sent events for word-by-word response)
- AsyncStorage (save login session between app opens)
- React Native Paper (professional UI components)

**The screens in the mobile app:**

1. **Splash / Login** — KROVA logo, email + password, Google login via Supabase Auth
2. **Onboarding** — 5 questions to set up business context (type, goals, customer types, channels)
3. **Connect Channels** — guided flow to connect WhatsApp, Instagram, Gmail one by one
4. **Main Chat** — the conversational AI interface. Looks like WhatsApp. Owner types, KROVA answers. Message history persists.
5. **Pending Approvals** — list of all suggested actions waiting for owner tap. Each shows customer name, suggested message, reason why KROVA suggested it.
6. **Settings** — manage connected channels, update business context, notification preferences, billing

---

### 3C. THE WEB DASHBOARD

**The identity of the web dashboard:**
The web dashboard is the data analyst view of KROVA. Full visibility into the business — graphs, charts, trends, pipeline, revenue — displayed visually for when the owner wants to go deep rather than just ask a question.

**What makes the dashboard different:**
No AI call is ever made when the owner opens the dashboard. Everything displayed is pre-computed by the brain during the nightly analysis. The dashboard reads directly from the database. This means it is completely instant. No loading. No waiting for AI. Just clean, fast data.

**The dashboard sections:**

**Overview (home screen):**
- Today's briefing summary (from last night's analysis)
- Total active leads this month
- Revenue this month vs last month (with trend arrow)
- Follow-ups pending count
- At-risk customers count
- Conversion rate this month

**Lead Pipeline:**
- Kanban view — Enquiry → Warm → Hot → Converted → Lost
- Each card shows customer name, channel they came from, last contact date, suggested next action
- Filter by channel (WhatsApp / Instagram / Email)
- Filter by date range
- Click any card to see full conversation history with that customer

**Customer Intelligence:**
- Full list of all customers with health scores
- Health score calculated by brain — green (active), yellow (cooling), red (at risk), grey (lost)
- Sort by health score, last contact, revenue generated
- Click any customer to see their complete profile — all messages, all actions taken, all analysis results

**Revenue Analytics:**
- Monthly revenue trend (line chart)
- Revenue by customer source (which channel brings highest value leads)
- Average time from enquiry to conversion
- Lost revenue estimate (how much was lost from cold leads)

**Channel Performance:**
- Messages received per channel per day (bar chart)
- Response time analysis
- Which channel generates most leads
- Which channel has best conversion rate

**Actions History:**
- Every action KROVA took — automated and approved
- Filter by approved vs automatic vs rejected
- Outcome tracking — did the customer respond after the action

**Settings:**
- Connected channels management
- Business context editing
- Team members (coming in later version)
- Billing and plan management

**Dashboard tech stack:**
- React 18 + TypeScript (type-safe, maintainable)
- Vite (fast build tool, replacing Create React App)
- React Router 6 (multi-page navigation)
- TanStack Query (data fetching with caching, loading states, background refresh)
- Recharts (all graphs and charts — line, bar, pie, area)
- Shadcn UI (professional component library built on Radix UI + Tailwind)
- Tailwind CSS 3 (utility-first styling)
- Hosted on Vercel (free tier, auto-deploys from GitHub)

---

## 4. THE LANDING WEBSITE

**Purpose:** Credibility and conversion. When an owner is referred to KROVA or Googles it, this is what they see.

**Sections:**
1. **Hero** — One line that explains KROVA, a demo video or animated screenshot, "Start Free Trial" CTA
2. **The problem** — Show what it feels like to lose leads. "Kitne leads last month aaye? Kitne ka kuch hua?" — make the owner feel the pain
3. **How KROVA works** — Three steps. Connect → KROVA watches → You get alerts. Simple animation.
4. **The three surfaces** — Mobile app, web dashboard, WhatsApp integration shown visually
5. **Social proof** — Testimonials from real owners once they exist
6. **Pricing** — Three tiers, clear comparison, "Start free for 14 days"
7. **FAQ** — Common objections answered honestly
8. **Footer** — Contact, privacy policy, terms

**Tech:** Next.js 14 (App Router) + Tailwind CSS, hosted on Vercel. Server-side rendered so Google indexes it instantly.

---

## 5. HOW ALL THREE SURFACES CONNECT

```
                    ┌─────────────────────┐
                    │   POSTGRESQL DB      │
                    │   (Source of Truth)  │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
    ┌──────▼──────┐    ┌───────▼───────┐   ┌──────▼──────┐
    │  AI BRAIN   │    │  MOBILE APP   │   │  DASHBOARD  │
    │             │    │               │   │             │
    │ Writes      │    │ Reads context │   │ Reads pre-  │
    │ decisions   │    │ + decisions   │   │ computed    │
    │ every night │    │ + streams     │   │ analysis    │
    │             │    │   Claude      │   │ instantly   │
    └─────────────┘    └───────────────┘   └─────────────┘
```

The database is the central nervous system. Everything writes to it and reads from it. The three surfaces never talk to each other directly. They all share one database and one source of truth.

---

## 6. DATA COLLECTION — HOW KROVA GETS BUSINESS DATA

Three channels. All connected during onboarding. All automatic after setup.

### WhatsApp Business Cloud API (Meta)
**What it does:** Every message arriving on the business owner's WhatsApp Business number is sent to KROVA's server in real time.

**How it works:**
1. Owner's number is connected to Meta's Cloud API
2. Meta fires a POST request (webhook) to KROVA's server for every incoming message
3. KROVA receives: sender's phone number, message text, timestamp
4. KROVA identifies which business this belongs to, finds or creates the customer profile, saves the message

**What the owner does:** Install WhatsApp Business app (free on Play Store). Verify number with OTP. That's it.

**What you (KROVA) do:** Set up Meta Business Manager, connect the number to the server, configure the webhook endpoint. Owner sees none of this.

**The owner's number does not change.** Customers keep messaging the same number. Everything is invisible to them.

### Instagram Graph API (Meta)
**What it does:** Every DM, comment, and mention on the business's Instagram account flows into KROVA.

**How it works:**
1. Owner connects Instagram Business account via OAuth (they log in, click Approve)
2. You receive and store an access token
3. Instagram sends webhooks to KROVA for every DM and relevant comment
4. KROVA saves everything under the right business and customer

**Permissions needed:** instagram_basic, instagram_manage_messages, pages_messaging

**Note:** Only data from after connection is available. Historical messages cannot be read. This is a Meta API limitation.

### Gmail API + Google Cloud Pub/Sub
**What it does:** Every new email to the business Gmail account is received by KROVA, classified by Claude (business vs spam), and saved if relevant.

**How it works:**
1. Owner clicks "Connect Gmail" in KROVA
2. Goes through Google OAuth — logs in, clicks Approve permissions
3. You receive an access token (stored encrypted in database)
4. Gmail push notifications via Google Cloud Pub/Sub — Gmail proactively tells KROVA when a new email arrives
5. KROVA fetches the email using Gmail API
6. Claude Haiku classifies: is this a business enquiry or spam?
7. If business enquiry — saved to database under the right customer
8. If spam/newsletter — ignored entirely

### Microsoft Outlook (Microsoft Graph API)
Same pattern as Gmail. OAuth → access token → webhooks → classification → save.

---

## 7. THE COMPLETE DATA FLOW

### Flow 1 — Data Arrives (Real-time, always on)
```
Customer sends WhatsApp message
→ Meta fires webhook to KROVA FastAPI server
→ Server validates webhook signature (proves it came from Meta)
→ Immediately returns 200 OK to Meta (within 5 seconds, or Meta retries)
→ Drops job in BullMQ message ingestion queue
→ Worker picks up job from queue
→ Worker finds which business this number belongs to
→ Worker finds or creates customer profile for the sender
→ Worker saves message to database with timestamp, channel, content
→ Total time: under 1 second from message received to saved
```

### Flow 2 — Brain Processes (Every night at 10 PM)
```
APScheduler triggers at 10 PM
→ FastAPI fetches all active businesses from DB
→ For each business:
   → Fetches all customers and their recent messages
   → Fetches business context (type, goals, what good/bad looks like)
   → Fetches previous analysis results
   → Builds comprehensive Claude prompt
   → Adds to Batch API request
→ Sends all businesses to Claude Haiku Batch API in one call
→ Checks Redis rate limiter — waits if near limit
→ Claude processes everything (up to 24 hours but typically 1-3 hours)
→ Results received as structured JSON per business
→ Saves all decisions to database (one row per customer per night)
→ Updates business analysis status to completed
→ Triggers notification queue to send morning briefings
→ Time for 50 businesses: 3-5 minutes
→ Time for 1000 businesses: 30-60 minutes (all parallel)
```

### Flow 3A — Owner Asks Question (Mobile App, real-time)
```
Owner types "Aaj kya hua?" in mobile app
→ App sends question to FastAPI
→ FastAPI fetches from DB:
   → Business context and profile
   → Last night's complete analysis results
   → Last 20 messages of current conversation session
→ Builds Claude prompt with all context + owner's question
→ Sends to Claude Sonnet (real-time, not batch)
→ Streams response back using server-sent events
→ Mobile app displays each word as it arrives
→ Time to first word: under 2 seconds
→ Complete response: 5-15 seconds depending on complexity
```

### Flow 3B — Owner Views Dashboard (Web, instant)
```
Owner opens dashboard
→ Dashboard React app makes API call to FastAPI
→ FastAPI checks Redis cache first
→ If cached: returns immediately (under 100ms)
→ If not cached: reads from PostgreSQL read replica
→ Returns pre-computed analysis data
→ Dashboard renders charts and stats
→ No Claude API call ever made for dashboard
→ Time: under 500ms
```

### Flow 3C — Owner Approves Action (WhatsApp send)
```
Owner taps HAAN on a suggested follow-up
→ App sends approve request to FastAPI
→ FastAPI immediately drops high-priority job in action execution queue
→ Worker picks up job (highest priority, under 5 seconds)
→ Worker fetches the exact message text from database
→ Worker calls Meta WhatsApp Cloud API send message endpoint
→ Message sent from owner's business number to customer
→ Customer receives it as if owner typed it personally
→ Action marked as completed in database
→ Cache invalidated for that customer's status
→ Total time from tap to customer receiving: under 10 seconds
```

---

## 8. WHO KROVA IS FOR

**The one filter that determines if a business is a good KROVA customer:**
> Do they lose money because they cannot see what is happening in their business?

### Target Segments — Detailed

**1. Digital Marketing Agencies (TOP PICK #1)**
- Market: 10,000+ agencies in India, growing at 38.9% CAGR
- Pain: Leads arriving from 5 sources simultaneously (Instagram, WhatsApp, email, LinkedIn, referrals) — all getting lost. No single view. Platform fragmentation means 80% of marketers say digital marketing is more complex than 2 years ago.
- How KROVA helps: Pulls all 5 channels into one brain. Detects cold leads, dropped client engagement, unopened proposals. Sends smart follow-ups automatically.
- Why they pay: Tech-educated. Already pay for Canva, Hootsuite, HubSpot. Adding KROVA at ₹2000 is easy.
- Price: ₹2,000 - ₹5,000/month

**2. Freelancers & Consultants (TOP PICK #2)**
- Market: 15 million in India, second largest freelance market globally. Average income ₹20 lakh/year, 23% earn over ₹40 lakh.
- Pain: Zero pipeline visibility. They do not know which prospects are warm, which proposals are being considered, which clients are about to leave. Everything in memory and WhatsApp. Lose 2-3 potential projects every month from forgotten follow-ups. Each missed project = ₹50,000 to ₹2,00,000.
- How KROVA helps: Invisible business manager. Flags prospects who went quiet. Reminds about follow-ups. Answers "how is my pipeline this month?" instantly.
- Why they pay: ₹499/month is less than one hour of their own billing rate.
- Price: ₹499 - ₹1,500/month

**3. Coaching & Training Companies (TOP PICK #3)**
- Market: $6.5 billion India, growing at 10.4% CAGR to 2033.
- Pain: 50 enquiries per month. 40 go unanswered within 48 hours. Each conversion worth ₹5,000 to ₹50,000. Owner is in sessions and cannot respond immediately. By the time they follow up, lead enrolled elsewhere.
- How KROVA helps: Detects every new enquiry instantly. Flags hot leads who enquired twice. Morning summary: "8 leads need follow-up today, 3 are urgent." Owner taps once. Personalised messages go out.
- Price: ₹1,000 - ₹3,000/month

**4. Recruitment Firms — Small and Mid-size (STRONG)**
- Market: $20 billion India, 13.2% CAGR to 2030.
- Pain: Hundreds of candidates in spreadsheets. Client requirements in WhatsApp. Follow-ups in memory. High attrition in IT and BPO means roles need filling fast. One missed placement = ₹50,000 to ₹5,00,000 in lost fees.
- How KROVA helps: Watches both sides — candidates who went cold after interview, client requirements with no submissions in 3 days. Tracks pending placements.
- Price: ₹2,000 - ₹5,000/month

**5. CA & Legal Firms — Small Practices (STRONG)**
- Market: 100,000+ CA firms in India. India has most CAs globally.
- Pain: Client relationships break silently when follow-ups are forgotten. Compliance deadline missed. Document not chased. New service not proposed to existing client. Revenue leaks invisibly but consistently.
- How KROVA helps: Flags when long-standing client not contacted in 30 days. Detects when proposal sent but not followed up. Reminds about compliance season for specific clients.
- Price: ₹1,500 - ₹4,000/month

**6. Small Software Agencies — 5 to 20 people (STRONG)**
- Market: 25,000+ agencies in India.
- Pain: Brilliant technically, commercially chaotic. Proposals go out and never followed up. Existing clients not approached for new work. Pipeline is feast or famine. Team fully utilised one month, idle next. Costs lakhs every quarter.
- How KROVA helps: Complete pipeline visibility without CRM setup. Tracks every proposal, every client conversation. Detects existing client not contacted in 45 days — prime upsell opportunity.
- Price: ₹2,000 - ₹6,000/month

**Businesses to NEVER target:**
- Kirana stores and walk-in retail — no real data problem, won't pay
- Restaurants — wrong pain, willingness to pay too low (₹299-500 max)

---

## 9. PRICING STRATEGY

**Three tiers:**

| Plan | Price | Customers | Features |
|---|---|---|---|
| Starter | ₹299/month | Up to 50 | Basic alerts, manual approval, WhatsApp only |
| Growth | ₹699/month | Up to 200 | Smart follow-ups, auto-send, mobile app |
| Pro | ₹1299/month | Unlimited | Full AI brain, all channels, web dashboard, reports |

**Sales approach — never mention price first:**
1. Walk in and ask "How many leads came in last month and how many did you follow up with?"
2. The gap between those two numbers is the pain
3. Show KROVA detecting 3 cold leads from their actual recent messages
4. "Kaam aaya na?"
5. 2-week free trial
6. Then: "Sirf ₹499 mahine ka hai"

**Unit economics at Pro — 50 customers:**
- Claude API cost: ~₹90/customer/month
- WhatsApp API cost: ~₹160/customer/month
- Server cost: ~₹20/customer/month
- Total cost per customer: ~₹270
- Revenue per customer: ₹1,299
- Profit per customer: **₹1,029 (79% margin)**

---

## 10. ONBOARDING EXPERIENCE

**Total time: 15-20 minutes. Done in person with the owner.**

**What the owner does (3 simple things):**
1. Download WhatsApp Business app from Play Store (2 minutes)
2. Verify their number with OTP (1 minute)
3. Give one permission — like adding a helper to their account (1 minute)

**What you (the KROVA person) do:**
1. Set up Meta Business Manager (one time setup on your developer account)
2. Connect their number to KROVA's server (technical, owner sees nothing)
3. Connect their Instagram Business account via OAuth (guided flow in KROVA)
4. Connect their Gmail via Google OAuth (guided flow in KROVA)
5. Ask 5 onboarding questions about their business:
   - What type of business do you run?
   - Who are your customers typically?
   - What does a good lead look like for you?
   - What does a lost customer look like?
   - What channels do you currently use most?

**What you say to explain it:**
> "Bhai aapko kuch nahi karna. Bas ek baar mere saath baitho — 15 minute. Main aapke phone mein WhatsApp Business install karunga, number verify karunga, aur baaki sab main karta hun. Aap sirf alerts dekhoge aur approve karoge. Aapka number same rahega. Customers ko kuch nahi batana."

**When you leave:**
KROVA is live. The next enquiry that arrives on their WhatsApp will be processed automatically. Next morning at 8 AM they get their first briefing on WhatsApp.

---

## 11. GO-TO-MARKET STRATEGY

### Four Phases

**Phase 1 — Months 1 to 3: Own your city, 50 customers**
- One city. Digital agencies + freelancers only.
- Go door to door personally. No cold email, no ads.
- Sit with owners. Show them something real about their own business in the first meeting.
- 2-week free trial. Charge from week 3.
- Target: 50 paying customers.
- Goal: Proof that KROVA works and owners will pay.

**Phase 2 — Months 3 to 6: Same product, every city, 200 customers**
- Take digital agency and freelancer templates to other cities.
- Use Phase 1 case studies as proof — "In [city], Rahul's agency stopped losing leads. Here's what happened."
- Begin LinkedIn content marketing targeting agency owners.
- Collect testimonials obsessively.
- Target: 200 paying customers across 5 cities.

**Phase 3 — Months 6 to 12: Add coaching and recruitment, 500 customers**
- Open coaching and recruitment segments using same core engine.
- New templates built from real owner conversations — never built in advance.
- Brand established enough that inbound leads start arriving.
- Target: 500 customers total.

**Phase 4 — Year 2: CA firms and software agencies, 2000 customers**
- Higher ARPU segments require more trust-building.
- By Year 2 KROVA has case studies from multiple segments.
- AI brain has learned from 500+ businesses — genuinely smarter than any competitor starting fresh.
- Target: 2,000 customers → ₹7.2 crore ARR.

---

## 12. COMPETITIVE ANALYSIS & UNIQUENESS

### What exists vs what KROVA is

| Tool | What it does | The gap vs KROVA |
|---|---|---|
| **Klaviyo** | Autonomous AI for B2C ecommerce — builds campaigns without prompting | US only, enterprise brands (Mattel, Glossier), email/SMS not WhatsApp, no Indian SMBs |
| **OpenClaw (YC)** | AI workforce + CRM in comms channels, approve actions every morning | US legal firms, email not WhatsApp, not India, no Indian SMB pricing |
| **Gupshup** | Conversational AI on WhatsApp, 50,000+ enterprise customers | Reactive — waits for customer to message. Enterprise pricing. No autonomous business intelligence. |
| **WATI / Gallabox** | WhatsApp automation, team inbox, bulk messaging | Zero AI intelligence. Owner sets up rules. Follows them blindly. No brain. |
| **HubSpot / Salesforce** | CRM with AI, lead scoring, pipeline tracking | Requires manual data entry always. Not WhatsApp. Too expensive. Too complex for SMBs. |
| **ChatGPT / Claude** | General AI — answers what you ask | No memory of your business. Starts from zero every conversation. You prompt it every time. |

### The 5-factor uniqueness test

KROVA is unique at the intersection of ALL FIVE:

1. **Autonomous — acts without being asked** → Klaviyo does this but for US B2C ecommerce only
2. **WhatsApp-native in India** → WATI/Gallabox do this but with zero AI brain
3. **Understands specific business context deeply** → Nobody does this for Indian SMBs
4. **Affordable for small businesses (₹699/month)** → All autonomous tools are enterprise-priced
5. **Works on messy unstructured data — no data entry** → No tool in the world does this for small businesses

**The window:** 18-24 months before a funded competitor enters this specific space. Speed of execution and depth of local market penetration is the only real protection.

### The three moats

1. **Data moat** — Every business trains the AI to be smarter for the next similar business. After 500 coaching businesses, KROVA understands coaching leads better than any tool built by someone who never spoke to a coaching owner. This intelligence is impossible to replicate without the same real-world data.

2. **Relationship moat** — Sold in person, door to door, with founder's trust behind it. After 6 months of using KROVA, the owner's entire pipeline lives inside it. Switching cost becomes enormous — not because of contracts, but because accumulated intelligence is specific to that business.

3. **Timing moat** — The technology to build this (affordable LLMs, WhatsApp Business API, real-time AI) only became accessible in 2023. The window to be first in this specific market for Indian professional service businesses is open now.

---

## 13. COMPLETE ARCHITECTURE & SCALABILITY

### 10 Non-Negotiable Principles

**1. Never do synchronously what can be done asynchronously**
Receive webhooks → immediately return 200 OK → drop job in queue → process in background. Webhook endpoints do almost nothing except queue work. This is what makes them fast under any load.

**2. Every component is stateless**
No information stored in server memory between requests. All state lives in PostgreSQL and Redis. This makes horizontal scaling possible — add a second server and it handles any request equally.

**3. Separate every concern into its own service**
Webhook processing, AI analysis, notification delivery, API serving — all have different scaling requirements. Separate worker pools scale independently.

**4. Design database for the queries you will run**
Every critical query identified first. Tables designed around those queries. Composite indexes from day one. Never add index after the fact.

**5. Treat every external API as unreliable**
Retry with exponential backoff (1s → 2s → 4s → 8s → give up). Circuit breaker pattern. Dead letter queues for failed jobs. Nothing is ever lost.

**6. Nightly analysis must be resumable**
Every business has a status: pending → processing → completed → failed. If analysis crashes halfway it resumes from failure point. No business is ever missed.

**7. Cache aggressively, invalidate correctly**
Every cached item has explicit invalidation rules. Business summary cached after nightly analysis, invalidated before next analysis. Follow-up count cached but invalidated immediately when owner approves or dismisses.

**8. Multi-tenancy from the very first table**
Every single database table has a business_id column. Every API query filters by business_id of authenticated user — in the database query, not in application code. Impossible to return wrong business's data.

**9. Monitor everything before you need it**
Sentry, queue dashboards, database monitoring set up on day one. Five key metrics always visible: webhook processing lag, analysis completion time, mobile app response time, queue depth, Claude API error rate.

**10. Design for 10,000 users while building for 50**
UUIDs as primary keys. created_at and updated_at on every table. No N+1 queries. Pagination on every list endpoint. PgBouncer connection pooling. These decisions cannot be added later — they must be there from line one.

---

## 14. COMPLETE TECH STACK

### Backend
| Layer | Technology | Version | Why |
|---|---|---|---|
| Language | Python | 3.11 | Best AI ecosystem, async support |
| Framework | FastAPI | Latest | Async, type-safe, fast, perfect for webhooks |
| Server | Uvicorn + Gunicorn | Latest | Async workers + multi-process management |
| Queue | BullMQ | Latest | Battle-tested, Redis-native, excellent retry handling |
| Scheduler | APScheduler | Latest | Nightly analysis trigger built into FastAPI |
| Dependencies | Poetry | Latest | Better than pip for complex projects |
| DB Migrations | Alembic | Latest | Safe versioned schema changes |

### Database & Cache
| Layer | Technology | Where | Why |
|---|---|---|---|
| Primary DB | PostgreSQL 15 | Supabase | Relational, managed, free tier |
| Read Replica | PostgreSQL | Supabase | Dashboard queries never hit primary |
| Cache | Redis 7 | Railway | Queue + cache + rate limiter in one |
| Connection Pool | PgBouncer | Supabase built-in | Prevents connection exhaustion |

### AI
| Use Case | Model | API Type | Why |
|---|---|---|---|
| Nightly batch analysis | claude-haiku-4-5 | Batch API | 50% discount, sufficient intelligence |
| Mobile app conversation | claude-sonnet-4-5 | Standard API | Best quality for real-time conversation |
| Email classification | claude-haiku-4-5 | Standard API | Simple task, very cheap |

### Integrations
| Channel | Technology | Cost |
|---|---|---|
| WhatsApp | Meta WhatsApp Cloud API (direct) | Free first 1000 conv/month |
| Instagram | Instagram Graph API | Free |
| Gmail | Gmail API + Google Cloud Pub/Sub | Free tier sufficient |
| Outlook | Microsoft Graph API | Free |
| Automation | n8n self-hosted on Railway | Free (Railway server cost only) |

### Frontend
| Surface | Framework | Hosting | Build Tool |
|---|---|---|---|
| Mobile App | React Native 0.73 + Expo SDK 50 | App Store + Play Store | Expo |
| Web Dashboard | React 18 + TypeScript | Vercel | Vite |
| Landing Website | Next.js 14 (App Router) | Vercel | Next.js built-in |

### Mobile App Libraries
| Purpose | Library |
|---|---|
| Navigation | React Navigation 6 |
| State management | Zustand |
| HTTP + token refresh | Axios with interceptors |
| Streaming responses | EventSource (server-sent events) |
| Local session storage | AsyncStorage |
| UI components | React Native Paper |

### Dashboard Libraries
| Purpose | Library |
|---|---|
| Routing | React Router 6 |
| Data fetching + caching | TanStack Query (React Query) |
| Charts and graphs | Recharts |
| UI components | Shadcn UI (Radix UI + Tailwind) |
| Styling | Tailwind CSS 3 |

### Infrastructure
| Purpose | Technology |
|---|---|
| Auth (all surfaces) | Supabase Auth |
| Encryption (API tokens) | Python cryptography — Fernet |
| Error tracking | Sentry (every service) |
| CI/CD | GitHub Actions |
| Local development | Docker Compose |
| API testing | Postman |
| Code quality (Python) | Black + Flake8 |
| Code quality (JS/TS) | ESLint + Prettier |
| Version control | Git + GitHub |

---

## 15. COMPLETE FOLDER STRUCTURE

```
KROVA/
├── krova/                              # Main monorepo
│   ├── infrastructure/
│   │   ├── docker/
│   │   │   ├── docker-compose.yml      # Local dev environment
│   │   │   └── Dockerfile
│   │   └── railway/
│   │       └── railway.toml            # Railway deployment config
│   │
│   ├── services/
│   │   │
│   │   ├── ai-brain/                   # The intelligence layer
│   │   │   ├── analysis/
│   │   │   │   ├── classifier.py       # Classifies message types and urgency
│   │   │   │   ├── nightly.py          # Full nightly batch analysis logic
│   │   │   │   └── realtime.py         # Real-time signal detection for urgent situations
│   │   │   ├── claude/
│   │   │   │   ├── client.py           # Anthropic Claude API client with retry logic
│   │   │   │   ├── batch.py            # Batch API submission and polling
│   │   │   │   └── streaming.py        # Real-time streaming for mobile app
│   │   │   ├── memory/
│   │   │   │   ├── business_context.py # Builds and manages business context
│   │   │   │   ├── customer_history.py # Manages customer conversation history
│   │   │   │   └── session.py          # Mobile app session memory (last 20 messages)
│   │   │   ├── prompts/
│   │   │   │   ├── nightly_analysis.py # Nightly brain prompt template
│   │   │   │   ├── mobile_chat.py      # Mobile app conversation prompt
│   │   │   │   └── email_classify.py   # Email classification prompt
│   │   │   └── main.py
│   │   │
│   │   ├── api/                        # FastAPI backend server
│   │   │   ├── dependencies/
│   │   │   │   ├── auth.py             # JWT validation, get current user
│   │   │   │   └── database.py         # DB session dependency
│   │   │   ├── middleware/
│   │   │   │   ├── rate_limit.py       # slowapi rate limiting
│   │   │   │   ├── logging.py          # Request logging middleware
│   │   │   │   └── cors.py             # CORS configuration
│   │   │   ├── routers/
│   │   │   │   ├── webhooks.py         # WhatsApp, Instagram, Gmail webhooks
│   │   │   │   ├── businesses.py       # Business CRUD endpoints
│   │   │   │   ├── customers.py        # Customer management endpoints
│   │   │   │   ├── conversations.py    # Message history endpoints
│   │   │   │   ├── analysis.py         # Analysis results endpoints
│   │   │   │   ├── actions.py          # Owner approve/reject endpoints
│   │   │   │   └── auth.py             # Auth endpoints
│   │   │   └── main.py                 # FastAPI app creation, router registration
│   │   │
│   │   ├── data-ingestion/             # Receives and processes all incoming data
│   │   │   ├── handlers/
│   │   │   │   ├── whatsapp.py         # Parse and validate WhatsApp webhook payloads
│   │   │   │   ├── instagram.py        # Parse and validate Instagram webhook payloads
│   │   │   │   └── gmail.py            # Handle Gmail push notifications
│   │   │   ├── queue/
│   │   │   │   └── producers.py        # Drop jobs into BullMQ queues
│   │   │   ├── validators/
│   │   │   │   ├── whatsapp.py         # Verify Meta webhook signatures
│   │   │   │   └── instagram.py        # Verify Instagram webhook signatures
│   │   │   └── main.py
│   │   │
│   │   └── workers/                    # Background job processors
│   │       ├── message_processor.py    # Ingestion queue — save incoming messages
│   │       ├── analysis_worker.py      # Analysis queue — run nightly AI analysis
│   │       ├── notification_worker.py  # Notification queue — morning briefings
│   │       ├── action_worker.py        # Action queue — send approved messages
│   │       └── email_processor.py      # Email queue — classify and save emails
│   │
│   ├── shared/                         # Shared across all services
│   │   ├── cache/
│   │   │   ├── client.py               # Redis client singleton
│   │   │   ├── keys.py                 # Cache key definitions (no magic strings)
│   │   │   └── helpers.py              # get_cached, set_cached, invalidate helpers
│   │   ├── config/
│   │   │   └── settings.py             # All env vars via Pydantic BaseSettings
│   │   ├── database/
│   │   │   ├── connection.py           # PostgreSQL connection + session management
│   │   │   ├── base.py                 # SQLAlchemy declarative base
│   │   │   └── models/
│   │   │       ├── business.py         # Business model
│   │   │       ├── customer.py         # Customer model
│   │   │       ├── message.py          # Message model
│   │   │       ├── analysis_result.py  # Nightly analysis result model
│   │   │       ├── action.py           # Action taken model
│   │   │       └── channel.py          # Connected channel credentials model
│   │   ├── encryption/
│   │   │   └── fernet.py               # Encrypt/decrypt API tokens stored in DB
│   │   ├── integrations/
│   │   │   ├── whatsapp.py             # Meta WhatsApp Cloud API client
│   │   │   ├── instagram.py            # Instagram Graph API client
│   │   │   ├── gmail.py                # Gmail API client
│   │   │   └── outlook.py              # Microsoft Graph API client
│   │   ├── queue/
│   │   │   ├── definitions.py          # BullMQ queue names and configs
│   │   │   └── rate_limiter.py         # Redis token bucket for Claude API
│   │   └── utils/
│   │       ├── logging.py              # Structured logging setup
│   │       ├── exceptions.py           # Custom exception classes
│   │       └── pagination.py           # Cursor-based pagination helpers
│   │
│   ├── tests/
│   │   ├── fixtures/
│   │   │   ├── businesses.py           # Test business data
│   │   │   └── messages.py             # Test message data
│   │   └── unit/
│   │       ├── test_webhooks.py
│   │       ├── test_brain.py
│   │       └── test_workers.py
│   │
│   ├── .env.example                    # Template for environment variables
│   ├── pyproject.toml                  # Poetry dependencies and project config
│   └── README.md
│
├── krova-dashboard/                    # React TypeScript web dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
│
├── krova-mobile/                       # React Native mobile app
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── store/
│   │   └── services/
│   ├── app.json
│   └── package.json
│
└── krova-website/                      # Next.js landing website
    ├── app/
    ├── components/
    └── package.json
```

---

## 16. FIVE QUEUE ARCHITECTURE

| Queue Name | What it does | Workers | Priority | Runs |
|---|---|---|---|---|
| `krova:ingestion` | Receives all webhooks, saves to DB | 3 → 20 as volume grows | Normal | 24/7 |
| `krova:analysis` | Nightly AI analysis per business | 2, rate-limited by Redis | Normal | Nightly |
| `krova:notifications` | Morning briefings after analysis | 2 | Normal | Morning |
| `krova:actions` | Owner approves → send message | 5 | **HIGH** | 24/7 |
| `krova:email` | Gmail classify + save | 2 | Normal | 24/7 |

**All queues have:**
- Automatic retry with exponential backoff (attempts: 3, backoff: 1s → 2s → 4s)
- Dead letter queue for jobs that fail all retries
- Job completion events for monitoring
- BullMQ Board dashboard for visual monitoring

---

## 17. DATABASE DESIGN RULES

**Non-negotiable rules for every table:**

1. Primary key is UUID (not integer) — generated without DB round-trip
2. `business_id` UUID column with index — on every single table, no exceptions
3. `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
4. `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
5. Filter by business_id in database query — never in application code
6. Composite indexes for every critical query pattern
7. Never return all records — cursor-based pagination everywhere
8. PgBouncer connection pooling — never raw connections from workers

**Critical query patterns and their indexes:**

```sql
-- Messages for a specific business + customer
CREATE INDEX idx_messages_business_customer
ON messages(business_id, customer_id, created_at DESC);

-- Latest analysis for a business
CREATE INDEX idx_analysis_business_date
ON analysis_results(business_id, created_at DESC);

-- Pending follow-ups for a business
CREATE INDEX idx_actions_business_status
ON actions(business_id, status, created_at DESC);

-- Customer list sorted by last contact
CREATE INDEX idx_customers_business_contact
ON customers(business_id, last_contact_at DESC);
```

---

## 18. CODING STANDARDS — NON-NEGOTIABLE

Every file we write follows these rules without exception:

```python
# ✅ CORRECT — type hints on everything
async def get_customer(
    customer_id: UUID,
    business_id: UUID,
    db: AsyncSession
) -> Customer | None:

# ❌ WRONG — no type hints
async def get_customer(customer_id, business_id, db):
```

```python
# ✅ CORRECT — specific exception handling
try:
    result = await claude_client.complete(prompt)
except anthropic.RateLimitError as e:
    logger.warning("Claude rate limited", extra={"error": str(e)})
    raise
except anthropic.APIError as e:
    logger.error("Claude API error", extra={"error": str(e)})
    raise

# ❌ WRONG — bare except
try:
    result = await claude_client.complete(prompt)
except:
    pass
```

```python
# ✅ CORRECT — structured logging
logger.info(
    "Message saved to database",
    extra={
        "business_id": str(business_id),
        "customer_id": str(customer_id),
        "channel": channel,
        "message_id": str(message.id)
    }
)

# ❌ WRONG — print statement
print(f"Message saved: {message_id}")
```

```python
# ✅ CORRECT — secrets from environment
settings = Settings()
api_key = settings.anthropic_api_key

# ❌ WRONG — hardcoded secret
api_key = "sk-ant-abc123..."
```

**Complete checklist for every function:**
- [ ] Type hints on all parameters and return type
- [ ] Docstring explaining what it does
- [ ] Specific exception handling — no bare except
- [ ] Structured logging for important operations
- [ ] No secrets hardcoded
- [ ] No synchronous calls inside async functions
- [ ] No N+1 database queries
- [ ] Returns consistent response structure

---

## 19. ENVIRONMENT VARIABLES

```env
# ── Application ────────────────────────────────
ENVIRONMENT=development          # development | staging | production
LOG_LEVEL=INFO                   # DEBUG | INFO | WARNING | ERROR
APP_NAME=KROVA
APP_VERSION=0.1.0

# ── Database ───────────────────────────────────
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/krova
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# ── Redis ──────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Supabase ───────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# ── Anthropic ──────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_HAIKU_MODEL=claude-haiku-4-5
CLAUDE_SONNET_MODEL=claude-sonnet-4-5
CLAUDE_RATE_LIMIT_TPM=100000     # Tokens per minute limit

# ── Meta (WhatsApp + Instagram) ────────────────
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=       # Random string you choose for webhook verification
META_API_VERSION=v18.0

# ── Google (Gmail) ─────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://api.krova.ai/auth/google/callback
GOOGLE_PUBSUB_TOPIC=projects/krova/topics/gmail-notifications

# ── Microsoft (Outlook) ────────────────────────
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=https://api.krova.ai/auth/microsoft/callback
MICROSOFT_TENANT_ID=common

# ── Security ───────────────────────────────────
ENCRYPTION_KEY=                  # Fernet key — generate with Fernet.generate_key()
JWT_SECRET=                      # Strong random string
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=10080         # 7 days

# ── Monitoring ─────────────────────────────────
SENTRY_DSN=https://...@sentry.io/...

# ── n8n Automation ─────────────────────────────
N8N_BASE_URL=https://n8n.krova.ai
N8N_API_KEY=

# ── Rate Limiting ──────────────────────────────
API_RATE_LIMIT_PER_MINUTE=60
WEBHOOK_RATE_LIMIT_PER_MINUTE=1000
```

---

## 20. BUILD ORDER

The exact sequence. Every file written depends on what came before it.

**Week 1 — Foundation**
1. `shared/config/settings.py` — all environment variables via Pydantic BaseSettings
2. `shared/database/connection.py` — PostgreSQL async connection
3. `shared/database/base.py` — SQLAlchemy declarative base
4. `shared/database/models/` — all 6 database models
5. `shared/cache/client.py` — Redis connection
6. `shared/utils/logging.py` — structured logging setup
7. `shared/utils/exceptions.py` — custom exceptions
8. `pyproject.toml` — all dependencies via Poetry

**Week 2 — API Server**
9. `services/api/main.py` — FastAPI app, middleware, routers registered
10. `services/api/middleware/` — CORS, rate limiting, logging
11. `services/api/dependencies/auth.py` — JWT validation
12. First endpoint: `GET /health` — server is running

**Week 3 — Data Ingestion**
13. `shared/integrations/whatsapp.py` — Meta WhatsApp API client
14. `services/data-ingestion/validators/whatsapp.py` — signature verification
15. `services/data-ingestion/handlers/whatsapp.py` — parse webhook payload
16. `services/api/routers/webhooks.py` — WhatsApp webhook endpoint
17. `shared/queue/definitions.py` — BullMQ queue setup
18. `services/data-ingestion/queue/producers.py` — drop jobs in queue
19. `services/workers/message_processor.py` — save messages to DB
20. Test: Send WhatsApp message → verify it appears in database

**Week 4 — Instagram + Gmail**
21. Same pattern for Instagram
22. Same pattern for Gmail + Pub/Sub setup

**Week 5 — AI Brain**
23. `shared/queue/rate_limiter.py` — Redis token bucket
24. `services/ai-brain/prompts/nightly_analysis.py` — brain prompt
25. `services/ai-brain/claude/client.py` — Claude API client with retry
26. `services/ai-brain/claude/batch.py` — Batch API submission
27. `services/ai-brain/analysis/nightly.py` — full nightly logic
28. `services/workers/analysis_worker.py` — process analysis queue
29. Test: Trigger analysis manually → verify results in database

**Week 6 — Notifications + Actions**
30. `services/ai-brain/prompts/mobile_chat.py` — conversation prompt
31. `services/workers/notification_worker.py` — morning briefing
32. `services/workers/action_worker.py` — send approved messages
33. `services/api/routers/actions.py` — approve/reject endpoints

**Week 7-8 — Mobile App**
34. React Native project setup with Expo
35. Login screen + Supabase Auth
36. Onboarding flow (5 questions)
37. Main chat screen with streaming
38. Pending approvals screen

**Week 9-10 — Web Dashboard**
39. React + TypeScript + Vite setup
40. Overview page
41. Lead pipeline view
42. Customer intelligence view
43. Revenue analytics

**Week 11 — Landing Website**
44. Next.js setup
45. All sections of landing page
46. Pricing page

**Week 12 — Polish + Launch**
47. Sentry integration across all services
48. GitHub Actions CI/CD pipeline
49. Docker Compose for local dev
50. End-to-end testing
51. First real business onboarded

---

## 21. REVENUE PROJECTIONS

| Milestone | Customers | Avg Revenue | Monthly Revenue | Annual Run Rate |
|---|---|---|---|---|
| Month 3 — Phase 1 complete | 50 | ₹1,500 | ₹75,000 | ₹9 lakh |
| Month 6 — Phase 2 complete | 200 | ₹1,800 | ₹3.6 lakh | ₹43 lakh |
| Month 12 — Phase 3 complete | 500 | ₹2,000 | ₹10 lakh | ₹1.2 crore |
| Month 18 — Phase 4 starts | 1,000 | ₹2,500 | ₹25 lakh | ₹3 crore |
| Month 24 — Scale | 2,000 | ₹3,000 | ₹60 lakh | ₹7.2 crore |

**Total addressable market:**
- 10,000 digital agencies + 15 million freelancers + 100,000 coaching businesses
- Even 0.1% of freelancers alone = 15,000 customers = ₹7.5 crore/month at ₹499

---

## 22. THE ONE RULE

> Build only what owners actually ask for. No feature is added unless a real business owner described it as painful. Complexity is built when it solves a real problem — not because it sounds impressive.

This rule protects KROVA from becoming another overbuilt tool that nobody uses. The product stays simple on the outside no matter how intelligent it becomes inside.

Every proposed feature must pass this test:
**"Has a real owner specifically said this is painful?"**

If the answer is no — the feature does not get built.

---

*This document is the complete KROVA bible. Every decision in here was made deliberately over weeks of planning, research, and design. Nothing is here by accident.*

*Status: Ready to build*
*Next step: Write `shared/config/settings.py` — the first production file*
