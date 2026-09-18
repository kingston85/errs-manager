#!/usr/bin/env python3
"""
Build the ERRS Environmental & Public Health Dashboard workbook.

Produces a fully-formatted Excel workbook (exports/ERRS-Health-Dashboard.xlsx) for the
Environmental Research and Radiation Safety (ERRS) Department of Liberia's Environmental
Protection Agency. The workbook mirrors the health-relevant data the ERRS Manager app
already tracks: lab results measured against safety limits, environmental health
complaints (with illness cases reported), facility inspections, and radiation worker
protection.

Sheets
  1. Dashboard            -- KPI cards + native Excel charts, all driven by live formulas
  2. Lab Results          -- one row per sample tested against a limit
  3. Health Complaints    -- one row per complaint, with illness cases and resolution time
  4. Facility Inspections -- one row per site inspection, with a health risk score
  5. Radiation Safety     -- one row per licensed facility, dose + PPE + calibration status
  6. Reference            -- thresholds and controlled lists (feeds the dropdowns)
  7. CalcData             -- the engine: every chart and KPI aggregates from here
  8. Read Me              -- how to use, and how to swap in real data

Every number on the Dashboard is a live formula (COUNTIFS / SUMIFS / AVERAGEIFS over the
data sheets), so editing or pasting in real records updates the KPIs and charts. The
sample data ships pre-filled, and is illustrative only -- see the Read Me sheet.

Two implementation notes for whoever maintains this:
  * Formulas are written with openpyxl, which does not calculate them. To make the file
    display correctly even in viewers that never recalculate, every formula is also given
    its Python-computed cached value (function `_inject_cached_values`). Excel still
    recalculates on open (`fullCalcOnLoad`), so the cached values can never go stale in
    the app that matters.
  * Column letters are resolved from the sheet specs below rather than hard-coded, so
    inserting a column in a data sheet does not silently break the aggregates.

Usage:  python3 scripts/build_health_dashboard.py [output_path]
Requires: openpyxl  (pip install openpyxl)
"""

from __future__ import annotations

import os
import random
import re
import shutil
import sys
import zipfile
from datetime import date, timedelta
from xml.sax.saxutils import escape as xml_escape

from openpyxl import Workbook, load_workbook
from openpyxl.chart import BarChart, DoughnutChart, LineChart, Reference
from openpyxl.chart.data_source import AxDataSource, StrRef
from openpyxl.chart.label import DataLabelList
from openpyxl.comments import Comment
from openpyxl.chart.marker import Marker
from openpyxl.formatting.rule import CellIsRule, ColorScaleRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

# --------------------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------------------

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUT = os.path.join(REPO_ROOT, "exports", "ERRS-Health-Dashboard.xlsx")

REPORT_YEAR = 2026
MONTHS = list(range(1, 9))          # January - August 2026 (data through 31 Aug 2026)
MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                "Sep", "Oct", "Nov", "Dec"]
DATA_AS_OF = f"data through 31 August {REPORT_YEAR}"

# Palette
INK = "1F2A2E"
TEAL_DARK = "0E5C4A"
TEAL = "12775F"
TEAL_PALE = "E7F1EE"
AMBER = "E8A33D"
RED = "C0392B"
BLUE = "2E6E9E"
GREEN = "3E8E5A"
GREY = "6B7A80"
CARD_BG = "F4F9F7"
WHITE = "FFFFFF"
BAND = "F7FAF9"

THIN = Side(style="thin", color="D3DED9")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

FMT_INT = "#,##0"
FMT_PCT = "0.0%"
FMT_RATIO = "0.00"
FMT_DATE = "yyyy-mm-dd"
FMT_DOSE = "0.0"


# --------------------------------------------------------------------------------------
# Controlled vocabulary + thresholds
# --------------------------------------------------------------------------------------

# (parameter, unit, limit_min, limit_max, basis)
PARAMS = {
    "Water": [
        ("Total Coliform", "CFU/100 mL", 0, 0, "WHO drinking-water guideline"),
        ("E. coli", "CFU/100 mL", 0, 0, "WHO drinking-water guideline"),
        ("Nitrate (as NO3)", "mg/L", 0, 10, "WHO drinking-water guideline"),
        ("Arsenic", "mg/L", 0, 0.01, "WHO drinking-water guideline"),
        ("Lead", "mg/L", 0, 0.01, "WHO drinking-water guideline"),
        ("Manganese", "mg/L", 0, 0.4, "WHO drinking-water guideline"),
        ("Iron", "mg/L", 0, 0.3, "WHO guideline (aesthetic)"),
        ("Turbidity", "NTU", 0, 5, "WHO drinking-water guideline"),
    ],
    "Soil": [
        ("Lead", "mg/kg", 0, 100, "US EPA regional screening level (residential)"),
        ("Arsenic", "mg/kg", 0, 20, "US EPA regional screening level (residential)"),
        ("Mercury", "mg/kg", 0, 1, "US EPA regional screening level (residential)"),
        ("Cadmium", "mg/kg", 0, 3, "US EPA regional screening level (residential)"),
    ],
    "Air": [
        ("PM2.5", "ug/m3", 0, 25, "WHO 24-hour air quality guideline"),
        ("PM10", "ug/m3", 0, 50, "WHO 24-hour air quality guideline"),
        ("Nitrogen Dioxide (NO2)", "ug/m3", 0, 40, "WHO annual air quality guideline"),
        ("Sulphur Dioxide (SO2)", "ug/m3", 0, 125, "WHO 24-hour air quality guideline"),
    ],
    "Ambient Radiation": [
        ("Gamma Dose Rate", "uSv/h", 0, 0.3, "IAEA reference level - public exposure"),
    ],
}

MEDIA = ["Water", "Soil", "Air", "Ambient Radiation"]

SOURCE_TYPES = {
    "Water": ["Community Borehole", "Hand-Dug Well", "River / Stream Intake",
              "Public Tap Stand", "Health Facility Supply", "School Water Point"],
    "Soil": ["Farmland", "School Grounds", "Playground", "Dumpsite Perimeter",
             "Industrial Site"],
    "Air": ["Urban Roadside", "Industrial Perimeter", "Residential Area",
            "Dumpsite Perimeter", "Market Area"],
    "Ambient Radiation": ["Medical Facility", "Industrial Site", "Dumpsite Perimeter",
                          "Urban Background"],
}

COMPLAINT_TYPES = [
    "Drinking Water Contamination",
    "Air Quality / Smoke & Dust",
    "Sanitation",
    "Waste Dumping",
    "Noise",
    "Chemical Exposure",
]

COMPLAINT_STATUSES = ["Received", "Investigating", "Findings Presented", "Closed"]
SEVERITIES = ["Low", "Medium", "High", "Critical"]
FACILITY_TYPES = ["Hospital / Clinic", "Industrial Plant", "Water Treatment / Supply",
                  "School", "Mining Site", "Waste Facility"]
INSPECTION_OUTCOMES = ["Compliant", "Non-Compliant", "Pending Review"]
DOSE_LIMIT_MSV = 20.0  # IAEA occupational annual effective dose limit

# County : (weight, [communities], [health facilities])
COUNTIES = {
    "Montserrado": (0.24, ["Paynesville", "Sinkor", "Brewerville", "Caldwell", "West Point",
                           "Gardnersville", "Johnsonville", "New Kru Town"],
                    ["Redemption Hospital", "JFK Memorial Hospital", "St. Joseph's Catholic Hospital",
                     "Benson Hospital"]),
    "Nimba": (0.16, ["Ganta", "Saclepea", "Karnplay", "Tappita", "Yekepa", "Butuo"],
              ["Ganta United Methodist Hospital", "Tappita Referral Hospital",
               "Saclepea Health Center"]),
    "Bong": (0.12, ["Gbarnga", "Salala", "Palala", "Suakoko", "Totota"],
             ["Phebe Hospital", "Gbarnga Health Center", "Suakoko Clinic"]),
    "Grand Bassa": (0.10, ["Buchanan", "Edina", "St. John River", "Owensgrove"],
                    ["Buchanan Government Hospital", "Edina Health Center"]),
    "Margibi": (0.09, ["Kakata", "Harbel", "Firestone", "Dolo Town", "Weala"],
                ["C.H. Rennie Hospital", "Harbel Health Center"]),
    "Lofa": (0.08, ["Voinjama", "Zorzor", "Foya", "Kolahun"],
             ["Curran Lutheran Hospital", "Foya Health Center", "Zorzor Hospital"]),
    "Grand Cape Mount": (0.06, ["Robertsport", "Sinje", "Tieni", "Bomi Hills"],
                         ["St. Timothy Hospital", "Sinje Health Center"]),
    "Sinoe": (0.05, ["Greenville", "Butaw", "Juazon"],
              ["F.J. Grante Hospital", "Greenville Health Center"]),
    "Grand Gedeh": (0.04, ["Zwedru", "Toe Town", "B'hai"],
                    ["Martha Tubman Memorial Hospital", "Zwedru Health Center"]),
    "Bomi": (0.03, ["Tubmanburg", "Klay", "Suehn-Mecca"],
             ["Bomi County Health Center", "Klay Clinic"]),
    "Maryland": (0.02, ["Harper", "Pleebo", "Karloken"],
                 ["Harper Hospital", "Pleebo Health Center"]),
    "Gbarpolu": (0.01, ["Bopolu", "Kongba"],
                 ["Bopolu Health Center"]),
}
COUNTY_LIST = list(COUNTIES.keys())
CHART_COUNTIES = COUNTY_LIST[:8]  # the eight with the most national monitoring coverage

INDUSTRIAL_SITES = [
    "Firestone Rubber Plantation", "ArcelorMittal Buchanan", "Bea Mountain Mining",
    "China Union Bong Mines", "Golden Veroleum Palm Oil", "Cavalla Rubber Corporation",
    "Liberia Cement Corporation", "Monrovia Breweries", "Liberia Petroleum Refinery",
    "Buchanan Port Terminal", "Nimba Western Range Iron Ore", "Maryland Oil Palm Estate",
]

RADIATION_FACILITIES = [
    ("JFK Memorial Hospital - Radiology", "Montserrado", "Medical"),
    ("JFK Memorial Hospital - Radiotherapy", "Montserrado", "Medical"),
    ("Redemption Hospital - Radiology", "Montserrado", "Medical"),
    ("St. Joseph's Catholic Hospital - Radiology", "Montserrado", "Medical"),
    ("C.H. Rennie Hospital - Radiology", "Margibi", "Medical"),
    ("Phebe Hospital - Radiology", "Bong", "Medical"),
    ("Ganta United Methodist Hospital - Radiology", "Nimba", "Medical"),
    ("Tappita Referral Hospital - Radiology", "Nimba", "Medical"),
    ("Buchanan Government Hospital - Radiology", "Grand Bassa", "Medical"),
    ("Curran Lutheran Hospital - Radiology", "Lofa", "Medical"),
    ("St. Timothy Hospital - Radiology", "Grand Cape Mount", "Medical"),
    ("Harper Hospital - Radiology", "Maryland", "Medical"),
    ("Martha Tubman Memorial Hospital - Radiology", "Grand Gedeh", "Medical"),
    ("F.J. Grante Hospital - Radiology", "Sinoe", "Medical"),
    ("Bomi County Health Center - Radiology", "Bomi", "Medical"),
    ("Pleebo Health Center - Radiology", "Maryland", "Medical"),
    ("Saclepea Health Center - Radiology", "Nimba", "Medical"),
    ("Foya Health Center - Radiology", "Lofa", "Medical"),
    ("Zwedru Health Center - Radiology", "Grand Gedeh", "Medical"),
    ("Bopolu Health Center - Radiology", "Gbarpolu", "Medical"),
    ("Liberia Cement Corporation - Level Gauge", "Montserrado", "Industrial"),
    ("Monrovia Breweries - Level Gauge", "Montserrado", "Industrial"),
    ("ArcelorMittal Buchanan - Density Gauge", "Grand Bassa", "Industrial"),
    ("Bea Mountain Mining - Density Gauge", "Grand Cape Mount", "Industrial"),
    ("China Union Bong Mines - Density Gauge", "Bong", "Industrial"),
    ("Nimba Western Range Iron Ore - Level Gauge", "Nimba", "Industrial"),
    ("Firestone Rubber Plantation - Thickness Gauge", "Margibi", "Industrial"),
    ("Golden Veroleum Palm Oil - Level Gauge", "Sinoe", "Industrial"),
    ("Cavalla Rubber Corporation - Density Gauge", "Grand Bassa", "Industrial"),
    ("Buchanan Port Terminal - Baggage Scanner", "Grand Bassa", "Industrial"),
    ("Liberia Petroleum Refinery - Level Gauge", "Montserrado", "Industrial"),
    ("Nimba Western Range - Portable Moisture Gauge", "Nimba", "Industrial"),
    ("Environmental Protection Agency - XRF Analyser", "Montserrado", "Environmental"),
    ("Liberia Geological Survey - XRF Analyser", "Montserrado", "Environmental"),
    ("University of Liberia - Gamma Spectroscopy", "Montserrado", "Environmental"),
    ("Cuttington University - XRF Analyser", "Bong", "Environmental"),
    ("ERRS Department - Field Survey Meter", "Montserrado", "Environmental"),
    ("ERRS Department - Portable Dose Rate Meter", "Montserrado", "Environmental"),
    ("Mining Cadastre Office - Density Gauge", "Montserrado", "Environmental"),
    ("National Standards Laboratory - Industrial Radiography", "Montserrado", "Environmental"),
    ("Sinoe Oil Palm Estate - Level Gauge", "Sinoe", "Industrial"),
    ("Grand Bassa Community College - XRF Analyser", "Grand Bassa", "Environmental"),
]

