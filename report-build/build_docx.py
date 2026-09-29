# -*- coding: utf-8 -*-
"""Render the consolidated report to an editable Word document (python-docx)."""
import os

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Emu, Inches, Pt, RGBColor

import content as C

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(
    HERE, "..", "ERRS-Consolidated-Third-Quarter-Report-2026.docx"))

GREEN = RGBColor(0x1F, 0x4E, 0x3D)
GREEN_L = RGBColor(0x2E, 0x7D, 0x5B)
GOLD = RGBColor(0xC9, 0xA2, 0x27)
BODY = RGBColor(0x25, 0x29, 0x2E)
MUTED = RGBColor(0x5B, 0x64, 0x70)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

HEX_GREEN = "1F4E3D"
HEX_GREEN_L = "2E7D5B"
HEX_ZEBRA = "F4F7F5"
HEX_TOTAL = "DCE6E0"
HEX_RULE = "C9CFD6"

FONT = "Calibri"
PORTRAIT_W = Inches(6.69)      # A4 210mm - 2 x 20mm margins
LANDSCAPE_W = Inches(10.31)    # A4 297mm - 2 x 20mm margins

doc = Document()

# ------------------------------------------------------------------ styles
normal = doc.styles["Normal"]
normal.font.name = FONT
normal.font.size = Pt(10.5)
normal.font.color.rgb = BODY
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.12
rpr = normal.element.get_or_add_rPr()
rf = rpr.find(qn("w:rFonts"))
if rf is None:
    rf = OxmlElement("w:rFonts")
    rpr.append(rf)
for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
    rf.set(qn(a), FONT)


def set_margins(section, top=0.87, bottom=0.79, left=0.79, right=0.79):
    section.top_margin = Inches(top)
    section.bottom_margin = Inches(bottom)
    section.left_margin = Inches(left)
    section.right_margin = Inches(right)


sec = doc.sections[0]
sec.page_width = Inches(8.27)
sec.page_height = Inches(11.69)
set_margins(sec)


def shade(el, hexcolor):
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear")
    sh.set(qn("w:color"), "auto")
    sh.set(qn("w:fill"), hexcolor)
    el.append(sh)


def para_border(p, position="bottom", size=12, color=HEX_RULE, space=4):
    pPr = p._p.get_or_add_pPr()
    bd = pPr.find(qn("w:pBdr"))
    if bd is None:
        bd = OxmlElement("w:pBdr")
        pPr.append(bd)
    e = OxmlElement("w:" + position)
    e.set(qn("w:val"), "single")
    e.set(qn("w:sz"), str(size))
    e.set(qn("w:space"), str(space))
    e.set(qn("w:color"), color)
    bd.append(e)


def add_par(text="", size=10.5, bold=False, italic=False, color=BODY,
            align=None, space_before=0, space_after=6, leading=1.12,
            left_indent=0, font=FONT):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    pf.line_spacing = leading
    if left_indent:
        pf.left_indent = Inches(left_indent)
    if align is not None:
        p.alignment = align
    if text:
        r = p.add_run(text)
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.italic = italic
        r.font.color.rgb = color
        r.font.name = font
    return p


def field(paragraph, instr):
    r = paragraph.add_run()
    fc = OxmlElement("w:fldChar")
    fc.set(qn("w:fldCharType"), "begin")
    r._r.append(fc)
    r2 = paragraph.add_run()
    it = OxmlElement("w:instrText")
    it.set(qn("xml:space"), "preserve")
    it.text = instr
    r2._r.append(it)
    r3 = paragraph.add_run()
    fc2 = OxmlElement("w:fldChar")
    fc2.set(qn("w:fldCharType"), "separate")
    r3._r.append(fc2)
    r4 = paragraph.add_run("Right-click and select \u201cUpdate Field\u201d to "
                           "build this list.")
    r4.font.size = Pt(9.5)
    r4.font.color.rgb = MUTED
    r5 = paragraph.add_run()
    fc3 = OxmlElement("w:fldChar")
    fc3.set(qn("w:fldCharType"), "end")
    r5._r.append(fc3)


def bookmark_heading(p, level, text):
    """Mark a paragraph with a built-in heading outline level for the TOC."""
    pPr = p._p.get_or_add_pPr()
    pstyle = OxmlElement("w:pStyle")
    pstyle.set(qn("w:val"), "Heading%d" % level)
    pPr.insert(0, pstyle)


