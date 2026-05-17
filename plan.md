# KROVA — Build Plan
> Everything that needs to be built, changed, or created to accomplish the full product vision.
> Ordered by priority. Each item is specific enough to act on.

---

## Phase 1 — Core Intelligence (Do This First)
*Nothing else matters until the intelligence layer is proven on real businesses.*

### Backend

**1. Expand the analysis worker to classify all message types**
- `services/workers/analysis_worker.py`
- Right now only classifies messages as lead signals
- Add classification: `sales_signal`, `money_signal`, `complaint_signal`, `vendor_signal`, `relationship_signal`
- Every incoming message tagged before analysis runs

**2. Gmail ingestion worker**
- New file: `services/workers/gmail_worker.py`
- Connect via Google OAuth refresh token
- Pull new threads since last sync nightly
- Filter out newsletters, notifications, OTPs (known sender domain blocklist)
- Feed real human-to-human threads into the same analysis pipeline
- Store in existing `messages` table with `channel = 'gmail'`

**3. Commitment Tracker — DB + worker**
- New migration: add `commitments` table
  - `id`, `business_id`, `customer_id`, `team_member_id`, `commitment_text`, `due_date`, `source_channel`, `source_message_id`, `is_fulfilled`, `created_at`
- New worker logic: Claude extracts commitments from natural language in messages
- Runs nightly as part of analysis pipeline
- Flags overdue commitments in morning brief

**4. Revenue Leak Detector — DB + worker**
- New migration: extend `revenue_entries` table or add `revenue_signals` table
  - Fields: `signal_type` (scope_creep, forgotten_invoice, retainer_mismatch, ghost_invoice), `estimated_amount`, `customer_id`, `evidence`, `is_resolved`
- Worker logic: detect unbilled scope, forgotten invoices, retainer undercharging from message analysis
- Surfaces in financial intelligence endpoint

**5. Relationship Reality Check — worker enhancement**
- Extend `customer_intelligence` worker
- Track response time trends per customer (is their response time increasing?)
- Track conversation tone shift (transactional vs warm)
- Track competitor mentions per customer
- Add `relationship_trajectory` field to `CustomerIntelligence` model: `improving`, `stable`, `declining`, `critical`
- Add `churn_probability` float field

**6. Energy Drain Score — worker**
- Add `monthly_message_count` to `CustomerIntelligence`
- Calculate energy per rupee ratio after `RevenueEntry` data is present
- Surface in customer profile

**7. Competitor Intelligence — DB + worker**
- New migration: add `competitor_mentions` table
  - `id`, `business_id`, `customer_id`, `competitor_name`, `channel`, `context`, `mentioned_at`
- Worker extracts competitor names from conversations
- Aggregates monthly — "4 clients mentioned Studio X this month"
- Alert triggered when a customer mentions a competitor

**8. Growth Blocker Report — worker**
- Runs after 90 days of data per business
- Analyses: response time patterns, scope creep frequency, invoice collection time
- Produces structured report with specific revenue impact numbers
- Stored in new `growth_reports` table, surfaced in analytics endpoint

**9. Context Brief endpoint**
- `GET /intelligence/customers/{id}/brief`
- Returns pre-call context for a specific customer
- Pulls from: conversation history, DNA, intelligence profile, revenue entries, commitments
- Plain language summary ready for owner to read before a call

---

## Phase 2 — BSP Integration (Automation Unlock)
*After intelligence is proven. Businesses connect this when they trust KROVA.*

### Backend

**10. Connected Platforms — DB + API**
- New migration: add `connected_platforms` table
  - `id`, `business_id`, `platform` (interakt/wati/gupshup), `api_key_encrypted`, `is_active`, `created_at`
- Encrypt API keys at rest using Fernet symmetric encryption
- New endpoints:
  - `POST /platforms/connect` — save encrypted API key
  - `DELETE /platforms/{id}` — disconnect
  - `GET /platforms` — list connected platforms

**11. BSP Message Sender service**
- New file: `services/workers/bsp_sender.py`
- Supports Interakt API, Wati API, Gupshup API
- Pulls existing approved templates from BSP when connected
- Maps KROVA message recommendation to closest matching template
- Fills template variables with customer data
- Called by autopilot worker when `requires_approval = False`

**12. Template Sync worker**
- Pulls approved WhatsApp templates from connected BSP nightly
- Stores in new `message_templates` table
- KROVA selects best matching template when sending autonomously

---

## Phase 3 — Full Business Intelligence UI
*The dashboard stops being lead-focused and becomes a full business OS.*

### Frontend

**13. Redesign Intelligence page tabs**
- `app/dashboard/intelligence/page.tsx`
- Current tabs: Predictions, DNA, Financial, Learning, Reputation
- Add tabs: Commitments, Revenue Leaks, Competitor Intel, Growth Blockers
- Relationship Reality Check moves into Customer profile, not a separate tab

