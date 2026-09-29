"""Extract the long, repetitive tables from the three source unit reports
verbatim into JSON so that the consolidated report reproduces them exactly."""
import json
import os
import re

import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source")
DATA = os.path.join(HERE, "data")
os.makedirs(DATA, exist_ok=True)

cmu = pymupdf.open(os.path.join(SRC, "cmu_q3_2026.pdf"))
emr = pymupdf.open(os.path.join(SRC, "emr_q3_2026.pdf"))


def clean(s):
    if s is None:
        return ""
    s = s.replace("\n", " ")
    s = re.sub(r"\s+", " ", s).strip()
    # rejoin ordinal suffixes broken by the source layout, e.g. "16thStreet"
    s = re.sub(r"(\d)(st|nd|rd|th)([A-Z])", r"\1\2 \3", s)
    return s


# --------------------------------------------------------------------------
# CMU — Table of the 38 applications received and responded to (pages 3-4)
# --------------------------------------------------------------------------
lines = []
for pno in (2, 3):
    lines += [l.rstrip() for l in cmu[pno].get_text().split("\n")]

apps = {}
i = 0
while i < len(lines):
    m = re.fullmatch(r"(\d{1,2})", lines[i].strip())
    if m:
        n = int(m.group(1))
        if 1 <= n <= 38 and n not in apps:
            name = lines[i + 1].strip() if i + 1 < len(lines) else ""
            loc = ""
            j = i + 2
            # the name may wrap onto a second line
            if j < len(lines) and not re.fullmatch(r"\d{1,2}", lines[j].strip()) \
                    and name.endswith(("Service", "Fumigation")):
                name = (name + " " + lines[j].strip()).strip()
                j += 1
            if j < len(lines) and not re.fullmatch(r"\d{1,2}", lines[j].strip()):
                loc = lines[j].strip()
                j += 1
            apps[n] = [str(n), clean(name), clean(loc) or "—"]
            i = j
            continue
    i += 1

cmu_apps = [apps[k] for k in sorted(apps) if k <= 38]
# rows 21-24, 28, 29 and 31 carry no location in the source document
json.dump(cmu_apps, open(os.path.join(DATA, "cmu_applications.json"), "w"),
          indent=1)

# --------------------------------------------------------------------------
# EMR — Table 3: 91 environmental investigations (pages 4-9)
# --------------------------------------------------------------------------
text = "\n".join(emr[p].get_text() for p in range(3, 9))
text = re.sub(r"\n\d+ \| P a g e\n", "\n", text)
text = re.sub(r"=+ PAGE \d+ =+", "", text)
text = text.replace("ontsrrado6.", "\n6.\n")  # source typo glues item 6 on

parts = re.split(r"\n(\d{1,2})\.?\s*\n", "\n" + text)
items = []
for k in range(1, len(parts) - 1, 2):
    num = parts[k].strip()
    body = clean(parts[k + 1])
    body = body.replace("(July ends Here)", "(July ends here)")
    if body:
        items.append([num + ".", body])
items = [it for it in items if len(it[1]) > 20]
json.dump(items, open(os.path.join(DATA, "emr_investigations.json"), "w"),
          indent=1)

# --------------------------------------------------------------------------
# EMR — sachet water tables (pages 11-20), taken from the ruled table grid
# --------------------------------------------------------------------------
grids = {}
for p in range(10, 21):
    for j, t in enumerate(emr[p].find_tables().tables):
        grids["p%d_t%d" % (p + 1, j)] = t.extract()


def rows_from(keys, ncols, skip_headers=True, drop_totals=True):
    out = []
    for key in keys:
        for r in grids[key]:
            cells = [clean(c) for c in r]
            cells = [c for c in cells if c != ""] if len(r) > ncols else cells
            cells = [clean(c) for c in cells]
            if not any(cells):
                continue
            first = cells[0]
            if drop_totals and first.lower().startswith(("total", "totatal")):
                continue
            if skip_headers and first.lower() in ("", "no", "no.", "s/n"):
                continue
            if not re.fullmatch(r"\d{1,2}\.?", first):
                # continuation fragment of the previous row
                if out and len(cells) < ncols:
                    continue
                continue
            while len(cells) < ncols:
                cells.append("—")
            out.append([c if c else "—" for c in cells[:ncols]])
    return out


t8 = rows_from(["p11_t0", "p12_t0", "p13_t0"], 5)
# the contact number of entry 24 is split across a page break in the source
for r in t8:
    if r[0] == "24" and r[4].endswith("/07"):
        r[4] = r[4] + "77687936"
t9 = rows_from(["p14_t0", "p15_t0", "p16_t0"], 5)
t10 = rows_from(["p16_t1", "p17_t0"], 5)
t11 = rows_from(["p17_t1", "p18_t0"], 5)
t12 = rows_from(["p18_t1", "p19_t0"], 5)
t13 = rows_from(["p19_t1", "p20_t0"], 4)

for name, tbl in [("emr_t8_applications", t8), ("emr_t9_response_letters", t9),
                  ("emr_t10_paid", t10), ("emr_t11_printed", t11),
                  ("emr_t12_issued", t12), ("emr_t13_lab_results", t13)]:
    json.dump(tbl, open(os.path.join(DATA, name + ".json"), "w"), indent=1)

print("CMU applications      :", len(cmu_apps))
print("EMR investigations    :", len(items))
print("EMR T8  applications  :", len(t8))
print("EMR T9  response ltrs :", len(t9))
print("EMR T10 paid          :", len(t10))
print("EMR T11 printed       :", len(t11))
print("EMR T12 issued        :", len(t12))
print("EMR T13 lab results   :", len(t13))
