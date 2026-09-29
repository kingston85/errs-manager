"""Generate all charts/figures for the ERRS Consolidated Third Quarter Report 2026."""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
os.makedirs(OUT, exist_ok=True)

# ----------------------------------------------------------------- house style
GREEN = "#1F4E3D"
GREEN_L = "#2E7D5B"
GOLD = "#C9A227"
BLUE = "#3E6E96"
RUST = "#B5651D"
GREY = "#6B7280"
PALETTE = [GREEN, GREEN_L, GOLD, BLUE, RUST, "#7A6A9B", "#4FA3A5", "#8C3B3B"]

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10.5,
    "axes.titlesize": 13,
    "axes.titleweight": "bold",
    "axes.titlecolor": GREEN,
    "axes.labelsize": 10.5,
    "axes.labelcolor": "#333333",
    "axes.edgecolor": "#C9CDD4",
    "axes.linewidth": 0.8,
    "xtick.color": "#444444",
    "ytick.color": "#444444",
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "savefig.dpi": 220,
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.12,
})

EMBED_TITLES = False


def _finish(ax, ygrid=True):
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    if ygrid:
        ax.yaxis.grid(True, color="#E3E6EA", linewidth=0.8)
        ax.set_axisbelow(True)


def barh(fname, labels, values, title, xlabel, colors=None, figsize=(7.4, 4.0),
         fmt="{:,.0f}"):
    fig, ax = plt.subplots(figsize=figsize)
    colors = colors or [PALETTE[i % len(PALETTE)] for i in range(len(labels))]
    y = range(len(labels))
    bars = ax.barh(list(y), values, color=colors, height=0.62,
                   edgecolor="white", linewidth=0.6)
    ax.set_yticks(list(y))
    ax.set_yticklabels(labels)
    ax.invert_yaxis()
    ax.set_xlabel(xlabel)
    if EMBED_TITLES:
        ax.set_title(title, pad=14, loc="left")
    span = max(values) if max(values) else 1
    for b, v in zip(bars, values):
        ax.text(b.get_width() + span * 0.015, b.get_y() + b.get_height() / 2,
                fmt.format(v), va="center", ha="left", fontsize=10,
                fontweight="bold", color="#333333")
    ax.set_xlim(0, span * 1.16)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.xaxis.grid(True, color="#E3E6EA", linewidth=0.8)
    ax.set_axisbelow(True)
    fig.savefig(os.path.join(OUT, fname))
    plt.close(fig)


def barv(fname, labels, values, title, ylabel, colors=None, figsize=(7.4, 4.0),
         rotate=0, fmt="{:,.0f}", hline=None, hline_label=None):
    fig, ax = plt.subplots(figsize=figsize)
    colors = colors or [PALETTE[i % len(PALETTE)] for i in range(len(labels))]
    x = range(len(labels))
    bars = ax.bar(list(x), values, color=colors, width=0.62,
                  edgecolor="white", linewidth=0.6)
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels, rotation=rotate,
                       ha="right" if rotate else "center")
    ax.set_ylabel(ylabel)
    if EMBED_TITLES:
        ax.set_title(title, pad=14, loc="left")
    span = max(values) if max(values) else 1
    for b, v in zip(bars, values):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + span * 0.02,
                fmt.format(v), ha="center", va="bottom", fontsize=10,
                fontweight="bold", color="#333333")
    top = span * 1.18
    if hline:
        top = max(top, hline * 1.15)
        ax.axhline(hline, color=RUST, linestyle="--", linewidth=1.4, zorder=3)
        ax.text(len(labels) - 0.4, hline + span * 0.02, hline_label, color=RUST,
                fontsize=9.5, fontweight="bold", ha="right", va="bottom")
    ax.set_ylim(0, top)
    _finish(ax)
    fig.savefig(os.path.join(OUT, fname))
    plt.close(fig)


