# KROVA — Product Decisions Log
> Everything discussed and decided from Layer B onwards.
> Last updated: April 2026 (updated with full intelligence expansion, deep features, and mobile app decisions)

---

## 1. Who KROVA Is Built For

**Target market:** Tech-savvy educated Indian SMB owners.

**The hard rule:** KROVA only works with businesses that have at least one Business API connected:
- WhatsApp Business API
- Instagram Graph API
- Gmail API

**Why this rule exists:** If they set up WhatsApp Business API, they went through Meta Business verification, picked a BSP, configured webhooks. That is not a simple process. Anyone who did that is not afraid of a 15-minute setup. They know tech.

**Who is NOT KROVA's customer:**
- Kirana store owners
- Salon owners who don't know tech
- Anyone on regular WhatsApp app (not the API)
- Anyone uncomfortable with SaaS tools

**The harsh truth accepted:** The business that's still on the regular WhatsApp app is not ready for KROVA. That's fine. They're not the customer. Accepting this early saves from building the wrong product.

---

## 2. How Channels Work

### Connected Channels — where data comes FROM
These are the business's own accounts. KROVA never owns them.

| Channel | What it needs |
|---|---|
| WhatsApp Business API | BSP account (Interakt, Wati, Gupshup) + Meta approval |
| Instagram Graph API | Instagram Business account + OAuth |
| Gmail | Google OAuth → refresh token |

- Business connects at least one channel to use KROVA
- More channels connected = richer intelligence = more accurate predictions
- KROVA stores credentials securely, uses them to read conversations and build intelligence
- Business pays their own message costs directly to their BSP — KROVA pays nothing

### Rule: At least one channel required to onboard
No channel = no data = no intelligence = can't use KROVA.

---

## 3. What KROVA Is — The Clear Identity

**KROVA is an intelligence platform. Not an automation platform.**

| Without BSP Integration | With BSP Integration |
|---|---|
| Reads conversations | Everything on the left |
| Builds DNA, predictions, profiles | Plus autopilot rules execute automatically |
| Tells you exactly who to message and what to say | Messages go out through BSP without owner doing anything |
| Owner sends messages manually | Fully autonomous after trust is established |

**Competitors doing automation:** Interakt, Wati, Gupshup, AiSensy — they send WhatsApp messages, run drip campaigns. They do it well. They're established.

**KROVA's edge:** Knowing WHO to message, WHAT to say, WHY right now — based on deep analysis of that specific customer's behaviour. Interakt sends the same template to everyone. KROVA knows if this customer responds better to formal or casual, whether they're price-sensitive, whether they're about to close or leave.

---

## 4. Layer B — KROVA as Operator

### The Autopilot Model (Option 3 — Hybrid)
Each rule has a `requires_approval` toggle. Owner decides per rule.

**Low stakes → turn off approval (send automatically):**
- Follow up if no reply in 3 days
- Check in with converted customers every 30 days
- Routine check-ins

**High stakes → keep approval on (draft and ask):**
- Reactivate a lost customer
- Respond to a negative review
- Upsell after conversion

### Connected Platforms — where messages go TO
Separate from Connected Channels. This is what unlocks automation.

| Platform | How to connect |
|---|---|
| Interakt | Paste API key in Settings |
| Wati | Paste API key in Settings |
| Gupshup | Paste API key in Settings |

**No Zapier. No third party bridge. KROVA calls the BSP API directly.**

### The Trust-Building Flow
- **Day 1–20:** KROVA reads conversations, builds intelligence, surfaces recommendations. Owner acts on them manually from their own BSP dashboard. KROVA proves its value.
- **Day 20+:** Owner trusts KROVA. Goes to Settings → Connected Platforms. Pastes Interakt API key. Autopilot rules now fire automatically.

### WhatsApp Template Restriction — Important
WhatsApp rule: if a customer hasn't messaged in the last 24 hours, you CANNOT send a free-form message. Must use a pre-approved template.

Templates must be:
1. Created in Meta Business Manager
2. Submitted for approval
3. Approved by Meta (1–3 days)

**Solution:** Since target customers are already on Interakt/Wati, they already have approved templates. KROVA pulls their existing templates, picks the most relevant one, fills in variables, sends.

