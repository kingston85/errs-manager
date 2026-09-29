# -*- coding: utf-8 -*-
"""Render the consolidated report to a print-ready PDF (ReportLab)."""
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Flowable, Frame,
                                Image, KeepTogether, NextPageTemplate,
                                PageBreak, PageTemplate, Paragraph, Spacer,
                                Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

import content as C

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(
    HERE, "..", "ERRS-Consolidated-Third-Quarter-Report-2026.pdf"))

# ----------------------------------------------------------------- fonts
FONT, FONT_B, FONT_I = "Times-Roman", "Times-Bold", "Times-Italic"
FONT_BI = "Times-BoldItalic"
_FD = os.path.join(HERE, "fonts")
_TINOS = {"": "Tinos-Regular.ttf", "-Bold": "Tinos-Bold.ttf",
          "-Italic": "Tinos-Italic.ttf", "-BoldItalic": "Tinos-BoldItalic.ttf"}
if all(os.path.exists(os.path.join(_FD, v)) for v in _TINOS.values()):
    # Tinos is metrically and visually compatible with Times New Roman and
    # carries the full Unicode range the report needs.
    for suf, fn in _TINOS.items():
        pdfmetrics.registerFont(TTFont("Times New Roman" + suf,
                                       os.path.join(_FD, fn)))
    pdfmetrics.registerFontFamily(
        "Times New Roman", normal="Times New Roman",
        bold="Times New Roman-Bold", italic="Times New Roman-Italic",
        boldItalic="Times New Roman-BoldItalic")
    FONT = "Times New Roman"
    FONT_B = "Times New Roman-Bold"
    FONT_I = "Times New Roman-Italic"
    FONT_BI = "Times New Roman-BoldItalic"

# ----------------------------------------------------------------- palette
GREEN = colors.HexColor("#1F4E3D")
GREEN_L = colors.HexColor("#2E7D5B")
GOLD = colors.HexColor("#C9A227")
BLACK = colors.black
# All running text is black; the accent colours below are used only for
# design elements (rules, table header bands, zebra fills, the cover page
# and the PENDING placeholder panels).
INK = BLACK
BODY = BLACK
MUTED = BLACK
RULE = colors.HexColor("#C9CFD6")
ZEBRA = colors.HexColor("#F4F7F5")
PANEL = colors.HexColor("#EEF3F0")
HEADBG = GREEN
TOTBG = colors.HexColor("#DCE6E0")

PW, PH = A4
MARGIN_L = MARGIN_R = 20 * mm
MARGIN_T = 22 * mm
MARGIN_B = 20 * mm
CW = PW - MARGIN_L - MARGIN_R                       # portrait content width
LW, LH = landscape(A4)
CWL = LW - MARGIN_L - MARGIN_R                      # landscape content width

# ----------------------------------------------------------------- styles
def S(name, **kw):
    kw.setdefault("fontName", FONT)
    kw.setdefault("textColor", BODY)
    return ParagraphStyle(name, **kw)


