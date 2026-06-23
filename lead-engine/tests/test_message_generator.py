"""Tests for message generation — verifies fallback templates work without AI."""
import sys
from pathlib import Path
import asyncio
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.message_generator import (
    generate_intro_messages,
    generate_offer_messages,
    _fallback_intro_email,
    _fallback_intro_whatsapp,
    _fallback_offer_email,
    _fallback_offer_whatsapp,
)

BUYER = {
    "company_name": "Premier Auto Group",
    "contact_person": "Ahmed Al-Rashid",
    "country": "UAE",
    "brands_sold": ["Range Rover", "Bentley"],
    "email": "info@premierauto.ae",
    "whatsapp": "+971501234567",
}

OFFER = {
    "make": "Range Rover",
    "model": "Autobiography",
    "year": 2022,
    "mileage": 12000,
    "price_gbp": 95000,
    "colour": "Santorini Black",
    "condition": "Used",
    "description": "Full spec, one owner, FSH.",
}


# ── Fallback template tests (no API key needed) ──────────────────────────────

def test_fallback_intro_email_contains_company():
    subject, body = _fallback_intro_email(BUYER)
    assert "Premier Auto Group" in body or "Ahmed" in body


def test_fallback_intro_email_has_subject():
    subject, body = _fallback_intro_email(BUYER)
    assert len(subject) > 5
    assert "UK" in subject or "Premier" in subject


def test_fallback_intro_email_contains_ukcarsource():
    _, body = _fallback_intro_email(BUYER)
    assert "UK Car Source" in body


def test_fallback_whatsapp_is_short():
    msg = _fallback_intro_whatsapp(BUYER)
    assert len(msg) < 500
    assert "UK Car Source" in msg


def test_fallback_offer_email_contains_make_model():
    subject, body = _fallback_offer_email(BUYER, OFFER)
    assert "Range Rover" in body
    assert "Autobiography" in body


def test_fallback_offer_email_contains_price():
    _, body = _fallback_offer_email(BUYER, OFFER)
    assert "95,000" in body or "95000" in body


def test_fallback_offer_whatsapp_is_brief():
    msg = _fallback_offer_whatsapp(BUYER, OFFER)
    assert "Range Rover" in msg
    assert len(msg) < 300


# ── Async generation with no API key → should return template fallback ────────

def test_generate_intro_messages_without_api_key():
    async def run():
        import os
        os.environ.pop("ANTHROPIC_API_KEY", None)
        result = await generate_intro_messages(BUYER)
        return result
    result = asyncio.get_event_loop().run_until_complete(run())
    assert "email_subject" in result
    assert "email_body" in result
    assert "whatsapp" in result
    assert result["source"] in ("template", "template_fallback")


def test_generate_offer_messages_without_api_key():
    async def run():
        import os
        os.environ.pop("ANTHROPIC_API_KEY", None)
        result = await generate_offer_messages(BUYER, OFFER)
        return result
    result = asyncio.get_event_loop().run_until_complete(run())
    assert "email_body" in result
    assert "whatsapp" in result
    assert result["source"] in ("template", "template_fallback")


def test_generated_email_body_not_empty():
    async def run():
        import os
        os.environ.pop("ANTHROPIC_API_KEY", None)
        result = await generate_intro_messages(BUYER)
        return result
    result = asyncio.get_event_loop().run_until_complete(run())
    assert len(result["email_body"]) > 50


def test_generated_whatsapp_not_empty():
    async def run():
        import os
        os.environ.pop("ANTHROPIC_API_KEY", None)
        result = await generate_intro_messages(BUYER)
        return result
    result = asyncio.get_event_loop().run_until_complete(run())
    assert len(result["whatsapp"]) > 10