# ============================================================ PART I  —  C M U
# Figure 1: licences, clearances and permits issued by CMU
barh(
    "fig01_cmu_instruments.png",
    ["Chemical clearances / letters", "Chemical importation licences",
     "Effluent discharge licences", "Chemical registration licences",
     "Annual transportation licences", "Fumigation licences",
     "Chemical disposal licences", "Chemical seizures"],
    [19, 5, 5, 3, 2, 1, 0, 0],
    "Figure 1  Regulatory instruments issued by the Chemical Management Unit, Q3 2026",
    "Number issued",
    colors=[GREEN, GREEN_L, GREEN_L, BLUE, BLUE, GOLD, GREY, GREY],
    figsize=(7.4, 3.9),
)

# Figure 2: application throughput
fig, ax = plt.subplots(figsize=(4.6, 4.0))
ax.pie([38], colors=[GREEN], startangle=90,
       wedgeprops=dict(width=0.26, edgecolor="white", linewidth=2))
ax.text(0, 0.14, "100%", ha="center", va="center", fontsize=30,
        fontweight="bold", color=GREEN)
ax.text(0, -0.14, "response rate", ha="center", va="center", fontsize=11,
        color="#555555")
ax.text(0, -0.38, "38 of 38 applications", ha="center", va="center",
        fontsize=9.5, color="#777777")
if EMBED_TITLES:
    ax.set_title("Figure 2  Application response performance, CMU, Q3 2026",
                 pad=16, loc="center", fontsize=12)
ax.set_aspect("equal")
fig.savefig(os.path.join(OUT, "fig02_cmu_response.png"))
plt.close(fig)

# Figure 3: chemical escort operations
barv(
    "fig03_cmu_escorts.png",
    ["Explosives\n5 Sep", "Ferric chloride\n9 Sep", "Explosives\n18 Sep",
     "Ammonium nitrate\n22 Sep", "Ammonium nitrate\n23 Sep",
     "Ammonium nitrate\n24 Sep"],
    [6, 3, 24, 16, 16, 23],
    "Figure 3  Chemical escort operations by consignment and date, CMU, Q3 2026",
    "Trucks escorted",
    colors=[RUST, BLUE, RUST, GREEN_L, GREEN_L, GREEN_L],
    figsize=(7.4, 3.9),
)

# =========================================================== PART II  —  E M R
# Figure 4: sachet water analysis (redrawn from the unit's pie chart)
labels = ["Total application letters received", "Total applications responded to",
          "Total response letters issued", "Total applicants that paid",
          "Total sites verification", "Total labs conducted",
          "Total certificates printed out", "Total certificates issued"]
vals = [35, 35, 26, 14, 0, 19, 11, 11]
fig, ax = plt.subplots(figsize=(7.6, 4.6))
wedges, _, autotexts = ax.pie(
    vals, startangle=90, counterclock=False,
    colors=[PALETTE[i % len(PALETTE)] for i in range(len(vals))],
    autopct=lambda p: "{:.0f}%".format(p) if p > 0.5 else "",
    pctdistance=0.72,
    wedgeprops=dict(edgecolor="white", linewidth=1.6),
    textprops=dict(color="white", fontsize=10.5, fontweight="bold"))
ax.legend(wedges, ["{}  ({})".format(l, v) for l, v in zip(labels, vals)],
          loc="center left", bbox_to_anchor=(1.0, 0.5), frameon=False,
          fontsize=9.5)
if EMBED_TITLES:
    ax.set_title("Figure 4  Sachet water certification workflow, EMR Unit, Q3 2026",
                 pad=14, loc="left")
ax.set_aspect("equal")
fig.savefig(os.path.join(OUT, "fig04_emr_sachet_pie.png"))
plt.close(fig)

# Figure 5: sachet water pipeline
barh(
    "fig05_emr_sachet_pipeline.png",
    ["Applications received", "Applications responded to",
     "Response letters picked up", "Lab results received",
     "Applicants that paid", "Certificates printed", "Certificates issued",
     "Site verifications"],
    [35, 35, 26, 19, 14, 11, 11, 0],
    "Figure 5  Sachet water certification pipeline, EMR Unit, Q3 2026",
    "Number of proponents",
    colors=[GREEN, GREEN, GREEN_L, BLUE, BLUE, GOLD, GOLD, GREY],
    figsize=(7.4, 4.0),
)

