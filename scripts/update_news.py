"""Refresh the "Latest UK Motoring News" block on market-insights.html from public RSS feeds.

Only headlines, source, date and a link are shown (no article text). Runs daily via
.github/workflows/update-news.yml; safe to run locally: python3 scripts/update_news.py
"""
import email.utils
import html
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

FEEDS = [
    ("Autocar", "https://www.autocar.co.uk/rss"),
    ("Auto Express", "https://www.autoexpress.co.uk/feed/all"),
    ("Motor1 UK", "https://uk.motor1.com/rss/news/all/"),
]
# Headlines mentioning the brands we source are shown first.
PRIORITY = re.compile(
    r"range rover|land rover|defender|bentley|rolls-royce|porsche|mercedes|amg|bmw|"
    r"toyota|land cruiser|hilux|lexus|mclaren|aston martin|ferrari|lamborghini|price",
    re.I,
)
# Photo galleries and videos duplicate the main story.
SKIP = re.compile(r"(?:-|–)\s*(?:pictures|gallery|video)\s*$", re.I)
MAX_ITEMS = 10
PER_FEED = 4
PAGE = Path(__file__).resolve().parent.parent / "market-insights.html"
START, END = "<!-- NEWS:START -->", "<!-- NEWS:END -->"


def fetch(source, url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; UKCarSourceNews/1.0)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        root = ET.fromstring(r.read())
    items = []
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        if not title or not link.startswith("https://") or SKIP.search(title):
            continue
        try:
            date = email.utils.parsedate_to_datetime(it.findtext("pubDate") or "")
        except (TypeError, ValueError):
            date = None
        items.append({"source": source, "title": title, "link": link, "date": date})
    return items


def pick(items):
    items.sort(key=lambda i: i["date"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    seen, chosen, per_source = set(), [], {}
    for want_priority in (True, False):
        for i in items:
            key = i["title"].lower()
            if key in seen or bool(PRIORITY.search(i["title"])) != want_priority:
                continue
            if per_source.get(i["source"], 0) >= PER_FEED or len(chosen) >= MAX_ITEMS:
                continue
            seen.add(key)
            chosen.append(i)
            per_source[i["source"]] = per_source.get(i["source"], 0) + 1
    chosen.sort(key=lambda i: i["date"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return chosen


def render(items):
    today = datetime.now(timezone.utc).strftime("%-d %B %Y")
    rows = "\n".join(
        f'      <li><a href="{html.escape(i["link"])}" target="_blank" rel="nofollow noopener">{html.escape(i["title"])}</a>'
        f'<span>{html.escape(i["source"])}{" · " + i["date"].strftime("%-d %b") if i["date"] else ""}</span></li>'
        for i in items
    )
    return f"""{START}
  <div class="news-box">
    <div class="news-head"><h2>Latest UK <span>Motoring News</span></h2><span class="news-updated">Updated {today}</span></div>
    <ul class="news-list">
{rows}
    </ul>
    <p class="news-note">Headlines from Autocar, Auto Express and Motor1 UK, updated daily. Links open the original article.</p>
  </div>
  {END}"""


def main():
    items = []
    for source, url in FEEDS:
        try:
            items += fetch(source, url)
        except Exception as e:  # one bad feed shouldn't stop the others
            print(f"warning: {source} failed: {e}", file=sys.stderr)
    chosen = pick(items)
    if len(chosen) < 3:
        print("too few headlines; leaving page unchanged", file=sys.stderr)
        return
    page = PAGE.read_text()
    new = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: render(chosen), page, count=1, flags=re.S)
    if new == page:
        print("markers not found or no change", file=sys.stderr)
        return
    PAGE.write_text(new)
    print(f"updated {PAGE.name} with {len(chosen)} headlines")


if __name__ == "__main__":
    main()
