"""Generate outreach email and WhatsApp drafts via Claude. Falls back to templates if AI unavailable."""
import os
import json
from pathlib import Path
from typing import Optional

CONFIG = Path(__file__).resolve().parent.parent.parent / "config"

def _get_stock_block(drive: str) -> str:
    try:
        from app.services.stock_service import get_stock_block
        return get_stock_block(drive)
    except Exception:
        return ""


def _client():
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None
    import anthropic
    return anthropic.Anthropic(api_key=api_key)


def _country_is_lhd(country: str) -> bool:
    """Return True if country is LHD-only (UAE, Saudi, Qatar, Kuwait etc.)"""
    try:
        rules = json.loads((CONFIG / "country_rules.json").read_text())
        c = rules.get(country, {})
        return c.get("lhd_allowed", False) and not c.get("rhd_allowed", True)
    except Exception:
        return False


# ── Fallback templates ──────────────────────────────────────────────────────────

def _fallback_intro_email(buyer: dict) -> tuple:
    name = buyer.get("contact_person") or buyer.get("company_name", "Sir/Madam")
    company = buyer.get("company_name", "your company")
    country = buyer.get("country", "your market")
    brands = ", ".join(buyer.get("brands_sold") or ["prestige vehicles"])
    is_lhd = _country_is_lhd(country)

    subject = f"UK Prestige Vehicle Export – {company}"

    if is_lhd:
        stock_block = _get_stock_block("LHD")
        stock_section = f"\n{stock_block}\n" if stock_block else ""
        body = f"""Dear {name},

I hope this message finds you well.

My name is Jason, and I'm reaching out from UK Car Source — we source and export prestige vehicles from the United Kingdom to dealers and importers worldwide.

Rolls-Royce is manufactured here in the UK and produced from the factory in both left and right-hand drive. We source and export genuine factory LHD Rolls-Royce — Ghost, Phantom, Cullinan, Wraith and Dawn — directly from UK private clients and collections, often at significantly lower prices than local market rates.

We also occasionally source and export factory LHD Land Rover and Range Rover, and maintain strong connections with suppliers in the USA and Europe for additional LHD requirements.
{stock_section}
If your clients are looking for factory LHD Rolls-Royce or other prestige vehicles, I'd welcome the opportunity to discuss how we can work together.

Kind regards,
Jason
UK Car Source
sales@ukcarsource.com
www.ukcarsource.com
"""
    else:
        body = f"""Dear {name},

I hope this message finds you well.

My name is Jason, and I'm reaching out from UK Car Source — we source and export premium and luxury vehicles from the United Kingdom to dealers and importers worldwide.

I noticed that {company} specialises in {brands} in {country}, and I believe we could be a strong supply partner for you.

We source low-mileage, UK-specification right-hand drive vehicles including Range Rover, Bentley, Rolls-Royce, Porsche, and Mercedes-Benz — often at prices well below local market rates.

Would you be open to a brief conversation to explore whether there is a fit?

Looking forward to hearing from you.

Kind regards,
Jason
UK Car Source
sales@ukcarsource.com
www.ukcarsource.com
"""
    return subject, body


def _fallback_intro_whatsapp(buyer: dict) -> str:
    name = buyer.get("contact_person") or buyer.get("company_name", "there")
    company = buyer.get("company_name", "your company")
    country = buyer.get("country", "")
    is_lhd = _country_is_lhd(country)

    if is_lhd:
        return (
            f"Hi {name}, I'm Jason from UK Car Source — we source and export factory LHD Rolls-Royce direct from the UK. "
            f"Ghost, Phantom, Cullinan and more. Worth a quick chat? 🇬🇧"
        )
    return (
        f"Hi {name}, I'm Jason from UK Car Source — we source and export premium UK vehicles worldwide. "
        f"Range Rover, Bentley, Rolls-Royce and more. "
        f"Think we could work together? 🇬🇧🚗"
    )


def _fallback_offer_email(buyer: dict, offer: dict) -> tuple:
    name = buyer.get("contact_person") or buyer.get("company_name", "Sir/Madam")
    make = offer.get("make", "")
    model = offer.get("model", "")
    year = offer.get("year", "")
    mileage = offer.get("mileage", "")
    price = offer.get("price_gbp", "")
    colour = offer.get("colour", "")
    subject = f"Vehicle Available: {year} {make} {model} – UK Export"
    body = f"""Dear {name},

I have a vehicle that I thought may be of interest to you:

{year} {make} {model}
Colour: {colour}
Mileage: {mileage:,} miles
Price: £{price:,.0f} (ex-UK)
Condition: {offer.get("condition", "Excellent")}

{offer.get("description") or ""}

This vehicle is available for immediate export. Please let me know if you would like photos, a full specification sheet, or to discuss pricing.

Kind regards,
Jason
UK Car Source
sales@ukcarsource.com
www.ukcarsource.com
"""
    return subject, body


def _fallback_offer_whatsapp(buyer: dict, offer: dict) -> str:
    make = offer.get("make", "")
    model = offer.get("model", "")
    year = offer.get("year", "")
    price = offer.get("price_gbp", "")
    return (
        f"Hi, I have a {year} {make} {model} available for export — "
        f"priced at £{price:,.0f} ex-UK. "
        f"Interested in photos/spec? Reply here or email me."
    )