### Cost Breakdown (Pro Plan with automation)
| Cost | Who pays | Amount |
|---|---|---|
| WhatsApp message delivery | Business → their BSP | ₹0.35–₹1.40 per conversation window |
| Interakt/Wati API call | Free | ₹0 |
| Claude API (message generation) | KROVA | ~₹0.02 per message |
| Infrastructure per business | KROVA | ~₹100–200/month |

**KROVA margin at ₹4999/month:** ~₹4700/month per business. The messaging cost model is extremely clean — Meta/WhatsApp costs are the business's problem, not KROVA's.

---

## 5. Features — Compressed and Final

The original 10 features were compressed because several did the same underlying thing.

### Group 1 — Business Analytics
*(Loss Post-Mortem + Time Machine + Cluster Intelligence + Voice of Customer)*

All answer: **"What is actually happening in my business?"**

- **Loss Post-Mortem:** Every time a deal dies, KROVA analyses why and builds a private loss database. After 6 months: "Why do I keep losing Instagram leads?" — answered from 30 real deals.
- **Time Machine:** "What if I had replied within 1 hour to every lead?" Runs on actual data. Gives a number. ₹4.8L lost to response time, not price.
- **Cluster Intelligence:** Automatically discovers customer types from conversation patterns. "You're spending 60% energy on customers who convert 4% of the time."
- **Voice of Customer:** Monthly report of what customers are actually saying across all conversations. Real themes, not sentiment labels.

### Group 2 — Relationship Health
*(Relationship Debt Tracker + Gratitude Engine + Anti-Spam Guardian)*

All manage the human side of customer relationships.

- **Relationship Debt Tracker:** Customers you've forgotten who deserve attention. Scores the debt. Tells you when to reach out personally — not with a template, personally.
- **Gratitude Engine:** Identifies customers who deserve genuine appreciation. Drafts personal messages based on actual relationship history, not generic "thank you for your business."
- **Anti-Spam Guardian:** Stops the owner from being too pushy. "You've sent 4 messages to Priya in 6 days with no reply. Pause for 12 days. I'll alert you when she shows activity." Tells the owner to do LESS.

### Group 3 — Deal Intelligence
*(Conversation Coach + Deal Room)*

Both serve the same moment: working a specific lead right now.

- **Conversation Coach:** Owner asks "What should I say to Rahul right now?" Gets 3 options ranked by likelihood to work with THIS specific customer based on their history. Not generic templates.
- **Deal Room:** For high-value leads — one dedicated view with full cross-channel context, outstanding objections, next 3 recommended moves, revenue at stake. Becomes a case study when deal closes or dies.

### Momentum Score
Folds into the main dashboard as the headline number. 0–100, updated every morning. The business health Fitbit. Not a separate feature.

---

## 6. New Features Discussed

### KROVA Predict
**Status: Already built as Layer 2.**
The Prediction model exists in the DB — churn risk, conversion window, upsell opportunity, reactivation, revenue at risk. The intelligence page surfaces them. Just needs better UI and more prominent placement.

### KROVA Network
**Status: Foundation built as Layer 4 (Benchmarks). Needs data density.**
Anonymously aggregates insights across similar businesses. "Agencies like yours in your city convert 23% of Instagram leads. You are at 11%. Here is what the top performers do differently."
Needs 500–1000 businesses on the platform before data is meaningful.

### KROVA Memory Export
**Status: Not built. Can build anytime.**
Generates a complete structured business report from all KROVA data — customers, trends, insights, revenue history. Owner shares with accountant, investor, bank, or partner. Nobody does this automatically from unstructured business data.

### KROVA Coach
**Status: Not built. Needs months of data per business.**
Distinct from DNA (which tracks business patterns). Coach tracks OWNER behaviour patterns specifically.
"You consistently lose leads on days 3 and 4 after initial contact. Leads that convert receive follow-up within 24 hours. Change this one habit and your conversion rate increases by approximately 30%."
No consultant can give this because no consultant has this data. KROVA does.

