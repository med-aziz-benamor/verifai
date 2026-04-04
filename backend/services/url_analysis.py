# Owner: Backend Lead — URL Safety Team
# File: backend/services/url_analysis.py
# Description: URLScan.io + Google Safe Browsing API integration stubs.
#              Replace stubs with real API calls once keys are configured.

import os
import httpx

URLSCAN_API_URL = "https://urlscan.io/api/v1/scan/"
GOOGLE_SAFE_BROWSING_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

URLSCAN_API_KEY = os.getenv("URLSCAN_API_KEY", "")
GOOGLE_SAFE_BROWSING_KEY = os.getenv("GOOGLE_SAFE_BROWSING_KEY", "")


async def scan_url_urlscan(url: str) -> dict:
    """
    Submit a URL to URLScan.io for analysis and retrieve the verdict.

    TODO: Uncomment once URLSCAN_API_KEY is configured.
    Note: URLScan is asynchronous — submit → poll for result → fetch report.

    Args:
        url: The URL string to scan.

    Returns:
        dict with keys: risk_level, signals list.
    """
    # --- STUB ---
    # async with httpx.AsyncClient() as client:
    #     # Step 1: Submit scan
    #     submit_resp = await client.post(
    #         URLSCAN_API_URL,
    #         headers={"API-Key": URLSCAN_API_KEY, "Content-Type": "application/json"},
    #         json={"url": url, "visibility": "public"},
    #         timeout=30.0,
    #     )
    #     scan_id = submit_resp.json().get("uuid")
    #
    #     # Step 2: Poll for result (simplified — use asyncio.sleep in production)
    #     import asyncio
    #     await asyncio.sleep(10)
    #     result_resp = await client.get(
    #         f"https://urlscan.io/api/v1/result/{scan_id}/",
    #         timeout=30.0,
    #     )
    #     data = result_resp.json()
    #     verdicts = data.get("verdicts", {}).get("overall", {})
    #     return {
    #         "risk_level": "high" if verdicts.get("malicious") else "low",
    #         "signals": verdicts.get("tags", []),
    #     }

    return {
        "risk_level": "high",
        "signals": [
            "Domain registered within the last 30 days",
            "Redirects to known phishing domain",
        ],
    }


async def check_google_safe_browsing(url: str) -> dict:
    """
    Check a URL against the Google Safe Browsing API.

    TODO: Uncomment once GOOGLE_SAFE_BROWSING_KEY is configured.

    Args:
        url: The URL string to check.

    Returns:
        dict with keys: is_dangerous (bool), threat_types (list).
    """
    # --- STUB ---
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         f"{GOOGLE_SAFE_BROWSING_URL}?key={GOOGLE_SAFE_BROWSING_KEY}",
    #         json={
    #             "client": {"clientId": "verifai", "clientVersion": "1.0"},
    #             "threatInfo": {
    #                 "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
    #                 "platformTypes": ["ANY_PLATFORM"],
    #                 "threatEntryTypes": ["URL"],
    #                 "threatEntries": [{"url": url}],
    #             },
    #         },
    #         timeout=10.0,
    #     )
    #     matches = response.json().get("matches", [])
    #     return {
    #         "is_dangerous": len(matches) > 0,
    #         "threat_types": [m["threatType"] for m in matches],
    #     }

    return {
        "is_dangerous": True,
        "threat_types": ["SOCIAL_ENGINEERING"],
    }