# ── AI generation ───────────────────────────────────────────────────────────────

async def generate_intro_messages(buyer: dict) -> dict:
    """Return {'email_subject', 'email_body', 'whatsapp'} — AI or fallback."""
    client = _client()
    if not client:
        subj, body = _fallback_intro_email(buyer)
        return {"email_subject": subj, "email_body": body, "whatsapp": _fallback_intro_whatsapp(buyer), "source": "template"}

    country = buyer.get("country", "")
    is_lhd = _country_is_lhd(country)

    if is_lhd:
        vehicle_context = """IMPORTANT — LHD COUNTRY RULES:
- This is a LEFT-HAND DRIVE market.
- ONLY contact this buyer if they sell HIGH-END vehicles — cars priced £100,000+ new (Rolls-Royce, Bentley, Lamborghini, Ferrari, high-spec Mercedes, BMW, Porsche, Range Rover). Do NOT pitch to dealers of Toyota, Nissan, Honda, Kia, Hyundai or other mainstream brands.
- Rolls-Royce is manufactured in the UK and produced in BOTH LHD and RHD from the factory. We source genuine factory LHD Rolls-Royce directly from the UK. Do NOT mention conversions or kits — these are factory-built LHD cars.
- Our primary LHD offer: Ghost, Phantom, Cullinan, Wraith, Dawn, Spectre — factory LHD, UK-sourced.
- Occasionally we source factory LHD Land Rover / Range Rover (produced in small LHD numbers at the Solihull factory).
- We also have strong connections with suppliers in the USA and Europe for other LHD prestige vehicles when required.
- DO NOT mention Jaguar or mainstream brands as regular stock for LHD markets.
- Never mention conversions, kits, or modifications.
- Position us as: a specialist UK source for factory LHD Rolls-Royce, with additional LHD capability via USA/Europe connections.
- The tone should be exclusive and discreet — we are approaching them as a serious supply partner for ultra-premium stock."""
    else:
        vehicle_context = """RHD COUNTRY RULES:
- This is a RIGHT-HAND DRIVE market — perfect fit for UK cars.
- We regularly source: Range Rover, Bentley, Rolls-Royce, Porsche, Mercedes-Benz, BMW.
- Emphasise: UK specification, low mileage, competitive pricing, RHD availability."""

    drive = "LHD" if is_lhd else "RHD"
    stock_block = _get_stock_block(drive)
    stock_context = f"\nCURRENT AVAILABLE STOCK TO MENTION IN THE EMAIL:\n{stock_block}\n" if stock_block else ""

    prompt = f"""You are a senior export sales executive at UK Car Source, a UK prestige vehicle exporter.

Write a cold outreach email and WhatsApp message to this potential buyer.

{vehicle_context}
{stock_context}
Buyer info:
{json.dumps(buyer, indent=2, default=str)[:2000]}

Rules:
- Email: professional, concise, 150-200 words. No fluff. Specific to their country and what we can actually offer them.
- WhatsApp: casual, under 60 words, one emoji max.
- Never promise specific stock you don't have.
- Never mention RHD brands to LHD markets.
- Always describe UK Car Source as a company that SOURCES AND EXPORTS vehicles — not just a dealer or broker.
- Sign off as "Jason | UK Car Source | sales@ukcarsource.com | www.ukcarsource.com"

Respond ONLY with JSON:
{{
  "email_subject": "...",
  "email_body": "...",
  "whatsapp": "..."
}}
"""
    try:
        message = _client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        data["source"] = "ai"
        return data
    except Exception:
        subj, body = _fallback_intro_email(buyer)
        return {"email_subject": subj, "email_body": body, "whatsapp": _fallback_intro_whatsapp(buyer), "source": "template_fallback"}


async def generate_offer_messages(buyer: dict, offer: dict) -> dict:
    """Return {'email_subject', 'email_body', 'whatsapp'} for a specific vehicle offer."""
    client = _client()
    if not client:
        subj, body = _fallback_offer_email(buyer, offer)
        return {"email_subject": subj, "email_body": body, "whatsapp": _fallback_offer_whatsapp(buyer, offer), "source": "template"}

    prompt = f"""You are a senior export sales executive at UK Car Source.

Write a vehicle offer email and WhatsApp message to this buyer for this specific vehicle.

Buyer:
{json.dumps(buyer, indent=2, default=str)[:1000]}

Vehicle:
{json.dumps(offer, indent=2, default=str)[:500]}

Rules:
- Email: 100-150 words, include key specs, invite questions, no pressure.
- WhatsApp: under 50 words, spark curiosity.
- Sign off as "Jason | UK Car Source | sales@ukcarsource.com | www.ukcarsource.com"

Respond ONLY with JSON:
{{
  "email_subject": "...",
  "email_body": "...",
  "whatsapp": "..."
}}
"""
    try:
        message = _client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        data["source"] = "ai"
        return data
    except Exception:
        subj, body = _fallback_offer_email(buyer, offer)
        return {"email_subject": subj, "email_body": body, "whatsapp": _fallback_offer_whatsapp(buyer, offer), "source": "template_fallback"}
