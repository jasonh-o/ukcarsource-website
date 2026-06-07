# UK Car Source — B2B CRM System
## Product Requirements Document v1.0

---

## Overview

A full-stack B2B dealer relationship management system for UK Car Source. Enables systematic discovery, enrichment, outreach and management of overseas vehicle dealers, importers and trade buyers — with AI-assisted personalisation and full compliance with GDPR, PECR, CAN-SPAM and platform rules.

**Repository:** `/crm/` within ukcarsource-website
**Stack:** Next.js 14 · TypeScript · PostgreSQL · Prisma · Tailwind · Claude API · Resend
**Deployment:** Docker / Railway / Vercel + Supabase

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Next.js App (App Router)          │
│                                                   │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Admin UI    │  │    API Routes            │  │
│  │  - Dashboard │  │  /api/leads              │  │
│  │  - Leads     │  │  /api/leads/[id]         │  │
│  │  - Pipeline  │  │  /api/leads/[id]/activity│  │
│  │  - Outreach  │  │  /api/outreach/send      │  │
│  │  - Templates │  │  /api/ai/outreach        │  │
│  │  - Markets   │  │  /api/ai/score           │  │
│  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────┘
          │                        │
          ▼                        ▼
┌─────────────────┐      ┌──────────────────────┐
│   PostgreSQL    │      │   External Services  │
│   (Prisma ORM)  │      │                      │
│                 │      │  Claude API (AI)      │
│  - Lead         │      │  Resend (email)       │
│  - Activity     │      │  WhatsApp Cloud API   │
│  - OutreachLog  │      │  Meta Graph API       │
│  - Template     │      │                       │
│  - Enquiry      │      └──────────────────────┘
│  - StockAlert   │
└─────────────────┘
```

---

## Database Schema Summary

| Table | Purpose |
|---|---|
| `Lead` | Core dealer/importer record with all contact and enrichment data |
| `Activity` | Immutable log of all interactions per lead |
| `OutreachLog` | Record of every message sent (email/WA/LinkedIn/FB) |
| `Template` | Reusable outreach message templates |
| `Enquiry` | Inbound enquiries from website or lead form |
| `StockAlert` | Dealer stock alert subscriptions |

---

## API Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/leads` | List leads with filter/pagination |
| POST | `/api/leads` | Create new lead + auto-score |
| GET | `/api/leads/[id]` | Get lead with activities & logs |
| PATCH | `/api/leads/[id]` | Update lead (stage, fields) |
| DELETE | `/api/leads/[id]` | Delete lead |
| POST | `/api/leads/[id]/activity` | Log an activity |
| POST | `/api/outreach/send` | Send email / queue WhatsApp |
| POST | `/api/ai/outreach` | Generate AI outreach message |

---

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Stats, pipeline, hot leads, recent activity |
| Leads | `/leads` | Filterable table of all leads |
| Lead Detail | `/leads/[id]` | Full contact record + AI outreach + activity |
| Pipeline | `/pipeline` | Kanban by stage |
| Templates | `/templates` | Message template library |
| Markets | `/markets` | Priority market intelligence |
| AI Tools | `/ai` | Bulk AI scoring, follow-up suggestions |
| Settings | `/settings` | API keys, email config, team |

---

## AI Features (Claude API)

### 1. Outreach Generation (`/api/ai/outreach`)
- Generates personalised first-contact messages for email, WhatsApp or LinkedIn
- Context: company name, country, city, vehicle specialty, notes, stage
- Respects GDPR legitimate interest framing
- Country-specific market context (COE for Singapore, RHD focus for Japan, etc.)
- Tone: formal / friendly / direct

### 2. Lead Scoring (`scoreLead`)
- 0–100 score based on: market priority, vehicle specialty alignment, company size
- Runs automatically on lead creation (background, non-blocking)
- Priority markets score higher (UAE, Japan, Singapore, NZ, etc.)
- Priority vehicles score higher (Rolls-Royce, prestige, RHD specialist)

### 3. Follow-up Suggestion (`suggestFollowUp`)
- Generates contextual follow-up based on last message + days since contact
- Used in Leads table overdue follow-up workflow

---

## Outreach Compliance

### Email (GDPR / PECR)
- Legitimate interest basis (B2B, no consent required for commercial organisations)
- Unsubscribe link in every email footer
- Opt-out stored in `Lead.optedOut` — blocks all future outreach
- From domain must be properly configured (SPF, DKIM, DMARC)
- Rate limiting: max 50 cold emails/day to start; increase with reputation

