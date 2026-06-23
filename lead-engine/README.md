# UK Car Source — Lead Engine

Local MVP for B2B lead generation, buyer discovery, and vehicle-offer automation.

## Quick Start

```bash
cd lead-engine
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # then fill in your API keys
python -m app.seed                 # seed country/payment/brand rules
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000

## API Keys

| Key | Where to get it |
|-----|----------------|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `GOOGLE_SEARCH_API_KEY` | https://console.cloud.google.com → Custom Search JSON API |
| `GOOGLE_SEARCH_ENGINE_ID` | https://programmablesearchengine.google.com |
| `RESEND_API_KEY` | https://resend.com |

## Config (no code changes needed)

All business rules live in `config/`:

- `country_rules.json` — RHD/LHD, age limits, luxury score, payment prefs per country
- `payment_rules.json` — TT/LC/escrow rules
- `brand_rules.json` — scoring weights per vehicle brand
- `scoring_rules.json` — lead scoring weights
- `search_targets.json` — marketplaces, search queries, target countries

## Running Tests

```bash
pytest tests/ -v
```

## Pages

| URL | Page |
|-----|------|
| `/` | Dashboard |
| `/buyers` | Buyer CRM |
| `/discovery` | Discovery engine |
| `/offers` | Vehicle offers & matching |
| `/rules` | Country/payment/brand rules |
| `/queue` | Outreach approval queue |
| `/settings` | API diagnostics |
