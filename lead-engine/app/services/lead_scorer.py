"""Rule-based lead scoring engine. No AI dependency."""
import json
from pathlib import Path

CONFIG = Path(__file__).resolve().parent.parent.parent / "config"


def _load_rules():
    scoring = json.loads((CONFIG / "scoring_rules.json").read_text())
    brands = json.loads((CONFIG / "brand_rules.json").read_text())
    countries = json.loads((CONFIG / "country_rules.json").read_text())
    return scoring, brands, countries


def is_grey_market(buyer_data: dict, grey_keywords: list) -> bool:
    """Check if buyer shows signals of being an importer/exporter/trader."""
    text = " ".join([
        (buyer_data.get("company_name") or ""),
        (buyer_data.get("notes") or ""),
        (buyer_data.get("description") or ""),
        (buyer_data.get("buyer_type") or ""),
    ]).lower()
    return any(kw in text for kw in grey_keywords)


def is_regular_dealer(buyer_data: dict) -> bool:
    """Return True if buyer appears to be a regular franchise/retail dealer only."""
    buyer_type = (buyer_data.get("buyer_type") or "").lower()
    if buyer_type in ("luxury dealer", "mainstream dealer"):
        # Only penalise if NO import/export signals
        text = " ".join([
            (buyer_data.get("company_name") or ""),
            (buyer_data.get("notes") or ""),
        ]).lower()
        import_signals = ["import", "export", "wholesale", "trade", "sourcing", "grey", "gray", "parallel"]
        return not any(s in text for s in import_signals)
    return False


def score_buyer(buyer_data: dict) -> tuple:
    """
    Score a buyer 0-100.
    Only importers, exporters, grey market traders and wholesalers are valued.
    Regular dealers score very low.
    """
    scoring, brands, countries = _load_rules()
    factors = scoring["factors"]
    penalties = scoring["penalties"]
    multipliers = scoring["buyer_type_multipliers"]
    rhd_countries = scoring.get("rhd_countries", [])
    no_rr_countries = scoring.get("countries_without_official_rr_dealer", [])
    grey_keywords = scoring.get("grey_market_keywords", [])

    score = scoring["base_score"]
    reasons = []

    def add(val, reason):
        nonlocal score
        score += val
        reasons.append(reason)

    buyer_type = (buyer_data.get("buyer_type") or "unknown").lower()
    country = buyer_data.get("country", "")
    country_data = countries.get(country, {})
    buyer_brands = buyer_data.get("brands_sold") or []
    is_lhd = country_data.get("lhd_allowed", False) and not country_data.get("rhd_allowed", True)

    # ── Regular dealer penalty — applied first ─────────────────────────────────
    if is_regular_dealer(buyer_data):
        add(penalties["regular_dealer"], "Regular dealer — not our target buyer")

    # ── Importer / Exporter ────────────────────────────────────────────────────
    if buyer_type == "importer" or buyer_data.get("has_import_signal"):
        add(factors["imports_vehicles"], "Importer — primary target")
    if buyer_type == "exporter":
        add(factors["exports_vehicles"], "Exporter — primary target")

    # ── Grey market / trader signals ───────────────────────────────────────────
    if is_grey_market(buyer_data, grey_keywords):
        add(factors["grey_market_signal"], "Grey market / trader signals detected")

    # ── RHD country ────────────────────────────────────────────────────────────
    if country in rhd_countries:
        add(factors["rhd_country"], f"RHD country ({country})")
    elif is_lhd:
        add(penalties["lhd_only_country"], f"LHD only ({country})")

    # ── No official RR dealer ──────────────────────────────────────────────────
    if country in no_rr_countries:
        add(factors["no_official_rr_dealer"], f"No official RR dealer in {country}")

    # ── Contact details ────────────────────────────────────────────────────────
    has_email = bool(buyer_data.get("email"))
    has_whatsapp = bool(buyer_data.get("whatsapp"))
    if has_email:
        add(factors["has_direct_email"], "Has direct email")
    if has_whatsapp:
        add(factors["has_whatsapp"], "Has WhatsApp")
    if not has_email and not has_whatsapp:
        add(penalties["no_email_no_whatsapp"], "No email or WhatsApp")

    # ── UK / luxury brands ────────────────────────────────────────────────────
    sells_uk = any(b.lower() in [x.lower() for x in brands["uk_strong_brands"]] for b in buyer_brands)
    if sells_uk:
        add(factors["sells_uk_vehicles"], "Stocks UK-origin brands")

    luxury_hits = sum(1 for b in buyer_brands if b in brands["luxury_brands"])
    if luxury_hits > 0:
        add(factors["sells_luxury_brands"], f"Sells luxury brands")

    # Priority model bonus
    priority_models = [m.lower() for m in brands.get("priority_models", [])]
    description = (buyer_data.get("notes") or "") + " " + (buyer_data.get("description") or "")
    if any(m in description.lower() for m in priority_models):
        add(factors["sells_priority_models"], "Stocks priority models")

    # ── Basic signals ──────────────────────────────────────────────────────────
    if buyer_data.get("website"):
        add(factors["has_website"], "Has website")
    else:
        add(penalties["no_website"], "No website")
    if buyer_data.get("phone"):
        add(factors["has_phone"], "Has phone")

    # ── AI confidence ──────────────────────────────────────────────────────────
    ai_conf = buyer_data.get("ai_confidence_score", 0)
    if ai_conf >= 0.75:
        add(factors["ai_confidence_high"], "High AI confidence")
    elif ai_conf >= 0.5:
        add(factors["ai_confidence_medium"], "Medium AI confidence")

    # ── Country luxury market bonus ────────────────────────────────────────────
    lux_score = country_data.get("luxury_market_score", 0)
    if lux_score >= 80:
        add(factors["country_luxury_market_bonus"], f"High luxury market")

    # ── Buyer type multiplier ──────────────────────────────────────────────────
    multiplier = multipliers.get(buyer_type, multipliers.get("unknown", 0.7))
    score = score * multiplier

    score = max(0.0, min(float(scoring["max_score"]), round(score, 1)))
    return score, reasons