### WhatsApp
- Click-to-chat workflow only (wa.me links) — no automated mass messaging
- WhatsApp Business Cloud API for template messages (approved templates only)
- No bulk DM automation

### LinkedIn
- Manual connection + message workflow supported
- Content posting scheduler (organic only)
- No automation of connection requests or DMs (violates ToS)

### Facebook
- Manual Messenger task generation
- Business page outreach prompts

---

## Deployment Guide

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or Supabase free tier)
- Claude API key (Anthropic Console)
- Resend account + verified sending domain

### Local Development
```bash
cd crm
cp .env.example .env
# Fill in DATABASE_URL and ANTHROPIC_API_KEY at minimum

npm install
npx prisma db push       # Create schema
npm run db:seed          # Seed sample leads & templates
npm run dev              # Start dev server → localhost:3000
```

### Production (Railway)
```bash
# 1. Create Railway project, add PostgreSQL plugin
# 2. Set environment variables in Railway dashboard
# 3. Deploy via GitHub integration
# railway up
```

### Production (Vercel + Supabase)
```bash
# 1. Create Supabase project — copy DATABASE_URL (pooled connection)
# 2. vercel deploy
# 3. Set env vars in Vercel dashboard
# 4. Run: npx prisma migrate deploy
```

### Docker
```dockerfile
# Dockerfile included — build with:
docker build -t ukcarsource-crm .
docker run -p 3000:3000 --env-file .env ukcarsource-crm
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | NextAuth secret (32-char random) |
| `ANTHROPIC_API_KEY` | ✅ | For AI outreach & scoring |
| `RESEND_API_KEY` | ⚠️ | Required for email sending |
| `RESEND_FROM_EMAIL` | ⚠️ | Verified sender email |
| `WHATSAPP_ACCESS_TOKEN` | Optional | WhatsApp Business Cloud API |
| `AUTH_GOOGLE_ID/SECRET` | Optional | Google OAuth for team login |

---

## Implementation Roadmap

### Week 1 — Foundation
- [ ] Database setup (Supabase or Railway PostgreSQL)
- [ ] Run `prisma db push` + seed data
- [ ] Verify dashboard, leads table, and lead detail pages
- [ ] Test AI outreach generation (needs ANTHROPIC_API_KEY)
- [ ] Configure Resend + test email send

### Week 2 — First Leads
- [ ] Manually add 20–50 priority leads from Google Maps / LinkedIn
- [ ] Enrich leads with website, email, WhatsApp where possible
- [ ] Review AI scores — adjust manually where needed
- [ ] Begin first email outreach sequence (10–15 leads/day max)
- [ ] Set up LinkedIn company page (use LINKEDIN-BRAND.md)

### Week 3 — Outreach in Motion
- [ ] Daily outreach routine: 5 emails + 3 WhatsApp + 5 LinkedIn connections
- [ ] Update lead stages as replies come in
- [ ] Log all replies as activities
- [ ] Identify first QUALIFIED leads

### Month 2 — Scale
- [ ] Add stock alert signup to main website
- [ ] Build dealer portal (stock alerts, sourcing requests)
- [ ] Import leads from trade directories / export databases
- [ ] Set up email domain tracking (open/click via Resend webhooks)
- [ ] Monthly pipeline review

### Month 3+ — Automation
- [ ] Resend webhook for open/click tracking → auto-update OutreachLog
- [ ] Scheduled follow-up reminders (Next Follow Up date)
- [ ] Bulk AI scoring run for all unscored leads
- [ ] CRM export to CSV for offline analysis
- [ ] WhatsApp Business API approved templates for follow-ups

---

## Key Metrics to Track

| Metric | Target (Month 3) |
|---|---|
| Total leads in CRM | 200+ |
| Contacted leads | 100+ |
| Reply rate | 15–25% |
| Qualified leads | 20+ |
| Active buyers | 5+ |
| Deals in pipeline | £50k+ |

---

## Lead Discovery Methods (Manual, Compliant)

1. **Google Maps** — Search "car dealer" + city in target markets. Extract name, website, phone.
2. **LinkedIn Company Search** — Filter by industry (Motor Vehicle), country, size.
3. **Facebook Business Pages** — Search "[city] car dealership" or "[brand] dealer [country]"
4. **Trade Directories** — Kompass, Yellow Pages equivalents per country
5. **Country-specific databases** — e.g. Kenya Motor Industry Association, Singapore LTA registered dealers
6. **Referrals** — Ask existing buyers for introductions to peers in other markets
7. **Trade shows** — Dubai Motor Show, Tokyo Motor Show, London Motor Show

---

*Built for UK Car Source | ukcarsource.com | Version 1.0 | June 2026*
