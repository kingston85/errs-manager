"""
Builds the updated "BOLO TOWN SAMPLE INFORMATION (Joint)" document.

Changes vs. the original PDF:
  * Table 1 gains a "Description" column (same style as Table 2 of the
    "Bolo Town Investigation Drafted report V2").  The Emmanuel Suah (ES)
    group rows are filled from "ES Group - Physical Observations at
    Following Sampling Points".  JC / VA rows are left blank because no
    physical-observation notes were supplied for those groups.
  * A new "Physical Observations at Sampling Points (ES Group)" section is
    added after Table 1.
  * Table 2 (TSS results) is reproduced unchanged.

Outputs a .docx (editable) and a .pdf next to this script.
"""
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Inches

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (Paragraph, SimpleDocTemplate, Spacer, Table, Image, PageBreak,
                                TableStyle, ListFlowable, ListItem)

OUT_DIR = Path(__file__).resolve().parent
BASENAME = "BOLO TOWN SAMPLE INFORMATION (Joint) - with ES observations"

# --------------------------------------------------------------------------
# Content
# --------------------------------------------------------------------------
HEADER_LINES = [
    ("Date of Assessment: ", "October 13, 2026"),
    ("Location: ", "Bolo Town, Nimba County"),
    ("Sample Matrix", ": Water"),
    ("Analysis Start Date: ", "October 15, 2026"),
]