ANALYSTS = ["A. Kollie", "M. Toe", "J. Nyeman", "F. Gbato", "S. Dolo", "P. Wleh",
            "E. Sebo", "B. Kpadeh", "T. Mulbah", "H. Zolia"]
INSPECTORS = ["A. Kollie", "M. Toe", "S. Dolo", "F. Gbato", "D. Yarkpawolo", "L. Gbessay"]

# Rainy season (May-Oct) raises waterborne and sanitation complaints; the dry season
# (Dec-Mar) raises dust/smoke complaints. This is what gives the trend charts shape.
SEASON_WATER_RISK = {1: 0.75, 2: 0.70, 3: 0.80, 4: 1.00, 5: 1.35, 6: 1.55,
                     7: 1.70, 8: 1.60, 9: 1.45, 10: 1.25, 11: 1.00, 12: 0.80}
SEASON_AIR_RISK = {1: 1.55, 2: 1.60, 3: 1.45, 4: 1.15, 5: 0.85, 6: 0.75,
                   7: 0.70, 8: 0.75, 9: 0.85, 10: 1.00, 11: 1.25, 12: 1.45}


def weighted_choice(rng: random.Random, pairs):
    """pairs = [(item, weight), ...]"""
    total = sum(w for _, w in pairs)
    cut = rng.random() * total
    upto = 0.0
    for item, w in pairs:
        upto += w
        if upto >= cut:
            return item
    return pairs[-1][0]


def month_bounds(month: int):
    start = date(REPORT_YEAR, month, 1)
    end = date(REPORT_YEAR, month + 1, 1) - timedelta(days=1) if month < 12 \
        else date(REPORT_YEAR, 12, 31)
    return start, end


def rand_date(rng: random.Random, month: int) -> date:
    start, end = month_bounds(month)
    return start + timedelta(days=rng.randint(0, (end - start).days))


def round_sig(value: float, limit: float) -> float:
    """Round a measurement to a sensible number of decimals for its magnitude."""
    if limit == 0:
        return float(round(value))
    if limit >= 100:
        return round(value, 0)
    if limit >= 1:
        return round(value, 1)
    if limit >= 0.1:
        return round(value, 2)
    return round(value, 4)


# --------------------------------------------------------------------------------------
# Sample data generation (deterministic -- same file every run)
# --------------------------------------------------------------------------------------

def generate_lab_results(rng: random.Random):
    rows = []
    seq = 0
    for month in MONTHS:
        n = rng.randint(64, 72)
        for _ in range(n):
            seq += 1
            medium = weighted_choice(rng, [("Water", 54), ("Soil", 14), ("Air", 24),
                                           ("Ambient Radiation", 8)])
            if medium in ("Soil", "Air") and rng.random() < 0.22:
                source = "Industrial Perimeter"
                county = rng.choice(["Montserrado", "Nimba", "Bong", "Grand Bassa"]
                                    if medium == "Air" else ["Nimba", "Grand Bassa", "Bong"])
                site = rng.choice(INDUSTRIAL_SITES)
            else:
                county = weighted_choice(rng, [(c, w) for c, (w, _, _) in COUNTIES.items()])
                community = rng.choice(COUNTIES[county][1])
                source = rng.choice(SOURCE_TYPES[medium])
                site = f"{community} - {source}"

            param, unit, lo, hi, _basis = rng.choice(PARAMS[medium])

            # Exceedance probability: peaks in the rainy season for water/soil (runoff and
            # flooding), in the dry season for air (dust), and is worse at industrial sites.
            base = {"Water": 0.20, "Soil": 0.13, "Air": 0.17, "Ambient Radiation": 0.05}[medium]
            if medium in ("Water", "Soil"):
                base *= SEASON_WATER_RISK[month]
            elif medium == "Air":
                base *= SEASON_AIR_RISK[month]
            if "Industrial" in site or site in INDUSTRIAL_SITES:
                base *= 1.8
            if "Dumpsite" in source:
                base *= 1.5
            base = min(base, 0.75)

            exceeds = rng.random() < base
            if hi == 0:  # zero-tolerance parameters (coliforms / E. coli)
                result = 0.0 if not exceeds else float(rng.randint(1, 45))
            elif exceeds:
                result = round_sig(hi * rng.uniform(1.05, 3.6), hi)
            else:
                result = round_sig(hi * rng.uniform(0.02, 0.95), hi)

            population = 0
            if medium == "Water":
                population = rng.choice([120, 240, 350, 500, 750, 900, 1200, 1800, 2500, 4200])
            elif medium in ("Soil", "Air"):
                population = rng.choice([0, 0, 200, 450, 800, 1500, 2200, 3500, 6000])

            facility = rng.choice(COUNTIES[county][2])
            d = rand_date(rng, month)
            prefix = {"Water": "WQ", "Soil": "SL", "Air": "AQ",
                      "Ambient Radiation": "RD"}[medium]
            rows.append({
                "id": f"{prefix}-{REPORT_YEAR}-{seq:05d}",
                "date": d,
                "month": month,
                "county": county,
                "site": site,
                "source": source,
                "medium": medium,
                "param": param,
                "result": result,
                "unit": unit,
                "limit_min": float(lo),
                "limit_max": float(hi),
                "within": "Yes" if (lo <= result <= hi) else "No",
                "ratio": (result / hi) if hi else None,
                "population": population,
                "facility": facility,
                "analyst": rng.choice(ANALYSTS),
            })
    return rows


def generate_complaints(rng: random.Random):
    rows = []
    seq = 0
    for month in MONTHS:
        n = rng.randint(10, 15)
        for _ in range(n):
            seq += 1
            ctype = weighted_choice(rng, [
                ("Drinking Water Contamination", 26 * SEASON_WATER_RISK[month] / 1.2),
                ("Sanitation", 18 * SEASON_WATER_RISK[month] / 1.2),
                ("Air Quality / Smoke & Dust", 20 * SEASON_AIR_RISK[month] / 1.2),
                ("Waste Dumping", 16),
                ("Noise", 12),
                ("Chemical Exposure", 8),
            ])
            county = weighted_choice(rng, [(c, w) for c, (w, _, _) in COUNTIES.items()])
            community = rng.choice(COUNTIES[county][1])

            if ctype == "Drinking Water Contamination":
                cases = rng.choice([0, 4, 8, 12, 18, 25, 34, 47, 62])
                desc = (f"Residents report discoloured water with an odour from the "
                        f"{rng.choice(['community hand pump', 'public tap stand', 'shallow well'])}; "
                        f"suspected faecal contamination after heavy rain.")
            elif ctype == "Sanitation":
                cases = rng.choice([0, 3, 6, 11, 17, 24, 33])
                desc = ("Overflowing latrine / open defecation near a dwelling; residents "
                        "report diarrhoeal illness, mostly in children under five.")
            elif ctype == "Air Quality / Smoke & Dust":
                cases = rng.choice([0, 2, 5, 9, 14, 21, 30])
                desc = (f"Dust and smoke from {rng.choice(['unpaved haul road', 'open burning of waste', 'charcoal production', 'clinker handling'])}; "
                        f"households report coughing and eye irritation.")
            elif ctype == "Waste Dumping":
                cases = rng.choice([0, 0, 1, 3, 6, 9])
                desc = ("Unauthorised dumping of mixed and medical waste on vacant land; "
                        "scavenging by children reported.")
            elif ctype == "Noise":
                cases = rng.choice([0, 0, 0, 1, 2])
                desc = (f"Continuous low-frequency noise at night from "
                        f"{rng.choice(['a generator set', 'crushing plant', 'night-time haulage'])}.")
            else:
                cases = rng.choice([0, 1, 2, 4, 6, 9])
                desc = ("Possible chemical exposure reported after handling of unlabelled "
                        "containers at a nearby facility.")

            # Severity follows reported illness burden, so the two columns agree.
            if cases >= 30:
                severity = "Critical"
            elif cases >= 12:
                severity = "High"
            elif cases >= 3:
                severity = "Medium"
            else:
                severity = "Low"

            status = weighted_choice(rng, [("Closed", 54), ("Findings Presented", 16),
                                           ("Investigating", 20), ("Received", 10)])
            received = rand_date(rng, month)
            closed = None
            if status == "Closed":
                span = {"Drinking Water Contamination": (5, 30),
                        "Sanitation": (6, 35),
                        "Air Quality / Smoke & Dust": (4, 25),
                        "Waste Dumping": (7, 40),
                        "Noise": (3, 18),
                        "Chemical Exposure": (10, 45)}[ctype]
                closed = received + timedelta(days=rng.randint(*span))

            rows.append({
                "id": f"HC-{REPORT_YEAR}-{seq:04d}",
                "date": received,
                "month": month,
                "county": county,
                "community": community,
                "type": ctype,
                "desc": desc,
                "cases": cases,
                "severity": severity,
                "status": status,
                "closed": closed,
                "days": (closed - received).days if closed else None,
                "linked": "Yes" if (ctype in ("Drinking Water Contamination", "Sanitation")
                                    and cases > 0) else "No",
                "action": {
                    "Drinking Water Contamination":
                        "Water point sampled; chlorination advised; community sensitised on boiling.",
                    "Sanitation":
                        "Referred to county health team; latrine disinfection and clean-up ordered.",
                    "Air Quality / Smoke & Dust":
                        "Air sampling conducted; operator directed to suppress dust and stop open burning.",
                    "Waste Dumping":
                        "Dumpsite cleared; warning notice served; monthly surveillance added.",
                    "Noise":
                        "Noise measurement taken; operator advised on night-time operating hours.",
                    "Chemical Exposure":
                        "Site visited with Chemical Unit; containers secured for inventory audit.",
                }[ctype],
            })
    return rows


def generate_inspections(rng: random.Random):
    rows = []
    seq = 0
    for month in MONTHS:
        n = rng.randint(8, 11)
        for _ in range(n):
            seq += 1
            county = weighted_choice(rng, [(c, w) for c, (w, _, _) in COUNTIES.items()])
            if rng.random() < 0.45:
                facility = rng.choice(INDUSTRIAL_SITES)
                ftype = weighted_choice(rng, [("Mining Site", 40), ("Industrial Plant", 60)])
            elif rng.random() < 0.5:
                facility = rng.choice(COUNTIES[county][2])
                ftype = "Hospital / Clinic"
            else:
                facility = f"{rng.choice(COUNTIES[county][1])} Community Water Point"
                ftype = weighted_choice(rng, [("Water Treatment / Supply", 60),
                                              ("School", 25), ("Waste Facility", 15)])

            risk_bump = 0.10 if ftype in ("Mining Site", "Industrial Plant", "Waste Facility") else 0.0
            outcome = weighted_choice(rng, [("Compliant", 60 - risk_bump * 100),
                                            ("Non-Compliant", 30 + risk_bump * 100),
                                            ("Pending Review", 10)])
            if outcome == "Compliant":
                score = rng.choice([1, 2, 2, 3, 3, 4])
            elif outcome == "Pending Review":
                score = rng.choice([4, 5, 5, 6])
            else:
                score = rng.choice([6, 7, 7, 8, 8, 9, 10])

            findings = {
                "Compliant": rng.choice([
                    "Limits and record-keeping in order; no corrective action required.",
                    "Minor housekeeping notes given; no compliance gap identified.",
                    "Monitoring records complete for the period under review.",
                ]),
                "Pending Review": rng.choice([
                    "Sampling results awaited before a compliance decision is made.",
                    "Laboratory analysis pending; interim control measures advised.",
                ]),
                "Non-Compliant": rng.choice([
                    "Effluent / runoff discharged without treatment; abatement notice served.",
                    "Waste stored uncovered on site; corrective action plan requested.",
                    "Radiation warning signage and access control missing at source store.",
                    "Water supply point unprotected; risk of contamination confirmed.",
                    "Monitoring records not maintained for the reporting period.",
                ]),
            }[outcome]

            follow_up = "Yes" if outcome in ("Non-Compliant", "Pending Review") else "No"
            follow_done = "Yes" if (follow_up == "Yes" and rng.random() < 0.62) else "No"

            rows.append({
                "id": f"SI-{REPORT_YEAR}-{seq:04d}",
                "date": rand_date(rng, month),
                "month": month,
                "county": county,
                "facility": facility,
                "ftype": ftype,
                "outcome": outcome,
                "score": score,
                "findings": findings,
                "follow_up": follow_up,
                "follow_done": follow_done,
                "inspector": rng.choice(INSPECTORS),
            })
    return rows