**14. Unified Business Brief — redesign Overview page**
- `app/dashboard/page.tsx`
- Replace current KPI cards with ranked priority list
- "5 things that will hurt your business most if ignored today"
- Ranked by impact across all 5 business areas — not just sales
- Each item has one-tap action

**15. Customer Profile — deep intelligence view**
- `app/dashboard/customers/page.tsx`
- When clicking a customer, slide-over shows:
  - Relationship trajectory (improving/stable/declining/critical)
  - Churn probability
  - Energy drain score
  - All commitments made to this customer
  - Revenue entries and outstanding amounts
  - Competitor mentions
  - Context brief (pre-call summary)
  - AI recommendation + suggested message

**16. Commitments page**
- New: `app/dashboard/commitments/page.tsx`
- List of all outstanding commitments across all customers
- Sorted by overdue first
- One tap to mark fulfilled
- Add to nav under Workspace

**17. Revenue Leaks page**
- New: `app/dashboard/revenue/page.tsx`
- Shows scope creep, forgotten invoices, retainer mismatches
- Total estimated leakage at the top
- One tap to create an invoice or flag for billing
- Add to nav under Workspace

**18. Competitor Intelligence panel**
- Inside Intelligence page — new tab
- Monthly view of all competitor mentions
- Which customers mentioned which competitors
- Alert history

**19. Growth Blockers report page**
- Inside Analytics page or Intelligence page
- Only shows after 90 days of data
- Three blockers with specific revenue impact
- Action items for each

**20. Settings — Connected Platforms section**
- `app/dashboard/settings/page.tsx`
- Add new section below Connected Channels
- Interakt, Wati, Gupshup cards
- Each has: paste API key field, connect button, status indicator
- Shows template count after connection

---

## Phase 4 — KROVA for Teams
*When businesses with 2–10 people start signing up.*

### Backend

**21. Team members — DB + auth**
- New migration: add `team_members` table
  - `id`, `business_id`, `user_id` (supabase), `role` (owner/manager/team_member), `name`, `email`, `is_active`, `created_at`
- Owner can invite team members via email
- Each team member gets their own Supabase auth account
- Role stored in `team_members`, checked on every API request

**22. Customer assignment**
- Add `assigned_to` field (team_member user_id) to `customers` table
- New migration for this field
- New endpoint: `PATCH /customers/{id}/assign`
- Assignment rules engine: round robin, by category, by location, manual

**23. Team performance analytics**
- New endpoint: `GET /analytics/team`
- Per team member: assigned customers, follow-up rate, conversion rate, response time, overdue actions
- Owner-only endpoint

**24. Role-based API filtering**
- All customer/action/intelligence endpoints check `assigned_to` for team_member role
- Owner and manager see everything
- Team member sees only their assigned records

**25. Team invitation flow**
- `POST /team/invite` — sends email invite via Resend/SendGrid
- `POST /team/accept` — team member sets password, account activated
- `GET /team` — list all team members (owner only)
- `DELETE /team/{id}` — deactivate team member

### Frontend

**26. Team member dashboard**
- Same layout as owner dashboard but filtered
- No financials section
- No team overview section
- Morning brief is personal only
- Performance stats are their own only

**27. Owner team overview panel**
- New section on Overview page (owner only)
- Cards per team member: assigned leads, overdue follow-ups, this month's conversions
- Quick assign button for unassigned leads

**28. Team settings page**
- `app/dashboard/settings/page.tsx` — new Team section
- Invite team member (name + email)
- Set role
- View all active team members
- Deactivate team member

**29. Assignment UI in Pipeline and Customers**
- Each customer card shows assigned team member avatar
- Owner can drag/drop or use dropdown to reassign
- Unassigned leads shown in a separate column/section

---

## Phase 5 — Mobile App
*After web product is solid and proven.*

**30. React Native app (single codebase)**
- Tech: React Native with Expo
- Shared API layer with web — same FastAPI backend
- Role-aware: owner view vs team member view determined by login

**31. Owner mobile screens**
- Today's Brief (home screen)
- One-tap action queue
- Team health summary
- Quick customer lookup with context brief
- Notification for urgent items

**32. Team member mobile screens**
- Personal brief (home screen)
- Their action queue only
- Quick add (log a call/meeting outcome)
- Their customer list

**33. WhatsApp morning message**
- Backend sends WhatsApp message at 8 AM IST via owner's connected BSP
- Owner receives brief in WhatsApp
- Reply "send" → approves top pending action
- Reply "skip" → defers to tomorrow
- Reply "show all" → deep link opens mobile app
- Team members receive their own personal brief via WhatsApp

---

## Phase 6 — Advanced Features
*Build when core is solid and real businesses are using KROVA daily.*

**34. KROVA Memory Export**
- `GET /export/business-report` — generates full PDF/structured report
- Covers: all customers, revenue history, trends, predictions, key insights
- Owner downloads and shares with accountant, investor, bank