# ----------------------------------------------------------- header/footer
def decorate(section, running=True):
    hdr = section.header
    hp = hdr.paragraphs[0]
    hp.text = ""
    hp.paragraph_format.space_after = Pt(2)
    if running:
        hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = hp.add_run(C.META["running_top"])
        r.font.size = Pt(7.6)
        r.font.bold = True
        r.font.color.rgb = GREEN
        hp2 = hdr.add_paragraph()
        hp2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        hp2.paragraph_format.space_after = Pt(2)
        r2 = hp2.add_run(C.META["running_title"])
        r2.font.size = Pt(7.6)
        r2.font.color.rgb = MUTED
        para_border(hp2, "bottom", 6, HEX_RULE, 4)

    ftr = section.footer
    fp = ftr.paragraphs[0]
    fp.text = ""
    if running:
        tab = section.page_width - section.left_margin - section.right_margin
        fp.paragraph_format.tab_stops.add_tab_stop(Emu(int(tab)),
                                                   WD_ALIGN_PARAGRAPH.RIGHT)
        r = fp.add_run("Environmental Protection Agency of Liberia  \u00b7  "
                       "ERRS Department\t")
        r.font.size = Pt(7.8)
        r.font.color.rgb = MUTED
        r2 = fp.add_run()
        fc = OxmlElement("w:fldChar")
        fc.set(qn("w:fldCharType"), "begin")
        r2._r.append(fc)
        r3 = fp.add_run()
        it = OxmlElement("w:instrText")
        it.set(qn("xml:space"), "preserve")
        it.text = " PAGE "
        r3._r.append(it)
        r4 = fp.add_run()
        fc2 = OxmlElement("w:fldChar")
        fc2.set(qn("w:fldCharType"), "end")
        r4._r.append(fc2)
        for rr in (r2, r3, r4):
            rr.font.size = Pt(8.6)
            rr.font.bold = True
            rr.font.color.rgb = GREEN
        para_border(fp, "top", 6, HEX_RULE, 4)


# ------------------------------------------------------------------ tables
tbl_no = [0]
fig_no = [0]


def tbl_borders(t, color):
    tblPr = t._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right"):
        e = OxmlElement("w:" + edge)
        e.set(qn("w:val"), "single")
        e.set(qn("w:sz"), "18" if edge == "left" else "6")
        e.set(qn("w:space"), "0")
        e.set(qn("w:color"), color)
        borders.append(e)
    tblPr.append(borders)


def add_table(b, content_width):
    tbl_no[0] += 1
    n = tbl_no[0]
    cap = add_par("Table %d.  %s" % (n, b["caption"]), size=9.2, bold=True,
                  color=GREEN, space_before=8, space_after=3)

    head = b["head"]
    ncols = len(head)
    align = b.get("align") or ["l"] * ncols
    widths = b.get("widths") or [100.0 / ncols] * ncols
    group = b.get("group_head")
    small = b.get("small")
    xsmall = b.get("xsmall")
    fsize = 6.8 if xsmall else (8.2 if small else 9.0)
    hsize = 6.8 if xsmall else 8.6

    nrows = len(b["rows"]) + 1 + (1 if group else 0)
    t = doc.add_table(rows=nrows, cols=ncols)
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    t.autofit = False

    total = float(sum(widths))
    colw = [Emu(int(content_width * w / total)) for w in widths]
    for row in t.rows:
        for i, cell in enumerate(row.cells):
            cell.width = colw[i]

    ri = 0
    if group:
        row = t.rows[0]
        ci = 0
        for label, span in group:
            cells = row.cells[ci:ci + span]
            merged = cells[0]
            for c in cells[1:]:
                merged = merged.merge(c)
            merged.text = ""
            p = merged.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.space_before = Pt(1)
            r = p.add_run(label)
            r.font.bold = True
            r.font.size = Pt(hsize)
            r.font.color.rgb = WHITE
            shade(merged._tc.get_or_add_tcPr(), HEX_GREEN_L)
            merged.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            ci += span
        ri = 1

    hrow = t.rows[ri]
    for i, h in enumerate(head):
        cell = hrow.cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(1)
        p.paragraph_format.space_before = Pt(1)
        if align[i] == "c":
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for j, line in enumerate(str(h).split("\n")):
            if j:
                p.add_run().add_break()
            r = p.add_run(line)
            r.font.bold = True
            r.font.size = Pt(hsize)
            r.font.color.rgb = WHITE
        shade(cell._tc.get_or_add_tcPr(), HEX_GREEN)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    # repeat the header row on every page
    trPr = hrow._tr.get_or_add_trPr()
    th = OxmlElement("w:tblHeader")
    trPr.append(th)

    is_total = b.get("total_row")
    for k, rowvals in enumerate(b["rows"]):
        row = t.rows[ri + 1 + k]
        last = is_total and k == len(b["rows"]) - 1
        for i, val in enumerate(rowvals):
            cell = row.cells[i]
            cell.text = ""
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(1.5)
            p.paragraph_format.space_before = Pt(1.5)
            p.paragraph_format.line_spacing = 1.0
            if align[i] == "c":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for j, line in enumerate(str(val).split("\n")):
                if j:
                    p.add_run().add_break()
                r = p.add_run(line)
                r.font.size = Pt(fsize)
                if last:
                    r.font.bold = True
                    r.font.color.rgb = GREEN
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            if last:
                shade(cell._tc.get_or_add_tcPr(), HEX_TOTAL)
            elif k % 2 == 1:
                shade(cell._tc.get_or_add_tcPr(), HEX_ZEBRA)

    if b.get("note"):
        add_par("Note: " + b["note"], size=8.4, italic=False, color=MUTED,
                space_before=3, space_after=10, leading=1.05)
    else:
        add_par("", size=4, space_after=4)
    return cap


