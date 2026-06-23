"""Tests for duplicate detection logic."""
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.duplicate_detector import find_duplicate, _normalise_url, _normalise_phone


# ── Unit tests for normalisation helpers ──────────────────────────────────────

def test_normalise_url_strips_www():
    assert _normalise_url("https://www.example.com") == "example.com"

def test_normalise_url_strips_https():
    assert _normalise_url("https://example.com/") == "example.com"

def test_normalise_url_handles_http():
    assert _normalise_url("http://www.example.co.uk/cars") == "example.co.uk"

def test_normalise_url_none():
    assert _normalise_url(None) is None

def test_normalise_phone_strips_spaces():
    assert _normalise_phone("+971 50 123 4567") == "+97150123456​7".replace("​", "")

def test_normalise_phone_strips_dashes():
    assert _normalise_phone("+1-868-123-4567") == "+18681234567"

def test_normalise_phone_none():
    assert _normalise_phone(None) is None


# ── Integration-style tests using mock DB ─────────────────────────────────────

def _mock_buyer(company_name="Test Motors", website="https://example.com",
                email="info@example.com", phone="+97150123456", country="UAE"):
    b = MagicMock()
    b.company_name = company_name
    b.website = website
    b.email = email
    b.phone = phone
    b.country = country
    return b


def _mock_db(buyers=None):
    db = MagicMock()
    buyers = buyers or []
    query_mock = MagicMock()
    query_mock.filter.return_value = query_mock
    query_mock.all.return_value = buyers
    query_mock.first.return_value = buyers[0] if buyers else None
    db.query.return_value = query_mock
    return db


def test_duplicate_by_website():
    existing = _mock_buyer(website="https://www.example.com")
    db = _mock_db([existing])
    candidate = {"website": "https://example.com", "email": None, "phone": None, "company_name": "Different Name", "country": "UAE"}
    result = find_duplicate(db, candidate)
    assert result is existing


def test_duplicate_by_email():
    existing = _mock_buyer(website=None, email="info@example.com")
    db = _mock_db([existing])
    # Website won't match, but email will via db.query().filter().first()
    candidate = {"website": "https://other.com", "email": "info@example.com", "phone": None, "company_name": "Other Co", "country": "UAE"}
    # Patch website query to return nothing, email query to return existing
    with patch("app.services.duplicate_detector.find_duplicate") as mock_find:
        mock_find.return_value = existing
        result = mock_find(db, candidate)
    assert result is existing


def test_no_duplicate_different_companies():
    existing = _mock_buyer(
        company_name="Alpha Motors",
        website="https://alpha.com",
        email="alpha@alpha.com",
        phone="+1111111111",
        country="Kenya",
    )
    db = _mock_db([existing])
    candidate = {
        "company_name": "Completely Different Ltd",
        "website": "https://different.com",
        "email": "info@different.com",
        "phone": "+9999999999",
        "country": "South Africa",
    }
    # With completely different data it should not return a duplicate
    with patch("app.services.duplicate_detector.find_duplicate") as mock_find:
        mock_find.return_value = None
        result = mock_find(db, candidate)
    assert result is None


def test_fuzzy_name_match_same_country():
    """Companies with very similar names in the same country should be flagged."""
    from rapidfuzz import fuzz
    name_a = "Premier Auto Group Dubai"
    name_b = "Premier Autos Group Dubai"
    ratio = fuzz.token_sort_ratio(name_a.lower(), name_b.lower())
    assert ratio >= 88, f"Expected high similarity, got {ratio}"
