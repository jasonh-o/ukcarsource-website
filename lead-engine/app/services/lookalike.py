"""Analyse successful buyers to surface lookalike prospects."""
from collections import Counter
from sqlalchemy.orm import Session
from app.models import Buyer


def _successful_buyers(db: Session) -> list[Buyer]:
    return db.query(Buyer).filter(
        (Buyer.purchased == True) | (Buyer.positive_response == True)  # noqa: E712
    ).all()


def get_lookalike_profile(db: Session) -> dict:
    """Return the common attributes of successful buyers."""
    successful = _successful_buyers(db)
    if not successful:
        return {"message": "No successful buyers yet. Profile will build over time."}

    countries = Counter(b.country for b in successful if b.country)
    brands = Counter(
        brand
        for b in successful
        for brand in (b.brands_sold or [])
    )
    payment_methods = Counter(b.preferred_payment for b in successful if b.preferred_payment)
    buyer_types = Counter(b.buyer_type for b in successful if b.buyer_type)

    return {
        "total_successful": len(successful),
        "top_countries": countries.most_common(5),
        "top_brands": brands.most_common(10),
        "top_payment_methods": payment_methods.most_common(3),
        "top_buyer_types": buyer_types.most_common(3),
    }


def score_lookalike_similarity(buyer: Buyer, profile: dict) -> float:
    """Return 0-100 similarity score between a buyer and the lookalike profile."""
    if not profile or "top_countries" not in profile:
        return 0.0

    score = 0.0
    top_countries = [c for c, _ in profile.get("top_countries", [])]
    top_brands = [b for b, _ in profile.get("top_brands", [])]
    top_types = [t for t, _ in profile.get("top_buyer_types", [])]

    if buyer.country in top_countries[:2]:
        score += 30
    elif buyer.country in top_countries:
        score += 15

    buyer_brands = buyer.brands_sold or []
    brand_overlap = len(set(buyer_brands) & set(top_brands))
    score += min(30, brand_overlap * 10)

    if buyer.buyer_type in top_types[:1]:
        score += 20
    elif buyer.buyer_type in top_types:
        score += 10

    if buyer.preferred_payment:
        top_payment = [p for p, _ in profile.get("top_payment_methods", [])]
        if buyer.preferred_payment in top_payment:
            score += 10

    return min(100.0, round(score, 1))


def get_lookalike_prospects(db: Session, top_n: int = 20) -> list[dict]:
    """Return non-successful buyers ranked by similarity to successful buyers."""
    profile = get_lookalike_profile(db)
    if "message" in profile:
        return []

    prospects = db.query(Buyer).filter(
        Buyer.purchased == False,  # noqa: E712
        Buyer.status != "rejected",
    ).all()

    scored = [
        {"buyer": b, "lookalike_score": score_lookalike_similarity(b, profile)}
        for b in prospects
    ]
    scored.sort(key=lambda x: x["lookalike_score"], reverse=True)
    return scored[:top_n]
