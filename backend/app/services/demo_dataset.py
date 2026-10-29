"""Deterministic demo dataset used by the Demo AI provider.

The names below are fictional. They are realistic in shape - Indian cities,
recognisable specialities, plausible operating histories - so the product demo
reads like genuine research output without asserting anything false about real
businesses.
"""

from __future__ import annotations

import random
from typing import Any

# name, city, state, specialty, employees, founded, web_quality, has_booking,
# mobile_ok, rating, reviews
HEALTHCARE: list[tuple] = [
    ("MedCare Health Systems", "Bengaluru", "Karnataka", "Multi-speciality", 180, 2009, "low", 0, 0, 4.3, 412),
    ("Apollo Clinic", "Hyderabad", "Telangana", "Multi-speciality", 240, 2006, "low", 0, 0, 4.5, 688),
    ("HealthFirst Wellness", "Pune", "Maharashtra", "Primary Care", 95, 2013, "low", 1, 0, 4.4, 287),
    ("CarePlus Hospital", "Chennai", "Tamil Nadu", "Multi-speciality", 320, 2004, "medium", 0, 0, 4.2, 954),
    ("LifeLine Diagnostics", "Mumbai", "Maharashtra", "Diagnostics", 120, 2011, "low", 1, 0, 4.6, 341),
    ("Sanjeevani Health", "Jaipur", "Rajasthan", "Primary Care", 64, 2016, "low", 0, 0, 4.1, 96),
    ("NovaCare Clinic", "Ahmedabad", "Gujarat", "Dermatology", 48, 2018, "medium", 0, 0, 4.7, 212),
    ("Arogya Care Centre", "Lucknow", "Uttar Pradesh", "General Practice", 72, 2015, "low", 1, 0, 4.0, 158),
    ("MediNova Hospitals", "Kolkata", "West Bengal", "Multi-speciality", 410, 2002, "medium", 1, 1, 4.3, 1204),
    ("PrimeHealth Clinic", "Surat", "Gujarat", "Primary Care", 55, 2017, "low", 0, 0, 4.2, 174),
    ("Sarthi Polyclinic", "Nagpur", "Maharashtra", "Orthopaedics", 88, 2012, "medium", 1, 0, 4.4, 246),
    ("Veda Health & Wellness", "Indore", "Madhya Pradesh", "Integrative Care", 60, 2014, "low", 0, 0, 4.5, 133),
    ("Nirmaya Hospital", "Coimbatore", "Tamil Nadu", "Women's Health", 210, 2008, "medium", 1, 1, 4.6, 520),
    ("Asha Health Centre", "Kochi", "Kerala", "Primary Care", 42, 2019, "low", 0, 0, 4.1, 71),
    ("Tridev Medical", "Indore", "Madhya Pradesh", "Orthopaedics", 76, 2013, "medium", 0, 0, 4.3, 198),
    ("CureWell Clinic", "Bhopal", "Madhya Pradesh", "Family Medicine", 58, 2015, "low", 1, 0, 4.0, 129),
    ("Zenith Care Hospital", "Bhubaneswar", "Odisha", "Multi-speciality", 260, 2007, "medium", 1, 1, 4.4, 702),
    ("Amrita Health", "Madurai", "Tamil Nadu", "Women's Health", 92, 2014, "medium", 0, 0, 4.2, 214),
    ("Unity Medical Centre", "Rajkot", "Gujarat", "Primary Care", 50, 2016, "low", 0, 0, 4.0, 108),
    ("Sapphire Diagnostics", "Nashik", "Maharashtra", "Diagnostics", 110, 2012, "medium", 1, 1, 4.5, 377),
    ("Srijan Polyclinic", "Patna", "Bihar", "General Practice", 38, 2018, "low", 0, 0, 4.1, 84),
    ("Ayushman Health", "Bhavnagar", "Gujarat", "Primary Care", 45, 2017, "medium", 0, 0, 3.9, 117),
    ("MetroCare Hospital", "Visakhapatnam", "Andhra Pradesh", "Emergency Care", 190, 2010, "medium", 1, 1, 4.2, 456),
    ("BlueSky Clinic", "Chandigarh", "Punjab", "Physiotherapy", 33, 2020, "low", 0, 0, 4.4, 62),
    ("Arogyam Health", "Varanasi", "Uttar Pradesh", "AYUSH", 44, 2016, "low", 0, 0, 4.0, 91),
    ("HealBridge Hospital", "Jodhpur", "Rajasthan", "Multi-speciality", 150, 2009, "medium", 1, 0, 4.1, 388),
    ("Kosarva Clinic", "Thane", "Maharashtra", "Cardiology", 68, 2013, "medium", 0, 0, 4.3, 176),
    ("Jeevani Hospital", "Guwahati", "Assam", "Multi-speciality", 130, 2011, "medium", 1, 0, 4.2, 302),
    ("Derma Glow Clinic", "Ludhiana", "Punjab", "Dermatology", 29, 2021, "low", 0, 0, 4.6, 47),
    ("Sanjeevani Diagnostics", "Meerut", "Uttar Pradesh", "Diagnostics", 84, 2014, "medium", 1, 0, 4.0, 205),
    ("Prana Health & Wellness", "Udaipur", "Rajasthan", "Wellness", 36, 2018, "low", 0, 0, 4.4, 73),
    ("CityMed Clinic", "Kanpur", "Uttar Pradesh", "Primary Care", 41, 2017, "medium", 0, 0, 3.9, 88),
    ("SpringLeaf Clinic", "Ranchi", "Jharkhand", "Pediatrics", 47, 2015, "medium", 1, 0, 4.1, 132),
    ("Lotus Care Hospital", "Kozhikode", "Kerala", "Multi-speciality", 175, 2008, "medium", 1, 1, 4.3, 498),
    ("Vantage Health", "Guntur", "Andhra Pradesh", "Orthopaedics", 63, 2015, "medium", 0, 0, 4.0, 111),
    ("Riverstone Clinic", "Dehradun", "Uttarakhand", "General Practice", 27, 2020, "low", 0, 0, 4.2, 39),
    ("GenX Diagnostics", "Warangal", "Telangana", "Diagnostics", 71, 2016, "medium", 1, 0, 3.8, 156),
    ("Aashray Hospital", "Jamshedpur", "Jharkhand", "Emergency Care", 140, 2010, "medium", 1, 0, 4.0, 287),
    ("Elevate Care Clinic", "Amritsar", "Punjab", "Physiotherapy", 32, 2019, "low", 0, 0, 4.3, 58),
    ("Nirmal Eye Hospital", "Durgapur", "West Bengal", "Ophthalmology", 98, 2012, "medium", 1, 0, 4.1, 231),
    ("Orchid Wellness", "Thrissur", "Kerala", "Women's Health", 54, 2014, "medium", 0, 0, 4.4, 142),
    ("Southern Cross Clinic", "Mysuru", "Karnataka", "Multi-speciality", 102, 2011, "medium", 1, 1, 4.0, 265),
    ("Pinnacle Ortho Centre", "Raipur", "Chhattisgarh", "Orthopaedics", 61, 2013, "medium", 0, 0, 3.9, 122),
    ("Vitality Health", "Jalandhar", "Punjab", "Primary Care", 39, 2016, "medium", 0, 0, 4.0, 74),
    ("GreenLeaf Ayurveda", "Thiruvananthapuram", "Kerala", "Ayurveda", 26, 2018, "low", 0, 0, 4.7, 41),
    ("Metro Multispeciality", "Nellore", "Andhra Pradesh", "Multi-speciality", 120, 2012, "medium", 1, 0, 3.8, 214),
    ("Sunrise Medical Centre", "Gorakhpur", "Uttar Pradesh", "Pediatrics", 48, 2015, "medium", 0, 0, 4.1, 97),
]