### KROVA for Teams
**Status: Not built. Significant build.**
Multi-user auth, roles, team dashboards. Each team member gets their own KROVA interface. Owner sees everything across the whole team. Morning briefing includes team performance alongside business performance.
Important for: digital agencies, recruitment firms, coaching businesses with 2–10 people.

### KROVA Voice
**Status: Deferred. Wrong target market right now.**
Voice-first interface in Hindi — "Aaj kaun kaun se leads aaye?" KROVA responds in voice.
Great feature. Wrong customer for now. Target market (tech-savvy API users) are comfortable with dashboards and text. Voice matters more for tier 2/3 owners who don't have Business APIs — and those are not KROVA's customers yet.
Revisit when expanding to a less tech-savvy segment.

### KROVA Marketplace
**Status: Year 2–3. Do not touch yet.**
KROVA matches businesses to each other based on real intelligence data. "There is a digital agency in your city that has been struggling with content for 3 months. You should reach out to them."
Requires network density before it creates value. Nothing to build now.

---

## 7. Build Order

| Priority | What | Why |
|---|---|---|
| 1 | Core intelligence proven on real businesses | Nothing matters until a real owner says "this prediction was right" |
| 2 | Business Analytics group | Answers the deepest business questions |
| 3 | Relationship Health group | Turns data into human moments |
| 4 | Deal Intelligence group | Helps close the deals already in pipeline |
| 5 | BSP integration (Interakt/Wati) | Unlocks automation for businesses ready to trust KROVA |
| 6 | Memory Export | Simple build, high value, share with accountant/investor |
| 7 | Predict (better UI) | Already built, just needs surfacing properly |
| 8 | KROVA for Teams | When businesses with 2–10 people start signing up |
| 9 | KROVA Coach | Needs months of owner behaviour data first |
| 10 | KROVA Network | Needs 500–1000 businesses on platform |
| 11 | KROVA Voice | When expanding to less tech-savvy segment |
| 12 | KROVA Marketplace | Year 2–3 |

---

## 9. KROVA Is Not Just a Lead Analyst — The Full Intelligence Expansion

### The Breakthrough Insight
When a business connects Gmail, WhatsApp, and Instagram — KROVA sees the entire nervous system of that business. Not just leads. Everything.

**What actually flows through those channels:**

| Channel | What's really there |
|---|---|
| Gmail | Unpaid invoices, vendor bills, client complaints, legal notices, job applications, tax correspondence, bank communications, partnership proposals |
| WhatsApp | Yes leads — but also supplier negotiations, delivery complaints, payment follow-ups, angry customers, team coordination |
| Instagram | Lead DMs — but also public complaints in comments, brand mentions, competitor comparisons |

**What KROVA was doing:** Reading all of this and only extracting one thing — is this person a hot or cold lead? Everything else ignored.

**What KROVA now does:** Every incoming message classified into which area of the business it belongs to — Sales, Money, Complaint, Vendor/Operations, or Relationship.

---

### The 5 Areas of a Business KROVA Now Covers

1. **Sales** — leads, pipeline, conversions (already built, heavy)
2. **Money** — cash flow, overdue invoices, revenue patterns (model built, UI weak)
3. **Reputation** — reviews, complaints, what the market thinks (model built, barely touched)
4. **Operations** — response times, process gaps, vendor issues (almost untouched)
5. **Relationships** — existing clients, retention, loyalty (discussed, not built properly)

---

### The Deep Features — What Makes KROVA Irreplaceable

**1. The Commitment Tracker**
Every promise made across every channel extracted automatically from natural language. No manual to-do list.
- "You told Sharma you'd send the revised proposal by Friday. 11 days ago. Never sent."
- "You told Priya you'd introduce her to your CA. 2 weeks ago. Not done."
Owner never drops a commitment again. Protects relationships and reputation.

**2. The Revenue Leak Detector**
Money the owner should be earning but isn't — found automatically.
- **Scope creep:** "Client X asked for 3 extra deliverables. ₹18,000 never billed."
- **Forgotten invoices:** "Project completed in September. No invoice sent. ₹25,000 sitting unbilled 4 months."
- **Retainer undercharging:** "You are delivering 2.5x the work in Mehta's retainer. Giving away ₹20,000/month for free."
- **Ghost invoices:** "Invoice #47 for ₹35,000 sent 42 days ago. Client is active on WhatsApp but ignoring it deliberately."
Most owners have no idea how much money they leave on the table. KROVA finds it from data that already exists.