# (Sample Location, Sample ID, Latitude, Longitude, Time, Description)
# Descriptions for the ES group are drawn from the ES Group physical
# observations.  Sample-ID prefix YWK2 = Yeewa Korweny 2 (Patel) and
# YWK1 = Yeewa Korweny 1 (Dor).
TABLE1 = [
    # ---- JC group -------------------------------------------------------
    ("Wenee Downstream", "WE-JC-SW-001", "0542501", "0834879", "2:08 PM", ""),
    ("Wenee mid-point", "WE-JC-SW-002", "0542460", "0834664", "2:21 PM", ""),
    ("Wenee Upstream (confluence with Saymenee)", "WE-SW-JC-003", "0542353", "0834524", "2:36 PM", ""),
    ("Saymenee mid-point", "SM-SW-JC-001", "0542304", "0834561", "2:45 PM", ""),
    ("Alphonso farm", "AF-SW-JC-001", "7.547899", "-8.616177", "2:21 PM", ""),
    ("Neneyee Upstream (northern sediment control station)", "NEN-SW-JC-001", "7.537928", "-8.614119", "4:24 PM", ""),
    # ---- VA group -------------------------------------------------------
    ("Wehyee Downstream", "W-SW-VA-001", "7.56771", "-8.60949", "2:58 PM",
     "Downstream surface water sample collected along the Wehyee stream within a densely "
     "vegetated channel. Water was brownish to reddish-brown and visibly turbid, with "
     "suspended particles and sediment apparent in the flowing water. No visible sign of "
     "mine-runoff pollution was observed on the nearby farmland."),
    ("Wehyee Mid-point", "W-SW-VA-002", "7.56695", "-8.61227", "3:16 PM",
     "Mid-point surface water sample collected along the Wehyee stream to assess spatial "
     "variation in sediment load. The stream was turbid and reddish-brown, with uneven "
     "banks showing exposed soil, roots and localised erosion along the channel."),
    ("Wehyee Upstream", "W-SW-VA-003", "7.56724", "-8.6128", "3:21 PM",
     "Upstream surface water sample collected on the Wehyee stream above the mid-point and "
     "downstream stations. Water remained discoloured and turbid under dense tree, shrub "
     "and fern cover; disturbed bank sections with exposed soils were noted as possible "
     "local sediment sources."),
    ("Pompleh Downstream", "POM-SW-VA-001", "7.56793", "-8.6094", "3:03 PM",
     "Downstream surface water sample collected along the Pompleh stream within dense "
     "vegetation. Brownish, visibly turbid water with suspended sediment was observed; no "
     "visible sign of mine-runoff pollution was noted on the adjacent farmland."),
    ("Pompleh Mid-point", "POM-SW-VA-002", "7.56822", "-8.60947", "3:07 PM",
     "Mid-point surface water sample collected along the Pompleh stream. The channel was "
     "turbid and reddish-brown, flowing through abundant ground vegetation with uneven, "
     "partially eroded streambanks."),
    ("Pompleh Downstream", "POM-SW-VA-003", "7.56882", "-8.60976", "3:35 PM",
     "Surface water sample collected further along the Pompleh stream to evaluate the "
     "combined sediment load. Water was discoloured and turbid, with suspended particles "
     "consistent with soil erosion and sediment runoff into the stream."),
    # ---- ES group -------------------------------------------------------
    ("Yeewa Downstream", "YEEWA-DS", "542444", "834881", "2:09 PM",
     "Downstream surface water sample collected from the Yeewa main stream, a natural "
     "water body, below the inflow of the Yeewa Korweny 1 and 2 tributaries. Iron ore "
     "sediment was observed along the waterway and turbidity was visibly higher than at "
     "Yeewa Korweny 1."),
    ("Yeewa Mid-Stream", "YEEWA-MS", "542314", "834915", "2:16 PM",
     "Mid-stream surface water sample collected along the Yeewa main stream to assess "
     "spatial sediment migration. Reddish iron ore sediment deposits were observed along "
     "the channel, with elevated turbidity."),
    ("Yeewa Up-Stream", "YEEWA-US", "542066", "835147", "2:32 PM",
     "Upstream surface water sample collected on the Yeewa main stream above the "
     "tributary junctions. Iron ore sediment was still present along the waterway at "
     "this point, indicating sediment loading from further upstream in the Mount "
     "Yewlliton drainage."),
    ("Yeewa Korweny Patel Downstream", "YWK2-ES-SW-001", "0541616", "0835024", "3:15 PM",
     "Downstream surface water sample collected from Yeewa Korweny 2 (Patel), a "
     "tributary of the Yeewa main stream, just above its junction with the main "
     "watercourse. Substantial sediment deposits were observed and turbidity was higher "
     "than at Yeewa Korweny 1."),
    ("Yeewa Korweny Patel Midstream", "YWK2-ES-SW-002", "0541600", "0834909", "3:18 PM",
     "Midstream surface water sample collected along Yeewa Korweny 2 (Patel) within a "
     "deep, densely forested valley. A geo-fencing sign reading \u201cKEEP AWAY \u2013 500 "
     "Meters Safety Buffer Zone\u201d was observed on this tributary, in proximity to "
     "ArcelorMittal\u2019s haulage route."),
    ("Yeewa Korweny Patel Upstream", "YWK2-ES-SW-003", "0541550", "0834786", "3:21 PM",
     "Upstream surface water sample collected on Yeewa Korweny 2 (Patel) towards its "
     "source in the Mount Yewlliton area, in proximity to mining activities in the Mount "
     "Yewlliton and Mount Gangro areas. Sediment deposits were observed in the channel."),
    ("Yeewa korweny Dor Downstream", "YWK1-ES-SW-001", "0541697", "0835051", "3:35 PM",
     "Downstream surface water sample collected from Yeewa Korweny 1 (Dor), the "
     "tributary on the opposite side of the Yeewa main stream from Yeewa Korweny 2, "
     "near its junction with the main watercourse. Sediment deposits were present but "
     "turbidity was visibly lower than at Yeewa and Yeewa Korweny 2."),
    ("Yeewa Korweny Dor Midstream", "YWK1-ES-SW-002", "0541644", "0835167", "3:44 PM",
     "Midstream surface water sample collected along Yeewa Korweny 1 (Dor) as it flows "
     "through a deep valley under dense forest cover. Sediment deposits were observed, "
     "with lower turbidity than the Yeewa Korweny 2 branch."),
    ("Yeewa korweny Dor Midstream", "YWK1-ES-SW-003", "0541607", "0835271", "3:59 PM",
     "Upper surface water sample collected on Yeewa Korweny 1 (Dor) towards its source "
     "in the Mount Yewlliton area, located in proximity to ArcelorMittal\u2019s haulage route "
     "and the Mount Yewlliton / Mount Gangro mining areas. Natural water body with "
     "sediment deposits in the channel."),
]

