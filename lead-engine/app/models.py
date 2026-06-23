from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Buyer(Base):
    __tablename__ = "buyers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String(255), index=True)
    website: Mapped[Optional[str]] = mapped_column(String(512), unique=True, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    city: Mapped[Optional[str]] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    email_secondary: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    whatsapp: Mapped[Optional[str]] = mapped_column(String(50))
    contact_person: Mapped[Optional[str]] = mapped_column(String(255))
    buyer_type: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), default="new", index=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(512))
    discovery_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    brands_sold: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    vehicle_segment: Mapped[Optional[str]] = mapped_column(String(100))
    rhd_preference: Mapped[Optional[str]] = mapped_column(String(20))
    sells_wholesale: Mapped[bool] = mapped_column(Boolean, default=False)
    sells_retail: Mapped[bool] = mapped_column(Boolean, default=False)

    lead_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_classification: Mapped[Optional[str]] = mapped_column(String(100))

    linkedin_url: Mapped[Optional[str]] = mapped_column(String(512))
    facebook_url: Mapped[Optional[str]] = mapped_column(String(512))
    instagram_url: Mapped[Optional[str]] = mapped_column(String(512))
    has_contact_form: Mapped[bool] = mapped_column(Boolean, default=False)

    preferred_payment: Mapped[Optional[str]] = mapped_column(String(50))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    email_sent_count: Mapped[int] = mapped_column(Integer, default=0)
    whatsapp_sent_count: Mapped[int] = mapped_column(Integer, default=0)
    last_contacted: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    replied: Mapped[bool] = mapped_column(Boolean, default=False)
    positive_response: Mapped[bool] = mapped_column(Boolean, default=False)
    purchased: Mapped[bool] = mapped_column(Boolean, default=False)

    messages: Mapped[List["OutreachMessage"]] = relationship(back_populates="buyer", cascade="all, delete-orphan")
    learning_events: Mapped[List["LearningEvent"]] = relationship(back_populates="buyer", cascade="all, delete-orphan")


class OutreachMessage(Base):
    __tablename__ = "outreach_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    buyer_id: Mapped[int] = mapped_column(Integer, ForeignKey("buyers.id"))
    channel: Mapped[str] = mapped_column(String(20))
    message_type: Mapped[str] = mapped_column(String(50))
    subject: Mapped[Optional[str]] = mapped_column(String(512))
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    linked_offer_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("offers.id"), nullable=True)

    buyer: Mapped["Buyer"] = relationship(back_populates="messages")
    offer: Mapped[Optional["Offer"]] = relationship(back_populates="messages")


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    make: Mapped[str] = mapped_column(String(100))
    model: Mapped[str] = mapped_column(String(100))
    year: Mapped[Optional[int]] = mapped_column(Integer)
    mileage: Mapped[Optional[int]] = mapped_column(Integer)
    price_gbp: Mapped[Optional[float]] = mapped_column(Float)
    fuel: Mapped[Optional[str]] = mapped_column(String(50))
    gearbox: Mapped[Optional[str]] = mapped_column(String(50))
    colour: Mapped[Optional[str]] = mapped_column(String(50))
    condition: Mapped[Optional[str]] = mapped_column(String(50))
    location: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    spec_highlights: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(50), default="active")

    messages: Mapped[List["OutreachMessage"]] = relationship(back_populates="offer")
    matches: Mapped[List["OfferMatch"]] = relationship(back_populates="offer", cascade="all, delete-orphan")


class OfferMatch(Base):
    __tablename__ = "offer_matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    offer_id: Mapped[int] = mapped_column(Integer, ForeignKey("offers.id"))
    buyer_id: Mapped[int] = mapped_column(Integer, ForeignKey("buyers.id"))
    match_score: Mapped[float] = mapped_column(Float, default=0.0)
    match_reasons: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    offer: Mapped["Offer"] = relationship(back_populates="matches")
    buyer: Mapped["Buyer"] = relationship()


class DiscoveryRun(Base):
    __tablename__ = "discovery_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="running")
    queries_run: Mapped[int] = mapped_column(Integer, default=0)
    results_found: Mapped[int] = mapped_column(Integer, default=0)
    new_buyers_added: Mapped[int] = mapped_column(Integer, default=0)
    duplicates_skipped: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    log: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)


class CountryRule(Base):
    __tablename__ = "country_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    country: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    rhd_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    lhd_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    rhd_preferred: Mapped[bool] = mapped_column(Boolean, default=True)
    max_age_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    luxury_market_score: Mapped[int] = mapped_column(Integer, default=50)
    preferred_payment: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    tt_common: Mapped[bool] = mapped_column(Boolean, default=True)
    lc_common: Mapped[bool] = mapped_column(Boolean, default=False)
    import_restrictions: Mapped[Optional[str]] = mapped_column(Text)
    shipping_notes: Mapped[Optional[str]] = mapped_column(Text)
    currency: Mapped[Optional[str]] = mapped_column(String(10))
    vat_rate: Mapped[Optional[float]] = mapped_column(Float)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class LearningEvent(Base):
    __tablename__ = "learning_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    buyer_id: Mapped[int] = mapped_column(Integer, ForeignKey("buyers.id"))
    event_type: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    event_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    buyer: Mapped["Buyer"] = relationship(back_populates="learning_events")


class CurrentStock(Base):
    __tablename__ = "current_stock"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    make: Mapped[str] = mapped_column(String(100))
    model: Mapped[str] = mapped_column(String(100))
    year: Mapped[Optional[int]] = mapped_column(Integer)
    variant: Mapped[Optional[str]] = mapped_column(String(255))  # e.g. "110 Ans Edition", "Nightingale"
    drive: Mapped[str] = mapped_column(String(10), default="LHD")  # LHD, RHD, Both
    stock_type: Mapped[str] = mapped_column(String(50), default="physical")  # physical, allocation, factory-order
    mileage: Mapped[Optional[int]] = mapped_column(Integer)
    colour: Mapped[Optional[str]] = mapped_column(String(100))
    interior: Mapped[Optional[str]] = mapped_column(String(100))
    price_gbp: Mapped[Optional[float]] = mapped_column(Float)
    location: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)  # extra details e.g. "US titled", "1 of 20"
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
