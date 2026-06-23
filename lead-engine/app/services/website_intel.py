"""Scrape a company website to extract contact details, brands, and signals."""
import os
import re
import httpx
from bs4 import BeautifulSoup
from dataclasses import dataclass, field
from typing import Optional


EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"[\+\(]?[0-9][0-9\s\-\(\)\.]{7,}[0-9]")
WHATSAPP_RE = re.compile(r"(whatsapp|wa\.me|api\.whatsapp)", re.IGNORECASE)
SOCIAL_PATTERNS = {
    "linkedin": re.compile(r"linkedin\.com/(company|in)/([^/\s\"']+)", re.IGNORECASE),
    "facebook": re.compile(r"facebook\.com/([^/\s\"'?#]+)", re.IGNORECASE),
    "instagram": re.compile(r"instagram\.com/([^/\s\"'?#]+)", re.IGNORECASE),
}


@dataclass
class WebsiteIntel:
    url: str
    emails: list[str] = field(default_factory=list)
    phones: list[str] = field(default_factory=list)
    whatsapp_numbers: list[str] = field(default_factory=list)
    has_contact_form: bool = False
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    brands_detected: list[str] = field(default_factory=list)
    vehicle_segment: Optional[str] = None  # luxury, mainstream, mixed
    rhd_signals: bool = False
    lhd_signals: bool = False
    sells_wholesale: bool = False
    sells_retail: bool = False
    page_title: Optional[str] = None
    description: Optional[str] = None
    error: Optional[str] = None


LUXURY_BRANDS = [
    "Rolls-Royce", "Rolls Royce", "Bentley", "Lamborghini", "Ferrari",
    "McLaren", "Aston Martin", "Maserati",
]
PREMIUM_BRANDS = [
    "Porsche", "Land Rover", "Range Rover", "Mercedes", "BMW", "Audi",
    "Jaguar", "Lexus", "Volvo",
]
MAINSTREAM_BRANDS = [
    "Toyota", "Nissan", "Honda", "Hyundai", "Kia", "Ford",
    "Volkswagen", "VW", "Peugeot", "Renault",
]
ALL_BRANDS = LUXURY_BRANDS + PREMIUM_BRANDS + MAINSTREAM_BRANDS

PRIORITY_MODELS = [
    "Cullinan", "Ghost", "Phantom", "Wraith", "Dawn",
    "Bentayga", "Flying Spur", "Continental GT", "Mulsanne",
    "G63", "G-Wagon", "Range Rover Autobiography",
]

WHOLESALE_KEYWORDS = ["wholesale", "trade only", "trade price", "bulk", "fleet"]
RETAIL_KEYWORDS = ["showroom", "test drive", "finance", "part exchange", "retail"]
RHD_KEYWORDS = ["right hand drive", "rhd", "right-hand-drive"]
LHD_KEYWORDS = ["left hand drive", "lhd", "left-hand-drive"]


async def analyse_website(url: str) -> WebsiteIntel:
    if not url.startswith("http"):
        url = "https://" + url

    intel = WebsiteIntel(url=url)
    user_agent = os.getenv("USER_AGENT", "Mozilla/5.0 (compatible; UKCarSourceBot/1.0)")
    timeout = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "15"))

    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers={"User-Agent": user_agent},
    ) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except Exception as exc:
            intel.error = str(exc)
            return intel

    soup = BeautifulSoup(resp.text, "lxml")
    text = soup.get_text(" ", strip=True)
    text_lower = text.lower()

    # Page meta
    title_tag = soup.find("title")
    intel.page_title = title_tag.string.strip() if title_tag else None
    desc_tag = soup.find("meta", attrs={"name": "description"})
    intel.description = desc_tag.get("content", "")[:300] if desc_tag else None

    # Emails — from text and mailto links
    raw_emails = set(EMAIL_RE.findall(text))
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("mailto:"):
            raw_emails.add(href[7:].split("?")[0])
    # Filter out image/file extensions and common false positives
    intel.emails = [
        e for e in raw_emails
        if not any(e.lower().endswith(ext) for ext in [".png", ".jpg", ".gif", ".webp"])
    ][:5]

    # Phones
    raw_phones = PHONE_RE.findall(text)
    seen_phones: set[str] = set()
    for a in soup.find_all("a", href=True):
        if a["href"].startswith("tel:"):
            seen_phones.add(a["href"][4:])
    for p in raw_phones[:10]:
        cleaned = re.sub(r"[\s\-\(\)]", "", p)
        if len(cleaned) >= 7:
            seen_phones.add(cleaned)
    intel.phones = list(seen_phones)[:5]

    # WhatsApp
    wa_links = [a["href"] for a in soup.find_all("a", href=True) if WHATSAPP_RE.search(a["href"])]
    for link in wa_links:
        nums = re.findall(r"\d{7,}", link)
        intel.whatsapp_numbers.extend(nums)
    if WHATSAPP_RE.search(text):
        # Try to find the number near the word WhatsApp
        for match in re.finditer(r"whatsapp[^0-9+]{0,30}([\+\d\s]{7,})", text, re.IGNORECASE):
            num = re.sub(r"\s", "", match.group(1))
            if num:
                intel.whatsapp_numbers.append(num)
    intel.whatsapp_numbers = list(set(intel.whatsapp_numbers))[:3]

    # Contact form
    if soup.find("form"):
        inputs = soup.find_all("input")
        if any(i.get("type") in ("email", "text") for i in inputs):
            intel.has_contact_form = True

    # Social media
    page_html = resp.text
    for platform, pattern in SOCIAL_PATTERNS.items():
        m = pattern.search(page_html)
        if m:
            full_url = m.group(0)
            setattr(intel, f"{platform}_url", f"https://www.{full_url}" if not full_url.startswith("http") else full_url)

    # Brand detection
    detected: list[str] = []
    for brand in ALL_BRANDS:
        if brand.lower() in text_lower:
            detected.append(brand)
    intel.brands_detected = list(dict.fromkeys(detected))  # dedupe, preserve order

    # Segment
    luxury_hits = sum(1 for b in intel.brands_detected if b in LUXURY_BRANDS)
    premium_hits = sum(1 for b in intel.brands_detected if b in PREMIUM_BRANDS)
    mainstream_hits = sum(1 for b in intel.brands_detected if b in MAINSTREAM_BRANDS)
    if luxury_hits > 0 or premium_hits > 1:
        intel.vehicle_segment = "luxury" if luxury_hits >= premium_hits else "premium"
    elif mainstream_hits > 0:
        intel.vehicle_segment = "mainstream"
    if (luxury_hits + premium_hits) > 0 and mainstream_hits > 0:
        intel.vehicle_segment = "mixed"

    # Drive-side signals
    intel.rhd_signals = any(kw in text_lower for kw in RHD_KEYWORDS)
    intel.lhd_signals = any(kw in text_lower for kw in LHD_KEYWORDS)

    # Wholesale / retail
    intel.sells_wholesale = any(kw in text_lower for kw in WHOLESALE_KEYWORDS)
    intel.sells_retail = any(kw in text_lower for kw in RETAIL_KEYWORDS)

    return intel