**3. The Relationship Reality Check**
The gap between what the owner thinks about a client and what the data actually shows.
> "You think Priya is happy and stable. Data shows: response time increased from 2 hours to 18 hours over 6 weeks. Last 4 conversations purely transactional. Mentioned 'evaluating options' 3 weeks ago. Has not asked about scope expansion in 2 months — used to ask every month. Churn probability: 67% within 45 days. You have a window right now."
The owner is always the last to know a relationship is deteriorating. KROVA sees it weeks before they do.

**4. The Cash Flow Oracle**
Full prediction of what is actually coming — not just overdue amounts.
> "Next month: ₹1.8L expected. Committed expenses: ₹1.2L. But 3 clients representing ₹65,000 historically pay 25–40 days late. Real cash on the 1st: likely ₹1.1L–₹1.4L. Risk: Mehta's invoice is 30 days overdue. Based on his pattern, 40% chance it extends to 60 days — which creates a ₹35,000 cash gap in week 3 of next month. Message him today, not next week."
No accountant gives this. No software gives this. Comes from reading Gmail payment threads and WhatsApp together.

**5. The Energy Drain Detector**
Identifies clients who consume 10x the time for the same money.
> "Sharma & Associates pays ₹20,000/month. They generate 847 messages. Your average client at this price generates 89 messages. They consume 9.5x the energy per rupee. Effective hourly value: ₹180/hour vs your average of ₹890/hour. Your most expensive client — they just aren't paying for it."
Helps owners decide who to reprice, renegotiate with, or fire.

**6. The Competitor Intelligence Layer**
Every competitor mention across any channel — detected, logged, pattern-analysed.
> "4 clients mentioned Studio X this month. 3 comparing, 1 moved work there. Clients who mention Studio X then go quiet have 78% churn rate in your history. When a client mentions a competitor you have a 72-hour window. Kapoor mentioned Studio X 48 hours ago. You have not responded. This is urgent."

**7. The Context Brief — Before Every Important Conversation**
Before calling a client not spoken to in months, KROVA gives a 30-second brief:
> "Sharma: Last contact October, Bandra project. Happy with deliverables, timeline complaint August (resolved). Owes nothing. Referred 1 client December. His emails suggest expansion — mentioned hiring 2 people in November. Best opening: ask about the expansion before any business talk. Never lead with pricing. Responds poorly to transactional calls."
Owner walks into every call knowing everything. Never says "remind me where we left off."

**8. The Growth Blocker Report**
After 90 days, KROVA tells the owner exactly what is stopping growth — from their specific data.
> "3 specific blockers: (1) Response time costing ₹3.2L annually — 43% of Instagram leads lost because first response averages 6 hours. (2) Scope creep tolerance costing ₹2.1L annually — 7 of 12 clients getting 30–40% more than contracted. (3) Invoice collection consuming 14 hours/month — worth ₹28,000 in lost productive capacity. Total annual leakage: ₹5.3L. Fix these before adding a single new client."
A consultant charges ₹2–5 lakh for this. KROVA produces it from data that already exists.

---

## 10. Mobile App — What It Does and Does Not Do

### The Mobile App's One Job
**The owner runs their entire business from their phone in under 10 minutes every morning.**

That's it. Mobile is for consuming intelligence and taking action. Not for configuration, deep analysis, or reports.

### What's on Mobile

**First screen — Today's Brief**
Not a dashboard. Not charts. One intelligent brief:
> "Good morning. 3 things need attention today:
> · Priya's relationship declining — message her today
> · ₹35,000 overdue from Mehta — 42 days
> · Tax notice in Gmail unanswered 3 weeks — urgent
> Pipeline: 2 hot leads, 1 closing this week
> Cash this month: ₹1.4L expected
> Business health: 74/100"

Read in 60 seconds. Owner knows exactly what their day looks like.

**Second — One Tap Actions**
For each item in the brief — one tap gives the drafted message, the context, the recommended action. Approve or edit. Done. No navigating. No menus.

