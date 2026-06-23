"""Tests for the rule-based lead scoring engine."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.lead_scorer import score_buyer


def _base():
    return {
        "company_name": "Test Motors",
        "country": "UAE",
        "email": None,
        "phone": None,
        "whatsapp": None,
        "website": None,
        "brands_sold": [],
        "buyer_type": "",
        "ai_confidence_score": 0.0,
        "has_contact_form": False,
        "has_import_signal": False,
        "notes": "",
        "description": "",
    }


def test_base_score_nonzero():
    score, _ = score_buyer(_base())
    assert score > 0


def test_whatsapp_increases_score():
    buyer = _base()
    score_without, _ = score_buyer(buyer)
    buyer["whatsapp"] = "+971501234567"
    score_with, _ = score_buyer(buyer)
    assert score_with > score_without


def test_luxury_brand_increases_score():
    buyer = _base()
    buyer["brands_sold"] = ["Toyota"]
    low_score, _ = score_buyer(buyer)
    buyer["brands_sold"] = ["Rolls-Royce", "Bentley"]
    high_score, _ = score_buyer(buyer)
    assert high_score > low_score


def test_importer_buyer_type_multiplier():
    buyer = _base()
    buyer["buyer_type"] = "mainstream dealer"
    low_score, _ = score_buyer(buyer)
    buyer["buyer_type"] = "luxury dealer"
    high_score, _ = score_buyer(buyer)
    assert high_score > low_score


def test_high_ai_confidence_bonus():
    buyer = _base()
    buyer["ai_confidence_score"] = 0.0
    score_low, _ = score_buyer(buyer)
    buyer["ai_confidence_score"] = 0.9
    score_high, _ = score_buyer(buyer)
    assert score_high > score_low


def test_score_capped_at_100():
    buyer = {
        "company_name": "Prestige Motors Dubai",
        "country": "UAE",
        "email": "info@test.com",
        "phone": "+97141234567",
        "whatsapp": "+97150123456",
        "website": "https://example.com",
        "brands_sold": ["Rolls-Royce", "Bentley", "Porsche", "Range Rover"],
        "buyer_type": "luxury dealer",
        "ai_confidence_score": 0.95,
        "has_contact_form": True,
        "has_import_signal": True,
        "notes": "Sells Cullinan and Phantom",
        "description": "Cullinan Phantom Bentayga Flying Spur",
    }
    score, _ = score_buyer(buyer)
    assert score <= 100


def test_no_website_penalty():
    buyer = _base()
    buyer["email"] = "test@test.com"
    buyer["phone"] = "+1234567"
    score_with_website, _ = score_buyer({**buyer, "website": "https://example.com"})
    score_without, _ = score_buyer(buyer)
    assert score_with_website > score_without


def test_reasons_list_nonempty_for_good_buyer():
    buyer = _base()
    buyer["whatsapp"] = "+971501234567"
    buyer["brands_sold"] = ["Bentley"]
    buyer["has_import_signal"] = True
    _, reasons = score_buyer(buyer)
    assert len(reasons) > 0


def test_uk_brands_give_bonus():
    buyer = _base()
    buyer["brands_sold"] = ["Toyota", "Honda"]
    score_mainstream, _ = score_buyer(buyer)
    buyer["brands_sold"] = ["Range Rover", "Bentley"]
    score_uk, _ = score_buyer(buyer)
    assert score_uk > score_mainstream
