# ERRS Consolidated Third Quarter Report 2026 — build kit

Generates the consolidated Q3 2026 report of the Environmental Research and
Radiation Safety Department from the three source unit reports (CMU, EMRU, RSU).

## Deliverables (written to the repository root)

| File | Description |
| --- | --- |
| `ERRS-Consolidated-Third-Quarter-Report-2026.docx` | Editable Word master |
| `ERRS-Consolidated-Third-Quarter-Report-2026.pdf` | Print-ready PDF (52 pages) |

## Layout

```
report-build/
├── source/          the three original unit reports (PDF, unaltered)
├── data/            long tables extracted verbatim from the sources (JSON)
├── figures/         generated charts + images lifted from the sources
├── extract_data.py  source PDFs  ->  data/*.json
├── make_figures.py  chart generation (matplotlib)
├── content.py       the single content model: every section, table and figure
├── build_pdf.py     content model -> PDF  (ReportLab)
└── build_docx.py    content model -> DOCX (python-docx)
```

Both renderers consume the same `content.py`, so the Word and PDF versions are
identical in structure, wording, table numbering and figure numbering.

## Rebuilding

```bash
pip install pymupdf matplotlib reportlab python-docx
python3 extract_data.py     # optional: only needed if the sources change
python3 make_figures.py
python3 build_pdf.py
python3 build_docx.py
```

## Editorial rules applied

* The three unit reports are reproduced **in full** and in the order
  CMU → EMRU → RSU. Nothing is summarised, abridged or omitted.
* Wording, spellings and figures are carried over **verbatim** from the
  sources, including the units' own typographical errors.
* Cells left blank in a source table are rendered as an em dash (—); where a
  source value is internally inconsistent, a table note records the fact rather
  than silently correcting it.
* Tables are renumbered `Table 1…50` and figures `Figure 1…14` consecutively
  across the whole document; the original per-unit numbering is not retained
  because the sources repeat and skip numbers.
* Fourteen figures are included: thirteen charts redrawn at print resolution
  from the underlying data, plus the field photograph from the EMR annex.

## Rebuild on the Second Quarter 2026 template (September 2026)

`content.py` was restructured to follow the architecture of the ERRS Second
Quarter Report 2026 (`source/errs_q2_2026_consolidated_reference.pdf`):

1. Executive Summary
2. Summary of the Department's Mandates
3. Outstanding Achievements During the Quarter
4. Progress Tracking, Quarter III 2026 (cumulative Q1–Q3 KPI tracker)
5. Detailed Summary of Undertakings (full verbatim unit reports)
6. Challenges · 7. Recommendations · 8. Conclusion · Annex and Pictorials

Unit order is CMU → EMRU → RSU throughout.

Two new block types were added to both builders:

* `h4` — fourth-level numbered heading (x.y.z.w); the TOC still stops at level 3.
* `placeholder` — tinted "PENDING" panel used wherever content is still
  outstanding. There are eight of them: seven for the Waste and Remediation
  Unit (executive summary, outstanding achievements, KPI achievements,
  detailed undertakings, challenges, recommendations, conclusion) and one for
  the EMRU outstanding surveillance returns. Remove the block and drop in the
  real content once the submissions arrive.

Build: `python3 make_figures.py && python3 build_pdf.py && python3 build_docx.py`
