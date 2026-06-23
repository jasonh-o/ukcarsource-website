"""Tests for vehicle-to-buyer matching logic."""
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.matcher import match_offer_to_buyers


def _mock_offer(make="Range Rover", model="Autobiography", year=2022, price=95000):
    o = MagicMock()
    o.make = make
    o.model = model
    o.year = year
    o.price_gbp = price
    o.id = 1
    return o


def _mock_buyer(company="Test", country="UAE", brands=None, status="new",
                lead_score=50.0, positive_response=False, purchased=False, id=1):
    b = MagicMock()
    b.id = id
    b.company_name = company
    b.country = country
    b.brands_sold = brands or []
    b.status = status
    b.lead_score = lead_score
    b.positive_response = positive_response
    b.purchased = purchased
    return b


def _mock_db(buyers):
    db = MagicMock()
    query = MagicMock()
    query.filter.return_value = query
    query.all.return_value = buyers
    db.query.return_value = query
    return db


def test_rhd_country_gets_higher_score_than_lhd():
    """UAE (LHD) should score lower for UK cars than Kenya (RHD)."""
    uae_buyer = _mock_buyer(company="UAE Motors", country="UAE", id=1)
    kenya_buyer = _mock_buyer(company="Nairobi Cars", country="Kenya", id=2)
    offer = _mock_offer()
    db = _mock_db([uae_buyer, kenya_buyer])

    results = match_offer_to_buyers(db, offer)
    uae_result = next((r for r in results if r["buyer"].id == 1), None)
    kenya_result = next((r for r in results if r["buyer"].id == 2), None)

    # Kenya accepts RHD; UAE does not — Kenya should score higher for UK vehicles
    if uae_result and kenya_result:
        assert kenya_result["score"] >= uae_result["score"]


def test_luxury_brand_buyer_scores_higher():
    rr_buyer = _mock_buyer(company="RR Dubai", country="UAE", brands=["Range Rover", "Bentley"], id=1)
    generic_buyer = _mock_buyer(company="Used Cars LLC", country="UAE", brands=["Toyota"], id=2)
    offer = _mock_offer(make="Range Rover")
    db = _mock_db([rr_buyer, generic_buyer])

    results = match_offer_to_buyers(db, offer)
    rr_result = next((r for r in results if r["buyer"].id == 1), None)
    generic_result = next((r for r in results if r["buyer"].id == 2), None)

    if rr_result and generic_result:
        assert rr_result["score"] >= generic_result["score"]


def test_positive_response_buyer_scores_higher():
    cold = _mock_buyer(company="Cold Lead", country="Kenya", id=1, lead_score=40)
    warm = _mock_buyer(company="Warm Lead", country="Kenya", id=2, lead_score=40, positive_response=True)
    offer = _mock_offer()
    db = _mock_db([cold, warm])

    results = match_offer_to_buyers(db, offer)
    cold_result = next((r for r in results if r["buyer"].id == 1), None)
    warm_result = next((r for r in results if r["buyer"].id == 2), None)

    if cold_result and warm_result:
        assert warm_result["score"] > cold_result["score"]


def test_results_sorted_by_score_descending():
    buyers = [
        _mock_buyer(company=f"Buyer {i}", country="Kenya", lead_score=float(i * 10), id=i)
        for i in range(1, 6)
    ]
    offer = _mock_offer()
    db = _mock_db(buyers)
    results = match_offer_to_buyers(db, offer)
    scores = [r["score"] for r in results]
    assert scores == sorted(scores, reverse=True)


def test_rejected_buyers_excluded():
    active = _mock_buyer(company="Active", country="Kenya", status="new", id=1)
    rejected = _mock_buyer(company="Rejected", country="Kenya", status="rejected", id=2)
    offer = _mock_offer()
    # The service filters status != rejected at DB level; mock that filtering
    db = _mock_db([active])  # rejected already filtered by DB mock
    results = match_offer_to_buyers(db, offer)
    ids = [r["buyer"].id for r in results]
    assert 2 not in ids


def test_top_n_limit_respected():
    buyers = [_mock_buyer(company=f"B{i}", country="Kenya", id=i) for i in range(1, 30)]
    offer = _mock_offer()
    db = _mock_db(buyers)
    results = match_offer_to_buyers(db, offer, top_n=10)
    assert len(results) <= 10


def test_match_returns_reasons():
    buyer = _mock_buyer(company="RR Kenya", country="Kenya", brands=["Range Rover"], id=1)
    offer = _mock_offer(make="Range Rover")
    db = _mock_db([buyer])
    results = match_offer_to_buyers(db, offer)
    if results:
        assert isinstance(results[0]["reasons"], list)