ST = {
    "body": S("body", fontSize=11.2, leading=15.8, alignment=TA_JUSTIFY,
              spaceAfter=7),
    "lead": S("lead", fontSize=12, leading=17.2, alignment=TA_JUSTIFY,
              spaceAfter=9, textColor=INK),
    "note": S("note", fontSize=9.2, leading=12.4, textColor=MUTED,
              spaceBefore=3, spaceAfter=10, alignment=TA_LEFT),
    "h1": S("h1", fontName=FONT_B, fontSize=17, leading=21, textColor=BLACK,
            spaceBefore=6, spaceAfter=10),
    "h2": S("h2", fontName=FONT_B, fontSize=13.4, leading=17.4,
            textColor=BLACK, spaceBefore=14, spaceAfter=6),
    "h3": S("h3", fontName=FONT_B, fontSize=11.6, leading=15.2,
            textColor=BLACK, spaceBefore=11, spaceAfter=4),
    "h4": S("h4", fontName=FONT_B, fontSize=10.8, leading=14.2,
            textColor=BLACK, spaceBefore=9, spaceAfter=3),
    "phtitle": S("phtitle", fontName=FONT_B, fontSize=10.4, leading=13.8,
                 textColor=colors.HexColor("#8A6D1F")),
    "phitem": S("phitem", fontSize=10, leading=13.6, textColor=BODY),
    "cap": S("cap", fontName=FONT_B, fontSize=9.6, leading=12.8,
             textColor=BLACK, spaceBefore=2, spaceAfter=4),
    "figcap": S("figcap", fontName=FONT_B, fontSize=9.6, leading=12.8,
                textColor=BLACK, spaceBefore=5, spaceAfter=12,
                alignment=TA_CENTER),
    "bullet": S("bullet", fontSize=11.2, leading=15.6, alignment=TA_JUSTIFY,
                spaceAfter=4),
    "th": S("th", fontName=FONT_B, fontSize=9.3, leading=11.8,
            textColor=colors.white),
    "thc": S("thc", fontName=FONT_B, fontSize=9.3, leading=11.8,
             textColor=colors.white, alignment=TA_CENTER),
    "td": S("td", fontSize=9.8, leading=12.8),
    "tdc": S("tdc", fontSize=9.8, leading=12.8, alignment=TA_CENTER),
    "tds": S("tds", fontSize=8.9, leading=11.6),
    "tdsc": S("tdsc", fontSize=8.9, leading=11.6, alignment=TA_CENTER),
    "tdx": S("tdx", fontSize=7.5, leading=9.4),
    "tdxc": S("tdxc", fontSize=7.5, leading=9.4, alignment=TA_CENTER),
    "tot": S("tot", fontName=FONT_B, fontSize=9.8, leading=12.8,
             textColor=BLACK),
    "totc": S("totc", fontName=FONT_B, fontSize=9.8, leading=12.8,
              textColor=BLACK, alignment=TA_CENTER),
    "toc0": S("toc0", fontName=FONT_B, fontSize=11.6, leading=20, textColor=BLACK,
              spaceBefore=8),
    "toc1": S("toc1", fontName=FONT_B, fontSize=10.5, leading=17,
              textColor=INK, leftIndent=8),
    "toc2": S("toc2", fontSize=10.1, leading=15.4, leftIndent=22),
    "toc3": S("toc3", fontSize=9.7, leading=14.4, leftIndent=38,
              textColor=BLACK),
    "cov1": S("cov1", fontName=FONT_B, fontSize=13, leading=18,
              alignment=TA_CENTER, textColor=GREEN),
    "cov2": S("cov2", fontSize=9.6, leading=13.6, alignment=TA_CENTER,
              textColor=MUTED),
    "covtitle": S("covtitle", fontName=FONT_B, fontSize=27, leading=33,
                  alignment=TA_CENTER, textColor=GREEN),
    "covsub": S("covsub", fontName=FONT_B, fontSize=14.5, leading=20,
                alignment=TA_CENTER, textColor=GOLD),
    "covkey": S("covkey", fontName=FONT_B, fontSize=10, leading=14,
                textColor=GREEN),
    "covval": S("covval", fontSize=10, leading=14, textColor=BODY),
    "covmeta": S("covmeta", fontSize=10.6, leading=16, alignment=TA_CENTER,
                 textColor=BODY),
    "part_num": S("part_num", fontName=FONT_B, fontSize=13, leading=18,
                  alignment=TA_CENTER, textColor=GOLD),
    "part_title": S("part_title", fontName=FONT_B, fontSize=23, leading=29,
                    alignment=TA_CENTER, textColor=GREEN),
    "part_sub": S("part_sub", fontSize=12, leading=17, alignment=TA_CENTER,
                  textColor=MUTED),
}


class HRule(Flowable):
    def __init__(self, width, thickness=0.9, color=RULE, space=3):
        Flowable.__init__(self)
        self.width, self.thickness, self.color, self.space = (
            width, thickness, color, space)
        self.height = thickness + space

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, self.space, self.width, self.space)


def esc(t):
    return (str(t).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace("\n", "<br/>"))


# ----------------------------------------------------------------- numbering
tbl_no = [0]
fig_no = [0]
TABLES, FIGURES = [], []
h1_no, h2_no, h3_no, h4_no = [0], [0], [0], [0]
_bk = [0]
_olvl = [-1]


def bookmark(label):
    _bk[0] += 1
    return "sec%d" % _bk[0]