# Figure 6: investigations by month
barv(
    "fig06_emr_investigations.png",
    ["July 2026", "August 2026", "September 2026"],
    [77, 9, 5],
    "Figure 6  Environmental investigations and monitoring activities by month, EMR Unit, Q3 2026",
    "Activities conducted",
    colors=[GREEN, GREEN_L, GOLD],
    figsize=(6.4, 3.6),
)

# Figure 7: reporting timeliness
fig, ax = plt.subplots(figsize=(7.4, 4.0))
groups = ["Water quality\nJuly 2026", "Soil quality\nJuly 2026",
          "Water quality\nAugust 2026"]
ontime = [5, 4, 5]
late = [4, 2, 9]
noreport = [0, 3, 0]
x = range(len(groups))
w = 0.26
b1 = ax.bar([i - w for i in x], ontime, w, label="On time (T)", color=GREEN)
b2 = ax.bar(list(x), late, w, label="Late (L)", color=GOLD)
b3 = ax.bar([i + w for i in x], noreport, w, label="No report (NR)", color=RUST)
for bars in (b1, b2, b3):
    for b in bars:
        if b.get_height() > 0:
            ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.15,
                    int(b.get_height()), ha="center", va="bottom",
                    fontsize=9.5, fontweight="bold", color="#333333")
ax.set_xticks(list(x))
ax.set_xticklabels(groups)
ax.set_ylabel("Number of proponents")
ax.set_ylim(0, 11)
ax.yaxis.set_major_locator(MaxNLocator(integer=True))
if EMBED_TITLES:
    ax.set_title("Figure 7  Timeliness of proponent reporting to the EMR Unit, Q3 2026",
                 pad=14, loc="left")
ax.legend(frameon=False, fontsize=9.5, ncol=3, loc="upper left",
          bbox_to_anchor=(0, 1.02))
_finish(ax)
fig.savefig(os.path.join(OUT, "fig07_emr_reporting_quality.png"))
plt.close(fig)

# Figure 8: complaints by nature
barh(
    "fig08_emr_complaints.png",
    ["Noise pollution", "Environmental contamination",
     "Water / waste water pollution"],
    [3, 1, 2],
    "Figure 8  Complaints received by nature of complaint, EMR Unit, Q3 2026",
    "Number of complaints",
    colors=[RUST, BLUE, GREEN_L],
    figsize=(6.6, 2.9),
)

# Figure 9: laboratory samples analysed
barv(
    "fig09_emr_lab_samples.png",
    ["Kinjor,\nG. Cape Mount\n27 Jul", "Industrial Park /\nLPRC\n11 Aug",
     "Bolo Town,\nNimba\n17 Aug", "Bea Mountain,\nKinjor\n25 Aug",
     "Golden Loaf,\nAirfield\n28 Aug", "Club Breweries,\nMontserrado\n2 Sep"],
    [2, 3, 9, 9, 2, 1],
    "Figure 9  Samples analysed per laboratory exercise, EMR Unit, Q3 2026",
    "Samples analysed",
    colors=[BLUE, BLUE, GREEN, GREEN, GREEN_L, GOLD],
    figsize=(7.4, 3.8),
)

# Figure 10: noise pollution readings
locs = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]
noise = [62.5, 62.7, 79.8, 94.8, 94.8, 86.8, 87.1, 77.1, 62.8, 64.2, 62.9]
fig, ax = plt.subplots(figsize=(7.4, 4.0))
cols = [RUST if v >= 80 else (GOLD if v >= 55 else GREEN) for v in noise]
bars = ax.bar(locs, noise, color=cols, width=0.62, edgecolor="white",
              linewidth=0.6)