def add_figure(b, content_width):
    fig_no[0] += 1
    n = fig_no[0]
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    width = min(Inches(b.get("width", 6.0)), Emu(int(content_width)))
    p.add_run().add_picture(b["path"], width=width)
    cp = add_par("Figure %d.  %s" % (n, b["caption"]), size=9.2, bold=True,
                 color=GREEN, align=WD_ALIGN_PARAGRAPH.CENTER,
                 space_before=2, space_after=12)
    return cp


# -------------------------------------------------------------------- main
def main():
    decorate(doc.sections[0], running=False)

    # ---------------------------------------------------------- cover page
    add_par("", space_after=26)
    if os.path.exists(C.META["logo"]):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(14)
        p.add_run().add_picture(C.META["logo"], width=Inches(1.0))
    add_par(C.META["agency"], size=13, bold=True, color=GREEN,
            align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    add_par(C.META["agency2"], size=13, bold=True, color=GREEN,
            align=WD_ALIGN_PARAGRAPH.CENTER, space_after=6)
    for line in C.META["address"].split("\n"):
        add_par(line, size=9.6, color=MUTED, align=WD_ALIGN_PARAGRAPH.CENTER,
                space_after=1)
    rule = add_par("", space_before=18, space_after=16)
    para_border(rule, "bottom", 18, "C9A227", 6)
    add_par(C.META["dept_line1"], size=21, bold=True, color=GREEN,
            align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2, leading=1.0)
    add_par(C.META["dept_line2"], size=21, bold=True, color=GREEN,
            align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12, leading=1.0)
    add_par(C.META["title"], size=14.5, bold=True, color=GOLD,
            align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
    add_par(C.META["period_line"], size=10.6,
            align=WD_ALIGN_PARAGRAPH.CENTER, space_after=20)
    rule = add_par("", space_after=14)
    para_border(rule, "bottom", 18, "C9A227", 6)

    meta = C.META["cover_meta"]
    t = doc.add_table(rows=len(meta), cols=2)
    t.autofit = False
    for i, (kk, vv) in enumerate(meta):
        c0, c1 = t.rows[i].cells
        c0.width = Inches(1.85)
        c1.width = Inches(4.75)
        for cell, txt, bold, col in ((c0, kk, True, GREEN),
                                     (c1, vv, False, BODY)):
            pp = cell.paragraphs[0]
            pp.paragraph_format.space_after = Pt(3)
            pp.paragraph_format.space_before = Pt(3)
            rr = pp.add_run(txt)
            rr.font.size = Pt(10)
            rr.font.bold = bold
            rr.font.color.rgb = col
            rr.font.name = FONT
    rule = add_par("", space_before=18, space_after=8)
    para_border(rule, "bottom", 18, "C9A227", 6)
    add_par("Monrovia, Liberia", size=9.6, color=MUTED,
            align=WD_ALIGN_PARAGRAPH.CENTER)

    # body section with running head / foot
    body = doc.add_section(WD_SECTION.NEW_PAGE)
    body.page_width = Inches(8.27)
    body.page_height = Inches(11.69)
    set_margins(body)
    body.header.is_linked_to_previous = False
    body.footer.is_linked_to_previous = False
    decorate(body)

    cw = [int(PORTRAIT_W)]
    current = [body]

    for b in C.BLOCKS:
        k = b["kind"]
        if k == "cover":
            continue

        elif k == "pagebreak":
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

        elif k == "part":
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
            add_par("", space_after=170)
            add_par(b["num"], size=13, bold=True, color=GOLD,
                    align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
            rule = add_par("", space_after=12)
            para_border(rule, "bottom", 14, "C9A227", 6)
            p = add_par(b["title"], size=23, bold=True, color=GREEN,
                        align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10,
                        leading=1.0)
            bookmark_heading(p, 1, b["title"])
            for r in p.runs:
                r.font.size = Pt(23)
                r.font.color.rgb = GREEN
                r.font.bold = True
            add_par(b["subtitle"], size=12, color=MUTED,
                    align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)
            rule = add_par("", space_after=6)
            para_border(rule, "bottom", 14, "C9A227", 6)
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

        elif k == "toc":
            p = add_par("Table of Contents", size=16, bold=True, color=GREEN,
                        space_after=4)
            para_border(p, "bottom", 14, "C9A227", 6)
            add_par("", space_after=8)
            tp = doc.add_paragraph()
            field(tp, r' TOC \o "1-3" \h \z \u ')

        elif k == "lot":
            p = add_par("List of Tables", size=16, bold=True, color=GREEN,
                        space_after=4)
            para_border(p, "bottom", 14, "C9A227", 6)
            add_par("", space_after=8)
            for i, (num, cap) in enumerate(LOT, 1):
                add_par("Table %d.  %s" % (num, cap), size=9.4,
                        space_after=2, leading=1.05)

        elif k == "lof":
            p = add_par("List of Figures", size=16, bold=True, color=GREEN,
                        space_after=4)
            para_border(p, "bottom", 14, "C9A227", 6)
            add_par("", space_after=8)
            for num, cap in LOF:
                add_par("Figure %d.  %s" % (num, cap), size=9.4,
                        space_after=2, leading=1.05)

        elif k == "h1":
            if b.get("unnumbered"):
                p = add_par(b["text"], size=16, bold=True, color=GREEN,
                            space_before=6, space_after=4)
                para_border(p, "bottom", 14, "C9A227", 6)
                add_par("", space_after=6)
            else:
                H1[0] += 1
                H2[0] = H3[0] = H4[0] = 0
                p = add_par("%d.  %s" % (H1[0], b["text"]), size=16, bold=True,
                            color=GREEN, space_before=6, space_after=4)
                bookmark_heading(p, 1, b["text"])
                for r in p.runs:
                    r.font.size = Pt(16)
                    r.font.bold = True
                    r.font.color.rgb = GREEN
                para_border(p, "bottom", 14, "C9A227", 6)
                add_par("", space_after=6)

        elif k == "h2":
            H2[0] += 1
            H3[0] = H4[0] = 0
            p = add_par("%d.%d  %s" % (H1[0], H2[0], b["text"]), size=12.6,
                        bold=True, color=GREEN, space_before=14, space_after=5)
            bookmark_heading(p, 2, b["text"])
            for r in p.runs:
                r.font.size = Pt(12.6)
                r.font.bold = True
                r.font.color.rgb = GREEN

        elif k == "h3":
            if b.get("unnumbered"):
                add_par(b["text"], size=10.8, bold=True, color=GREEN_L,
                        space_before=11, space_after=4)
            else:
                H3[0] += 1
                H4[0] = 0
                p = add_par("%d.%d.%d  %s" % (H1[0], H2[0], H3[0], b["text"]),
                            size=10.8, bold=True, color=GREEN_L,
                            space_before=11, space_after=4)
                bookmark_heading(p, 3, b["text"])
                for r in p.runs:
                    r.font.size = Pt(10.8)
                    r.font.bold = True
                    r.font.color.rgb = GREEN_L

        elif k == "h4":
            if b.get("unnumbered"):
                add_par(b["text"], size=10.2, bold=True, color=BODY,
                        space_before=9, space_after=3)
            else:
                H4[0] += 1
                add_par("%d.%d.%d.%d  %s" % (H1[0], H2[0], H3[0], H4[0],
                                             b["text"]),
                        size=10.2, bold=True, color=BODY,
                        space_before=9, space_after=3)

        elif k == "placeholder":
            t = doc.add_table(rows=1, cols=1)
            t.autofit = False
            cell = t.rows[0].cells[0]
            cell.width = Emu(int(cw[0]))
            shade(cell._tc, "FDF7E3")
            title = b["title"].upper()
            if not title.startswith("PENDING"):
                title = "PENDING \u2014 " + title
            pp = cell.paragraphs[0]
            pp.paragraph_format.space_after = Pt(4)
            rr = pp.add_run(title)
            rr.font.size = Pt(10)
            rr.font.bold = True
            rr.font.name = FONT
            rr.font.color.rgb = RGBColor(0x8A, 0x6D, 0x1F)
            for it in b.get("items", []):
                ip = cell.add_paragraph()
                ip.paragraph_format.space_after = Pt(3)
                ip.paragraph_format.left_indent = Pt(12)
                ir = ip.add_run("\u2022  " + it)
                ir.font.size = Pt(9.5)
                ir.font.name = FONT
                ir.font.color.rgb = BODY
            tbl_borders(t, "C9A227")
            add_par("", space_after=8)

        elif k == "para":
            add_par(b["text"], size=10.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
                    space_after=7, leading=1.14)

        elif k == "bullets":
            for it in b["items"]:
                p = doc.add_paragraph(style="List Bullet")
                p.paragraph_format.space_after = Pt(3)
                p.paragraph_format.line_spacing = 1.1
                p.paragraph_format.left_indent = Inches(0.28)
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                r = p.add_run(it)
                r.font.size = Pt(10.3)
                r.font.color.rgb = BODY
            add_par("", size=4, space_after=4)

        elif k == "numbers":
            for it in b["items"]:
                p = doc.add_paragraph(style="List Number")
                p.paragraph_format.space_after = Pt(3)
                p.paragraph_format.line_spacing = 1.1
                p.paragraph_format.left_indent = Inches(0.34)
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                r = p.add_run(it)
                r.font.size = Pt(10.3)
                r.font.color.rgb = BODY
            add_par("", size=4, space_after=4)

        elif k == "table":
            add_table(b, cw[0])

        elif k == "figure":
            add_figure(b, cw[0])

        elif k == "landscape_on":
            s = doc.add_section(WD_SECTION.NEW_PAGE)
            s.orientation = WD_ORIENT.LANDSCAPE
            s.page_width = Inches(11.69)
            s.page_height = Inches(8.27)
            set_margins(s)
            s.header.is_linked_to_previous = False
            s.footer.is_linked_to_previous = False
            decorate(s)
            cw[0] = int(LANDSCAPE_W)

        elif k == "landscape_off":
            s = doc.add_section(WD_SECTION.NEW_PAGE)
            s.orientation = WD_ORIENT.PORTRAIT
            s.page_width = Inches(8.27)
            s.page_height = Inches(11.69)
            set_margins(s)
            s.header.is_linked_to_previous = False
            s.footer.is_linked_to_previous = False
            decorate(s)
            cw[0] = int(PORTRAIT_W)

    cp = doc.core_properties
    cp.title = C.META["title"] + " \u2014 " + C.META["subtitle"]
    cp.author = "Environmental Protection Agency of Liberia \u2014 ERRS Department"
    cp.subject = "Consolidated Third Quarter Report 2026 (CMU, EMRU, RSU)"
    cp.category = "Quarterly report"

    doc.save(OUT)
    print("DOCX written:", OUT)
    print("tables:", tbl_no[0], " figures:", fig_no[0])


# pre-compute the list of tables / figures (they are printed before the body)
LOT, LOF = [], []
_t = _f = 0
for _b in C.BLOCKS:
    if _b["kind"] == "table":
        _t += 1
        LOT.append((_t, _b["caption"]))
    elif _b["kind"] == "figure":
        _f += 1
        LOF.append((_f, _b["caption"]))

H1, H2, H3, H4 = [0], [0], [0], [0]

if __name__ == "__main__":
    main()