# Scores: 24 qualified (>=63), 23 pruned by the Qualification agent.
QUALIFIED_SCORES = [
    96, 93, 89, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71,
    69, 68, 67, 66, 65, 64, 63,
]
PRUNED_SCORES = [
    62, 61, 60, 58, 57, 55, 54, 52, 51, 49, 48, 46, 45, 43, 42, 40, 38,
    37, 35, 34, 32, 30, 28,
]

GENERIC_PREFIXES = [
    "Northwind", "Vertex", "Lumen", "Orbit", "Brightway", "Core", "Summit",
    "Bluepeak", "Cedar", "Ironwood", "Meridian", "Apex", "Harbour", "Stonebridge",
    "Clearwater", "Redwood", "Copperfield", "Highland", "Silverline", "Kestrel",
]
GENERIC_SUFFIXES = {
    "saas": ["Labs", "Systems", "Stack", "Works", "Software", "Cloud"],
    "real estate": ["Properties", "Estates", "Realty", "Homes", "Advisors"],
    "restaurant": ["Kitchen", "Bistro", "Cafe", "Table", "House"],
    "legal": ["Associates", "Law Group", "Counsel", "Chambers"],
    "manufacturing": ["Industries", "Fabrication", "Engineering", "Components"],
    "education": ["Academy", "Institute", "Learning", "Studios"],
    "finance": ["Advisory", "Capital", "Partners", "Financial"],
    "fitness": ["Fitness", "Performance", "Athletic Club", "Training"],
    "retail": ["Retail", "Trading", "Store", "Outlet"],
    "automotive": ["Motors", "Auto Works", "Automotive", "Garage"],
    "consulting": ["Consulting", "Advisory", "Partners", "Group"],
    "logistics": ["Logistics", "Freight", "Supply Co", "Cargo"],
}
GENERIC_CITIES = [
    ("Bengaluru", "Karnataka"), ("Pune", "Maharashtra"), ("Hyderabad", "Telangana"),
    ("Chennai", "Tamil Nadu"), ("Mumbai", "Maharashtra"), ("Delhi", "Delhi"),
    ("Ahmedabad", "Gujarat"), ("Jaipur", "Rajasthan"), ("Kochi", "Kerala"),
    ("Indore", "Madhya Pradesh"), ("Nagpur", "Maharashtra"), ("Lucknow", "Uttar Pradesh"),
    ("Surat", "Gujarat"), ("Bhopal", "Madhya Pradesh"), ("Coimbatore", "Tamil Nadu"),
]