for b, v in zip(bars, noise):
    ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 1.2, v,
            ha="center", va="bottom", fontsize=9, fontweight="bold",
            color="#333333")
ax.axhline(55, color="#8C3B3B", linestyle="--", linewidth=1.5)
ax.text(-0.45, 50.5, "Permissible night-time limit  55 dBA", color="#8C3B3B",
        fontsize=9.5, fontweight="bold", ha="left", va="top")
ax.set_ylim(0, 108)
ax.set_xlabel("Measurement location")
ax.set_ylabel("Noise level (dBA)")
if EMBED_TITLES:
    ax.set_title("Figure 10  Recorded noise levels against the permissible night-time limit,\nPeuto Dela Torres Compound, 14 September 2026",
                 pad=14, loc="left")
_finish(ax)
fig.savefig(os.path.join(OUT, "fig10_emr_noise.png"))
plt.close(fig)

# ========================================================== PART III  —  R S U
# Figure 11: radiation licences issued
fig, ax = plt.subplots(figsize=(7.0, 3.6))
inst = ["Bea Mountain Mining\nCorporation (BMMC)",
        "ArcelorMittal", "AMI Expeditionary\nHealth Care"]
imp = [7, 0, 0]
pos = [0, 2, 1]
x = range(len(inst))
b1 = ax.bar([i - 0.17 for i in x], imp, 0.34, label="Importation licences",
            color=GREEN)
b2 = ax.bar([i + 0.17 for i in x], pos, 0.34, label="Possess and use licences",
            color=GOLD)
for bars in (b1, b2):
    for b in bars:
        if b.get_height() > 0:
            ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.12,
                    int(b.get_height()), ha="center", va="bottom",
                    fontsize=10, fontweight="bold", color="#333333")
ax.set_xticks(list(x))
ax.set_xticklabels(inst)
ax.set_ylabel("Licences issued")
ax.set_ylim(0, 8.6)
ax.yaxis.set_major_locator(MaxNLocator(integer=True))
if EMBED_TITLES:
    ax.set_title("Figure 11  Radiation licences issued by institution and type, RSU, Q3 2026",
                 pad=14, loc="left")
ax.legend(frameon=False, fontsize=9.5, ncol=2, loc="upper right")
_finish(ax)
fig.savefig(os.path.join(OUT, "fig11_rsu_licences.png"))
plt.close(fig)

# Figure 12: Q3 output against annual target
cats = ["Medical facilities\ninventoried", "Operators / radiographers\ntrained",
        "Persons under personnel\nmonitoring", "Publications"]
completed = [7, 0, 0, 0]
target = [50, 50, 50, 2]
fig, ax = plt.subplots(figsize=(7.4, 3.8))
y = list(range(len(cats)))
ax.barh(y, target, 0.52, color="#E1E6EB", edgecolor="#CBD2D9", linewidth=0.7,
        label="Annual target 2026")
ax.barh(y, completed, 0.52, color=GREEN_L, edgecolor="white", linewidth=0.7,
        label="Total completed to date")
ax.scatter([0] * len(cats), y, marker="D", s=46, color=GOLD, zorder=5,
           label="Quarter III 2026 output (0)")
for i, (t, c) in enumerate(zip(target, completed)):
    pct = (c / t * 100) if t else 0
    ax.text(t + 1.2, i, "{} of {}  ({:.0f}%)".format(c, t, pct), va="center",
            ha="left", fontsize=9.5, fontweight="bold", color="#444444")
ax.set_yticks(y)
ax.set_yticklabels(cats)
ax.invert_yaxis()
ax.set_xlim(0, 72)
ax.set_xlabel("Number of facilities / persons / publications")
ax.legend(frameon=False, fontsize=9.5, ncol=3, loc="lower center",
          bbox_to_anchor=(0.5, -0.34))
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.xaxis.grid(True, color="#E3E6EA", linewidth=0.8)
ax.set_axisbelow(True)
fig.savefig(os.path.join(OUT, "fig12_rsu_targets.png"))
plt.close(fig)

