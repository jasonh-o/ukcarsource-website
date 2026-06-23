"""View and edit country rules stored in the database."""
import json
from pathlib import Path
from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CountryRule

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")
CONFIG = Path(__file__).resolve().parent.parent.parent / "config"


@router.get("/rules", response_class=HTMLResponse)
async def rules_page(request: Request, db: Session = Depends(get_db)):
    country_rules = db.query(CountryRule).order_by(CountryRule.country).all()
    payment_rules = json.loads((CONFIG / "payment_rules.json").read_text())
    brand_rules = json.loads((CONFIG / "brand_rules.json").read_text())
    scoring_rules = json.loads((CONFIG / "scoring_rules.json").read_text())
    return templates.TemplateResponse("rules.html", {
        "request": request,
        "country_rules": country_rules,
        "payment_rules": payment_rules,
        "brand_rules": brand_rules,
        "scoring_rules": scoring_rules,
    })


@router.post("/rules/country/{rule_id}")
async def update_country_rule(
    rule_id: int,
    luxury_market_score: int = Form(...),
    max_age_years: str = Form(""),
    rhd_allowed: str = Form("off"),
    lhd_allowed: str = Form("off"),
    tt_common: str = Form("off"),
    lc_common: str = Form("off"),
    import_restrictions: str = Form(""),
    shipping_notes: str = Form(""),
    db: Session = Depends(get_db),
):
    rule = db.get(CountryRule, rule_id)
    if rule:
        rule.luxury_market_score = luxury_market_score
        rule.max_age_years = int(max_age_years) if max_age_years.strip() else None
        rule.rhd_allowed = rhd_allowed == "on"
        rule.lhd_allowed = lhd_allowed == "on"
        rule.tt_common = tt_common == "on"
        rule.lc_common = lc_common == "on"
        rule.import_restrictions = import_restrictions
        rule.shipping_notes = shipping_notes
        db.commit()
    return RedirectResponse("/rules", status_code=303)
