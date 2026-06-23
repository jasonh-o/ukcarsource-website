"""Current stock management — vehicles available for outreach."""
from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CurrentStock

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/stock", response_class=HTMLResponse)
async def stock_page(request: Request, db: Session = Depends(get_db)):
    lhd = db.query(CurrentStock).filter(
        CurrentStock.active == True,
        CurrentStock.drive.in_(["LHD", "Both"])
    ).order_by(CurrentStock.stock_type, CurrentStock.make).all()
    rhd = db.query(CurrentStock).filter(
        CurrentStock.active == True,
        CurrentStock.drive.in_(["RHD", "Both"])
    ).order_by(CurrentStock.stock_type, CurrentStock.make).all()
    inactive = db.query(CurrentStock).filter(CurrentStock.active == False).order_by(CurrentStock.created_at.desc()).all()
    return templates.TemplateResponse("stock.html", {
        "request": request,
        "lhd_stock": lhd,
        "rhd_stock": rhd,
        "inactive_stock": inactive,
    })


@router.post("/stock/add")
async def add_stock(
    make: str = Form(...),
    model: str = Form(...),
    year: str = Form(""),
    variant: str = Form(""),
    drive: str = Form("LHD"),
    stock_type: str = Form("physical"),
    mileage: str = Form(""),
    colour: str = Form(""),
    interior: str = Form(""),
    price_gbp: str = Form(""),
    location: str = Form(""),
    notes: str = Form(""),
    db: Session = Depends(get_db),
):
    item = CurrentStock(
        make=make,
        model=model,
        year=int(year) if year.strip() else None,
        variant=variant or None,
        drive=drive,
        stock_type=stock_type,
        mileage=int(mileage.replace(",", "")) if mileage.strip() else None,
        colour=colour or None,
        interior=interior or None,
        price_gbp=float(price_gbp.replace(",", "").replace("£", "")) if price_gbp.strip() else None,
        location=location or None,
        notes=notes or None,
        active=True,
    )
    db.add(item)
    db.commit()
    return RedirectResponse("/stock", status_code=303)


@router.post("/stock/{item_id}/deactivate")
async def deactivate_stock(item_id: int, db: Session = Depends(get_db)):
    item = db.get(CurrentStock, item_id)
    if item:
        item.active = False
        db.commit()
    return RedirectResponse("/stock", status_code=303)


@router.post("/stock/{item_id}/activate")
async def activate_stock(item_id: int, db: Session = Depends(get_db)):
    item = db.get(CurrentStock, item_id)
    if item:
        item.active = True
        db.commit()
    return RedirectResponse("/stock", status_code=303)


@router.post("/stock/{item_id}/delete")
async def delete_stock(item_id: int, db: Session = Depends(get_db)):
    item = db.get(CurrentStock, item_id)
    if item:
        db.delete(item)
        db.commit()
    return RedirectResponse("/stock", status_code=303)