# Figure 13: RSU regulatory instruments
barh(
    "fig13_rsu_instruments.png",
    ["Radiation importation licences", "Radiation bills issued",
     "Possess and use licences", "Staff trained (foreign fellowships)",
     "Occupational radiation safety trainings delivered"],
    [7, 4, 3, 3, 0],
    "Figure 13  Regulatory output of the Radiation Safety Unit, Q3 2026",
    "Number",
    colors=[GREEN, GREEN_L, BLUE, GOLD, GREY],
    figsize=(7.4, 3.4),
)

print("figures written to", OUT)
for f in sorted(os.listdir(OUT)):
    print("  ", f)

# =====================================================================
#  Q2-TEMPLATE FIGURES (progress tracking chapter)
# =====================================================================

# Figure A: 9M 2026 KPI achievement against annual targets
kpi_labels = [
    "Chemical registration &\nimportation licences",
    "Chemical transportation\nlicences",
    "Review of proponent\nmonitoring reports",
    "Fumigation licences",
    "Laboratory accreditations",
    "Effluent discharge\nlicences",
    "Radiation source\ninventory",
    "Waste management\nlicences (WRU)",
    "Nationwide chemical\ninventory",
    "Chemical disposal\nlicences",
    "Radiation / radiography\ntraining",
]
kpi_pct = [115.0, 150.0, 87.0, 80.0, 58.3, 43.3, 22.0, 22.0, 1.7, 0.0, 0.0]
kpi_pending = [False] * 7 + [True] + [False] * 3

fig, ax = plt.subplots(figsize=(7.4, 5.0))
y = list(range(len(kpi_labels)))
cols = []
for p, pend in zip(kpi_pct, kpi_pending):
    if pend:
        cols.append("#B9C2CB")
    elif p >= 100:
        cols.append(GREEN)
    elif p >= 50:
        cols.append(GREEN_L)
    elif p >= 25:
        cols.append(GOLD)
    else:
        cols.append(RUST)
bars = ax.barh(y, kpi_pct, 0.62, color=cols, edgecolor="white", linewidth=0.6)
ax.axvline(100, color="#8C3B3B", linestyle="--", linewidth=1.4, zorder=4)
ax.text(101.5, len(kpi_labels) - 0.3, "Annual target  100%", color="#8C3B3B",
        fontsize=9, fontweight="bold", va="center")
for b, p, pend in zip(bars, kpi_pct, kpi_pending):
    lab = "{:.1f}%".format(p) + ("  (Q3 pending)" if pend else "")
    ax.text(b.get_width() + 2, b.get_y() + b.get_height() / 2, lab,
            va="center", fontsize=9, fontweight="bold", color="#333333")
ax.set_yticks(y)
ax.set_yticklabels(kpi_labels)
ax.invert_yaxis()
ax.set_xlim(0, 178)
ax.set_xlabel("Cumulative achievement against 2026 annual target (%)")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.xaxis.grid(True, color="#E3E6EA", linewidth=0.8)
ax.set_axisbelow(True)
fig.savefig(os.path.join(OUT, "figA_kpi_progress.png"))
plt.close(fig)

# Figure B: breakdown of CMU regulatory instruments, Q3
inst_lbl = ["Chemical release / clearances", "Chemical importation licences",
            "Effluent discharge licences", "Chemical registration licences",
            "Annual transportation licences", "Fumigation licences"]
inst_val = [19, 5, 5, 3, 2, 1]
fig, ax = plt.subplots(figsize=(7.6, 4.4))
wedges, _, autotexts = ax.pie(
    inst_val, startangle=90, counterclock=False,
    colors=[GREEN, GREEN_L, BLUE, GOLD, RUST, "#7A6A9B"],
    autopct=lambda p: "{:.1f}%".format(p), pctdistance=0.70,
    wedgeprops=dict(edgecolor="white", linewidth=1.6),
    textprops=dict(color="white", fontsize=10, fontweight="bold"))
