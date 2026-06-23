from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Offer, OutreachMessage
from app.services.offer_parser import parse_offer_form
from app.services.matcher import match_offer_to_buyers, save_matches
from app.services.message_generator import generate_offer_messages

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/offers", response_class=HTMLResponse)
async def offers_page(request: Request, db: Session = Depends(get_db)):
    offers = db.query(Offer).order_by(Offer.created_at.desc()).all()
    return templates.TemplateResponse("offers.html", {"request": request, "offers": offers})


@router.post("/offers/add")
async def add_offer(
    request: Request,
    make: str = Form(...),
    model: str = Form(...),
    year: str = Form(""),
    mileage: str = Form(""),
    price_gbp: str = Form(""),
    fuel: str = Form(""),
    gearbox: str = Form(""),
    colour: str = Form(""),
    condition: str = Form("Used"),
    location: str = Form(""),
    description: str = Form(""),
    spec_highlights: str = Form(""),
    db: Session = Depends(get_db),
):
    parsed = parse_offer_form({
        "make": make, "model": model, "year": year, "mileage": mileage,
        "price_gbp": price_gbp, "fuel": fuel, "gearbox": gearbox,
        "colour": colour, "condition": condition, "location": location,
        "description": description, "spec_highlights": spec_highlights,
    })
    if parsed.errors:
        offers = db.query(Offer).order_by(Offer.created_at.desc()).all()
        return templates.TemplateResponse("offers.html", {
            "request": request, "offers": offers, "errors": parsed.errors, "form": parsed,
        })

    offer = Offer(
        make=parsed.make, model=parsed.model, year=parsed.year,
        mileage=parsed.mileage, price_gbp=parsed.price_gbp,
        fuel=parsed.fuel, gearbox=parsed.gearbox, colour=parsed.colour,
        condition=parsed.condition, location=parsed.location,
        description=parsed.description, spec_highlights=parsed.spec_highlights,
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    # Match buyers
    matches = match_offer_to_buyers(db, offer)
    save_matches(db, offer, matches)

    return RedirectResponse(f"/offers/{offer.id}", status_code=303)


@router.get("/offers/{offer_id}", response_class=HTMLResponse)
async def offer_detail(request: Request, offer_id: int, db: Session = Depends(get_db)):
    offer = db.get(Offer, offer_id)
    if not offer:
        return HTMLResponse("Offer not found", status_code=404)
    matches = sorted(offer.matches, key=lambda m: m.match_score, reverse=True)
    return templates.TemplateResponse("offer_detail.html", {
        "request": request, "offer": offer, "matches": matches,
    })


@router.post("/offers/{offer_id}/queue-messages")
async def queue_offer_messages(offer_id: int, buyer_ids: str = Form(...), db: Session = Depends(get_db)):
    """Generate and queue offer messages for selected buyers."""
    offer = db.get(Offer, offer_id)
    if not offer:
        return RedirectResponse("/offers", status_code=303)

    ids = [int(i) for i in buyer_ids.split(",") if i.strip().isdigit()]
    offer_dict = {
        "make": offer.make, "model": offer.model, "year": offer.year,
        "mileage": offer.mileage, "price_gbp": offer.price_gbp,
        "colour": offer.colour, "condition": offer.condition,
        "description": offer.description,
    }

    from app.models import Buyer
    for bid in ids:
        buyer = db.get(Buyer, bid)
        if not buyer:
            continue
        buyer_dict = {
            "company_name": buyer.company_name,
            "contact_person": buyer.contact_person,
            "country": buyer.country,
            "brands_sold": buyer.brands_sold,
        }
        msgs = await generate_offer_messages(buyer_dict, offer_dict)
        db.add(OutreachMessage(
            buyer_id=bid,
            channel="email",
            message_type="offer",
            subject=msgs.get("email_subject", ""),
            body=msgs.get("email_body", ""),
            status="pending",
            linked_offer_id=offer.id,
        ))
        if buyer.whatsapp:
            db.add(OutreachMessage(
                buyer_id=bid,
                channel="whatsapp",
                message_type="offer",
                body=msgs.get("whatsapp", ""),
                status="pending",
                linked_offer_id=offer.id,
            ))
    db.commit()
    return RedirectResponse(f"/queue?offer={offer_id}", status_code=303)