class Anchor(Flowable):
    """Zero-height flowable that registers a TOC entry at its real page."""

    def __init__(self, level, text, key):
        Flowable.__init__(self)
        self.level, self.text, self.key = level, text, key
        self.width = self.height = 0

    def draw(self):
        self.canv.bookmarkPage(self.key)
        lvl = min(max(0, self.level - 1), _olvl[0] + 1)
        _olvl[0] = lvl
        self.canv.addOutlineEntry(self.text.replace("<br/>", " "),
                                  self.key, lvl, False)



# ----------------------------------------------------------------- page deco
def _frame_deco(canvas, doc, pw, ph, first=False, plain=False):
    canvas.saveState()
    if not plain:
        # header rule + running title
        canvas.setFont(FONT_B, 8.0)
        canvas.setFillColor(BLACK)
        canvas.drawCentredString(pw / 2.0, ph - 12.4 * mm,
                                 C.META["running_top"])
        canvas.setFont(FONT, 8.0)
        canvas.setFillColor(BLACK)
        canvas.drawCentredString(pw / 2.0, ph - 15.8 * mm,
                                 C.META["running_title"])
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.7)
        canvas.line(MARGIN_L, ph - 17.6 * mm, pw - MARGIN_R, ph - 17.6 * mm)
        # footer
        canvas.setStrokeColor(RULE)
        canvas.line(MARGIN_L, 14 * mm, pw - MARGIN_R, 14 * mm)
        canvas.setFont(FONT, 8.4)
        canvas.setFillColor(BLACK)
        canvas.drawString(MARGIN_L, 10.2 * mm,
                          "Environmental Protection Agency of Liberia  \u00b7  "
                          "ERRS Department")
        canvas.setFont(FONT_B, 9.2)
        canvas.setFillColor(BLACK)
        canvas.drawRightString(pw - MARGIN_R, 10.2 * mm,
                               str(canvas.getPageNumber()))
    canvas.restoreState()


def deco_portrait(canvas, doc):
    _frame_deco(canvas, doc, PW, PH)


def deco_landscape(canvas, doc):
    _frame_deco(canvas, doc, LW, LH)


def deco_plain(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(GREEN)
    canvas.rect(0, PH - 10 * mm, PW, 10 * mm, stroke=0, fill=1)
    canvas.setFillColor(GOLD)
    canvas.rect(0, PH - 11.6 * mm, PW, 1.6 * mm, stroke=0, fill=1)
    canvas.setFillColor(GREEN)
    canvas.rect(0, 0, PW, 8 * mm, stroke=0, fill=1)
    canvas.restoreState()


class Doc(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Anchor):
            self.notify("TOCEntry", (flowable.level, flowable.text,
                                     self.page, flowable.key))


def build_table(b):
    tbl_no[0] += 1
    n = tbl_no[0]
    cap = "Table %d.  %s" % (n, b["caption"])
    TABLES.append((n, b["caption"]))

    small = b.get("small")
    xsmall = b.get("xsmall")
    tdk = "tdx" if xsmall else ("tds" if small else "td")
    tdck = tdk + "c"
    align = b.get("align") or ["l"] * len(b["head"])
    widths_pct = b.get("widths") or [100.0 / len(b["head"])] * len(b["head"])
    total_w = CWL if b.get("_landscape") else CW
    widths = [total_w * w / 100.0 for w in widths_pct]

    data, style = [], []
    r0 = 0
    if b.get("group_head"):
        grow, ci = [], 0
        for label, span in b["group_head"]:
            grow.append(Paragraph(esc(label), ST["thc"]))
            for k in range(1, span):
                grow.append("")
            if label:
                style.append(("SPAN", (ci, 0), (ci + span - 1, 0)))
            ci += span
        data.append(grow)
        style += [("BACKGROUND", (0, 0), (-1, 0), GREEN_L),
                  ("VALIGN", (0, 0), (-1, 0), "MIDDLE")]
        r0 = 1

    data.append([Paragraph(esc(h), ST["thc"] if align[i] == "c" else ST["th"])
                 for i, h in enumerate(b["head"])])
    style += [
        ("BACKGROUND", (0, r0), (-1, r0), HEADBG),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4.5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4.5),
        ("LINEBELOW", (0, r0), (-1, r0), 0.9, GREEN),
        ("GRID", (0, 0), (-1, -1), 0.4, RULE),
        ("BOX", (0, 0), (-1, -1), 0.9, GREEN),
    ]

    body_start = r0 + 1
    rows = b["rows"]
    is_total = b.get("total_row")
    for ri, row in enumerate(rows):
        last = is_total and ri == len(rows) - 1
        cells = []
        for ci, cell in enumerate(row):
            if last:
                st = ST["totc"] if align[ci] == "c" else ST["tot"]
            else:
                st = ST[tdck] if align[ci] == "c" else ST[tdk]
            cells.append(Paragraph(esc(cell if cell != "" else ""), st))
        data.append(cells)
        rr = body_start + ri
        if last:
            style.append(("BACKGROUND", (0, rr), (-1, rr), TOTBG))
        elif ri % 2 == 1:
            style.append(("BACKGROUND", (0, rr), (-1, rr), ZEBRA))

    t = Table(data, colWidths=widths, repeatRows=body_start, hAlign="LEFT")
    t.setStyle(TableStyle(style))

    flow = [Paragraph(esc(cap), ST["cap"]), t]
    if b.get("note"):
        flow.append(Paragraph("Note: " + esc(b["note"]), ST["note"]))
    else:
        flow.append(Spacer(1, 10))
    return flow