ax.legend(wedges, ["{}  ({})".format(l, v) for l, v in zip(inst_lbl, inst_val)],
          loc="center left", bbox_to_anchor=(0.98, 0.5), frameon=False,
          fontsize=9.5)
ax.set_aspect("equal")
fig.savefig(os.path.join(OUT, "figB_cmu_instruments_pie.png"))
plt.close(fig)

# Figure C: EMRU operational activity summary, Q3
emru_lbl = ["Environmental\ninvestigations", "Environmental media\nanalysed",
            "Sachet water\napplications", "Monitoring reports\nreviewed",
            "Lab results\nreceived", "Certificates\nissued",
            "Laboratory\naccreditations"]
emru_val = [91, 91, 35, 26, 19, 11, 1]
fig, ax = plt.subplots(figsize=(7.4, 3.9))
bars = ax.bar(range(len(emru_lbl)), emru_val, 0.62,
              color=[GREEN, GREEN, GREEN_L, BLUE, BLUE, GOLD, RUST],
              edgecolor="white", linewidth=0.6)
for b, v in zip(bars, emru_val):
    ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 1.8, v,
            ha="center", va="bottom", fontsize=10, fontweight="bold",
            color="#333333")
ax.set_xticks(range(len(emru_lbl)))
ax.set_xticklabels(emru_lbl, fontsize=9)
ax.set_ylabel("Count")
ax.set_ylim(0, 105)
_finish(ax)
fig.savefig(os.path.join(OUT, "figC_emru_activity.png"))
plt.close(fig)

# Figure D: EMRU quarter-on-quarter trend
cats_q = ["Environmental\ninvestigations", "Sachet water\napplications",
          "Certificates\nprinted", "Lab results\nprocessed",
          "Monitoring reports\nreviewed"]
q1 = [51, 84, 75, 53, 34]
q2 = [66, 31, 36, 36, 27]
q3 = [91, 35, 11, 19, 26]
fig, ax = plt.subplots(figsize=(7.4, 4.0))
x = range(len(cats_q))
w = 0.26
b1 = ax.bar([i - w for i in x], q1, w, label="Quarter I", color="#9FB8AC")
b2 = ax.bar(list(x), q2, w, label="Quarter II", color=GREEN_L)
b3 = ax.bar([i + w for i in x], q3, w, label="Quarter III", color=GREEN)
for bars in (b1, b2, b3):
    for b in bars:
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 1.5,
                int(b.get_height()), ha="center", va="bottom", fontsize=8.6,
                fontweight="bold", color="#333333")
ax.set_xticks(list(x))
ax.set_xticklabels(cats_q, fontsize=9)
ax.set_ylabel("Count")
ax.set_ylim(0, 100)
ax.legend(frameon=False, fontsize=9.5, ncol=3, loc="upper right")
_finish(ax)
fig.savefig(os.path.join(OUT, "figD_emru_quarters.png"))
plt.close(fig)

# Figure E: field investigations and assessments by unit, Q3
fig, ax = plt.subplots(figsize=(7.0, 3.4))
unit_lbl = ["EMRU\nenvironmental\ninvestigations", "CMU\nchemical escort\noperations",
            "RSU\nfacility inspections\n& inventories", "WRU\nfacility\nassessments"]
unit_val = [91, 6, 0, 0]
cols = [GREEN, GREEN_L, GOLD, "#B9C2CB"]
bars = ax.bar(range(4), unit_val, 0.58, color=cols, edgecolor="white",
              linewidth=0.6)
labels = ["91", "6", "0", "Pending"]
for b, lab in zip(bars, labels):
    ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 1.8, lab,
            ha="center", va="bottom", fontsize=10, fontweight="bold",
            color="#333333")
ax.set_xticks(range(4))
ax.set_xticklabels(unit_lbl, fontsize=9)
ax.set_ylabel("Activities conducted")
ax.set_ylim(0, 105)
_finish(ax)
fig.savefig(os.path.join(OUT, "figE_field_by_unit.png"))
plt.close(fig)

print("Q2-template figures added.")
