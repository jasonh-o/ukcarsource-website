"""Detect duplicate buyers by website, email, phone, or fuzzy name match."""
from __future__ import annotations
import re
from typing import Optional
import tldextract
from rapidfuzz import fuzz
from sqlalchemy.orm import Session
from app.models import Buyer


def _normalise_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = url.lower().strip().rstrip("/")
    for prefix in ("https://www.", "http://www.", "https://", "http://"):
        if url.startswith(prefix):
            url = url[len(prefix):]
            break
    ext = tldextract.extract(url)
    if ext.domain and ext.suffix:
        return f"{ext.domain}.{ext.suffix}"
    return url


def _normalise_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    return re.sub(r"[^\d+]", "", phone)


def find_duplicate(db: Session, candidate: dict) -> Optional[Buyer]:
    """
    Return existing Buyer if candidate is a duplicate, else None.
    Checks: website domain, email, phone, fuzzy company name.
    """
    # 1. Website domain match
    domain = _normalise_url(candidate.get("website"))
    if domain:
        for buyer in db.query(Buyer).filter(Buyer.website.isnot(None)).all():
            if _normalise_url(buyer.website) == domain:
                return buyer

    # 2. Email match
    email = (candidate.get("email") or "").strip().lower()
    if email:
        existing = db.query(Buyer).filter(Buyer.email == email).first()
        if existing:
            return existing

    # 3. Phone match
    phone = _normalise_phone(candidate.get("phone"))
    if phone and len(phone) >= 7:
        for buyer in db.query(Buyer).filter(Buyer.phone.isnot(None)).all():
            if _normalise_phone(buyer.phone) == phone:
                return buyer

    # 4. Fuzzy company name (same country, high similarity)
    name = candidate.get("company_name", "")
    country = candidate.get("country", "")
    if name and country:
        same_country = db.query(Buyer).filter(Buyer.country == country).all()
        for buyer in same_country:
            ratio = fuzz.token_sort_ratio(name.lower(), buyer.company_name.lower())
            if ratio >= 88:
                return buyer

    return None