def tier_for(score: int) -> str:
    if score >= 88:
        return "Very High"
    if score >= 80:
        return "High"
    if score >= 70:
        return "Medium"
    return "Low"


def _domain(name: str) -> str:
    slug = (
        name.lower()
        .replace("&", "and")
        .replace("'", "")
        .replace(" ", "")
        .replace(".", "")
    )
    slug = "".join(ch for ch in slug if ch.isalnum())
    return f"{slug[:22]}.co.in"


def _research_source(rng: random.Random, name: str) -> tuple[str, str]:
    """Returns (source_name, source_url) for the evidence trail."""
    sources = [
        ("Company website", f"https://{_domain(name)}"),
        ("Google Business Profile", f"https://g.page/{name.lower().replace(' ', '-')[:18]}"),
        ("Justdial listing", f"https://www.justdial.com/{name.split()[0].lower()}/"),
        ("IndiaMART company profile", f"https://www.indiamart.com/{name.split()[0].lower()}/"),
        ("Practo clinic listing", f"https://www.practo.com/{name.split()[0].lower()}/"),
        ("Google Reviews aggregate", f"https://reviews.example/{name.split()[0].lower()}"),
    ]
    return rng.choice(sources)


def healthcare_candidates() -> list[dict[str, Any]]:
    """Full curated healthcare universe, ordered by discovery (not rank)."""
    rows: list[dict[str, Any]] = []
    all_scores = QUALIFIED_SCORES + PRUNED_SCORES
    for index, row in enumerate(HEALTHCARE):
        name, city, state, specialty, employees, founded, web, booking, mobile, rating, reviews = row
        score = all_scores[index] if index < len(all_scores) else 40
        rows.append(
            {
                "name": name,
                "city": city,
                "state": state,
                "location": f"{city}, {state}",
                "industry": "Healthcare",
                "specialty": specialty,
                "employees": employees,
                "founded": str(founded),
                "website_quality": web,
                "has_booking": bool(booking),
                "mobile_optimised": bool(mobile),
                "rating": rating,
                "reviews": reviews,
                "activity_index": score,
            }
        )
    return rows


def generic_candidates(industry: str, location: str, count: int) -> list[dict[str, Any]]:
    """Deterministic synthetic universe for any other industry / location."""
    key = industry.lower().strip() or "consulting"
    suffixes = GENERIC_SUFFIXES.get(key, GENERIC_SUFFIXES["consulting"])
    rng = random.Random(f"{key}|{location}|{count}")
    rows: list[dict[str, Any]] = []
    for i in range(count):
        prefix = GENERIC_PREFIXES[i % len(GENERIC_PREFIXES)]
        suffix = suffixes[(i // len(GENERIC_PREFIXES)) % len(suffixes)]
        city, state = GENERIC_CITIES[i % len(GENERIC_CITIES)]
        rows.append(
            {
                "name": f"{prefix} {suffix}",
                "city": city,
                "state": state,
                "location": f"{city}, {state}",
                "industry": industry.title() if industry else "Services",
                "specialty": suffix,
                "employees": rng.randint(12, 260),
                "founded": str(rng.randint(1998, 2021)),
                "website_quality": rng.choice(["low", "low", "medium", "medium", "high"]),
                "has_booking": bool(rng.getrandbits(1)),
                "mobile_optimised": bool(rng.getrandbits(1)),
                "rating": round(rng.uniform(3.6, 4.8), 1),
                "reviews": rng.randint(18, 980),
                "activity_index": rng.randint(45, 96),
            }
        )
    return rows


def website_health(website_quality: str, mobile: bool, booking: bool) -> dict[str, Any]:
    """Derived digital-presence profile used by the Analyst agent."""
    key = str(website_quality or "medium").strip().lower()
    base = {"low": 34, "medium": 58, "high": 84}.get(key, 58)
    if mobile:
        base += 9
    if booking:
        base += 7
    return {
        "website_quality": website_quality.title(),
        "digital_presence": "Low" if base < 45 else ("Medium" if base < 70 else "High"),
        "seo_readiness": "Low" if base < 45 else ("Medium" if base < 70 else "High"),
        "booking_capability": "Available" if booking else "Not detected",
        "mobile_optimised": "Yes" if mobile else "No",
        "health_index": max(8, min(97, base)),
    }