inch = 25.4 * mm


def build_figure(b):
    fig_no[0] += 1
    n = fig_no[0]
    FIGURES.append((n, b["caption"]))
    ir = ImageReader(b["path"])
    iw, ih = ir.getSize()
    w = min(b.get("width", 6.0) * inch, CW)
    h = w * ih / float(iw)
    maxh = PH - MARGIN_T - MARGIN_B - 40 * mm
    if h > maxh:
        h = maxh
        w = h * iw / float(ih)
    img = Image(b["path"], width=w, height=h)
    img.hAlign = "CENTER"
    cap = Paragraph("Figure %d.  %s" % (n, esc(b["caption"])), ST["figcap"])
    return [KeepTogether([Spacer(1, 4), img, cap])]


def build_placeholder(b):
    rows = [[Paragraph("PENDING \u2014 " + esc(b["title"]).upper()
                       if not b["title"].upper().startswith("PENDING")
                       else esc(b["title"]).upper(), ST["phtitle"])]]
    items = []
    for it in b.get("items", []):
        items.append(Paragraph("<bullet>&bull;</bullet>&nbsp;" + esc(it),
                               ParagraphStyle("phi", parent=ST["phitem"],
                                              leftIndent=12, bulletIndent=2,
                                              spaceAfter=3)))
    if items:
        rows.append([items])
    t = Table(rows, colWidths=[CW], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FDF7E3")),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#C9A227")),
        ("LINEBEFORE", (0, 0), (0, -1), 3.2, colors.HexColor("#C9A227")),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return [Spacer(1, 4), KeepTogether(t), Spacer(1, 12)]


def cover_flow():
    out = [Spacer(1, 6 * mm)]

    def _img(path, w_mm):
        if not os.path.exists(path):
            return Paragraph("", ST["cov2"])
        iw, ih = ImageReader(path).getSize()
        w = w_mm * mm
        return Image(path, width=w, height=w * ih / float(iw))

    banner = [_img(C.META.get("coat", ""), 23),
              [Paragraph(C.META["agency"], ST["cov1"]),
               Paragraph(C.META["agency2"], ST["cov1"]),
               Spacer(1, 2),
               Paragraph(esc(C.META["address"]), ST["cov2"])],
              _img(C.META["logo"], 23)]
    bt = Table([banner], colWidths=[28 * mm, CW - 56 * mm, 28 * mm],
               hAlign="CENTER")
    bt.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    out += [
        bt,
        Spacer(1, 12 * mm),
        HRule(CW, 1.4, GOLD, 0),
        Spacer(1, 8 * mm),
        Paragraph(C.META["dept_line1"], ST["covtitle"]),
        Paragraph(C.META["dept_line2"], ST["covtitle"]),
        Spacer(1, 6 * mm),
        Paragraph(C.META["title"], ST["covsub"]),
        Spacer(1, 2 * mm),
        Paragraph(C.META["period_line"], ST["covmeta"]),
        Spacer(1, 9 * mm),
        HRule(CW, 1.4, GOLD, 0),
        Spacer(1, 8 * mm),
    ]
    rows = [[Paragraph("<b>%s</b>" % esc(k), ST["covkey"]),
             Paragraph(esc(v), ST["covval"])]
            for k, v in C.META["cover_meta"]]
    t = Table(rows, colWidths=[46 * mm, CW - 46 * mm], hAlign="CENTER")
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#E4E8EC")),
    ]))
    out.append(t)
    out += [Spacer(1, 8 * mm), HRule(CW, 0.9, RULE, 0), Spacer(1, 3 * mm),
            Paragraph("Monrovia, Liberia", ST["cov2"])]
    return out