**35. Business Analytics group**
- Loss Post-Mortem: auto-analysis when lead goes cold or lost
- Time Machine: revenue simulation on historical data
- Cluster Intelligence: auto-discover customer types from conversation patterns
- Voice of Customer: monthly aggregated theme report

**36. Relationship Health group**
- Gratitude Engine: identify customers deserving appreciation, draft personal messages
- Anti-Spam Guardian: detect over-messaging, enforce pause

**37. Deal Intelligence group**
- Conversation Coach: "what should I say to Rahul right now?" — 3 ranked options
- Deal Room: dedicated view for high-value leads

**38. KROVA Predict (better UI)**
- Already built in backend as Layer 2
- Needs prominent placement on dashboard
- Needs "prediction accuracy" tracking — was this prediction right?

**39. KROVA Network (Benchmarks)**
- Already built as Layer 4
- Needs 500–1000 businesses before data is meaningful
- Build the UI now, data populates as platform grows

**40. KROVA Coach**
- Tracks owner behaviour patterns specifically (not business patterns)
- "You consistently lose leads on days 3–4 after initial contact"
- Needs 90+ days of data per owner to be accurate

---

## What Does NOT Get Built (Decided)

| Feature | Reason |
|---|---|
| KROVA Voice | Wrong target market right now. Revisit for tier 2/3 expansion. |
| Zapier integration | Too complex for target market. Direct BSP API instead. |
| Manual CRM entry / chat exports | For non-API users. Not KROVA's customer. |
| KROVA Marketplace | Year 2–3. Needs network density. |
| Building our own WhatsApp sending infrastructure | Businesses use their own BSP. KROVA never owns the channel. |

---

## Database Migrations Needed (in order)

| # | Migration | What it adds |
|---|---|---|
| 004 | commitments table | Commitment tracking |
| 005 | revenue_signals table | Revenue leak detection |
| 006 | competitor_mentions table | Competitor intelligence |
| 007 | growth_reports table | Growth blocker reports |
| 008 | connected_platforms table | BSP integration |
| 009 | message_templates table | WhatsApp template sync |
| 010 | team_members table | Teams feature |
| 011 | assigned_to field on customers | Conversation assignment |

---

## Files to Create (Backend)

| File | What it does |
|---|---|
| `services/workers/gmail_worker.py` | Gmail ingestion pipeline |
| `services/workers/bsp_sender.py` | BSP message sending (Interakt/Wati/Gupshup) |
| `services/workers/commitment_worker.py` | Extract commitments from messages |
| `services/workers/revenue_leak_worker.py` | Detect unbilled work and overdue invoices |
| `services/workers/competitor_worker.py` | Extract competitor mentions |
| `services/api/routers/platforms.py` | Connected platforms endpoints |
| `services/api/routers/team.py` | Team management endpoints |
| `services/api/routers/commitments.py` | Commitments endpoints |
| `shared/database/models/commitment.py` | Commitment ORM model |
| `shared/database/models/competitor.py` | Competitor mention ORM model |
| `shared/database/models/platform.py` | Connected platform ORM model |
| `shared/database/models/team_member.py` | Team member ORM model |
| `shared/prompts/commitment_extraction.py` | Claude prompt for commitment extraction |
| `shared/prompts/revenue_leak.py` | Claude prompt for revenue leak detection |
| `shared/prompts/growth_blockers.py` | Claude prompt for growth blocker report |
| `shared/prompts/context_brief.py` | Claude prompt for pre-call context brief |

---

## Files to Create (Frontend)

| File | What it does |
|---|---|
| `app/dashboard/commitments/page.tsx` | Commitments tracking page |
| `app/dashboard/revenue/page.tsx` | Revenue leaks page |
| `app/dashboard/_components/CustomerDrawer.tsx` | Shared deep customer intelligence slide-over |
| `app/dashboard/_components/TeamMemberCard.tsx` | Team member performance card |

---

## Files to Modify (Frontend)

| File | What changes |
|---|---|
| `app/dashboard/page.tsx` | Replace KPIs with ranked priority brief |
| `app/dashboard/intelligence/page.tsx` | Add Commitments, Revenue Leaks, Competitor Intel tabs |
| `app/dashboard/customers/page.tsx` | Deep intelligence in slide-over via CustomerDrawer |
| `app/dashboard/pipeline/page.tsx` | Add assigned_to display, use CustomerDrawer |
| `app/dashboard/settings/page.tsx` | Add Connected Platforms section, add Team section |
| `app/dashboard/layout.tsx` | Add Commitments and Revenue to nav |
| `lib/api.ts` | Add TypeScript types for all new models |

---

## Files to Modify (Backend)

| File | What changes |
|---|---|
| `services/workers/analysis_worker.py` | Add message type classification, call new workers |
| `services/api/routers/customers.py` | Add PATCH status endpoint, add assign endpoint |
| `services/api/routers/intelligence.py` | Add context brief endpoint, competitor endpoint |
| `services/api/main.py` | Register new routers |
| `shared/database/models/__init__.py` | Import new models |
