"""Match a vehicle offer to likely buyers."""
import json
from pathlib import Path
from sqlalchemy.orm import Session
from app.models import Buyer, Offer, OfferMatch

CONFIG = Path(__file__).resolve().parent.parent.parent / "config"


def _brand_rules():
    return json.loads((CONFIG / "brand_rules.json").read_text())


def _country_rules():
    return json.loads((CONFIG / "country_rules.json").read_text())


def match_offer_to_buyers(db: Session, offer: Offer, top_n: int = 20) -> list[dict]:
    """Score all buyers against an offer and return top N matches."""
    brand_data = _brand_rules()
    country_data = _country_rules()

    make = (offer.make or "").lower()
    model = (offer.model or "").lower()
    year = offer.year or 0

    results = []
    for buyer in db.query(Buyer).filter(Buyer.status != "rejected").all():
        score = 0.0
        reasons = []

        # Brand match
        buyer_brands_lower = [b.lower() for b in (buyer.brands_sold or [])]
        for brand in brand_data["luxury_brands"] + brand_data["premium_brands"]:
            if brand.lower() == make and brand.lower() in buyer_brands_lower:
                weight = brand_data["scoring"].get(brand, 5)
                score += weight
                reasons.append(f"Sells {brand}")
                break

        # Country RHD/LHD check
        c_rules = country_data.get(buyer.country or "", {})
        if c_rules:
            # UK cars are RHD — check if country accepts them
            if c_rules.get("rhd_allowed"):
                score += 10
                reasons.append(f"{buyer.country} accepts RHD")
            elif c_rules.get("lhd_allowed") and not c_rules.get("rhd_allowed"):
                score -= 20
                reasons.append(f"{buyer.country} is LHD only — poor fit for UK cars")

            # Age restriction
            max_age = c_rules.get("max_age_years")
            if max_age and year:
                import datetime
                current_year = datetime.datetime.utcnow().year
                age = current_year - year
                if age > max_age:
                    score -= 15
                    reasons.append(f"Vehicle too old for {buyer.country} ({age} yrs, max {max_age})")

            # Luxury market score bonus
            lux = c_rules.get("luxury_market_score", 0)
            if lux >= 80:
                score += 8
                reasons.append(f"High-luxury market ({buyer.country})")
            elif lux >= 60:
                score += 4

        # Buyer's own lead score influence
        score += buyer.lead_score * 0.2

        # Status bonus
        if buyer.status == "qualified":
            score += 10
            reasons.append("Already qualified")
        if buyer.positive_response:
            score += 15
            reasons.append("Previous positive response")

        if score <= 0:
            continue

        results.append({"buyer": buyer, "score": round(score, 1), "reasons": reasons})

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


def save_matches(db: Session, offer: Offer, matches: list[dict]):
    """Persist match results to offer_matches table."""
    db.query(OfferMatch).filter(OfferMatch.offer_id == offer.id).delete()
    for m in matches:
        db.add(OfferMatch(
            offer_id=offer.id,
            buyer_id=m["buyer"].id,
            match_score=m["score"],
            match_reasons=m["reasons"],
        ))
    db.commit()