def generate_radiation(rng: random.Random):
    rows = []
    for name, county, ftype in RADIATION_FACILITIES:
        sources = rng.choice([1, 1, 2, 2, 3, 4, 5, 7])
        workers = rng.choice([2, 3, 4, 6, 8, 11, 14, 19, 26])
        # Most facilities sit well under the 20 mSv occupational limit; a small number
        # exceed it, which is exactly what the dose-compliance KPI exists to surface.
        if rng.random() < 0.08:
            dose = round(rng.uniform(20.4, 27.5), 1)
        else:
            dose = round(rng.uniform(0.2, 12.5), 1)
        ppe = round(rng.uniform(0.68, 1.0), 2)
        calibration = "Yes" if rng.random() < 0.86 else "No"
        rows.append({
            "facility": name,
            "county": county,
            "ftype": ftype,
            "sources": sources,
            "workers": workers,
            "dose": dose,
            "within_dose": "Yes" if dose <= DOSE_LIMIT_MSV else "No",
            "ppe": ppe,
            "calibration": calibration,
            "last_inventory": rand_date(rng, rng.choice(MONTHS)),
            "notes": rng.choice([
                "Licence current; next inventory due within 12 months.",
                "Source register complete; leak test scheduled.",
                "Dose records reviewed on site; filing to be improved.",
                "PPE stock low - resupply requested by facility.",
                "Instrument calibration overdue - follow-up inspection scheduled.",
            ]),
        })
    return rows


# --------------------------------------------------------------------------------------
# Python-side aggregation (mirrors the in-workbook formulas, for cached values)
# --------------------------------------------------------------------------------------

def aggregate(lab, complaints, inspections, radiation):
    def pct(n, d):
        return (n / d) if d else 0.0

    months = []
    for m in MONTHS:
        lr = [r for r in lab if r["month"] == m]
        cr = [r for r in complaints if r["month"] == m]
        within = sum(1 for r in lr if r["within"] == "Yes")
        exc = len(lr) - within
        months.append({
            "label": f"{MONTH_LABELS[m-1]} {REPORT_YEAR}",
            "num": m,
            "samples": len(lr),
            "within": within,
            "exceed": exc,
            "rate": pct(exc, len(lr)),
            "complaints": len(cr),
            "cases": sum(r["cases"] for r in cr),
        })
    totals = {
        "samples": sum(x["samples"] for x in months),
        "within": sum(x["within"] for x in months),
        "exceed": sum(x["exceed"] for x in months),
        "complaints": sum(x["complaints"] for x in months),
        "cases": sum(x["cases"] for x in months),
    }
    totals["rate"] = pct(totals["exceed"], totals["samples"])

    by_medium = []
    for med in MEDIA:
        lr = [r for r in lab if r["medium"] == med]
        within = sum(1 for r in lr if r["within"] == "Yes")
        by_medium.append({"medium": med, "samples": len(lr), "within": within,
                          "exceed": len(lr) - within, "pct_within": pct(within, len(lr))})

    by_param = []
    for med, plist in PARAMS.items():
        for (pname, unit, lo, hi, _b) in plist:
            pr = [r for r in lab if r["medium"] == med and r["param"] == pname]
            exc = sum(1 for r in pr if r["within"] == "No")
            ratios = [r["ratio"] for r in pr if r["ratio"] is not None]
            by_param.append({
                "param": pname, "medium": med, "samples": len(pr), "exceed": exc,
                "rate": pct(exc, len(pr)),
                "avg_ratio": (sum(ratios) / len(ratios)) if ratios else 0.0,
            })
    by_param.sort(key=lambda x: (-x["exceed"], -x["rate"]))
    top_params = by_param[:10]

    by_type = []
    for t in COMPLAINT_TYPES:
        cr = [c for c in complaints if c["type"] == t]
        days = [c["days"] for c in cr if c["days"] is not None]
        by_type.append({"type": t, "complaints": len(cr),
                        "cases": sum(c["cases"] for c in cr),
                        "avg_days": (sum(days) / len(days)) if days else 0.0})

    by_status = [{"status": s, "count": sum(1 for c in complaints if c["status"] == s)}
                 for s in COMPLAINT_STATUSES]

    by_county = []
    for c in CHART_COUNTIES:
        lr = [r for r in lab if r["county"] == c]
        cr = [c2 for c2 in complaints if c2["county"] == c]
        exc = sum(1 for r in lr if r["within"] == "No")
        by_county.append({"county": c, "samples": len(lr), "exceed": exc,
                          "rate": pct(exc, len(lr)), "complaints": len(cr),
                          "cases": sum(x["cases"] for x in cr)})
    other = [c for c in complaints if c["county"] not in CHART_COUNTIES]
    other_lab = [r for r in lab if r["county"] not in CHART_COUNTIES]
    other_exc = sum(1 for r in other_lab if r["within"] == "No")
    by_county.append({"county": "Other counties", "samples": len(other_lab),
                      "exceed": other_exc, "rate": pct(other_exc, len(other_lab)),
                      "complaints": len(other), "cases": sum(x["cases"] for x in other)})

    by_outcome = [{"outcome": o, "count": sum(1 for i in inspections if i["outcome"] == o)}
                  for o in INSPECTION_OUTCOMES]
    by_ftype = []
    for ft in FACILITY_TYPES:
        fr = [i for i in inspections if i["ftype"] == ft]
        if not fr:
            continue
        nc = sum(1 for i in fr if i["outcome"] == "Non-Compliant")
        by_ftype.append({"ftype": ft, "inspections": len(fr), "noncompliant": nc,
                         "rate": pct(nc, len(fr))})

    compliant = sum(1 for i in inspections if i["outcome"] == "Compliant")
    high_sev = sum(1 for c in complaints if c["severity"] in ("High", "Critical"))
    open_complaints = sum(1 for c in complaints if c["status"] != "Closed")
    closed_days = [c["days"] for c in complaints if c["days"] is not None]
    water = [x for x in by_medium if x["medium"] == "Water"][0]

    rad = {
        "facilities": len(radiation),
        "sources": sum(r["sources"] for r in radiation),
        "workers": sum(r["workers"] for r in radiation),
        "avg_dose": sum(r["dose"] for r in radiation) / len(radiation),
        "within_dose": sum(1 for r in radiation if r["within_dose"] == "Yes"),
        "over_dose": sum(1 for r in radiation if r["within_dose"] == "No"),
        "avg_ppe": sum(r["ppe"] for r in radiation) / len(radiation),
        "calibrated": sum(1 for r in radiation if r["calibration"] == "Yes"),
    }
    rad["dose_compliance"] = pct(rad["within_dose"], rad["facilities"])
    rad["calibration_rate"] = pct(rad["calibrated"], rad["facilities"])

    kpis = {
        "samples": totals["samples"],
        "within_pct": pct(totals["within"], totals["samples"]),
        "exceed": totals["exceed"],
        "population": sum(r["population"] for r in lab),
        "cases": totals["cases"],
        "open_complaints": open_complaints,
        "avg_days": (sum(closed_days) / len(closed_days)) if closed_days else 0.0,
        "compliance_rate": pct(compliant, len(inspections)),
        "rad_facilities": rad["facilities"],
        "avg_dose": rad["avg_dose"],
        "high_severity": high_sev,
        "water_exceed_rate": water["exceed"] / water["samples"] if water["samples"] else 0.0,
    }

    return {
        "months": months, "totals": totals, "by_medium": by_medium,
        "top_params": top_params, "by_type": by_type, "by_status": by_status,
        "by_county": by_county, "by_outcome": by_outcome, "by_ftype": by_ftype,
        "rad": rad, "kpis": kpis,
        "inspections_total": len(inspections),
    }


# --------------------------------------------------------------------------------------
# Workbook helpers
# --------------------------------------------------------------------------------------

CACHED: dict[tuple[str, str], object] = {}


def set_formula(ws, coord, formula, value, number_format=None, font=None, fill=None,
                align=None, border=None):
    """Write a formula cell and remember the value Excel/Sheets will compute for it."""
    cell = ws[coord]
    cell.value = formula
    CACHED[(ws.title, coord)] = value
    if number_format:
        cell.number_format = number_format
    if font:
        cell.font = font
    if fill:
        cell.fill = fill
    if align:
        cell.alignment = align
    if border:
        cell.border = border
    return cell


def style_range(ws, cell_range, fill=None, font=None, border=None, align=None,
                number_format=None):
    for row in ws[cell_range]:
        for cell in row:
            if fill:
                cell.fill = fill
            if font:
                cell.font = font
            if border:
                cell.border = border
            if align:
                cell.alignment = align
            if number_format:
                cell.number_format = number_format


def outline_range(ws, cell_range):
    """Draw a box around a (possibly merged) range."""
    rows = list(ws[cell_range])
    r0, r1 = 0, len(rows) - 1
    c0, c1 = 0, len(rows[0]) - 1
    for i, row in enumerate(rows):
        for j, cell in enumerate(row):
            left = THIN if j == c0 else None
            right = THIN if j == c1 else None
            top = THIN if i == r0 else None
            bottom = THIN if i == r1 else None
            cell.border = Border(left=left, right=right, top=top, bottom=bottom)


def mark_calculated(ws, header_row, columns):
    """Put a note on each calculated column header - these cells hold formulas, and a
    typed-over formula is the one way to break this workbook without noticing."""
    for col, note in columns.items():
        cell = ws.cell(row=header_row, column=col)
        cell.comment = Comment(f"{note}\n\nCalculated column - leave the formula alone.",
                               "ERRS Manager", width=260, height=90)


def add_table(ws, name, ref, style="TableStyleMedium2"):
    table = Table(displayName=name, ref=ref)
    table.tableStyleInfo = TableStyleInfo(name=style, showFirstColumn=False,
                                          showLastColumn=False, showRowStripes=True,
                                          showColumnStripes=False)
    ws.add_table(table)


def sheet_heading(ws, title, subtitle, last_col_letter):
    ws.merge_cells(f"A1:{last_col_letter}1")
    c = ws["A1"]
    c.value = title
    c.font = Font(bold=True, size=15, color=WHITE)
    c.fill = PatternFill("solid", fgColor=TEAL_DARK)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 26
    ws.merge_cells(f"A2:{last_col_letter}2")
    c2 = ws["A2"]
    c2.value = subtitle
    c2.font = Font(italic=True, size=9, color=GREY)
    c2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 15


# --------------------------------------------------------------------------------------
# Sheet: Lab Results
# --------------------------------------------------------------------------------------

LAB_COLS = ["Sample ID", "Sample Date", "Month", "County", "Community / Site", "Source Type",
            "Medium", "Parameter", "Result", "Unit", "Limit Min", "Limit Max",
            "Within Limit", "Exceedance Ratio", "Population Served", "Nearest Health Facility",
            "Analyst"]
LAB_W = {c: get_column_letter(i + 1) for i, c in enumerate(LAB_COLS)}
LAB_WIDTHS = [16, 12, 7, 16, 34, 21, 17, 21, 11, 12, 10, 10, 12, 15, 16, 30, 13]

LAB_SHEET = "Lab Results"
COMP_SHEET = "Health Complaints"
INSP_SHEET = "Facility Inspections"
RAD_SHEET = "Radiation Safety"