ES_SAMPLE_PREFIXES = ("YEEWA", "YWK1", "YWK2")
VA_SAMPLE_PREFIXES = ("W-SW-VA", "POM-SW-VA")
SHADED_PREFIXES = ES_SAMPLE_PREFIXES + VA_SAMPLE_PREFIXES

TABLE1_NOTE = (
    "Note: Descriptions for the shaded rows are derived from the groups\u2019 field notes \u2013 "
    "\u201cES Group \u2013 Physical Observations at Following Sampling Points\u201d (Emmanuel Suah "
    "group; YWK2 = Yeewa Korweny 2 (Patel), YWK1 = Yeewa Korweny 1 (Dor)) and \u201cTeam Varney "
    "Armah (Pompleh & Wehyee)\u201d (VA group). Descriptions for the JC group points are to be "
    "supplied by that group."
)

OBS_HEADING = "Physical Observations at Sampling Points \u2013 ES Group (Yeewa, Yeewa Korweny 1 & 2)"
OBS_INTRO = (
    "Sampling was followed by a physical inspection of the Yeewa main stream and its "
    "Yeewa Korweny 1 (Dor) and Yeewa Korweny 2 (Patel) tributaries. The following "
    "preliminary observations were recorded by the ES group:"
)

VA_HEADING = "Physical Observations at Sampling Points \u2013 VA Group (Pompleh & Wehyee)"
VA_INTRO = (
    "During the field visit on 13 October 2026, the Varney Armah (VA) team conducted surface "
    "water sampling along the Wehyee and Pompleh streams in Nimba County. The following "
    "preliminary observations were recorded:"
)
VA_OBSERVATIONS = [
    "The stream water was brownish to reddish-brown and visibly turbid, with suspended "
    "particles and sediment apparent in the flowing water.",
    "Both streams flow through a densely vegetated environment characterised by abundant "
    "trees, shrubs, ferns and other ground vegetation.",
    "The streambanks were uneven, with exposed soil, roots and areas of erosion visible "
    "along the channel.",
    "The presence of suspended sediment and the water\u2019s discoloration may indicate soil "
    "erosion and sediment runoff into the stream, potentially influenced by rainfall and "
    "surface-water movement. However, the specific cause of the discoloration cannot be "
    "confirmed through visual observation alone.",
    "The surrounding vegetation provides natural streambank cover, although localised exposed "
    "soils and disturbed bank sections may contribute to sediment entering the water.",
    "Around the collection points along the Pompleh and Wehyee streams, there were no visible "
    "signs of possible environmental pollution due to mine runoff on the nearby farmlands.",
    "Water samples were collected for subsequent analysis to assess the streams\u2019 water "
    "quality and determine whether their physical and chemical characteristics meet the "
    "applicable environmental standards.",
]
# (file, caption) -- photo GPS stamps matched to Table 1 coordinates / times
PHOTO_DIR = OUT_DIR / "photos"
VA_PHOTOS = [  # noqa: E501
    ("W-SW-VA-001_Wehyee_Downstream.jpg",
     "Plate 1: W-SW-VA-001 \u2013 Wehyee Downstream (7.5677, -8.6093; 2:58 PM). Reddish-brown, turbid flow."),
    ("POM-SW-VA-002_Pompleh_Midpoint.jpg",
     "Plate 2: POM-SW-VA-002 \u2013 Pompleh Mid-point (7.5682, -8.6095; 3:07 PM). Sampling under dense ground cover."),
    ("W-SW-VA-002_Wehyee_Midpoint.jpg",
     "Plate 3: W-SW-VA-002 \u2013 Wehyee Mid-point (7.5672, -8.6122; 3:16 PM). Suspended sediment in channel."),
    ("W-SW-VA-003_Wehyee_Upstream.jpg",
     "Plate 4: W-SW-VA-003 \u2013 Wehyee Upstream (7.5672, -8.6129; 3:21 PM). Uneven banks with exposed soil."),
]

