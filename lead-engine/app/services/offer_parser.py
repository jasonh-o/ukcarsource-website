"""Parse and validate vehicle offer input."""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ParsedOffer:
    make: str
    model: str
    year: Optional[int] = None
    mileage: Optional[int] = None
    price_gbp: Optional[float] = None
    fuel: Optional[str] = None
    gearbox: Optional[str] = None
    colour: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    spec_highlights: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def parse_offer_form(data: dict) -> ParsedOffer:
    errors = []

    make = (data.get("make") or "").strip()
    model = (data.get("model") or "").strip()
    if not make:
        errors.append("Make is required.")
    if not model:
        errors.append("Model is required.")

    year = None
    raw_year = data.get("year")
    if raw_year:
        try:
            year = int(raw_year)
            if not (1990 <= year <= 2030):
                errors.append("Year must be between 1990 and 2030.")
        except ValueError:
            errors.append("Year must be a number.")

    mileage = None
    raw_mileage = data.get("mileage")
    if raw_mileage:
        try:
            mileage = int(str(raw_mileage).replace(",", ""))
        except ValueError:
            errors.append("Mileage must be a number.")

    price_gbp = None
    raw_price = data.get("price_gbp")
    if raw_price:
        try:
            price_gbp = float(str(raw_price).replace(",", "").replace("£", ""))
        except ValueError:
            errors.append("Price must be a number.")

    spec = data.get("spec_highlights") or ""
    spec_list = [s.strip() for s in spec.split("\n") if s.strip()] if isinstance(spec, str) else []

    return ParsedOffer(
        make=make,
        model=model,
        year=year,
        mileage=mileage,
        price_gbp=price_gbp,
        fuel=data.get("fuel"),
        gearbox=data.get("gearbox"),
        colour=data.get("colour"),
        condition=data.get("condition", "Used"),
        location=data.get("location"),
        description=data.get("description"),
        spec_highlights=spec_list,
        errors=errors,
    )