def part_flow(b):
    key = bookmark(b["title"])
    return [
        Anchor(0, b["num"] + " \u2014 " + b["title"], key),
        Spacer(1, 62 * mm),
        Paragraph(b["num"], ST["part_num"]),
        Spacer(1, 4 * mm),
        HRule(CW, 1.2, GOLD, 0),
        Spacer(1, 7 * mm),
        Paragraph(b["title"], ST["part_title"]),
        Spacer(1, 5 * mm),
        Paragraph(b["subtitle"], ST["part_sub"]),
        Spacer(1, 7 * mm),
        HRule(CW, 1.2, GOLD, 0),
    ]


def main():
    story = []
    landscape_mode = [False]

    # --------------------------------------------------- cover
    story.append(NextPageTemplate("plain"))
    story += cover_flow()
    story.append(NextPageTemplate("portrait"))

    toc = TableOfContents()
    toc.levelStyles = [ST["toc0"], ST["toc1"], ST["toc2"], ST["toc3"]]

    for b in C.BLOCKS:
        k = b["kind"]
        if k == "cover":
            continue
        elif k == "pagebreak":
            story.append(PageBreak())
        elif k == "part":
            story.append(NextPageTemplate("part"))
            story.append(PageBreak())
            story += part_flow(b)
            story.append(NextPageTemplate("portrait"))
            story.append(PageBreak())
            h2_no[0] = h3_no[0] = 0
        elif k == "toc":
            story.append(Paragraph("Table of Contents", ST["h1"]))
            story.append(HRule(CW, 1.2, GOLD, 4))
            story.append(Spacer(1, 4))
            story.append(toc)
        elif k == "lot":
            story.append(Paragraph("List of Tables", ST["h1"]))
            story.append(HRule(CW, 1.2, GOLD, 4))
            story.append(Spacer(1, 4))
            story.append(LotLof("tables"))
        elif k == "lof":
            story.append(Paragraph("List of Figures", ST["h1"]))
            story.append(HRule(CW, 1.2, GOLD, 4))
            story.append(Spacer(1, 4))
            story.append(LotLof("figures"))
        elif k == "h1":
            if b.get("unnumbered"):
                story.append(Paragraph(esc(b["text"]), ST["h1"]))
                story.append(HRule(CW, 1.2, GOLD, 4))
                story.append(Spacer(1, 4))
            else:
                h1_no[0] += 1
                h2_no[0] = h3_no[0] = h4_no[0] = 0
                label = "%d.  %s" % (h1_no[0], b["text"])
                key = bookmark(label)
                story.append(Anchor(1, esc(label), key))
                story.append(Paragraph(esc(label), ST["h1"]))
                story.append(HRule(CW, 1.2, GOLD, 4))
                story.append(Spacer(1, 4))
        elif k == "h2":
            h2_no[0] += 1
            h3_no[0] = h4_no[0] = 0
            label = "%d.%d  %s" % (h1_no[0], h2_no[0], b["text"])
            key = bookmark(label)
            story.append(CondPageBreak(34 * mm))
            story.append(Anchor(2, esc(label), key))
            story.append(Paragraph(esc(label), ST["h2"]))
        elif k == "h3":
            if b.get("unnumbered"):
                story.append(CondPageBreak(26 * mm))
                story.append(Paragraph(esc(b["text"]), ST["h3"]))
            else:
                h3_no[0] += 1
                h4_no[0] = 0
                label = "%d.%d.%d  %s" % (h1_no[0], h2_no[0], h3_no[0],
                                          b["text"])
                key = bookmark(label)
                story.append(CondPageBreak(30 * mm))
                story.append(Anchor(3, esc(label), key))
                story.append(Paragraph(esc(label), ST["h3"]))
        elif k == "h4":
            if b.get("unnumbered"):
                story.append(CondPageBreak(24 * mm))
                story.append(Paragraph(esc(b["text"]), ST["h4"]))
            else:
                h4_no[0] += 1
                label = "%d.%d.%d.%d  %s" % (h1_no[0], h2_no[0], h3_no[0],
                                             h4_no[0], b["text"])
                story.append(CondPageBreak(28 * mm))
                story.append(Paragraph(esc(label), ST["h4"]))
        elif k == "placeholder":
            story += build_placeholder(b)
        elif k == "para":
            story.append(Paragraph(esc(b["text"]),
                                   ST.get(b.get("style", "body"), ST["body"])))
        elif k == "bullets":
            for it in b["items"]:
                story.append(Paragraph(
                    "<bullet>&bull;</bullet>&nbsp;%s" % esc(it),
                    ParagraphStyle("b", parent=ST["bullet"], leftIndent=13,
                                   bulletIndent=2)))
            story.append(Spacer(1, 6))
        elif k == "numbers":
            for i, it in enumerate(b["items"], 1):
                story.append(Paragraph(
                    "<bullet>%d.</bullet>&nbsp;%s" % (i, esc(it)),
                    ParagraphStyle("n", parent=ST["bullet"], leftIndent=18,
                                   bulletIndent=2)))
            story.append(Spacer(1, 6))
        elif k == "table":
            b = dict(b)
            b["_landscape"] = landscape_mode[0]
            story += build_table(b)
        elif k == "figure":
            story += build_figure(b)
        elif k == "landscape_on":
            landscape_mode[0] = True
            story.append(NextPageTemplate("land"))
            story.append(PageBreak())
        elif k == "landscape_off":
            landscape_mode[0] = False
            story.append(NextPageTemplate("portrait"))
            story.append(PageBreak())

    doc = Doc(OUT, pagesize=A4, title=C.META["title"] + " " + C.META["subtitle"],
              author="Environmental Protection Agency of Liberia \u2014 ERRS "
                     "Department",
              subject="Consolidated Third Quarter Report 2026",
              leftMargin=MARGIN_L, rightMargin=MARGIN_R,
              topMargin=MARGIN_T, bottomMargin=MARGIN_B)

    fp = Frame(MARGIN_L, MARGIN_B, CW, PH - MARGIN_T - MARGIN_B, id="p")
    fl = Frame(MARGIN_L, MARGIN_B, CWL, LH - MARGIN_T - MARGIN_B, id="l")
    fplain = Frame(MARGIN_L, MARGIN_B, CW, PH - MARGIN_T - MARGIN_B, id="c")
    doc.addPageTemplates([
        PageTemplate(id="plain", frames=[fplain], onPage=deco_plain,
                     pagesize=A4),
        PageTemplate(id="portrait", frames=[fp], onPage=deco_portrait,
                     pagesize=A4),
        PageTemplate(id="part", frames=[fplain], onPage=deco_plain, pagesize=A4),
        PageTemplate(id="land", frames=[fl], onPage=deco_landscape,
                     pagesize=landscape(A4)),
    ])
    doc.multiBuild(story)
    print("PDF written:", OUT)


