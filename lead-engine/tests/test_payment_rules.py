"""Tests for country payment rule lookups."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.payment_rules import (
    get_payment_method_for_country,
    get_payment_method_details,
    payment_terms_for_buyer,
    get_all_methods,
)


def test_uae_defaults_to_tt():
    assert get_payment_method_for_country("UAE") == "TT"


def test_sri_lanka_defaults_to_lc():
    assert get_payment_method_for_country("Sri Lanka") == "LC"


def test_indonesia_defaults_to_lc():
    assert get_payment_method_for_country("Indonesia") == "LC"


def test_cyprus_defaults_to_swift():
    assert get_payment_method_for_country("Cyprus") == "SWIFT"


def test_unknown_country_defaults_to_tt():
    assert get_payment_method_for_country("Atlantis") == "TT"


def test_tt_details_have_deposit():
    details = get_payment_method_details("TT")
    assert details["deposit_percent"] == 30
    assert "balance_trigger" in details


def test_lc_is_low_risk():
    details = get_payment_method_details("LC")
    assert details["risk_level"] == "low"


def test_payment_terms_for_buyer_returns_full_dict():
    terms = payment_terms_for_buyer("Kenya")
    assert "method" in terms
    assert "deposit_percent" in terms
    assert "balance_trigger" in terms
    assert "notes" in terms


def test_all_methods_returns_dict():
    methods = get_all_methods()
    assert "TT" in methods
    assert "LC" in methods
    assert "ESCROW" in methods


def test_south_africa_defaults_to_tt():
    assert get_payment_method_for_country("South Africa") == "TT"


def test_singapore_defaults_to_tt():
    assert get_payment_method_for_country("Singapore") == "TT"