OBSERVATIONS = [
    "An agricultural farm was observed to have been inundated and covered by sediments "
    "originating from the mining area. This may affect the overall productivity of the farmland.",
    "The presence of iron ore sediment was observed along the waterway during the sampling.",
    "The turbidity levels at Yeewa and Yeewa Korweny 2 were higher than those at Yeewa Korweny 1.",
    "A geo-fencing sign was observed at Yeewa Korweny 2 bearing the inscription: "
    "\u201cKEEP AWAY \u2013 500 Meters Safety Buffer Zone\u201d.",
    "All the sampling points were located within natural water bodies.",
    "Yeewa Korweny 1 and Yeewa Korweny 2 are tributary branches of the Yeewa main stream, "
    "situated on opposite sides of the main watercourse. Both originate in the Mount Yewlliton "
    "area and flow through deep valleys characterised by dense forest cover. The tributaries "
    "were also observed to contain substantial sediment deposits. Their locations are in "
    "proximity to ArcelorMittal\u2019s haulage route and to mining activities in the Mount "
    "Yewlliton and Mount Gangro areas. The proximity of mining and haulage activities, together "
    "with the observed sedimentation, warrants further investigation into possible sediment "
    "transport pathways. Nevertheless, the field observations alone do not establish that "
    "ArcelorMittal\u2019s activities caused the sedimentation or any chemical pollution.",
]

# (Sample Code, TSS)
TABLE2 = [
    ("YEEWA-DS", "532"), ("YEEWA-MS", "523"), ("YEEWA-US", "628"),
    ("YWK2-ES-SW-001", "1858"), ("YWK2-ES-SW-002", "2,400"), ("YWK2-ES-SW-003", "769"),
    ("YWK1-ES-SW-001", "259"), ("YWK1-ES-SW-002", "246"), ("YWK1-ES-SW-003", "188"),
    ("W-SW-VA-001", "24"), ("W-SW-VA-002", "24"), ("W-SW-VA-003", "20"),
    ("POM-SW-VA-001", "11"), ("POM-SW-VA-002", "24"), ("POM-SW-VA-003", "164"),
    ("WE-JC-SW-001", "102"), ("WE-JC-SW-002", "118"), ("WE-SW-JC-003", "214"),
    ("SM-SW-JC-001", "84"), ("AF-SW-JC-00", "1067"), ("NEN-SW-JC-001", "92"),
]
TABLE2_STD = "\u226450.0"
TABLE2_INSTR = "Colorimeter"