class LotLof(Flowable):
    """Placeholder resolved on the second build pass."""
    registry = {"tables": TABLES, "figures": FIGURES}

    def __init__(self, which):
        Flowable.__init__(self)
        self.which = which
        self._inner = None
        self.width = CW
        self.height = 0

    def wrap(self, aw, ah):
        rows = LotLof.registry[self.which]
        label = "Table" if self.which == "tables" else "Figure"
        data = [[Paragraph("<b>%s %d</b>" % (label, n),
                           ParagraphStyle("x", fontName=FONT, fontSize=10,
                                          leading=13.6, textColor=BLACK)),
                 Paragraph(esc(cap), ParagraphStyle(
                     "y", fontName=FONT, fontSize=10, leading=13.6,
                     textColor=BLACK))]
                for n, cap in rows]
        if not data:
            data = [[Paragraph("", ST["td"]), Paragraph("", ST["td"])]]
        t = Table(data, colWidths=[24 * mm, CW - 24 * mm])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#E4E8EC")),
        ]))
        self._inner = t
        w, h = t.wrap(aw, ah)
        self.width, self.height = w, h
        return w, h

    def split(self, aw, ah):
        return self._inner.split(aw, ah) if self._inner else []

    def draw(self):
        if self._inner:
            self._inner.drawOn(self.canv, 0, 0)


if __name__ == "__main__":
    main()