**Third — Quick Add**
Owner just finished a client call. Opens app, types or says:
> "Spoke to Kapoor. He wants proposal by Thursday. Budget 25k."
KROVA logs it, adds to Kapoor's timeline, creates a commitment reminder for Wednesday.

### What is NOT on Mobile
- Not the full analytics dashboard — that's desktop
- Not autopilot rule creation — that's desktop
- Not deep intelligence reports — that's desktop

### The Feature That Makes Mobile Irreplaceable
Every morning at 8 AM a WhatsApp message arrives from KROVA. Owner does not even need to open the app. The brief comes to them. They reply:
- "send" → approves a follow-up
- "skip" → defers to tomorrow
- "show all" → opens full brief in app

The entire morning routine happens inside WhatsApp — the app they already live in. Nobody will copy this because nobody else has the intelligence layer to back it up.

---

## 11. KROVA for Teams

### The Problem It Solves
Many businesses in KROVA's target market are not solo owners. They have people:
- Digital agency → account managers handling different clients
- Recruitment firm → placement officers each managing their own candidates
- Coaching business → sales coordinators following up on leads
- Real estate firm → agents each handling their own pipeline

Right now KROVA assumes one person runs everything. KROVA for Teams shifts the owner's job from "what should I do today" to "is my team doing what they should be doing?"

### How Channels Work for Teams
**One business account. Multiple team members.**
- One WhatsApp Business number
- One Instagram account
- One Gmail (plus optional individual mailboxes like rahul@agency.com)
- All connected once by the owner during onboarding
- Team members do not have separate channels — they work within the company's channels

### Conversation Assignment
When a new conversation comes in KROVA assigns it to a team member based on owner-set rules:
- **Round robin** — new leads distributed equally
- **By category** — all Instagram leads to Rahul, all Gmail to Priya
- **By location** — Mumbai leads to one person, Pune to another
- **Manual** — owner assigns specific customers to specific people

Database change required: add `assigned_to` field (user ID) to customer record. One field. Rest of intelligence layer works exactly the same, filtered by assignment.

### Two Dashboards — Same Product

**Team Member Dashboard — focused and narrow:**
- Their assigned customers only
- Their morning brief — "your 3 leads need attention today"
- Their action queue — drafts waiting for their approval only
- Their pipeline — only their stage distribution
- Their performance — their own reply rate, conversion rate, response time
- Cannot see other team members' work
- Cannot see business-level financials
- Cannot see full intelligence reports

**Owner Dashboard — everything:**
- Full business intelligence across all 5 areas
- Team performance panel — everyone's numbers side by side
- Unassigned leads — conversations that need assignment
- Override ability — can see and act on any team member's customers
- Morning brief includes both business health and team health

### Roles
| Role | What they see |
|---|---|
| `owner` | Full dashboard, full brief, team overview, all financials |
| `manager` | Their sub-team's work, no full business financials |
| `team_member` | Only their assigned customers and their own performance |

### Mobile App — One App, Different Experience
Same app. Role determines what you see. One codebase.

**Team member opens app:**
> "Good morning Rahul. 3 leads need your attention today. 1 follow-up overdue by 2 days."

**Owner opens same app:**
> "Good morning Nikhil. Business health: 74/100. Rahul has 1 overdue follow-up. Priya closed 2 leads yesterday. 3 things need your attention today."

**WhatsApp morning message for team members:**
> "Hey Rahul, 3 follow-ups due today. Kapoor hasn't replied in 4 days — priority. Tap to open."

They live in WhatsApp. KROVA comes to where they already are — same as the owner experience.

### Why One App Not Two
- One codebase to maintain
- Owner can switch to any team member's view — "show me Rahul's pipeline"
- Team members who get promoted don't need a different app
- One app link to share with the whole team

---

## 12. Pricing Direction

- **Base plan:** Intelligence only — reads channels, builds DNA, surfaces recommendations, owner acts manually
- **Pro plan:** Intelligence + Automation — BSP integration unlocked, autopilot rules fire automatically
- **Teams plan:** Everything in Pro + multi-user access, role-based dashboards, team performance intelligence

The integration naturally separates casual users from serious ones. Teams plan targets agencies and firms with 2–10 people.
