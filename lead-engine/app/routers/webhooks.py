"""Inbound webhook for tracking email opens and replies."""
from datetime import datetime
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Buyer, LearningEvent, OutreachMessage

router = APIRouter(prefix="/webhooks")


@router.post("/email/open")
async def email_open(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    buyer_id = data.get("buyer_id")
    if buyer_id:
        db.add(LearningEvent(buyer_id=buyer_id, event_type="email_open", event_data=data))
        db.commit()
    return JSONResponse({"ok": True})


@router.post("/email/reply")
async def email_reply(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    buyer_id = data.get("buyer_id")
    if buyer_id:
        buyer = db.get(Buyer, buyer_id)
        if buyer:
            buyer.replied = True
            buyer.last_contacted = datetime.utcnow()
            buyer.lead_score = min(100, buyer.lead_score + 10)
        db.add(LearningEvent(buyer_id=buyer_id, event_type="reply", event_data=data))
        db.commit()
    return JSONResponse({"ok": True})