def build_lab_sheet(wb, lab):
    ws = wb.create_sheet(LAB_SHEET)
    sheet_heading(ws, "Laboratory Results - Environmental Health Sampling",
                  "One row per sample. 'Within Limit' and 'Exceedance Ratio' are formulas - "
                  "type a new Result or change a limit and they update themselves.",
                  get_column_letter(len(LAB_COLS)))
    for i, h in enumerate(LAB_COLS, start=1):
        ws.cell(row=3, column=i, value=h)
    style_range(ws, f"A3:{get_column_letter(len(LAB_COLS))}3",
                fill=PatternFill("solid", fgColor=TEAL),
                font=Font(bold=True, color=WHITE, size=10),
                align=Alignment(horizontal="center", vertical="center", wrap_text=True))
    ws.row_dimensions[3].height = 30

    first = 4
    for n, r in enumerate(lab):
        row = first + n
        ws.cell(row=row, column=1, value=r["id"])
        ws.cell(row=row, column=2, value=r["date"]).number_format = FMT_DATE
        set_formula(ws, f"C{row}", f"=MONTH(B{row})", r["month"], FMT_INT)
        ws.cell(row=row, column=4, value=r["county"])
        ws.cell(row=row, column=5, value=r["site"])
        ws.cell(row=row, column=6, value=r["source"])
        ws.cell(row=row, column=7, value=r["medium"])
        ws.cell(row=row, column=8, value=r["param"])
        ws.cell(row=row, column=9, value=r["result"])
        ws.cell(row=row, column=10, value=r["unit"])
        ws.cell(row=row, column=11, value=r["limit_min"])
        ws.cell(row=row, column=12, value=r["limit_max"])
        set_formula(ws, f"M{row}",
                    f'=IF(AND(I{row}>=K{row},I{row}<=L{row}),"Yes","No")',
                    r["within"])
        if r["ratio"] is None:
            set_formula(ws, f"N{row}", f'=IF(L{row}=0,"",I{row}/L{row})', None,
                        FMT_RATIO)
        else:
            set_formula(ws, f"N{row}", f'=IF(L{row}=0,"",I{row}/L{row})', r["ratio"],
                        FMT_RATIO)
        ws.cell(row=row, column=15, value=r["population"]).number_format = FMT_INT
        ws.cell(row=row, column=16, value=r["facility"])
        ws.cell(row=row, column=17, value=r["analyst"])

    last = first + len(lab) - 1
    add_table(ws, "LabResults", f"A3:{get_column_letter(len(LAB_COLS))}{last}")
    mark_calculated(ws, 3, {
        3: "Pulled from the Sample Date column.",
        13: 'Compares Result against Limit Min / Limit Max - "Yes" or "No".',
        14: "Result divided by Limit Max - how far above (or below) the limit the sample "
            "came out. Blank where the limit is zero.",
    })

    # Conditional formatting: red/amber for out-of-limit results, a red data bar on the
    # ratio, and a green band on results that sit comfortably inside the limit.
    ws.conditional_formatting.add(
        f"M{first}:M{last}",
        CellIsRule(operator="equal", formula=['"No"'],
                   font=Font(color=WHITE, bold=True),
                   fill=PatternFill("solid", fgColor=RED)))
    ws.conditional_formatting.add(
        f"O{first}:O{last}",
        CellIsRule(operator="greaterThan", formula=["0"],
                   fill=PatternFill("solid", fgColor="FDE7E4")))
    ws.conditional_formatting.add(
        f"N{first}:N{last}",
        ColorScaleRule(start_type="num", start_value=0, start_color="D6EFD8",
                       mid_type="num", mid_value=1, mid_color="FFE9B0",
                       end_type="num", end_value=3.5, end_color="F4A79C"))

    widths = LAB_WIDTHS
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A4"
    dv = DataValidation(type="list", formula1="CountyList", allow_blank=True)
    dv.error = "Pick a county from the Reference sheet."
    ws.add_data_validation(dv)
    dv.add(f"D{first}:D{last + 200}")
    dv2 = DataValidation(type="list", formula1="MediumList", allow_blank=True)
    ws.add_data_validation(dv2)
    dv2.add(f"G{first}:G{last + 200}")
    dv3 = DataValidation(type="list", formula1="ParameterList", allow_blank=True)
    ws.add_data_validation(dv3)
    dv3.add(f"H{first}:H{last + 200}")
    return ws, first, last


# --------------------------------------------------------------------------------------
# Sheet: Health Complaints
# --------------------------------------------------------------------------------------

COMP_COLS = ["Complaint ID", "Date Received", "Month", "County", "Community",
             "Complaint Type", "Description", "Illness Cases Reported", "Severity",
             "Status", "Date Closed", "Days to Resolve", "Linked to Lab Exceedance",
             "Action Taken"]
COMP_WIDTHS = [15, 13, 7, 16, 16, 27, 60, 12, 11, 18, 13, 12, 14, 58]
COMP_W = {c: get_column_letter(i + 1) for i, c in enumerate(COMP_COLS)}