# --------------------------------------------------------------------------
# DOCX
# --------------------------------------------------------------------------
def _shade(cell, hex_fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    tcPr.append(shd)


def _cell_text(cell, text, bold=False, size=9, align=None, color=None):
    cell.text = ""
    p = cell.paragraphs[0]
    if align is not None:
        p.alignment = align
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def build_docx(path: Path):
    doc = Document()
    sec = doc.sections[0]
    sec.orientation = WD_ORIENT.LANDSCAPE
    sec.page_width, sec.page_height = sec.page_height, sec.page_width
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Inches(0.6))
    sec.top_margin = sec.bottom_margin = Inches(0.6)

    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(11)

    for label, value in HEADER_LINES:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(label); r.bold = True
        p.add_run(value)

    doc.add_paragraph()
    cap = doc.add_paragraph()
    cap.add_run("Table 1: Surface Water Quality Sample Information").font.size = Pt(10)

    # Table 1 --------------------------------------------------------------
    widths = [Inches(1.7), Inches(1.15), Inches(0.85), Inches(0.9), Inches(0.8), Inches(4.3)]
    t = doc.add_table(rows=2, cols=6)
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = ["Sample Location", "Sample ID", "GPS Coordinates", "", "Sampling Time", "Description"]
    t.cell(0, 2).merge(t.cell(0, 3))
    for c in (0, 1, 4, 5):
        t.cell(0, c).merge(t.cell(1, c))
    for i, h in enumerate(hdr):
        if i == 3:
            continue
        _cell_text(t.cell(0, i), h, bold=True, size=9, align=WD_ALIGN_PARAGRAPH.CENTER, color="FFFFFF")
    _cell_text(t.cell(1, 2), "Latitude", bold=True, size=9, align=WD_ALIGN_PARAGRAPH.CENTER, color="FFFFFF")
    _cell_text(t.cell(1, 3), "Longitude", bold=True, size=9, align=WD_ALIGN_PARAGRAPH.CENTER, color="FFFFFF")
    for row in t.rows[:2]:
        for cell in row.cells:
            _shade(cell, "404040")

    for loc, sid, lat, lon, tm, desc in TABLE1:
        cells = t.add_row().cells
        is_es = sid.startswith(SHADED_PREFIXES)
        _cell_text(cells[0], loc)
        _cell_text(cells[1], sid, align=WD_ALIGN_PARAGRAPH.CENTER)
        _cell_text(cells[2], lat, align=WD_ALIGN_PARAGRAPH.CENTER)
        _cell_text(cells[3], lon, align=WD_ALIGN_PARAGRAPH.CENTER)
        _cell_text(cells[4], tm, align=WD_ALIGN_PARAGRAPH.CENTER)
        _cell_text(cells[5], desc if desc else "\u2014", size=8.5,
                   align=None if desc else WD_ALIGN_PARAGRAPH.CENTER)
        if is_es:
            for c in cells:
                _shade(c, "F2F2F2")
    for row in t.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = w

    note = doc.add_paragraph()
    nr = note.add_run(TABLE1_NOTE)
    nr.italic = True; nr.font.size = Pt(9)

    # Observations sections ------------------------------------------------
    def _obs_section(heading, intro, bullets):
        doc.add_paragraph()
        h = doc.add_paragraph()
        hr = h.add_run(heading.upper()); hr.bold = True; hr.font.size = Pt(11)
        doc.add_paragraph(intro)
        for ob in bullets:
            p = doc.add_paragraph(ob, style="List Bullet")
            p.paragraph_format.space_after = Pt(4)

    _obs_section(OBS_HEADING, OBS_INTRO, OBSERVATIONS)
    _obs_section(VA_HEADING, VA_INTRO, VA_OBSERVATIONS)

    # VA photo plates (2 x 2 grid)
    doc.add_paragraph()
    pc = doc.add_paragraph()
    pcr = pc.add_run("Photographic documentation \u2013 VA group sampling points"); pcr.bold = True
    pt = doc.add_table(rows=2, cols=2)
    pt.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (fn, capt) in enumerate(VA_PHOTOS):
        cell = pt.cell(i // 2, i % 2)
        cell.text = ""
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(str(PHOTO_DIR / fn), height=Inches(2.75))
        cp = cell.add_paragraph()
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cr = cp.add_run(capt); cr.font.size = Pt(8.5); cr.italic = True

    # Table 2 --------------------------------------------------------------
    doc.add_page_break()
    cap2 = doc.add_paragraph()
    cap2.add_run("Table 2: Surface Water Quality Result").font.size = Pt(10)
    t2 = doc.add_table(rows=2, cols=4)
    t2.style = "Table Grid"
    t2.alignment = WD_TABLE_ALIGNMENT.CENTER
    t2.cell(0, 0).merge(t2.cell(1, 0)); t2.cell(0, 2).merge(t2.cell(1, 2)); t2.cell(0, 3).merge(t2.cell(1, 3))
    _cell_text(t2.cell(0, 0), "Sample Code", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, color="FFFFFF")
    _cell_text(t2.cell(0, 1), "Sample Parameter", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, color="FFFFFF")
    _cell_text(t2.cell(1, 1), "Total Suspended Solid (TSS)", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, color="FFFFFF")
    _cell_text(t2.cell(0, 2), "LWQS Class III", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, color="FFFFFF")
    _cell_text(t2.cell(0, 3), "Instrumentation", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, color="FFFFFF")
    for row in t2.rows[:2]:
        for cell in row.cells:
            _shade(cell, "404040")
    first = None
    for code, tss in TABLE2:
        cells = t2.add_row().cells
        _cell_text(cells[0], code)
        _cell_text(cells[1], tss, align=WD_ALIGN_PARAGRAPH.CENTER)
        if first is None:
            first = cells
    last = t2.rows[-1].cells
    m2 = first[2].merge(last[2]); m3 = first[3].merge(last[3])
    _cell_text(m2, TABLE2_STD, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    _cell_text(m3, TABLE2_INSTR, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    for row in t2.rows:
        for i, w in enumerate([Inches(1.8), Inches(1.8), Inches(1.5), Inches(1.5)]):
            row.cells[i].width = w

    doc.save(path)


# --------------------------------------------------------------------------
# PDF
# --------------------------------------------------------------------------
def build_pdf(path: Path):
    ss = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=ss["Normal"], fontName="Times-Roman", fontSize=10.5, leading=14)
    small = ParagraphStyle("small", parent=body, fontSize=8.5, leading=10.5)
    small_c = ParagraphStyle("small_c", parent=small, alignment=TA_CENTER)
    hdr = ParagraphStyle("hdr", parent=small, fontName="Times-Bold", textColor=colors.white, alignment=TA_CENTER)
    cap = ParagraphStyle("cap", parent=body, fontName="Helvetica", fontSize=9)
    note = ParagraphStyle("note", parent=body, fontName="Times-Italic", fontSize=9, leading=11)
    head = ParagraphStyle("head", parent=body, fontName="Times-Bold", fontSize=11.5, spaceBefore=10, spaceAfter=4)

    doc = SimpleDocTemplate(str(path), pagesize=landscape(A4),
                            leftMargin=0.6 * inch, rightMargin=0.6 * inch,
                            topMargin=0.6 * inch, bottomMargin=0.6 * inch,
                            title=BASENAME)
    story = []
    for label, value in HEADER_LINES:
        story.append(Paragraph(f"<b>{label}</b>{value}", body))
    story.append(Spacer(1, 14))
    story.append(Paragraph("Table 1: Surface Water Quality Sample Information", cap))
    story.append(Spacer(1, 4))

    data = [
        [Paragraph("Sample Location", hdr), Paragraph("Sample ID", hdr), Paragraph("GPS Coordinates", hdr), "",
         Paragraph("Sampling Time", hdr), Paragraph("Description", hdr)],
        ["", "", Paragraph("Latitude", hdr), Paragraph("Longitude", hdr), "", ""],
    ]
    es_rows = []
    for idx, (loc, sid, lat, lon, tm, desc) in enumerate(TABLE1, start=2):
        if sid.startswith(SHADED_PREFIXES):
            es_rows.append(idx)
        data.append([Paragraph(loc, small), Paragraph(sid, small_c), Paragraph(lat, small_c),
                     Paragraph(lon, small_c), Paragraph(tm, small_c),
                     Paragraph(desc, small) if desc else Paragraph("\u2014", small_c)])
    col_w = [1.7 * inch, 1.15 * inch, 0.85 * inch, 0.9 * inch, 0.8 * inch, 4.3 * inch]
    t = Table(data, colWidths=col_w, repeatRows=2)
    ts = TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BACKGROUND", (0, 0), (-1, 1), colors.HexColor("#404040")),
        ("SPAN", (2, 0), (3, 0)),
        ("SPAN", (0, 0), (0, 1)), ("SPAN", (1, 0), (1, 1)), ("SPAN", (4, 0), (4, 1)), ("SPAN", (5, 0), (5, 1)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ])
    for r in es_rows:
        ts.add("BACKGROUND", (0, r), (-1, r), colors.HexColor("#F2F2F2"))
    t.setStyle(ts)
    story.append(t)
    story.append(Spacer(1, 6))
    story.append(Paragraph(TABLE1_NOTE, note))

    def _obs_section(heading, intro, bullets):
        story.append(Paragraph(heading.upper(), head))
        story.append(Paragraph(intro, body))
        story.append(Spacer(1, 4))
        story.append(ListFlowable([ListItem(Paragraph(o, body), leftIndent=14) for o in bullets],
                                  bulletType="bullet", start="\u2022", leftIndent=14, bulletFontSize=9))

    _obs_section(OBS_HEADING, OBS_INTRO, OBSERVATIONS)
    _obs_section(VA_HEADING, VA_INTRO, VA_OBSERVATIONS)

    # VA photo plates
    story.append(PageBreak())
    story.append(Paragraph("<b>Photographic documentation \u2013 VA group sampling points</b>", body))
    story.append(Spacer(1, 6))
    capt_style = ParagraphStyle("capt", parent=small, fontName="Times-Italic", alignment=TA_CENTER)
    ph = 2.75 * inch  # uniform plate height so the 2x2 grid fits one page
    cells = []
    for fn, capt in VA_PHOTOS:
        img = Image(str(PHOTO_DIR / fn))
        ratio = img.imageWidth / img.imageHeight
        img.drawHeight, img.drawWidth = ph, ph * ratio
        cells.append([img, Spacer(1, 2), Paragraph(capt, capt_style)])
    grid = Table([[cells[0], cells[1]], [cells[2], cells[3]]], colWidths=[5.2 * inch] * 2)
    grid.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    story.append(grid)

    story.append(PageBreak())
    story.append(Paragraph("Table 2: Surface Water Quality Result", cap))
    story.append(Spacer(1, 4))
    d2 = [[Paragraph("Sample Code", hdr), Paragraph("Sample Parameter", hdr), Paragraph("LWQS Class III", hdr),
           Paragraph("Instrumentation", hdr)],
          ["", Paragraph("Total Suspended Solid (TSS)", hdr), "", ""]]
    for i, (code, tss) in enumerate(TABLE2):
        d2.append([Paragraph(code, small), Paragraph(tss, small_c),
                   Paragraph(f"<b>{TABLE2_STD}</b>", small_c) if i == 0 else "",
                   Paragraph(f"<b>{TABLE2_INSTR}</b>", small_c) if i == 0 else ""])
    t2 = Table(d2, colWidths=[1.8 * inch, 1.8 * inch, 1.5 * inch, 1.5 * inch], repeatRows=2)
    t2.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BACKGROUND", (0, 0), (-1, 1), colors.HexColor("#404040")),
        ("SPAN", (0, 0), (0, 1)), ("SPAN", (2, 0), (2, 1)), ("SPAN", (3, 0), (3, 1)),
        ("SPAN", (2, 2), (2, -1)), ("SPAN", (3, 2), (3, -1)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(t2)
    doc.build(story)


if __name__ == "__main__":
    docx_path = OUT_DIR / f"{BASENAME}.docx"
    pdf_path = OUT_DIR / f"{BASENAME}.pdf"
    build_docx(docx_path)
    build_pdf(pdf_path)
    print("wrote", docx_path)
    print("wrote", pdf_path)
