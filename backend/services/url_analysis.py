# Owner: Backend Lead — URL Safety Team
# File: backend/services/url_analysis.py
# Description: Google Safe Browsing + URLScan.io + domain heuristics for URL
#              credibility analysis. GSB is checked first; if flagged, URLScan
#              is skipped to avoid the 10-second wait.

import os
import asyncio
from urllib.parse import urlparse

import httpx

URLSCAN_SUBMIT_URL = "https://urlscan.io/api/v1/scan/"
URLSCAN_RESULT_URL = "https://urlscan.io/api/v1/result/{uuid}/"
GSB_URL            = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

URLSCAN_API_KEY          = os.getenv("URLSCAN_API_KEY", "")
GOOGLE_SAFE_BROWSING_KEY = os.getenv("GOOGLE_SAFE_BROWSING_KEY", "")

SUSPICIOUS_TLDS = {".xyz", ".top", ".click", ".tk", ".ml", ".ga", ".cf", ".gq"}


# ── Domain heuristics (no API needed) ────────────────────────────────────────

def _domain_signals(url: str) -> tuple[list[str], bool]:
    """
    Return (signals, has_ssl) derived purely from parsing the URL.
    No network calls.
    """
    signals: list[str] = []
    parsed  = urlparse(url)
    domain  = parsed.netloc.lower().split(":")[0]   # strip port if present
    has_ssl = parsed.scheme == "https"

    # IP address instead of domain
    import re
    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", domain):
        signals.append("IP address used instead of domain name")

    # Suspicious TLD
    for tld in SUSPICIOUS_TLDS:
        if domain.endswith(tld):
            signals.append(f"Suspicious top-level domain: {tld}")
            break

    # Excessive subdomains (>3 dots in hostname)
    if domain.count(".") > 3:
        signals.append("Excessive subdomains — possible phishing pattern")

    return signals, has_ssl


# ── Google Safe Browsing ──────────────────────────────────────────────────────

async def _check_gsb(url: str) -> tuple[bool, list[str]]:
    """
    Returns (flagged, threat_signal_strings).
    Raises on network error so caller can handle gracefully.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{GSB_URL}?key={GOOGLE_SAFE_BROWSING_KEY}",
            json={
                "client": {"clientId": "verifai", "clientVersion": "1.0"},
                "threatInfo": {
                    "threatTypes": [
                        "MALWARE",
                        "SOCIAL_ENGINEERING",
                        "UNWANTED_SOFTWARE",
                        "POTENTIALLY_HARMFUL_APPLICATION",
                    ],
                    "platformTypes": ["ANY_PLATFORM"],
                    "threatEntryTypes": ["URL"],
                    "threatEntries": [{"url": url}],
                },
            },
        )
        resp.raise_for_status()
        matches = resp.json().get("matches", [])

    if not matches:
        return False, []

    threat_signals = [
        f"Flagged by Google Safe Browsing: {m['threatType'].replace('_', ' ').title()}"
        for m in matches
    ]
    return True, threat_signals


# ── URLScan.io ────────────────────────────────────────────────────────────────

async def _scan_urlscan(url: str) -> tuple[int, bool, list[str]]:
    """
    Submit → wait → fetch result.
    Returns (score 0-100, malicious bool, tag signals).
    Raises on error.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Submit
        submit = await client.post(
            URLSCAN_SUBMIT_URL,
            headers={"API-Key": URLSCAN_API_KEY, "Content-Type": "application/json"},
            json={"url": url, "visibility": "public"},
        )
        submit.raise_for_status()
        uuid = submit.json().get("uuid")
        if not uuid:
            raise ValueError("URLScan did not return a scan UUID")

        # Wait for scan to complete
        await asyncio.sleep(10)

        # Fetch result
        result = await client.get(
            URLSCAN_RESULT_URL.format(uuid=uuid),
            timeout=15.0,
        )
        result.raise_for_status()
        data = result.json()

    overall   = data.get("verdicts", {}).get("overall", {})
    score     = int(overall.get("score", 0))
    malicious = bool(overall.get("malicious", False))
    tags      = overall.get("tags", [])
    tag_signals = [f"URLScan tag: {t}" for t in tags] if tags else []

    return score, malicious, tag_signals


# ── Public entry point ────────────────────────────────────────────────────────

async def analyze_url(url: str) -> dict:
    """
    Run GSB → (conditionally) URLScan → domain heuristics and return a verdict.
    """
    signals: list[str] = []

    # ── Domain heuristics (always run, zero latency) ──────────────────────────
    domain_signals, has_ssl = _domain_signals(url)
    signals.extend(domain_signals)

    # ── Step 1: Google Safe Browsing ──────────────────────────────────────────
    gsb_flagged   = False
    gsb_ok        = False

    try:
        gsb_flagged, gsb_signals = await _check_gsb(url)
        if gsb_signals:
            signals = gsb_signals + signals   # GSB threats go first
        gsb_ok = True
    except Exception as exc:
        print(f"[Verifai] GSB error: {exc}")

    # Fast path: if GSB already flagged it, no need to wait 10s for URLScan
    if gsb_flagged:
        signals = _cap_signals(signals)
        return {
            "url": url,
            "verdict": "suspicious",
            "risk_level": "high",
            "confidence": 95,
            "signals": signals,
            "explanation": (
                "This URL has been flagged by Google Safe Browsing as a known threat. "
                "It is strongly recommended not to visit or share this link."
            ),
        }

    # ── Step 2: URLScan.io ────────────────────────────────────────────────────
    urlscan_score     = 0
    urlscan_malicious = False
    urlscan_ok        = False

    try:
        urlscan_score, urlscan_malicious, tag_signals = await _scan_urlscan(url)
        signals.extend(tag_signals)
        urlscan_ok = True
    except Exception as exc:
        print(f"[Verifai] URLScan error: {exc}")

    # ── Step 3: Combine into verdict ──────────────────────────────────────────
    if urlscan_malicious:
        verdict    = "suspicious"
        risk_level = "high"
        confidence = 90
        explanation = (
            "URLScan.io identified this URL as malicious. "
            "Avoid visiting this link."
        )

    elif urlscan_score > 60:
        verdict    = "suspicious"
        risk_level = "medium"
        confidence = urlscan_score
        explanation = (
            f"URLScan.io assigned a risk score of {urlscan_score}/100 to this URL. "
            "Proceed with caution."
        )

    elif not has_ssl:
        verdict    = "suspicious"
        risk_level = "medium"
        confidence = 65
        signals.append("No SSL certificate — connection is not encrypted")
        explanation = (
            "This URL does not use HTTPS, meaning the connection is unencrypted. "
            "Avoid entering any personal information on this site."
        )

    elif domain_signals:
        # Has domain red flags but nothing else triggered
        verdict    = "suspicious"
        risk_level = "medium"
        confidence = 60
        explanation = (
            "This URL shows some structural warning signs. "
            "Exercise caution before visiting or sharing."
        )

    else:
        verdict    = "likely_authentic"
        risk_level = "low"
        confidence = 85
        explanation = (
            "No known threats were detected for this URL. "
            "It appears safe based on available intelligence."
        )

    return {
        "url": url,
        "verdict": verdict,
        "risk_level": risk_level,
        "confidence": confidence,
        "signals": _cap_signals(signals),
        "explanation": explanation,
    }


def _cap_signals(signals: list[str], limit: int = 5) -> list[str]:
    seen, out = set(), []
    for s in signals:
        if s not in seen:
            seen.add(s)
            out.append(s)
        if len(out) == limit:
            break
    return out
