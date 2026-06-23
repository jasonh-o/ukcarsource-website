"""Daily buyer discovery engine — search → dedupe → enrich → score → queue."""
from __future__ import annotations
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models import Buyer, DiscoveryRun, OutreachMessage
from app.services.search_provider import google_search
from app.services.website_intel import analyse_website
from app.services.lead_scorer import score_buyer
from app.services.duplicate_detector import find_duplicate
from app.services.ai_qualification import qualify_buyer
from app.services.message_generator import generate_intro_messages
from app.services.exclusion_filter import should_exclude

CONFIG = Path(__file__).resolve().parent.parent.parent / "config"


def _search_targets():
    return json.loads((CONFIG / "search_targets.json").read_text())


def _max_results() -> int:
    import os
    return int(os.getenv("DISCOVERY_MAX_RESULTS_PER_QUERY", "10"))


def purge_rejected_buyers(db: Session) -> int:
    """Delete all buyers marked as rejected, along with their messages. Returns count removed."""
    rejected = db.query(Buyer).filter(Buyer.status == "rejected").all()
    count = 0
    for buyer in rejected:
        db.query(OutreachMessage).filter(OutreachMessage.buyer_id == buyer.id).delete()
        db.delete(buyer)
        count += 1
    db.commit()
    return count


async def run_discovery(db: Session, countries: Optional[List[str]] = None) -> DiscoveryRun:
    targets = _search_targets()
    queries = targets["search_queries"]
    all_countries = countries or targets["target_countries"]

    run = DiscoveryRun(started_at=datetime.utcnow(), status="running", log=[])
    db.add(run)
    db.commit()
    db.refresh(run)

    log: list[str] = []
    queries_run = 0
    results_found = 0
    new_buyers = 0
    duplicates = 0

    def _log(msg: str):
        log.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] {msg}")

    # Purge rejected buyers before starting
    purged = purge_rejected_buyers(db)
    if purged:
        _log(f"🗑 Purged {purged} rejected buyers before run")

    try:
        for country in all_countries:
            for query in queries:
                full_query = f"{query} {country}"
                _log(f"Searching: {full_query}")
                resp = await google_search(full_query, num=_max_results())
                queries_run += 1

                if resp.error:
                    _log(f"  ⚠ Search error: {resp.error}")
                    continue

                _log(f"  Found {len(resp.results)} results")
                results_found += len(resp.results)

                for result in resp.results:
                    # Build candidate from search result
                    candidate = {
                        "company_name": result.title,
                        "website": result.link,
                        "country": country,
                        "source_url": result.link,
                        "notes": result.snippet,
                    }

                    # Exclusion check (franchise/official dealers)
                    excluded, reason = should_exclude(candidate)
                    if excluded:
                        _log(f"  ✗ Excluded: {result.title} — {reason}")
                        continue

                    # Dedupe check
                    dup = find_duplicate(db, candidate)
                    if dup:
                        _log(f"  ↷ Duplicate: {result.title}")
                        duplicates += 1
                        continue

                    # Website analysis
                    _log(f"  → Analysing: {result.link}")
                    intel = await analyse_website(result.link)

                    if intel.error:
                        _log(f"    ⚠ Site error: {intel.error}")

                    # AI qualification
                    site_text = f"{result.title}\n{result.snippet}\n{intel.description or ''}"
                    qual = await qualify_buyer(result.title, site_text, country)

                    # Build buyer dict for scoring
                    buyer_data = {
                        **candidate,
                        "email": intel.emails[0] if intel.emails else None,
                        "phone": intel.phones[0] if intel.phones else None,
                        "whatsapp": intel.whatsapp_numbers[0] if intel.whatsapp_numbers else None,
                        "brands_sold": intel.brands_detected or qual.brands_detected,
                        "vehicle_segment": intel.vehicle_segment or qual.vehicle_segment,
                        "rhd_preference": ("rhd" if intel.rhd_signals else "lhd" if intel.lhd_signals else qual.rhd_preference),
                        "sells_wholesale": intel.sells_wholesale,
                        "sells_retail": intel.sells_retail,
                        "linkedin_url": intel.linkedin_url,
                        "facebook_url": intel.facebook_url,
                        "instagram_url": intel.instagram_url,
                        "has_contact_form": intel.has_contact_form,
                        "buyer_type": qual.buyer_type,
                        "ai_confidence_score": qual.confidence,
                        "has_import_signal": qual.import_signal,
                    }

                    lead_score, _ = score_buyer(buyer_data)
                    lead_score = min(100, lead_score + qual.recommended_score_boost)

                    # Persist buyer
                    buyer = Buyer(
                        company_name=result.title[:255],
                        website=result.link[:512],
                        country=country,
                        city=None,
                        email=buyer_data["email"],
                        phone=buyer_data["phone"],
                        whatsapp=buyer_data["whatsapp"],
                        brands_sold=buyer_data["brands_sold"],
                        vehicle_segment=buyer_data["vehicle_segment"],
                        rhd_preference=buyer_data["rhd_preference"],
                        sells_wholesale=intel.sells_wholesale,
                        sells_retail=intel.sells_retail,
                        linkedin_url=intel.linkedin_url,
                        facebook_url=intel.facebook_url,
                        instagram_url=intel.instagram_url,
                        has_contact_form=intel.has_contact_form,
                        buyer_type=qual.buyer_type,
                        ai_confidence_score=qual.confidence,
                        ai_classification=qual.buyer_type,
                        lead_score=lead_score,
                        source_url=result.link[:512],
                        status="new",
                        notes=result.snippet,
                    )
                    db.add(buyer)
                    db.flush()  # get buyer.id

                    # Generate outreach messages and put in approval queue
                    msgs = await generate_intro_messages(buyer_data)
                    db.add(OutreachMessage(
                        buyer_id=buyer.id,
                        channel="email",
                        message_type="intro",
                        subject=msgs.get("email_subject", ""),
                        body=msgs.get("email_body", ""),
                        status="pending",
                    ))
                    if buyer_data.get("whatsapp"):
                        db.add(OutreachMessage(
                            buyer_id=buyer.id,
                            channel="whatsapp",
                            message_type="intro",
                            body=msgs.get("whatsapp", ""),
                            status="pending",
                        ))

                    db.commit()
                    new_buyers += 1
                    _log(f"  ✓ Added: {result.title} (score: {lead_score})")

                # Respect rate limits
                await asyncio.sleep(1)

        run.status = "completed"
    except Exception as exc:
        run.status = "failed"
        run.error_message = str(exc)
        _log(f"FATAL ERROR: {exc}")

    run.finished_at = datetime.utcnow()
    run.queries_run = queries_run
    run.results_found = results_found
    run.new_buyers_added = new_buyers
    run.duplicates_skipped = duplicates
    run.log = log
    db.commit()
    db.refresh(run)
    return run
