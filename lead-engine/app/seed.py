"""Seed country rules and config from JSON files into the database."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config"

sys.path.insert(0, str(ROOT))

from app.database import SessionLocal, init_db
from app.models import CountryRule


def seed_country_rules(db):
    data = json.loads((CONFIG / "country_rules.json").read_text())
    added = 0
    for country, rule in data.items():
        existing = db.query(CountryRule).filter_by(country=country).first()
        if existing:
            continue
        db.add(CountryRule(
            country=country,
            rhd_allowed=rule.get("rhd_allowed", True),
            lhd_allowed=rule.get("lhd_allowed", False),
            rhd_preferred=rule.get("rhd_preferred", True),
            max_age_years=rule.get("max_age_years"),
            luxury_market_score=rule.get("luxury_market_score", 50),
            preferred_payment=rule.get("preferred_payment", ["TT"]),
            tt_common=rule.get("tt_common", True),
            lc_common=rule.get("lc_common", False),
            import_restrictions=rule.get("import_restrictions"),
            shipping_notes=rule.get("shipping_notes"),
            currency=rule.get("currency"),
            vat_rate=rule.get("vat_rate"),
            active=rule.get("active", True),
        ))
        added += 1
    db.commit()
    print(f"Seeded {added} country rules.")


def main():
    print("Initialising database tables...")
    init_db()
    db = SessionLocal()
    try:
        seed_country_rules(db)
    finally:
        db.close()
    print("Done.")


if __name__ == "__main__":
    main()