def build_complaint_sheet(wb, complaints):
    ws = wb.create_sheet(COMP_SHEET)
    sheet_heading(ws, "Environmental Health Complaints",
                  "One row per complaint. Illness Cases Reported is the health burden the "
                  "complaint represents; Days to Resolve is calculated from the two date columns.",
                  get_column_letter(len(COMP_COLS)))
    for i, h in enumerate(COMP_COLS, start=1):
        ws.cell(row=3, column=i, value=h)
    style_range(ws, f"A3:{get_column_letter(len(COMP_COLS))}3",
                fill=PatternFill("solid", fgColor=TEAL),
                font=Font(bold=True, color=WHITE, size=10),
                align=Alignment(horizontal="center", vertical="center", wrap_text=True))
    ws.row_dimensions[3].height = 30

    first = 4
    for n, c in enumerate(complaints):
        row = first + n
        ws.cell(row=row, column=1, value=c["id"])
        ws.cell(row=row, column=2, value=c["date"]).number_format = FMT_DATE
        set_formula(ws, f"C{row}", f"=MONTH(B{row})", c["month"], FMT_INT)
        ws.cell(row=row, column=4, value=c["county"])
        ws.cell(row=row, column=5, value=c["community"])
        ws.cell(row=row, column=6, value=c["type"])
        ws.cell(row=row, column=7, value=c["desc"])
        ws.cell(row=row, column=8, value=c["cases"]).number_format = FMT_INT
        ws.cell(row=row, column=9, value=c["severity"])
        ws.cell(row=row, column=10, value=c["status"])
        if c["closed"]:
            ws.cell(row=row, column=11, value=c["closed"]).number_format = FMT_DATE
        set_formula(ws, f"L{row}",
                    f'=IF(K{row}="","",K{row}-B{row})',
                    c["days"], FMT_INT)
        ws.cell(row=row, column=13, value=c["linked"])
        ws.cell(row=row, column=14, value=c["action"])

    last = first + len(complaints) - 1
    add_table(ws, "HealthComplaints", f"A3:{get_column_letter(len(COMP_COLS))}{last}")
    mark_calculated(ws, 3, {
        3: "Pulled from the Date Received column.",
        12: "Date Closed minus Date Received. Blank while a complaint is still open.",
    })

    ws.conditional_formatting.add(
        f"H{first}:H{last}",
        ColorScaleRule(start_type="num", start_value=0, start_color=WHITE,
                       mid_type="num", mid_value=15, mid_color="FFE9B0",
                       end_type="num", end_value=60, end_color="F4A79C"))
    ws.conditional_formatting.add(
        f"I{first}:I{last}",
        CellIsRule(operator="equal", formula=['"Critical"'],
                   font=Font(color=WHITE, bold=True),
                   fill=PatternFill("solid", fgColor=RED)))
    ws.conditional_formatting.add(
        f"I{first}:I{last}",
        CellIsRule(operator="equal", formula=['"High"'],
                   fill=PatternFill("solid", fgColor="FBD9B5")))
    ws.conditional_formatting.add(
        f"J{first}:J{last}",
        CellIsRule(operator="equal", formula=['"Closed"'],
                   font=Font(color=GREEN, bold=True)))
    ws.conditional_formatting.add(
        f"J{first}:J{last}",
        CellIsRule(operator="equal", formula=['"Received"'],
                   font=Font(color=RED, bold=True)))
    ws.conditional_formatting.add(
        f"L{first}:L{last}",
        CellIsRule(operator="greaterThan", formula=["30"],
                   fill=PatternFill("solid", fgColor="FDE7E4")))

    for i, w in enumerate(COMP_WIDTHS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A4"

    for col, named in (("D", "CountyList"), ("F", "ComplaintTypeList"),
                       ("I", "SeverityList"), ("J", "ComplaintStatusList")):
        dv = DataValidation(type="list", formula1=named, allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f"{col}{first}:{col}{last + 200}")
    return ws, first, last


# --------------------------------------------------------------------------------------
# Sheet: Facility Inspections
# --------------------------------------------------------------------------------------

INSP_COLS = ["Inspection ID", "Inspection Date", "Month", "County", "Facility",
             "Facility Type", "Outcome", "Health Risk Score (1-10)", "Key Findings",
             "Follow-up Required", "Follow-up Complete", "Inspector"]
INSP_WIDTHS = [15, 14, 7, 16, 38, 21, 15, 12, 62, 12, 12, 16]


def build_inspection_sheet(wb, inspections):
    ws = wb.create_sheet(INSP_SHEET)
    sheet_heading(ws, "Facility Inspections - Environmental Health Risk",
                  "One row per inspection. Health Risk Score is the inspecting officer's "
                  "assessment: 1-3 low, 4-6 moderate, 7-10 high.",
                  get_column_letter(len(INSP_COLS)))
    for i, h in enumerate(INSP_COLS, start=1):
        ws.cell(row=3, column=i, value=h)
    style_range(ws, f"A3:{get_column_letter(len(INSP_COLS))}3",
                fill=PatternFill("solid", fgColor=TEAL),
                font=Font(bold=True, color=WHITE, size=10),
                align=Alignment(horizontal="center", vertical="center", wrap_text=True))
    ws.row_dimensions[3].height = 30

    first = 4
    for n, i in enumerate(inspections):
        row = first + n
        ws.cell(row=row, column=1, value=i["id"])
        ws.cell(row=row, column=2, value=i["date"]).number_format = FMT_DATE
        set_formula(ws, f"C{row}", f"=MONTH(B{row})", i["month"], FMT_INT)
        ws.cell(row=row, column=4, value=i["county"])
        ws.cell(row=row, column=5, value=i["facility"])
        ws.cell(row=row, column=6, value=i["ftype"])
        ws.cell(row=row, column=7, value=i["outcome"])
        ws.cell(row=row, column=8, value=i["score"]).number_format = FMT_INT
        ws.cell(row=row, column=9, value=i["findings"])
        ws.cell(row=row, column=10, value=i["follow_up"])
        ws.cell(row=row, column=11, value=i["follow_done"])
        ws.cell(row=row, column=12, value=i["inspector"])

    last = first + len(inspections) - 1
    add_table(ws, "Inspections", f"A3:{get_column_letter(len(INSP_COLS))}{last}")
    mark_calculated(ws, 3, {
        3: "Pulled from the Inspection Date column.",
    })

    ws.conditional_formatting.add(
        f"H{first}:H{last}",
        ColorScaleRule(start_type="num", start_value=1, start_color="D6EFD8",
                       mid_type="num", mid_value=5, mid_color="FFE9B0",
                       end_type="num", end_value=10, end_color="F4A79C"))
    ws.conditional_formatting.add(
        f"G{first}:G{last}",
        CellIsRule(operator="equal", formula=['"Non-Compliant"'],
                   font=Font(color=WHITE, bold=True),
                   fill=PatternFill("solid", fgColor=RED)))
    ws.conditional_formatting.add(
        f"G{first}:G{last}",
        CellIsRule(operator="equal", formula=['"Compliant"'],
                   font=Font(color=GREEN, bold=True)))
    ws.conditional_formatting.add(
        f"K{first}:K{last}",
        FormulaRule(formula=[f'AND($J{first}="Yes",$K{first}="No")'],
                    fill=PatternFill("solid", fgColor="FBD9B5")))

    for i, w in enumerate(INSP_WIDTHS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A4"
    for col, named in (("D", "CountyList"), ("F", "FacilityTypeList"),
                       ("G", "OutcomeList"), ("J", "YesNoList"), ("K", "YesNoList")):
        dv = DataValidation(type="list", formula1=named, allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f"{col}{first}:{col}{last + 200}")
    return ws, first, last


# --------------------------------------------------------------------------------------
# Sheet: Radiation Safety
# --------------------------------------------------------------------------------------

RAD_COLS = ["Facility", "County", "Facility Type", "Sources Inventoried",
            "Workers Monitored", "Avg Annual Dose (mSv)", "Within 20 mSv Limit",
            "PPE Compliance", "Instrument Calibration Current", "Last Inventory Date",
            "Notes"]
RAD_WIDTHS = [46, 18, 15, 12, 12, 14, 13, 12, 14, 14, 52]


def build_radiation_sheet(wb, radiation):
    ws = wb.create_sheet(RAD_SHEET)
    sheet_heading(ws, "Radiation Safety - Facility and Worker Protection",
                  "One row per licensed facility. Dose is the average annual effective "
                  "dose per monitored worker against the IAEA 20 mSv occupational limit.",
                  get_column_letter(len(RAD_COLS)))
    for i, h in enumerate(RAD_COLS, start=1):
        ws.cell(row=3, column=i, value=h)
    style_range(ws, f"A3:{get_column_letter(len(RAD_COLS))}3",
                fill=PatternFill("solid", fgColor=TEAL),
                font=Font(bold=True, color=WHITE, size=10),
                align=Alignment(horizontal="center", vertical="center", wrap_text=True))
    ws.row_dimensions[3].height = 30

    first = 4
    for n, r in enumerate(radiation):
        row = first + n
        ws.cell(row=row, column=1, value=r["facility"])
        ws.cell(row=row, column=2, value=r["county"])
        ws.cell(row=row, column=3, value=r["ftype"])
        ws.cell(row=row, column=4, value=r["sources"]).number_format = FMT_INT
        ws.cell(row=row, column=5, value=r["workers"]).number_format = FMT_INT
        ws.cell(row=row, column=6, value=r["dose"]).number_format = FMT_DOSE
        set_formula(ws, f"G{row}", f'=IF(F{row}<={DOSE_LIMIT_MSV},"Yes","No")',
                    r["within_dose"])
        ws.cell(row=row, column=8, value=r["ppe"]).number_format = "0%"
        ws.cell(row=row, column=9, value=r["calibration"])
        ws.cell(row=row, column=10, value=r["last_inventory"]).number_format = FMT_DATE
        ws.cell(row=row, column=11, value=r["notes"])

    last = first + len(radiation) - 1
    add_table(ws, "RadiationSafety", f"A3:{get_column_letter(len(RAD_COLS))}{last}")
    mark_calculated(ws, 3, {
        7: f'Compares the dose in column F against the {int(DOSE_LIMIT_MSV)} mSv annual '
           f'occupational limit.',
    })

    ws.conditional_formatting.add(
        f"F{first}:F{last}",
        CellIsRule(operator="greaterThan", formula=[str(DOSE_LIMIT_MSV)],
                   font=Font(color=WHITE, bold=True),
                   fill=PatternFill("solid", fgColor=RED)))
    ws.conditional_formatting.add(
        f"G{first}:G{last}",
        CellIsRule(operator="equal", formula=['"No"'],
                   font=Font(color=WHITE, bold=True),
                   fill=PatternFill("solid", fgColor=RED)))
    ws.conditional_formatting.add(
        f"H{first}:H{last}",
        ColorScaleRule(start_type="num", start_value=0.6, start_color="F4A79C",
                       mid_type="num", mid_value=0.85, mid_color="FFE9B0",
                       end_type="num", end_value=1, end_color="D6EFD8"))
    ws.conditional_formatting.add(
        f"I{first}:I{last}",
        CellIsRule(operator="equal", formula=['"No"'],
                   fill=PatternFill("solid", fgColor="FBD9B5")))

    for i, w in enumerate(RAD_WIDTHS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A4"
    for col, named in (("B", "CountyList"), ("C", "RadFacilityTypeList"),
                       ("I", "YesNoList")):
        dv = DataValidation(type="list", formula1=named, allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f"{col}{first}:{col}{last + 100}")
    return ws, first, last


# --------------------------------------------------------------------------------------
# Sheet: Reference
# --------------------------------------------------------------------------------------

def build_reference_sheet(wb):
    ws = wb.create_sheet("Reference")
    sheet_heading(ws, "Reference - Safety Limits and Controlled Lists",
                  "The thresholds applied in the Lab Results sheet, and the lists that "
                  "feed every dropdown in this workbook.",
                  "E")
    r = 4
    ws.cell(row=r, column=1, value="Safety limits applied").font = Font(bold=True, size=11,
                                                                       color=TEAL_DARK)
    r += 1
    headers = ["Medium", "Parameter", "Unit", "Limit Min", "Limit Max", "Basis"]
    for i, h in enumerate(headers, start=1):
        ws.cell(row=r, column=i, value=h)
    style_range(ws, f"A{r}:F{r}", fill=PatternFill("solid", fgColor=TEAL),
                font=Font(bold=True, color=WHITE, size=10),
                align=Alignment(horizontal="center"))
    head_row = r
    r += 1
    param_first = r
    for medium, plist in PARAMS.items():
        for (pname, unit, lo, hi, basis) in plist:
            ws.cell(row=r, column=1, value=medium)
            ws.cell(row=r, column=2, value=pname)
            ws.cell(row=r, column=3, value=unit)
            ws.cell(row=r, column=4, value=lo)
            ws.cell(row=r, column=5, value=hi)
            ws.cell(row=r, column=6, value=basis).font = Font(size=9, color=GREY)
            r += 1
    param_last = r - 1
    add_table(ws, "Limits", f"A{head_row}:F{param_last}", style="TableStyleLight9")
    r += 1

    def list_block(title, items, col=1, start=None):
        nonlocal r
        row = start if start else r
        ws.cell(row=row, column=col, value=title).font = Font(bold=True, size=10,
                                                              color=TEAL_DARK)
        for n, item in enumerate(items, start=1):
            ws.cell(row=row + n, column=col, value=item)
        return row + 1, row + len(items)

    # Lists laid out side by side so defined names can point at clean ranges.
    blocks = [
        ("County", COUNTY_LIST, "A"),
        ("Medium", MEDIA, "C"),
        ("Parameter", [p[0] for plist in PARAMS.values() for p in plist], "D"),
        ("Complaint Type", COMPLAINT_TYPES, "E"),
        ("Complaint Status", COMPLAINT_STATUSES, "F"),
        ("Severity", SEVERITIES, "G"),
        ("Facility Type", FACILITY_TYPES, "H"),
        ("Radiation Facility Type", ["Medical", "Industrial", "Environmental"], "I"),
        ("Source Type", SOURCE_TYPES["Water"] + SOURCE_TYPES["Soil"] + SOURCE_TYPES["Air"],
         "J"),
        ("Inspection Outcome", INSPECTION_OUTCOMES, "K"),
        ("Yes / No", ["Yes", "No"], "L"),
    ]

    # The parameter table already occupies A:F down to param_last; put the lists below it.
    list_top = param_last + 3
    ws.cell(row=list_top - 1, column=1,
            value="Controlled lists (these feed the dropdowns)").font = Font(
        bold=True, size=11, color=TEAL_DARK)
    names = {}
    for title, items, col in blocks:
        ws[f"{col}{list_top}"] = title
        ws[f"{col}{list_top}"].font = Font(bold=True, size=10, color=TEAL_DARK)
        for n, item in enumerate(items, start=1):
            ws[f"{col}{list_top + n}"] = item
        names[title] = (col, list_top + 1, list_top + len(items))

    defin = {
        "CountyList": "County", "MediumList": "Medium", "ParameterList": "Parameter",
        "ComplaintTypeList": "Complaint Type", "ComplaintStatusList": "Complaint Status",
        "SeverityList": "Severity", "FacilityTypeList": "Facility Type",
        "RadFacilityTypeList": "Radiation Facility Type",
        "SourceTypeList": "Source Type", "OutcomeList": "Inspection Outcome",
        "YesNoList": "Yes / No",
    }
    for name, key in defin.items():
        col, r0, r1 = names[key]
        wb.defined_names.add(
            __import__("openpyxl").workbook.defined_name.DefinedName(
                name, attr_text=f"Reference!${col}${r0}:${col}${r1}"))

    for col, w in (("A", 18), ("B", 24), ("C", 18), ("D", 24), ("E", 30), ("F", 26),
                   ("G", 11), ("H", 22), ("I", 20), ("J", 21), ("K", 17), ("L", 9)):
        ws.column_dimensions[col].width = w
    return ws


# --------------------------------------------------------------------------------------
# Sheet: CalcData
# --------------------------------------------------------------------------------------

def build_calc_sheet(wb, agg, lab, complaints, inspections, radiation,
                     lab_last, comp_last, insp_last, rad_last):
    ws = wb.create_sheet("CalcData")
    ws.sheet_properties.tabColor = GREY
    sheet_heading(ws, "CalcData - the engine behind the Dashboard",
                  "Every KPI card and chart reads from this sheet. Each cell is a live "
                  "formula over the data sheets - add rows and these follow automatically.",
                  "H")

    LW = LAB_W
    CW = COMP_W
    labs = f"'{LAB_SHEET}'"
    comps = f"'{COMP_SHEET}'"
    insps = f"'{INSP_SHEET}'"
    rads = f"'{RAD_SHEET}'"
    # Bounded ranges (data rows + 300 spare) so pasted rows are picked up.
    LR = lambda col: f"{labs}!${col}${4}:${col}${lab_last + 300}"      # noqa: E731
    CR = lambda col: f"{comps}!${col}${4}:${col}${comp_last + 300}"    # noqa: E731
    IR = lambda col: f"{insps}!${col}${4}:${col}${insp_last + 300}"    # noqa: E731
    RR = lambda col: f"{rads}!${col}${4}:${col}${rad_last + 300}"      # noqa: E731

    def block_header(row, labels, start_col=1):
        for i, lab_ in enumerate(labels):
            c = ws.cell(row=row, column=start_col + i, value=lab_)
            c.font = Font(bold=True, color=WHITE, size=9)
            c.fill = PatternFill("solid", fgColor=TEAL)
            c.alignment = Alignment(horizontal="center", wrap_text=True)
        ws.row_dimensions[row].height = 26

    def section(row, title):
        c = ws.cell(row=row, column=1, value=title)
        c.font = Font(bold=True, size=10, color=TEAL_DARK)

    geo = {}
    r = 4

    # ---- Monthly ----------------------------------------------------------------
    section(r, "1. Monthly trend")
    r += 1
    block_header(r, ["Month", "Month #", "Samples Tested", "Within Limits", "Exceedances",
                     "Exceedance Rate", "Complaints", "Illness Cases"])
    r += 1
    m_first = r
    for m in agg["months"]:
        ws.cell(row=r, column=1, value=m["label"])
        ws.cell(row=r, column=2, value=m["num"]).number_format = FMT_INT
        set_formula(ws, f"C{r}", f'=COUNTIFS({LR(LW["Month"])},$B{r})', m["samples"], FMT_INT)
        set_formula(ws, f"D{r}",
                    f'=COUNTIFS({LR(LW["Month"])},$B{r},{LR(LW["Within Limit"])},"Yes")',
                    m["within"], FMT_INT)
        set_formula(ws, f"E{r}",
                    f'=COUNTIFS({LR(LW["Month"])},$B{r},{LR(LW["Within Limit"])},"No")',
                    m["exceed"], FMT_INT)
        set_formula(ws, f"F{r}", f'=IFERROR($E{r}/$C{r},0)', m["rate"], FMT_PCT)
        set_formula(ws, f"G{r}", f'=COUNTIFS({CR(CW["Month"])},$B{r})',
                    m["complaints"], FMT_INT)
        set_formula(ws, f"H{r}",
                    f'=SUMIFS({CR(CW["Illness Cases Reported"])},{CR(CW["Month"])},$B{r})',
                    m["cases"], FMT_INT)
        r += 1
    m_last = r - 1
    ws.cell(row=r, column=1, value=f"{REPORT_YEAR} to date (Jan-Aug)").font = Font(bold=True)
    for col, val in (("C", agg["totals"]["samples"]), ("D", agg["totals"]["within"]),
                     ("E", agg["totals"]["exceed"]), ("G", agg["totals"]["complaints"]),
                     ("H", agg["totals"]["cases"])):
        set_formula(ws, f"{col}{r}", f"=SUM({col}{m_first}:{col}{m_last})", val, FMT_INT)
    set_formula(ws, f"F{r}", f'=IFERROR($E{r}/$C{r},0)', agg["totals"]["rate"], FMT_PCT)
    totals_row = r
    geo["monthly"] = (m_first, m_last, totals_row)
    r += 2

    # ---- By medium --------------------------------------------------------------
    section(r, "2. By medium")
    r += 1
    block_header(r, ["Medium", "Samples", "Within Limits", "Exceedances", "% Within Limits"])
    r += 1
    med_first = r
    for m in agg["by_medium"]:
        ws.cell(row=r, column=1, value=m["medium"])
        set_formula(ws, f"B{r}", f'=COUNTIFS({LR(LW["Medium"])},$A{r})', m["samples"], FMT_INT)
        set_formula(ws, f"C{r}",
                    f'=COUNTIFS({LR(LW["Medium"])},$A{r},{LR(LW["Within Limit"])},"Yes")',
                    m["within"], FMT_INT)
        set_formula(ws, f"D{r}", f'=$B{r}-$C{r}', m["exceed"], FMT_INT)
        set_formula(ws, f"E{r}", f'=IFERROR($C{r}/$B{r},0)', m["pct_within"], FMT_PCT)
        r += 1
    geo["medium"] = (med_first, r - 1)
    r += 1

    # ---- By parameter -----------------------------------------------------------
    section(r, "3. Parameters ranked by exceedances")
    r += 1
    block_header(r, ["Parameter", "Medium", "Samples", "Exceedances", "Exceedance Rate",
                     "Avg Result / Limit"])
    r += 1
    par_first = r
    for p in agg["top_params"]:
        ws.cell(row=r, column=1, value=p["param"])
        ws.cell(row=r, column=2, value=p["medium"])
        set_formula(ws, f"C{r}",
                    f'=COUNTIFS({LR(LW["Parameter"])},$A{r},{LR(LW["Medium"])},$B{r})',
                    p["samples"], FMT_INT)
        set_formula(ws, f"D{r}",
                    f'=COUNTIFS({LR(LW["Parameter"])},$A{r},{LR(LW["Medium"])},$B{r},'
                    f'{LR(LW["Within Limit"])},"No")',
                    p["exceed"], FMT_INT)
        set_formula(ws, f"E{r}", f'=IFERROR($D{r}/$C{r},0)', p["rate"], FMT_PCT)
        set_formula(ws, f"F{r}",
                    f'=IFERROR(AVERAGEIFS({LR(LW["Exceedance Ratio"])},'
                    f'{LR(LW["Parameter"])},$A{r},{LR(LW["Medium"])},$B{r}),0)',
                    p["avg_ratio"], FMT_RATIO)
        r += 1
    geo["param"] = (par_first, r - 1)
    r += 1

    # ---- Complaints by type -----------------------------------------------------
    section(r, "4. Complaints by type")
    r += 1
    block_header(r, ["Complaint Type", "Complaints", "Illness Cases", "Avg Days to Resolve"])
    r += 1
    typ_first = r
    for t in agg["by_type"]:
        ws.cell(row=r, column=1, value=t["type"])
        set_formula(ws, f"B{r}",
                    f'=COUNTIFS({CR(CW["Complaint Type"])},$A{r})', t["complaints"], FMT_INT)
        set_formula(ws, f"C{r}",
                    f'=SUMIFS({CR(CW["Illness Cases Reported"])},{CR(CW["Complaint Type"])},$A{r})',
                    t["cases"], FMT_INT)
        set_formula(ws, f"D{r}",
                    f'=IFERROR(AVERAGEIFS({CR(CW["Days to Resolve"])},'
                    f'{CR(CW["Complaint Type"])},$A{r}),0)',
                    t["avg_days"], "0.0")
        r += 1
    geo["type"] = (typ_first, r - 1)
    r += 1

    # ---- Complaint status -------------------------------------------------------
    section(r, "5. Complaint status")
    r += 1
    block_header(r, ["Status", "Complaints"])
    r += 1
    st_first = r
    for s in agg["by_status"]:
        ws.cell(row=r, column=1, value=s["status"])
        set_formula(ws, f"B{r}", f'=COUNTIFS({CR(CW["Status"])},$A{r})', s["count"], FMT_INT)
        r += 1
    geo["status"] = (st_first, r - 1)
    r += 1

    # ---- By county --------------------------------------------------------------
    section(r, "6. By county")
    r += 1
    block_header(r, ["County", "Lab Samples", "Exceedances", "Exceedance Rate",
                     "Complaints", "Illness Cases"])
    r += 1
    cty_first = r
    for c in agg["by_county"]:
        name = c["county"]
        if name == "Other counties":
            # A derived row: the eight named counties above are the ones with the largest
            # monitoring programmes, so anything else rolls up here. COUNTIF against the
            # named list returns 0 for a county that is not in it.
            ws.cell(row=r, column=1, value=name)
            named = f"$A${cty_first}:$A${r - 1}"
            set_formula(
                ws, f"B{r}",
                f'=SUMPRODUCT((COUNTIF({named},{LR(LW["County"])})=0)*'
                f'({LR(LW["County"])}<>""))', c["samples"], FMT_INT)
            set_formula(
                ws, f"C{r}",
                f'=SUMPRODUCT((COUNTIF({named},{LR(LW["County"])})=0)*'
                f'({LR(LW["County"])}<>"")*({LR(LW["Within Limit"])}="No"))',
                c["exceed"], FMT_INT)
            set_formula(ws, f"D{r}", f'=IFERROR($C{r}/$B{r},0)', c["rate"], FMT_PCT)
            set_formula(
                ws, f"E{r}",
                f'=SUMPRODUCT((COUNTIF({named},{CR(CW["County"])})=0)*'
                f'({CR(CW["County"])}<>""))', c["complaints"], FMT_INT)
            set_formula(
                ws, f"F{r}",
                f'=SUMPRODUCT((COUNTIF({named},{CR(CW["County"])})=0)*'
                f'({CR(CW["County"])}<>"")*{CR(CW["Illness Cases Reported"])})',
                c["cases"], FMT_INT)
        else:
            ws.cell(row=r, column=1, value=name)
            set_formula(ws, f"B{r}", f'=COUNTIFS({LR(LW["County"])},$A{r})',
                        c["samples"], FMT_INT)
            set_formula(ws, f"C{r}",
                        f'=COUNTIFS({LR(LW["County"])},$A{r},{LR(LW["Within Limit"])},"No")',
                        c["exceed"], FMT_INT)
            set_formula(ws, f"D{r}", f'=IFERROR($C{r}/$B{r},0)', c["rate"], FMT_PCT)
            set_formula(ws, f"E{r}", f'=COUNTIFS({CR(CW["County"])},$A{r})',
                        c["complaints"], FMT_INT)
            set_formula(ws, f"F{r}",
                        f'=SUMIFS({CR(CW["Illness Cases Reported"])},{CR(CW["County"])},$A{r})',
                        c["cases"], FMT_INT)
        r += 1
    geo["county"] = (cty_first, r - 1)
    r += 1

    # ---- Inspections ------------------------------------------------------------
    section(r, "7. Inspections")
    r += 1
    block_header(r, ["Outcome", "Inspections"])
    r += 1
    out_first = r
    for o in agg["by_outcome"]:
        ws.cell(row=r, column=1, value=o["outcome"])
        set_formula(ws, f"B{r}", f'=COUNTIFS({IR("G")},$A{r})', o["count"], FMT_INT)
        r += 1
    geo["outcome"] = (out_first, r - 1)
    r += 1
    block_header(r, ["Facility Type", "Inspections", "Non-Compliant", "Non-Compliance Rate"])
    r += 1
    ft_first = r
    for f in agg["by_ftype"]:
        ws.cell(row=r, column=1, value=f["ftype"])
        set_formula(ws, f"B{r}", f'=COUNTIFS({IR("F")},$A{r})', f["inspections"], FMT_INT)
        set_formula(ws, f"C{r}", f'=COUNTIFS({IR("F")},$A{r},{IR("G")},"Non-Compliant")',
                    f["noncompliant"], FMT_INT)
        set_formula(ws, f"D{r}", f'=IFERROR($C{r}/$B{r},0)', f["rate"], FMT_PCT)
        r += 1
    geo["ftype"] = (ft_first, r - 1)
    r += 1

    # ---- Radiation / occupational ----------------------------------------------
    rad = agg["rad"]
    section(r, "8. Radiation safety and worker protection")
    r += 1
    block_header(r, ["Metric", "Value"])
    r += 1
    rad_first = r
    rad_metrics = [
        ("Facilities monitored", f'=COUNTA({rads}!$A$4:$A${rad_last + 100})',
         rad["facilities"], FMT_INT),
        ("Radiation sources inventoried", f'=SUM({rads}!$D$4:$D${rad_last + 100})',
         rad["sources"], FMT_INT),
        ("Workers monitored", f'=SUM({rads}!$E$4:$E${rad_last + 100})',
         rad["workers"], FMT_INT),
        ("Average annual dose (mSv)",
         f'=IFERROR(AVERAGE({rads}!$F$4:$F${rad_last + 100}),0)', rad["avg_dose"], "0.00"),
        ("Facilities within the 20 mSv limit",
         f'=COUNTIFS({rads}!$G$4:$G${rad_last + 100},"Yes")', rad["within_dose"], FMT_INT),
        ("Facilities over the 20 mSv limit",
         f'=COUNTIFS({rads}!$G$4:$G${rad_last + 100},"No")', rad["over_dose"], FMT_INT),
        ("Dose-limit compliance rate",
         f'=IFERROR(COUNTIFS({rads}!$G$4:$G${rad_last + 100},"Yes")'
         f'/COUNTA({rads}!$A$4:$A${rad_last + 100}),0)', rad["dose_compliance"], FMT_PCT),
        ("Average PPE compliance",
         f'=IFERROR(AVERAGE({rads}!$H$4:$H${rad_last + 100}),0)', rad["avg_ppe"], "0.0%"),
        ("Instruments with current calibration",
         f'=COUNTIFS({rads}!$I$4:$I${rad_last + 100},"Yes")', rad["calibrated"], FMT_INT),
        ("Calibration currency rate",
         f'=IFERROR(COUNTIFS({rads}!$I$4:$I${rad_last + 100},"Yes")'
         f'/COUNTA({rads}!$A$4:$A${rad_last + 100}),0)', rad["calibration_rate"], FMT_PCT),
    ]
    for label, formula, val, fmt in rad_metrics:
        ws.cell(row=r, column=1, value=label)
        set_formula(ws, f"B{r}", formula, val, fmt)
        r += 1
    geo["rad"] = (rad_first, r - 1)
    rad_cells = {m[0]: f"B{rad_first + i}" for i, m in enumerate(rad_metrics)}
    r += 1

    # ---- KPI block --------------------------------------------------------------
    k = agg["kpis"]
    section(r, "9. Dashboard KPIs")
    r += 1
    block_header(r, ["KPI", "Value"])
    r += 1
    kpi_first = r
    kpi_defs = [
        ("Samples tested",
         f'=COUNTA({labs}!$A$4:$A${lab_last + 300})', k["samples"], FMT_INT),
        ("Samples within limits",
         f'=COUNTIFS({LR(LW["Within Limit"])},"Yes")', agg["totals"]["within"], FMT_INT),
        ("Exceedances detected",
         f'=COUNTIFS({LR(LW["Within Limit"])},"No")', k["exceed"], FMT_INT),
        ("Share within limits",
         f'=IFERROR(COUNTIFS({LR(LW["Within Limit"])},"Yes")'
         f'/COUNTA({labs}!$A$4:$A${lab_last + 300}),0)', k["within_pct"], FMT_PCT),
        ("Population served by monitored sources",
         f'=SUM({labs}!$O$4:$O${lab_last + 300})', k["population"], FMT_INT),
        ("Illness cases reported",
         f'=SUM({comps}!$H$4:$H${comp_last + 300})', k["cases"], FMT_INT),
        ("Complaints logged", f'=COUNTA({comps}!$A$4:$A${comp_last + 300})',
         agg["totals"]["complaints"], FMT_INT),
        ("Complaints still open",
         f'=COUNTA({comps}!$A$4:$A${comp_last + 300})-COUNTIFS({CR(CW["Status"])},"Closed")',
         k["open_complaints"], FMT_INT),
        ("High or critical severity complaints",
         f'=COUNTIFS({CR(CW["Severity"])},"High")+COUNTIFS({CR(CW["Severity"])},"Critical")',
         k["high_severity"], FMT_INT),
        ("Average days to resolve a complaint",
         f'=IFERROR(AVERAGE({comps}!$L$4:$L${comp_last + 300}),0)', k["avg_days"], "0.0"),
        ("Inspections completed", f'=COUNTA({insps}!$A$4:$A${insp_last + 300})',
         agg["inspections_total"], FMT_INT),
        ("Facility compliance rate",
         f'=IFERROR(COUNTIFS({IR("G")},"Compliant")'
         f'/COUNTA({insps}!$A$4:$A${insp_last + 300}),0)', k["compliance_rate"], FMT_PCT),
        ("Water exceedance rate",
         f'=IFERROR(COUNTIFS({LR(LW["Medium"])},"Water",{LR(LW["Within Limit"])},"No")'
         f'/COUNTIFS({LR(LW["Medium"])},"Water"),0)', k["water_exceed_rate"], FMT_PCT),
        ("Facilities under radiation monitoring", f"={rad_cells['Facilities monitored']}",
         rad["facilities"], FMT_INT),
        ("Average annual occupational dose (mSv)", f"={rad_cells['Average annual dose (mSv)']}",
         rad["avg_dose"], "0.00"),
    ]
    kpi_cells = {}
    for label, formula, val, fmt in kpi_defs:
        ws.cell(row=r, column=1, value=label)
        set_formula(ws, f"B{r}", formula, val, fmt)
        kpi_cells[label] = f"$B${r}"
        r += 1
    geo["kpi"] = (kpi_first, r - 1, kpi_cells)

    for col, w in (("A", 40), ("B", 16), ("C", 16), ("D", 16), ("E", 15), ("F", 15),
                   ("G", 15), ("H", 15)):
        ws.column_dimensions[col].width = w
    return ws, geo


# --------------------------------------------------------------------------------------
# Sheet: Dashboard
# --------------------------------------------------------------------------------------

def build_dashboard(wb, geo, agg):
    ws = wb.create_sheet("Dashboard", 0)
    ws.sheet_properties.tabColor = TEAL_DARK

    widths = {"A": 2.5}
    for i in range(2, 14):
        widths[get_column_letter(i)] = 10.5
    widths["N"] = 2.5
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    ws.merge_cells("B1:M1")
    c = ws["B1"]
    c.value = "Environmental & Public Health Dashboard"
    c.font = Font(bold=True, size=20, color=WHITE)
    c.fill = PatternFill("solid", fgColor=TEAL_DARK)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 38

    ws.merge_cells("B2:M2")
    c = ws["B2"]
    c.value = ("Liberia Environmental Protection Agency  |  Environmental Research & "
               f"Radiation Safety (ERRS) Department  |  Reporting period: January - August "
               f"{REPORT_YEAR}  |  Sample data - replace with real records")
    c.font = Font(size=9, color=GREY)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 16
    ws.row_dimensions[3].height = 6

    kpi_cells = geo["kpi"][2]

    def card(row_label, col_start, label, kpi_key, value, fmt, note, accent=TEAL_DARK,
             value_font_color=INK):
        c0 = get_column_letter(col_start)
        c1 = get_column_letter(col_start + 2)
        rng = f"{c0}{row_label}:{c1}{row_label + 2}"
        ws.merge_cells(f"{c0}{row_label}:{c1}{row_label}")
        ws.merge_cells(f"{c0}{row_label + 1}:{c1}{row_label + 1}")
        ws.merge_cells(f"{c0}{row_label + 2}:{c1}{row_label + 2}")
        style_range(ws, f"{c0}{row_label}:{c1}{row_label}",
                    fill=PatternFill("solid", fgColor=CARD_BG))
        style_range(ws, f"{c0}{row_label + 1}:{c1}{row_label + 1}",
                    fill=PatternFill("solid", fgColor=CARD_BG))
        style_range(ws, f"{c0}{row_label + 2}:{c1}{row_label + 2}",
                    fill=PatternFill("solid", fgColor=CARD_BG))
        outline_range(ws, rng)

        lab_cell = ws[f"{c0}{row_label}"]
        lab_cell.value = label
        lab_cell.font = Font(bold=True, size=9, color=accent)
        lab_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)

        # A thin accent stripe across the top of each card.
        for j in range(3):
            ws.cell(row=row_label, column=col_start + j).border = Border(
                top=Side(style="medium", color=accent),
                left=THIN if j == 0 else None, right=THIN if j == 2 else None)

        val_cell = ws[f"{c0}{row_label + 1}"]
        set_formula(ws, val_cell.coordinate, f"=CalcData!{kpi_cells[kpi_key]}",
                    value, fmt,
                    font=Font(bold=True, size=20, color=value_font_color),
                    fill=PatternFill("solid", fgColor=CARD_BG),
                    align=Alignment(horizontal="left", vertical="center", indent=1))

        note_cell = ws[f"{c0}{row_label + 2}"]
        note_cell.value = note
        note_cell.font = Font(size=8, italic=True, color=GREY)
        note_cell.alignment = Alignment(horizontal="left", vertical="top", indent=1,
                                        wrap_text=True)

        # A 20pt value needs the room, and the note wraps to two lines at 8pt.
        ws.row_dimensions[row_label].height = 15
        ws.row_dimensions[row_label + 1].height = 31
        ws.row_dimensions[row_label + 2].height = 28

    ws.row_dimensions[4].height = 6
    for spacer in (8, 9, 13, 14, 18, 19, 20):
        ws.row_dimensions[spacer].height = 7
    # Row 1 of cards
    card(5, 2, "SAMPLES TESTED", "Samples tested", agg["kpis"]["samples"], FMT_INT,
         "Environmental samples analysed against a safety limit")
    card(5, 5, "WITHIN SAFETY LIMITS", "Share within limits", agg["kpis"]["within_pct"],
         FMT_PCT, "Share of samples at or below the WHO / IAEA guideline applied",
         accent=GREEN)
    card(5, 8, "EXCEEDANCES DETECTED", "Exceedances detected", agg["kpis"]["exceed"],
         FMT_INT, "Results above the applicable safety limit", accent=RED,
         value_font_color=RED)
    card(5, 11, "POPULATION SERVED", "Population served by monitored sources",
         agg["kpis"]["population"], FMT_INT,
         "People relying on the water sources and sites monitored")

    # Row 2 of cards
    card(10, 2, "ILLNESS CASES REPORTED", "Illness cases reported",
         agg["kpis"]["cases"], FMT_INT,
         "Cases linked to an environmental health complaint", accent=RED)
    card(10, 5, "COMPLAINTS STILL OPEN", "Complaints still open",
         agg["kpis"]["open_complaints"], FMT_INT,
         "Received, investigating, or awaiting findings")
    card(10, 8, "AVG DAYS TO RESOLVE", "Average days to resolve a complaint",
         agg["kpis"]["avg_days"], "0.0",
         "Average time from receipt to closure", accent=AMBER)
    card(10, 11, "FACILITY COMPLIANCE", "Facility compliance rate",
         agg["kpis"]["compliance_rate"], FMT_PCT,
         "Inspected facilities found compliant on the day", accent=GREEN)

    # Row 3 of cards
    card(15, 2, "RADIATION FACILITIES", "Facilities under radiation monitoring",
         agg["rad"]["facilities"], FMT_INT,
         "Licensed facilities holding radioactive sources", accent=BLUE)
    card(15, 5, "AVG OCCUPATIONAL DOSE", "Average annual occupational dose (mSv)",
         agg["rad"]["avg_dose"], "0.00",
         f"Per monitored worker, against the {int(DOSE_LIMIT_MSV)} mSv annual limit",
         accent=BLUE)
    card(15, 8, "HIGH / CRITICAL COMPLAINTS", "High or critical severity complaints",
         agg["kpis"]["high_severity"], FMT_INT,
         "Complaints graded High or Critical by illness burden", accent=RED,
         value_font_color=RED)
    card(15, 11, "WATER EXCEEDANCE RATE", "Water exceedance rate",
         agg["kpis"]["water_exceed_rate"], FMT_PCT,
         "Share of water samples above limit - the headline exposure risk", accent=AMBER)

    ws.merge_cells("B21:M21")
    c = ws["B21"]
    c.value = "Trends and breakdowns"
    c.font = Font(bold=True, size=12, color=WHITE)
    c.fill = PatternFill("solid", fgColor=TEAL)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[21].height = 24

    # ---- Charts -----------------------------------------------------------------
    cd = wb["CalcData"]

    def ref(col, r0, r1=None):
        return Reference(cd, min_col=col, min_row=r0, max_row=r1)

    def series(col, r0, r1=None):
        """A Reference that includes the header row, so titles_from_data picks it up."""
        return Reference(cd, min_col=col, min_row=r0 - 1, max_row=r1 if r1 else r0 - 1)

    def label_axis(chart, r0, r1):
        """Point the category axis at column A of CalcData.

        openpyxl's set_categories() writes a *numeric* reference even when the labels are
        text, so the labels can come out as 1, 2, 3... in some viewers. Excel itself writes
        a string reference for text categories, so we set one explicitly.
        """
        text = f"'CalcData'!$A${r0}:$A${r1}"
        for ser in chart.series:
            ser.cat = AxDataSource(strRef=StrRef(f=text))

    m0, m1, _t = geo["monthly"]
    med0, med1 = geo["medium"]
    par0, par1 = geo["param"]
    typ0, typ1 = geo["type"]
    st0, st1 = geo["status"]
    cty0, cty1 = geo["county"]
    out0, out1 = geo["outcome"]
    ft0, ft1 = geo["ftype"]

    charts = []

    # 1. Exceedance rate by month
    ch = LineChart()
    ch.title = "Exceedance rate by month"
    ch.y_axis.title = "Share of samples above limit"
    ch.y_axis.numFmt = "0%"
    ch.height, ch.width = 8.6, 11.6
    ch.add_data(ref(6, m0, m1), titles_from_data=False)
    label_axis(ch, m0, m1)
    ser = ch.series[0]
    ser.graphicalProperties.line.solidFill = RED
    ser.graphicalProperties.line.width = 28000
    ser.marker = Marker(symbol="circle", size=6)
    ser.smooth = False
    ch.legend = None
    ch.style = 2
    charts.append(("B22", ch))

    # 2. Samples within limits vs exceedances, by medium (stacked)
    ch = BarChart()
    ch.type = "col"
    ch.grouping = "stacked"
    ch.overlap = 100
    ch.title = "Samples by medium: within limits vs above limit"
    ch.y_axis.title = "Samples"
    ch.height, ch.width = 8.6, 11.6
    ch.add_data(series(3, med0, med1), titles_from_data=True)
    ch.add_data(series(4, med0, med1), titles_from_data=True)
    label_axis(ch, med0, med1)
    ch.series[0].graphicalProperties.solidFill = GREEN
    ch.series[1].graphicalProperties.solidFill = RED
    ch.gapWidth = 60
    ch.legend.position = "b"
    charts.append(("H22", ch))

    # 3. Parameters ranked by exceedances (horizontal bars)
    ch = BarChart()
    ch.type = "bar"
    ch.title = "Parameters by number of exceedances"
    ch.x_axis.title = "Exceedances"
    ch.height, ch.width = 8.6, 11.6
    ch.add_data(ref(4, par0, par1), titles_from_data=False)
    label_axis(ch, par0, par1)
    ch.series[0].graphicalProperties.solidFill = AMBER
    ch.legend = None
    ch.gapWidth = 40
    charts.append(("B39", ch))

    # 4. Illness cases by complaint type
    ch = BarChart()
    ch.type = "col"
    ch.title = "Illness cases reported, by complaint type"
    ch.y_axis.title = "Cases reported"
    ch.height, ch.width = 8.6, 11.6
    ch.add_data(ref(3, typ0, typ1), titles_from_data=False)
    label_axis(ch, typ0, typ1)
    ch.series[0].graphicalProperties.solidFill = RED
    ch.legend = None
    ch.gapWidth = 50
    ch.dataLabels = DataLabelList()
    ch.dataLabels.showVal = True
    charts.append(("H39", ch))

    # 5. Complaint status doughnut
    ch = DoughnutChart(holeSize=55)
    ch.title = "Complaint status"
    ch.height, ch.width = 8.6, 11.6
    ch.add_data(ref(2, st0, st1), titles_from_data=False)
    label_axis(ch, st0, st1)
    ch.dataLabels = DataLabelList()
    ch.dataLabels.showVal = True
    ch.dataLabels.showCatName = True
    ch.legend = None

    charts.append(("B56", ch))

    # 6. Complaints and illness cases by county
    ch = BarChart()
    ch.type = "col"
    ch.grouping = "clustered"
    ch.title = "Complaints and illness cases by county"
    ch.y_axis.title = "Count"
    ch.height, ch.width = 8.6, 11.6
    ch.add_data(series(5, cty0, cty1), titles_from_data=True)
    ch.add_data(series(6, cty0, cty1), titles_from_data=True)
    label_axis(ch, cty0, cty1)
    ch.series[0].graphicalProperties.solidFill = BLUE
    ch.series[1].graphicalProperties.solidFill = RED
    ch.legend.position = "b"
    ch.gapWidth = 50
    charts.append(("H56", ch))

    # 7. Inspection outcomes
    ch = BarChart()
    ch.type = "col"
    ch.title = "Facility inspection outcomes"
    ch.y_axis.title = "Inspections"
    ch.height, ch.width = 8.6, 11.6
    ch.add_data(ref(2, out0, out1), titles_from_data=False)
    label_axis(ch, out0, out1)
    ch.series[0].graphicalProperties.solidFill = TEAL
    ch.legend = None
    ch.gapWidth = 70
    ch.dataLabels = DataLabelList()
    ch.dataLabels.showVal = True
    charts.append(("B73", ch))

    # 8. Non-compliance rate by facility type
    ch = BarChart()
    ch.type = "bar"
    ch.title = "Non-compliance rate by facility type"
    ch.x_axis.title = "Share inspected and found non-compliant"
    ch.x_axis.numFmt = "0%"
    ch.height, ch.width = 8.6, 11.6
    ch.add_data(ref(4, ft0, ft1), titles_from_data=False)
    label_axis(ch, ft0, ft1)
    ch.series[0].graphicalProperties.solidFill = AMBER
    ch.legend = None
    ch.gapWidth = 40
    charts.append(("H73", ch))

    for anchor, chart in charts:
        ws.add_chart(chart, anchor)

    ws.sheet_view.showGridLines = False
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_area = "B1:M90"
    return ws


# --------------------------------------------------------------------------------------
# Sheet: Read Me
# --------------------------------------------------------------------------------------

def build_readme(wb, agg):
    ws = wb.create_sheet("Read Me")
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 34
    ws.column_dimensions["C"].width = 96

    ws.merge_cells("B2:C2")
    c = ws["B2"]
    c.value = "ERRS Environmental & Public Health Dashboard - how to use this workbook"
    c.font = Font(bold=True, size=15, color=WHITE)
    c.fill = PatternFill("solid", fgColor=TEAL_DARK)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 30
    r = 4

    def para(text, bold=False, size=10, color=INK, indent=1, height=None):
        nonlocal r
        cell = ws.cell(row=r, column=2, value=text)
        cell.font = Font(bold=bold, size=size, color=color)
        cell.alignment = Alignment(vertical="top", wrap_text=True)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
        ws.row_dimensions[r].height = height or (14 if not bold else 18)
        r += 1

    def two_col(label, text):
        nonlocal r
        a = ws.cell(row=r, column=2, value=label)
        a.font = Font(bold=True, size=10, color=TEAL_DARK)
        a.alignment = Alignment(vertical="top", wrap_text=True)
        b = ws.cell(row=r, column=3, value=text)
        b.font = Font(size=10, color=INK)
        b.alignment = Alignment(vertical="top", wrap_text=True)
        ws.row_dimensions[r].height = 30
        r += 1

    para("What this is", bold=True, size=12, color=TEAL_DARK)
    para("A one-page health picture for the department: what the environment is doing to "
         "people, and what the department is doing about it. It brings together the four "
         "health-relevant streams ERRS already records - laboratory results measured against "
         "safety limits, environmental health complaints and the illness cases behind them, "
         "facility inspections, and radiation worker protection.")
    r += 1

    para("The sheets", bold=True, size=12, color=TEAL_DARK)
    two_col("Dashboard", "The one-page view. Twelve KPI cards, eight charts. Every figure is "
                         "a live formula - nothing is typed in by hand.")
    two_col("Lab Results", "One row per sample: water, soil, air and ambient radiation "
                           "readings against the applicable limit. The Within Limit and "
                           "Exceedance Ratio columns calculate themselves.")
    two_col("Health Complaints", "One row per complaint, including how many illness cases "
                                 "were reported and how long the complaint took to close.")
    two_col("Facility Inspections", "One row per inspection, with a 1-10 health risk score "
                                    "and whether the follow-up was completed.")
    two_col("Radiation Safety", "One row per licensed facility: sources inventoried, workers "
                                "monitored, annual dose against the 20 mSv limit, PPE "
                                "compliance and instrument calibration status.")
    two_col("Reference", "The safety limits applied to each parameter, and the controlled "
                         "lists behind every dropdown.")
    two_col("CalcData", "The engine: the aggregates the KPI cards and charts read from. "
                        "Leave it alone unless you are changing the dashboard itself.")
    r += 1

    para("How to put real data in", bold=True, size=12, color=TEAL_DARK)
    para("1.  Keep the column headings and the layout exactly as they are - the dashboard "
         "aggregates by column, not by position on the row.")
    para("2.  Type new records on the next empty row of each sheet, or paste them in. The "
         "tables, dropdowns, conditional colours and every chart extend automatically.")
    para("3.  Delete the sample rows when real records replace them, and delete any rows you "
         "do not need - the formulas count whatever is actually there.")
    para("4.  The Month, Within Limit, Exceedance Ratio, Days to Resolve and Within 20 mSv "
         "Limit columns all hold formulas, not values - hover the column heading for a note "
         "saying what each one does. If you overwrite one by accident, copy it down from the "
         "row above to bring it back.")
    para("5.  The dashboard recalculates the moment the data changes. If a figure looks "
         "stale, press F9.")
    r += 1

    para("A note on the data in this copy", bold=True, size=12, color=TEAL_DARK)
    para("The rows in this workbook are realistic sample data, not real records: they are "
         "generated to show what the dashboard looks like when it is working, and they are "
         "shaped around Liberia's rainy and dry seasons so the trends behave believably. "
         "Replace them with the department's own entries before any of this is used for a "
         "decision or shown outside the team.")
    para("The limits in the Reference sheet are the widely used WHO guideline values, US EPA "
         "regional screening levels (for soil) and an IAEA reference level (for ambient dose "
         "rate). They are a sensible default, not a legal position - have the department "
         "confirm each threshold against Liberia's own national standards before publishing "
         "this anywhere.")
    r += 1

    para("Regenerating or extending it", bold=True, size=12, color=TEAL_DARK)
    para("This workbook is built by scripts/build_health_dashboard.py in the ERRS Manager "
         "repository (npm run health-dashboard). Editing that script and re-running it "
         "rebuilds the whole workbook from scratch - useful if the department wants different "
         "parameters, different limits, or another breakdown added.")
    return ws


# --------------------------------------------------------------------------------------
# Cached values (so the file displays correctly even in viewers that never recalculate)
# --------------------------------------------------------------------------------------

def _fmt_cached(value):
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value == int(value) and abs(value) < 1e15:
            return str(int(value))
        return repr(round(value, 10))
    raise TypeError(f"unsupported cached value type: {type(value)} ({value!r})")


def inject_cached_values(path):
    """Give every formula cell the value Excel will compute, so non-recalculating
    viewers (and anything reading the file with data_only) show real numbers."""
    tmp = path + ".tmp"
    with zipfile.ZipFile(path, "r") as zin:
        names = zin.namelist()
        payload = {n: zin.read(n) for n in names}

    mapping = _sheet_file_map_dict(payload)
    by_file: dict[str, dict[str, object]] = {}
    for (sheet, coord), value in CACHED.items():
        if value is None:
            continue
        by_file.setdefault(mapping[sheet], {})[coord] = value

    for sheet_path, cells in by_file.items():
        xml = payload[sheet_path].decode("utf-8")
        for coord, value in cells.items():
            # openpyxl writes formula cells as <c r="A1" s="1"><f>...</f><v /></c>.
            pattern = re.compile(
                r'(<c r="%s"(?:[^>]*?)>)(<f>.*?</f>)(?:<v\s*/>|<v>.*?</v>)?(</c>)'
                % re.escape(coord), re.DOTALL)
            m = pattern.search(xml)
            if not m:
                raise RuntimeError(f"could not find formula cell {coord} in {sheet_path}")

            open_tag, formula, close_tag = m.group(1), m.group(2), m.group(3)
            if isinstance(value, str):
                # String result: keep t="str" and store the text.
                if 't="str"' not in open_tag:
                    open_tag = open_tag[:-1] + ' t="str">'
                body = f"{open_tag}{formula}<v>{xml_escape(value)}</v>{close_tag}"
            else:
                # Numeric result: the cell must not carry a string type attribute.
                open_tag = re.sub(r'\s+t="[^"]*"', "", open_tag)
                body = f"{open_tag}{formula}<v>{_fmt_cached(value)}</v>{close_tag}"

            xml = xml[:m.start()] + body + xml[m.end():]
        payload[sheet_path] = xml.encode("utf-8")

    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for name in names:
            zout.writestr(name, payload[name])
    shutil.move(tmp, path)


def _sheet_file_map_dict(payload):
    wb_xml = payload["xl/workbook.xml"].decode("utf-8")
    rels_xml = payload["xl/_rels/workbook.xml.rels"].decode("utf-8")
    pairs = re.findall(r'<Relationship\b[^>]*/>', rels_xml)
    rels = {}
    for p in pairs:
        rid = re.search(r'Id="([^"]+)"', p)
        tgt = re.search(r'Target="([^"]+)"', p)
        if rid and tgt:
            rels[rid.group(1)] = tgt.group(1)
    mapping = {}
    for sheet_tag in re.findall(r'<sheet\b[^>]*/>', wb_xml):
        name = re.search(r'name="([^"]+)"', sheet_tag)
        rid = re.search(r'r:id="([^"]+)"', sheet_tag)
        if not (name and rid):
            continue
        target = rels.get(rid.group(1), "")
        if target.startswith("/"):
            path = target.lstrip("/")
        elif target.startswith("xl/"):
            path = target
        else:
            path = "xl/" + target.lstrip("/")
        mapping[name.group(1)] = path
    return mapping


# --------------------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------------------

def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    rng = random.Random(20260915)  # fixed seed: the sample workbook is reproducible
    lab = generate_lab_results(rng)
    complaints = generate_complaints(rng)
    inspections = generate_inspections(rng)
    radiation = generate_radiation(rng)
    agg = aggregate(lab, complaints, inspections, radiation)

    wb = Workbook()
    wb.remove(wb.active)
    wb.calculation.fullCalcOnLoad = True

    _ws, lab_first, lab_last = build_lab_sheet(wb, lab)
    _ws2, comp_first, comp_last = build_complaint_sheet(wb, complaints)
    _ws3, insp_first, insp_last = build_inspection_sheet(wb, inspections)
    _ws4, rad_first, rad_last = build_radiation_sheet(wb, radiation)
    build_reference_sheet(wb)
    _calc_ws, geo = build_calc_sheet(wb, agg, lab, complaints, inspections, radiation,
                                     lab_last, comp_last, insp_last, rad_last)
    build_dashboard(wb, geo, agg)
    build_readme(wb, agg)

    # Sheet order: Dashboard first, then data, then Reference, then Read Me, then CalcData.
    order = ["Dashboard", LAB_SHEET, COMP_SHEET, INSP_SHEET, RAD_SHEET, "Reference",
             "Read Me", "CalcData"]
    wb._sheets = [wb[name] for name in order]
    wb["Dashboard"].sheet_view.tabSelected = True

    wb.save(out_path)
    inject_cached_values(out_path)

    print(f"Wrote {out_path}")
    print(f"  lab results:        {len(lab)} rows")
    print(f"  complaints:         {len(complaints)} rows  "
          f"({agg['totals']['cases']} illness cases)")
    print(f"  inspections:        {len(inspections)} rows")
    print(f"  radiation rows:     {len(radiation)} rows")
    print(f"  exceedance rate:    {agg['totals']['rate']*100:.1f}%")
    print(f"  cached formulas:    {len(CACHED)}")


if __name__ == "__main__":
    main()
