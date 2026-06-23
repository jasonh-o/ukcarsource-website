from datetime import datetime
from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Buyer, LearningEvent, OutreachMessage
from app.services.lead_scorer import score_buyer
from app.services.ai_qualification import generate_analysis_summary

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/buyers", response_class=HTMLResponse)
async def list_buyers(
    request: Request,
    db: Session = Depends(get_db),
    q: str = "",
    country: str = "",
    status: str = "",
    buyer_type: str = "",
    sort: str = "score",
):
    total_all = db.query(Buyer).count()
    query = db.query(Buyer)
    if q:
        query = query.filter(
            or_(
                Buyer.company_name.ilike(f"%{q}%"),
                Buyer.email.ilike(f"%{q}%"),
                Buyer.website.ilike(f"%{q}%"),
                Buyer.country.ilike(f"%{q}%"),
            )
        )
    if country:
        query = query.filter(Buyer.country == country)
    if status:
        query = query.filter(Buyer.status == status)
    if buyer_type:
        query = query.filter(Buyer.buyer_type == buyer_type)

    if sort == "score":
        query = query.order_by(Buyer.lead_score.desc())
    elif sort == "date":
        query = query.order_by(Buyer.discovery_date.desc())
    elif sort == "name":
        query = query.order_by(Buyer.company_name)

    buyers = query.all()
    countries = [r[0] for r in db.query(Buyer.country).distinct().order_by(Buyer.country).all() if r[0]]
    return templates.TemplateResponse("buyers.html", {
        "request": request, "buyers": buyers, "q": q,
        "country": country, "status": status, "sort": sort,
        "buyer_type": buyer_type, "countries": countries,
        "total": len(buyers), "total_all": total_all,
    })


@router.get("/buyers/{buyer_id}", response_class=HTMLResponse)
async def buyer_detail(request: Request, buyer_id: int, db: Session = Depends(get_db)):
    buyer = db.get(Buyer, buyer_id)
    if not buyer:
        return HTMLResponse("Buyer not found", status_code=404)
    return templates.TemplateResponse("buyer_detail.html", {"request": request, "buyer": buyer})


@router.post("/buyers/{buyer_id}/status")
async def update_status(buyer_id: int, status: str = Form(...), db: Session = Depends(get_db)):
    buyer = db.get(Buyer, buyer_id)
    if buyer:
        buyer.status = status
        # Auto-delete pending messages when buyer is rejected
        if status == "rejected":
            db.query(OutreachMessage).filter(
                OutreachMessage.buyer_id == buyer_id,
                OutreachMessage.status == "pending"
            ).delete()
        db.commit()
    return RedirectResponse(f"/buyers/{buyer_id}", status_code=303)


@router.post("/buyers/{buyer_id}/notes")
async def update_notes(buyer_id: int, notes: str = Form(...), db: Session = Depends(get_db)):
    buyer = db.get(Buyer, buyer_id)
    if buyer:
        buyer.notes = notes
        db.commit()
    return RedirectResponse(f"/buyers/{buyer_id}", status_code=303)


@router.post("/buyers/{buyer_id}/rescore")
async def rescore_buyer(buyer_id: int, db: Session = Depends(get_db)):
    buyer = db.get(Buyer, buyer_id)
    if buyer:
        data = {
            "company_name": buyer.company_name,
            "country": buyer.country,
            "email": buyer.email,
            "phone": buyer.phone,
            "whatsapp": buyer.whatsapp,
            "website": buyer.website,
            "brands_sold": buyer.brands_sold,
            "buyer_type": buyer.buyer_type,
            "ai_confidence_score": buyer.ai_confidence_score,
            "has_contact_form": buyer.has_contact_form,
            "has_import_signal": buyer.buyer_type in ("importer", "exporter"),
        }
        new_score, _ = score_buyer(data)
        buyer.lead_score = new_score
        db.commit()
    return RedirectResponse(f"/buyers/{buyer_id}", status_code=303)


@router.post("/buyers/{buyer_id}/event")
async def log_event(buyer_id: int, event_type: str = Form(...), db: Session = Depends(get_db)):
    buyer = db.get(Buyer, buyer_id)
    if not buyer:
        return RedirectResponse("/buyers", status_code=303)
    db.add(LearningEvent(buyer_id=buyer_id, event_type=event_type))
    if event_type == "reply":
        buyer.replied = True
        buyer.last_contacted = datetime.utcnow()
    elif event_type == "purchase":
        buyer.purchased = True
        buyer.positive_response = True
    elif event_type == "positive_response":
        buyer.positive_response = True
    db.commit()
    return RedirectResponse(f"/buyers/{buyer_id}", status_code=303)


@router.post("/buyers/add", response_class=HTMLResponse)
async def add_buyer(
    request: Request,
    company_name: str = Form(...),
    website: str = Form(""),
    country: str = Form(""),
    city: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    whatsapp: str = Form(""),
    contact_person: str = Form(""),
    notes: str = Form(""),
    db: Session = Depends(get_db),
):
    buyer = Buyer(
        company_name=company_name,
        website=website or None,
        country=country or None,
        city=city or None,
        email=email or None,
        phone=phone or None,
        whatsapp=whatsapp or None,
        contact_person=contact_person or None,
        notes=notes or None,
        status="new",
    )
    db.add(buyer)
    db.commit()
    db.refresh(buyer)
    return RedirectResponse(f"/buyers/{buyer.id}", status_code=303)
