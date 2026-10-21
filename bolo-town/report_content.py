"""
Content of the Bolo Town follow-up investigative assessment report
(October 13, 2026), structured on the template of the initial
"Comprehensive Investigation Report" (August 2026, Drafted report V2).

The report is a list of blocks consumed by the DOCX and PDF renderers in
build_followup_report.py.  Add / edit sections here as the other parts of
the investigation come in.

Block types
-----------
("h1", text)                     main section heading (blue banner, in TOC)
("h2", text)                     sub-heading (in TOC)
("h3", text)                     minor heading (not in TOC)
("p", text)                      paragraph; **bold** supported
("bullets", [text, ...])         bullet list; **bold** supported
("numbered", [text, ...])        numbered list
("placeholder", text)            grey italic "[To be added ...]" marker
("caption", text)                table / figure caption
("table", spec)                  see TABLE specs below
("photos", [(path, caption)])    2-column photo grid
("pagebreak",)
("spacer", points)
"""
from pathlib import Path

from build_joint_sample_info import (TABLE1, TABLE2, TABLE2_STD, TABLE2_INSTR,
                                     OBSERVATIONS, VA_OBSERVATIONS, VA_PHOTOS,
                                     PHOTO_DIR, SHADED_PREFIXES)

HERE = Path(__file__).resolve().parent
ASSETS = HERE / "assets"

# ---------------------------------------------------------------------------
# Cover page
# ---------------------------------------------------------------------------
COVER = {
    "logo": ASSETS / "epa_logo.png",
    "tagline": "Ensuring environmental protection & conserving biodiversity",
    "title": ("FOLLOW-UP INVESTIGATIVE ASSESSMENT REPORT ON THE ARCELORMITTAL "
              "LIBERIA (AML) BOLO TOWN POLLUTION INCIDENT, GBA CLAN, GBEH CHIEFDOM, "
              "YARMEIN ADMINISTRATIVE DISTRICT, NIMBA COUNTY"),
    "subtitle": ("Environmental Assessment of Pollution-Affected Water Bodies, Farmlands, "
                 "Community Livelihoods, and Regulatory Compliance"),
    "photo": ASSETS / "cover_photo.jpg",
    "prepared_by": ("AN ASSESSMENT REPORT PREPARED BY A TECHNICAL TEAM OF THE "
                    "ENVIRONMENTAL PROTECTION AGENCY (EPA), LIBERIA"),
    "date": "Date of Investigative Assessment: October 13, 2026",
    "status": "WORKING DRAFT \u2013 sections marked [To be added] are pending inputs",
}

# ---------------------------------------------------------------------------
# Table specs
# ---------------------------------------------------------------------------
def _sample_info_table():
    header = [
        ["Sample Location", "Sample ID", "GPS Coordinates", "", "Sampling Time", "Description"],
        ["", "", "Latitude", "Longitude", "", ""],
    ]
    spans = [((2, 0), (3, 0)), ((0, 0), (0, 1)), ((1, 0), (1, 1)), ((4, 0), (4, 1)), ((5, 0), (5, 1))]
    rows, shade = [], set()
    for i, (loc, sid, lat, lon, tm, desc) in enumerate(TABLE1):
        rows.append([loc, sid, lat, lon, tm, desc if desc else "\u2014"])
        if sid.startswith(SHADED_PREFIXES):
            shade.add(i)
    return {
        "widths_in": [1.15, 1.08, 0.68, 0.74, 0.62, 2.5],
        "header": header, "spans": spans, "rows": rows, "shade_rows": shade,
        "font": 7.5, "center_cols": {1, 2, 3, 4}, "repeat_header": True,
    }


def _tss_table():
    header = [["Sample Code", "Sample Parameter", "LWQS Class III", "Instrumentation"],
              ["", "Total Suspended Solid (TSS) (mg/L)", "", ""]]
    spans = [((0, 0), (0, 1)), ((2, 0), (2, 1)), ((3, 0), (3, 1))]
    rows = []
    for i, (code, tss) in enumerate(TABLE2):
        rows.append([code, tss, TABLE2_STD if i == 0 else "", TABLE2_INSTR if i == 0 else ""])
    n = len(rows)
    body_spans = [((2, 2), (2, n + 1)), ((3, 2), (3, n + 1))]  # merged down body
    return {
        "widths_in": [1.7, 1.9, 1.4, 1.5],
        "header": header, "spans": spans, "body_spans": body_spans, "rows": rows,
        "shade_rows": set(), "font": 9, "center_cols": {1, 2, 3}, "repeat_header": True,
    }


def _enforcement_table():
    return {
        "widths_in": [2.0, 1.3, 3.45],
        "header": [["Enforcement measure", "Amount (US$)", "Direction"]],
        "spans": [], "rows": [
            ["A. Administrative Fine", "400,000",
             "To be paid into the Government of Liberia Consolidated Account through the "
             "Liberia Revenue Authority (LRA) within ten working days."],
            ["B. Technical and Environmental Research Payment", "100,000",
             "To be paid to the EPA within ten working days to support advanced water and "
             "sediment sampling, environmental research, and ecological restoration planning."],
            ["Total enforcement obligation", "500,000", ""],
        ],
        "shade_rows": {2}, "font": 9, "center_cols": {1}, "repeat_header": False,
    }


def _team_table():
    return {
        "widths_in": [1.5, 2.3, 2.95],
        "header": [["Team", "Lead / designation", "Assignment"]],
        "spans": [], "rows": [
            ["Group 1 (ES)", "Emmanuel Suah", "Environmental sampling and field assessment \u2013 "
             "Yeewa main stream, Yeewa Korweny 1 (Dor) and Yeewa Korweny 2 (Patel)."],
            ["Group 2 (VA)", "Varney Armah", "Environmental sampling and field assessment \u2013 "
             "Wehyee and Pompleh streams."],
            ["Group 3 (JC)", "[Lead to be confirmed]", "Environmental sampling and field assessment \u2013 "
             "Wenee, Saymenee, Alphonso farm and Neneyee (northern sediment control station)."],
            ["Group 4 (Social Team)", "[Lead to be confirmed]", "Engagement of Bolo Town leadership and "
             "residents on farm damage, access, compensation and the farm-damage survey process."],
        ],
        "shade_rows": set(), "font": 9, "center_cols": set(), "repeat_header": False,
    }


def _tss_summary_table():
    return {
        "widths_in": [1.6, 1.9, 1.2, 2.05],
        "header": [["Stream / system", "Sample codes", "TSS range (mg/L)", "Relative to LWQS Class III (\u226450 mg/L)"]],
        "spans": [], "rows": [
            ["Yeewa main stream (ES)", "YEEWA-DS / MS / US", "523 \u2013 628", "All exceed (\u224810\u201313\u00d7)"],
            ["Yeewa Korweny 2 \u2013 Patel (ES)", "YWK2-ES-SW-001 \u2013 003", "769 \u2013 2,400", "All exceed (\u224815\u201348\u00d7); highest of the survey"],
            ["Yeewa Korweny 1 \u2013 Dor (ES)", "YWK1-ES-SW-001 \u2013 003", "188 \u2013 259", "All exceed (\u22484\u20135\u00d7)"],
            ["Wehyee (VA)", "W-SW-VA-001 \u2013 003", "20 \u2013 24", "All within standard"],
            ["Pompleh (VA)", "POM-SW-VA-001 \u2013 003", "11 \u2013 164", "001 and 002 within standard; 003 exceeds (\u22483\u00d7)"],
            ["Wenee (JC)", "WE-JC-SW-001 / 002, WE-SW-JC-003", "102 \u2013 214", "All exceed (\u22482\u20134\u00d7)"],
            ["Saymenee (JC)", "SM-SW-JC-001", "84", "Exceeds (\u22481.7\u00d7)"],
            ["Alphonso farm (JC)", "AF-SW-JC-001", "1,067", "Exceeds (\u224821\u00d7)"],
            ["Neneyee upstream control (JC)", "NEN-SW-JC-001", "92", "Exceeds (\u22481.8\u00d7)"],
        ],
        "shade_rows": set(), "font": 8.5, "center_cols": {2}, "repeat_header": True,
    }


# ---------------------------------------------------------------------------
# Report body
# ---------------------------------------------------------------------------
PH = "placeholder"

BLOCKS = [
    # ===================================================================
    ("h1", "Executive Summary"),
    ("p", "Following the preliminary investigation of August 13, 2026 into the complaint lodged by "
          "the leadership of Bolo Town, Gba Clan, Gbeh Chiefdom, Yarmein Administrative District, "
          "Nimba County, the Environmental Protection Agency of Liberia (EPA) undertook a follow-up "
          "investigative assessment on October 13, 2026. The initial investigation had established "
          "that iron-rich, sediment-laden discharges from ArcelorMittal Liberia (AML) operations at "
          "Mount Yeleweliton (Yuelliton) and Mount Gangra were entering local water resources and "
          "farmlands through six identified discharge points, and had identified regulatory "
          "compliance concerns which resulted in a total enforcement obligation of US$500,000 being "
          "imposed on AML."),
    ("p", "The October 13 assessment was intended to deepen the investigation by examining the "
          "pollution-affected water bodies and discharge pathways, collecting additional environmental "
          "samples, determining the extent of the affected area including agricultural land, engaging "
          "Bolo Town leadership and residents, and clarifying the disagreements surrounding AML\u2019s "
          "geofencing exercise and farm-damage survey. The EPA team was organised into three "
          "environmental sampling and field assessment groups and one Social Team."),
    ("p", "Field observations by the sampling groups recorded visibly turbid, brownish to "
          "reddish-brown water with suspended sediment in all streams inspected, substantial iron-ore "
          "sediment deposits in the Yeewa main stream and its Yeewa Korweny tributaries draining the "
          "Mount Yeleweliton area, an agricultural farm inundated by sediment originating from the "
          "mining area, and an AML geo-fencing sign (\u201cKEEP AWAY \u2013 500 Meters Safety Buffer Zone\u201d) "
          "at Yeewa Korweny 2. Preliminary Total Suspended Solids (TSS) results show gross exceedance "
          "of the Liberian Water Quality Standard (Class III, \u226450 mg/L) throughout the Yeewa system "
          "(up to 2,400 mg/L at YWK2-ES-SW-002) and at the Alphonso farm (1,067 mg/L), moderate "
          "exceedance in the Wenee and Saymenee streams, and compliant values in the Wehyee and "
          "Pompleh streams except at POM-SW-VA-003."),
    ("p", "The community consultation did not resolve the outstanding social issues. The geographical "
          "extent of the affected area remains disputed, the damaged-farm survey remains unresolved, "
          "and crop compensation is a major source of disagreement. The EPA Team Lead directed AML to "
          "suspend its RAP-related or damaged-farm survey activities pending further regulatory "
          "direction, and a follow-up EPA visit is to address the RAP process and enforcement of the "
          "Corrective Action Plans."),
    (PH, "To be completed once the full laboratory results (heavy metals, physico-chemical "
         "parameters) and the final recommendations are available."),

    # ===================================================================
    ("h1", "Introduction"),
    ("h2", "Background and Context"),
    ("h3", "Origin of the Complaint"),
    ("p", "The EPA received complaints concerning environmental pollution affecting water resources "
          "and farmlands in Bolo Town, Nimba County. The complaints prompted an EPA investigation into "
          "the reported impacts associated with mining-related discharges from AML\u2019s operations."),
    ("p", "According to the initial investigative findings, iron-rich and sediment-laden discharges "
          "were entering local water resources and farmlands through six identified discharge points. "
          "These observations raised concerns about water quality, sediment deposition, agricultural "
          "productivity, and the potential disruption of community livelihoods."),
    ("p", "The initial investigation also identified regulatory compliance concerns involving:"),
    ("numbered", [
        "Failure to report pollution incidents in accordance with applicable environmental permit conditions.",
        "Failure to submit the mandatory Q2 2026 Environmental Monitoring Report.",
        "Failure to meet the EPA\u2019s final compliance deadline of August 25, 2026.",
    ]),
    ("p", "The October 13, 2026 assessment was undertaken to deepen the investigation, collect "
          "additional environmental evidence, engage affected residents, and determine the next steps "
          "required to address the reported pollution and its consequences."),
    ("h3", "Enforcement Measures Previously Imposed"),
    ("p", "Following the initial investigation and the identified regulatory concerns, a total "
          "enforcement obligation of US$500,000 was imposed on AML, structured as follows:"),
    ("caption", "Table 1: Enforcement measures imposed on AML following the initial investigation"),
    ("table", _enforcement_table()),
    ("h3", "Purpose of the October 13 Assessment"),
    ("p", "The assessment was intended to advance the EPA\u2019s investigation by:"),
    ("bullets", [
        "Examining pollution-affected water bodies, discharge pathways, and surrounding environmental receptors.",
        "Collecting environmental samples for further analysis.",
        "Determining the extent of potentially affected areas, including agricultural lands.",
        "Engaging Bolo Town leadership and residents on environmental damage and livelihood impacts.",
        "Clarifying the disagreements surrounding AML\u2019s geofencing and farm-damage survey.",
        "Identifying outstanding issues requiring corrective action, regulatory intervention, or further consultation.",
    ]),

    # ===================================================================
    ("h1", "Methodology"),
    ("p", "The follow-up assessment was conducted using the following methodology:"),
    ("numbered", [
        "Review of the initial investigation report, the enforcement measures imposed, and the "
        "correspondence between the EPA, AML and the Bolo Town leadership.",
        "Opening conference with AML representatives to explain the EPA\u2019s Terms of Reference, the "
        "scope of the exercise and the respective roles of the EPA team and AML.",
        "Deployment of three environmental sampling and field assessment groups to the pollution-"
        "affected water bodies, with photographic and GPS documentation of field observations.",
        "Collection of surface water samples from the identified water bodies for laboratory analysis "
        "under EPA Chain-of-Custody protocols (analysis commenced October 15, 2026).",
        "Community consultation by the Social Team with Bolo Town leadership and residents on farm "
        "damage, access, compensation and the farm-damage survey process.",
        "Closing of the consultation and identification of outstanding issues for the subsequent EPA visit.",
    ]),
    ("h2", "Investigative Team Structure"),
    ("p", "The EPA team was divided into four groups to facilitate the technical and social components "
          "of the assessment."),
    ("caption", "Table 2: Composition and assignments of the EPA investigative team"),
    ("table", _team_table()),
    ("h3", "Environmental Sampling and Field Assessment Teams"),
    ("p", "Three groups were assigned to:"),
    ("bullets", [
        "Collect environmental samples from the identified pollution-affected areas.",
        "Examine affected water bodies and surrounding areas.",
        "Assess the geographical extent of the reported environmental impacts.",
        "Identify locations requiring additional investigation.",
        "Document field observations relevant to the pollution complaint.",
    ]),
    ("p", "The sampling exercise was intended to generate further evidence for determining the nature "
          "and distribution of contamination."),
    ("h3", "Social Assessment Team"),
    ("p", "The fourth group, designated as the Social Team, was assigned to engage Bolo Town "
          "leadership and residents. Its responsibilities included discussing:"),
    ("bullets", [
        "The reported destruction or damage of farms and crops.",
        "Access to affected farms and agricultural properties.",
        "The process for identifying affected farmers and households.",
        "Crop compensation and other potential livelihood-related losses.",
        "Community concerns about AML\u2019s farm-damage survey.",
        "The need for an acceptable process for resolving outstanding social issues.",
    ]),
    ("p", "The consultation was intended to provide the EPA with a clearer understanding of the "
          "community\u2019s concerns and the obstacles affecting the resolution of the incident."),

    # ===================================================================
    ("h1", "Opening Conference with ArcelorMittal Liberia"),
    ("p", "An opening conference was held at the commencement of the October 13 assessment. The "
          "purpose was to explain the EPA\u2019s Terms of Reference, outline the scope of the investigative "
          "exercise, and clarify the respective roles of the EPA team and AML representatives."),
    ("p", "During the conference, the EPA acknowledged AML for meeting its licensing obligation. AML, "
          "in turn, expressed appreciation to the EPA for its engagement and participation in the "
          "assessment. AML also requested that the EPA share the investigative report upon completion "
          "of the exercise."),
    ("h2", "Issue of Obsolete Nitrate Acid"),
    ("p", "The issue of obsolete nitrate acid was raised during the opening conference. In response, "
          "the EPA Team Lead, Director Rafael Ngumbu, explained the Agency\u2019s applicable disposal "
          "protocols. The issue was noted as a separate environmental management and chemical-handling "
          "concern requiring appropriate documentation and follow-up."),
    (PH, "List of AML and EPA participants at the opening conference (names and positions), as in the "
         "initial report."),

    # ===================================================================
    ("h1", "Community Engagement at Bolo Town"),
    ("h2", "Initial Environmental Pollution Findings"),
    ("p", "The initial EPA investigation identified iron-rich, sediment-laden discharges entering local "
          "water resources and farmlands through six distinct discharge points."),
    ("p", "During the October 13 community consultation, Mr. Rafael Ngumbu reiterated that the initial "
          "assessment had found pollution in the affected water bodies. He explained that observed "
          "turbidity could be associated with suspended sediments and potentially with chemical "
          "constituents requiring further analysis."),
    ("p", "The EPA\u2019s preliminary observations were communicated to both AML representatives and Bolo "
          "Town leadership before the October 13 investigative assessment commenced. The initial report "
          "was also shared with the relevant representatives of AML and the community leadership to "
          "inform the engagement and provide a basis for the subsequent assessment."),
    ("h2", "Assessment of the Extent of the Affected Areas"),
    ("p", "One of the principal objectives of the October 13 assessment was to determine the extent of "
          "the pollution-affected areas, including water resources, farmlands, and other potentially "
          "affected community assets. The three environmental teams were assigned to undertake sampling "
          "and field observations for this purpose."),
    ("p", "However, the consultation revealed that the geographical extent of the affected area remained "
          "disputed. AML indicated that it had conducted its own geofencing exercise before the EPA\u2019s "
          "arrival to identify the extent of the pollution. Bolo Town residents rejected AML\u2019s "
          "assessment as an adequate representation of the actual impact. Community representatives "
          "maintained that more farms, agricultural properties, and individuals had been affected than "
          "were included within the boundaries identified by AML."),
    ("p", "The disagreement indicates that the boundaries established through AML\u2019s geofencing "
          "exercise had not been accepted by the community as a conclusive determination of the "
          "affected area. The EPA must therefore independently evaluate the relevant geographical "
          "information and field evidence before determining the final extent of the impact."),
    ("h2", "Access to Farms and the Damaged-Farm Survey"),
    ("p", "Access to affected farms emerged as a significant concern during the assessment. The "
          "engagement revealed that disputes concerning access to farms, disagreements over crop "
          "compensation, and AML\u2019s alleged failure to adequately heed earlier warnings and advice from "
          "Bolo Town contributed to the deterioration of relations between the company and the "
          "community. These concerns were raised in the context of the ongoing effort to identify and "
          "quantify damaged farms."),
    ("p", "A senior elder representing the Town Chief, who was reported to be ill, stated that the "
          "community had stopped AML from conducting its proposed farm survey. According to the "
          "representative, the approach adopted by AML was not considered a normal or appropriate "
          "process for determining the extent of agricultural damage."),
    ("p", "Community residents also deliberately declined to agree to the survey at that stage, "
          "explaining that many farm owners were not present in Bolo Town. They stated that a "
          "significant number of the affected owners were in Monrovia and were preparing to return. "
          "The community\u2019s position was that a credible survey should not proceed without adequate "
          "participation by the relevant farm owners and an agreed process for determining the losses "
          "sustained. These issues remain unresolved."),
    ("h2", "Community Concerns Regarding Crop Compensation"),
    ("p", "Crop compensation emerged as a central issue during the consultation. The discussion "
          "indicated that residents were concerned not only about the identification of polluted areas "
          "but also about the number of farms and crops affected, the valuation of losses, and the "
          "adequacy of the compensation process."),
    ("p", "The disagreement over AML\u2019s geofencing exercise has contributed to uncertainty about which "
          "farm owners and residents should be included in any assessment of agricultural damage. "
          "Community representatives maintained that persons and farms located outside AML\u2019s "
          "identified boundaries may also have sustained losses. Consequently, the number of affected "
          "farms, the number of eligible owners, the quantity and type of damaged crops, and the total "
          "value of agricultural losses have not been conclusively established."),
    ("h2", "Alleged Failure to Heed Earlier Community Warnings"),
    ("p", "During the consultation, concerns were raised that AML had not adequately adhered to "
          "warnings and advice previously provided by Bolo Town residents regarding the activities or "
          "conditions that contributed to the incident. Community representatives associated these "
          "concerns with the damage to farms, difficulties relating to access, and the subsequent "
          "dispute over compensation."),
    ("h2", "AML\u2019s Geofencing Exercise and the Community\u2019s Response"),
    ("p", "AML stated during the community consultation that it had independently undertaken a "
          "geofencing exercise before the EPA\u2019s arrival to determine the extent of the pollution. "
          "Community representatives disputed the adequacy of that exercise on two principal grounds:"),
    ("numbered", [
        "They believed that the assessment excluded additional affected farms and individuals.",
        "They questioned the appropriateness of AML determining the boundaries of the affected area "
        "without independent regulatory oversight.",
    ]),
    ("p", "The disagreement reflects a lack of consensus over the geographical scope of the incident "
          "and the evidence to be used in identifying affected properties."),
    ("h2", "Community Position on Further Decisions"),
    ("p", "The senior elder representing the Town Chief stated that Bolo Town cannot make any further "
          "or final decision until the community\u2019s lawyers review the EPA\u2019s initial reports. The "
          "representative further indicated that the reports would be discussed with other elders and "
          "that the community intends to conduct or ascertain its own survey to determine the extent "
          "of damaged farms and crops. According to the representative, the community would determine "
          "the appropriate way forward after these consultations and assessments had been completed."),
    ("h2", "AML\u2019s Request for the Investigative Report"),
    ("p", "AML requested that the EPA provide the investigative report at the conclusion of the assessment."),
    ("h2", "Increasing Tensions during the Consultation"),
    ("p", "As discussions progressed, tensions increased over the geographical boundaries of the "
          "affected area, the farm-damage survey, the identification of affected persons, and crop "
          "compensation. The community maintained that AML\u2019s geofencing exercise did not capture the "
          "full extent of the damage. AML, meanwhile, had indicated that it had already assessed the "
          "affected area. The unresolved differences made it difficult to reach a common understanding "
          "of the farm-survey process and the steps required to establish agricultural losses."),
    ("p", "In response, Mr. Ngumbu instructed AML to stop its RAP-related or damaged-farm survey "
          "activities pending further regulatory direction. He emphasised the need to allow the "
          "appropriate regulators to perform their functions. He further requested that the "
          "consultation be closed and that the outstanding issues be addressed during a subsequent EPA "
          "visit expected within the following days. The planned follow-up is intended to address the "
          "RAP process and enforcement of the EPA\u2019s Corrective Action Plans."),
    ("p", "The consultation was subsequently closed without a final community agreement on the extent "
          "of damaged farms, compensation, or the broader resolution of the incident."),

    # ===================================================================
    ("h1", "Site Inspection and Physical Observations"),
    ("p", "The sampling groups inspected the affected water bodies while collecting samples. Physical "
          "observations were documented photographically and by GPS coordinates. The following "
          "preliminary observations were recorded by each group."),
    ("h2", "Yeewa, Yeewa Korweny 1 and 2 (ES Group)"),
    ("p", "The ES group inspected the Yeewa main stream and its two tributaries, Yeewa Korweny 1 (Dor) "
          "and Yeewa Korweny 2 (Patel):"),
    ("bullets", OBSERVATIONS),
    ("h2", "Pompleh and Wehyee Streams (VA Group)"),
    ("p", "During the field visit, the VA team conducted surface water sampling along the Wehyee and "
          "Pompleh streams. The following observations were recorded (see Appendix A, Plates 1\u20134):"),
    ("bullets", VA_OBSERVATIONS),
    ("h2", "Wenee, Saymenee, Alphonso Farm and Neneyee (JC Group)"),
    (PH, "Physical observations of the JC group at the Wenee, Saymenee, Alphonso farm and Neneyee "
         "sampling points."),

    # ===================================================================
    ("h1", "Laboratory Analysis and Quality Assurance/Quality Control (QA/QC)"),
    ("p", "Laboratory analysis of the surface water samples commenced on October 15, 2026. The "
          "parameters are those associated with iron ore exploitation and sediment transport, "
          "consistent with the initial investigation."),
    ("bullets", [
        "**Analytical parameters reported to date:** Total Suspended Solids (TSS), measured by "
        "colorimeter and compared against the Liberian Water Quality Standard (LWQS) Class III limit "
        "of \u226450 mg/L.",
        "**Quality assurance / quality control:** samples were collected in pre-treated laboratory "
        "bottles under Chain-of-Custody and analysed ex-situ; each test is conducted in triplicate and "
        "reported as a cumulative mean, consistent with the initial investigation.",
    ]),
    (PH, "Remaining analytical parameters and methods (pH, conductivity, turbidity, TDS, nutrients, "
         "iron and other heavy metals) and the applicable LWQS class for each, as in Table 3 of the "
         "initial report."),

    # ===================================================================
    ("h1", "Water Quality Sampling and Analysis"),
    ("h2", "Sampling Locations and Rationale"),
    ("p", "Surface water sampling on October 13, 2026 extended the network of the initial "
          "investigation to the tributaries and creeks reported by the community, with each stream "
          "sampled at downstream, mid-point and upstream stations so that spatial sediment migration "
          "could be evaluated along the flow path:"),
    ("bullets", [
        "**Yeewa system (ES group):** the Yeewa main stream (YEEWA-DS/MS/US) and its two tributaries "
        "Yeewa Korweny 2 \u2013 Patel (YWK2-ES-SW-001 to 003) and Yeewa Korweny 1 \u2013 Dor (YWK1-ES-SW-001 "
        "to 003), which originate in the Mount Yeleweliton area and lie in proximity to AML\u2019s haulage "
        "route and the Mount Yeleweliton and Mount Gangra mining areas.",
        "**Wehyee and Pompleh streams (VA group):** W-SW-VA-001 to 003 and POM-SW-VA-001 to 003, "
        "flowing through densely vegetated terrain north-east of Bolo Town.",
        "**Wenee, Saymenee, Alphonso farm and Neneyee (JC group):** the Wenee stream (WE-JC-SW-001, "
        "002 and WE-SW-JC-003 at the confluence with Saymenee), Saymenee mid-point (SM-SW-JC-001), the "
        "inundated Alphonso farm (AF-SW-JC-001) and Neneyee upstream (NEN-SW-JC-001), designated the "
        "northern sediment control station.",
    ]),
    ("p", "Sample identification, GPS coordinates, sampling time and the field description of each "
          "sampling point are presented in Table 3. Descriptions for the ES and VA group points (shaded) "
          "are derived from the groups\u2019 field notes; descriptions for the JC group points are pending."),
    ("caption", "Table 3: Surface water quality sample information, Bolo Town, Nimba County "
                "(Date of assessment: October 13, 2026; sample matrix: water; analysis start date: "
                "October 15, 2026)"),
    ("table", _sample_info_table()),
    ("spacer", 8),
    ("h2", "Analytical Results"),
    ("p", "The Total Suspended Solids results for the twenty-one surface water samples are presented "
          "in Table 4 against the LWQS Class III limit."),
    ("caption", "Table 4: Surface water quality result \u2013 Total Suspended Solids (TSS)"),
    ("table", _tss_table()),
    (PH, "Tables 5a/5b \u2013 results of the remaining physico-chemical and heavy-metal analyses, as in "
         "Tables 4a and 4b of the initial report."),

    # ===================================================================
    ("h1", "Preliminary Interpretation of Results"),
    ("p", "The TSS results confirm the field observations of heavy sediment loading in the water bodies "
          "draining the Mount Yeleweliton area. The results are summarised by stream in Table 5."),
    ("caption", "Table 5: Summary of TSS results by stream relative to the LWQS Class III limit (\u226450 mg/L)"),
    ("table", _tss_summary_table()),
    ("bullets", [
        "**Yeewa system:** every sample exceeded the standard by an order of magnitude or more. The "
        "highest values of the survey were recorded on Yeewa Korweny 2 (Patel), reaching 2,400 mg/L at "
        "the midstream station (YWK2-ES-SW-002), consistent with the field observation that turbidity on "
        "Yeewa and Yeewa Korweny 2 was visibly higher than on Yeewa Korweny 1 (188\u2013259 mg/L). The "
        "upstream Yeewa station (628 mg/L) was not cleaner than the downstream stations, indicating that "
        "the sediment load originates further up the Yeewa catchment.",
        "**Alphonso farm:** the sample taken at the inundated farm (1,067 mg/L) corroborates the "
        "observation of sediment deposition on agricultural land.",
        "**Wenee and Saymenee:** moderate exceedances (84\u2013214 mg/L), with the highest value at the "
        "Wenee\u2013Saymenee confluence.",
        "**Wehyee and Pompleh:** values were within the standard (11\u201324 mg/L) at five of six stations "
        "despite the brownish, turbid appearance recorded in the field; the exception was POM-SW-VA-003 "
        "(164 mg/L). The VA group observed no visible sign of mine-runoff pollution on the adjacent "
        "farmland, and attributed the discoloration possibly to local bank erosion and rainfall runoff.",
        "**Control station:** the Neneyee northern sediment control station returned 92 mg/L, above the "
        "Class III limit. Its suitability as an unaffected baseline should be reviewed once the full "
        "analytical suite is available.",
    ]),
    ("p", "These interpretations are preliminary and limited to a single physical parameter. As noted "
          "by the field teams, the observations alone do not establish the source of the sediment or any "
          "chemical pollution; the complete laboratory results are required to characterise the "
          "contamination and its pathways."),

    # ===================================================================
    ("h1", "Environmental and Public Health Impact Assessment"),
    (PH, "Assessment of ecological, agricultural and public health impacts, to be prepared once the "
         "complete laboratory results and the farm-damage extent are available."),

    # ===================================================================
    ("h1", "Preliminary Conclusions"),
    ("p", "Based on the engagement from the October 13, 2026 assessment, the following preliminary "
          "conclusions are drawn."),
    ("bullets", [
        "**Environmental concerns were identified during the initial investigation.** The initial EPA "
        "findings identified iron-rich, sediment-laden discharges entering local water resources and "
        "farmlands through six distinct discharge points. Further laboratory and field evidence was "
        "required to establish the full extent and characteristics of the environmental impacts.",
        "**The geographical extent of the affected area remains disputed.** AML\u2019s geofencing exercise "
        "has not been accepted by Bolo Town residents as a complete representation of the affected area. "
        "Independent EPA verification is required to establish the boundaries and identify potentially "
        "omitted farms and affected persons.",
        "**The damaged-farm survey remains unresolved.** Community representatives objected to AML\u2019s "
        "proposed survey process and cited the absence of many farm owners from the town. The survey "
        "process requires further coordination and regulatory direction.",
        "**Crop compensation is a major source of disagreement.** The identification of affected farm "
        "owners, the assessment of agricultural losses, and the determination of the appropriate "
        "compensation process remain outstanding matters.",
        "**The community has not reached a final position.** Bolo Town\u2019s representative stated that the "
        "community intended to consult its lawyers and elders and independently ascertain the extent of "
        "damaged farms before determining the way forward.",
        "**Regulatory oversight remains necessary.** The EPA Team Lead directed AML to suspend its "
        "RAP-related or damaged-farm survey activities pending further regulatory direction and indicated "
        "that the subsequent EPA visit would address the RAP process and enforcement of the Corrective "
        "Action Plans.",
    ]),

    # ===================================================================
    ("h1", "Conclusion and Recommendations"),
    ("h2", "Overall Conclusion"),
    ("p", "The October 13, 2026 investigative assessment in Bolo Town represented a further step in the "
          "EPA\u2019s response to complaints of pollution associated with AML\u2019s operations. The exercise "
          "involved technical field assessment, environmental sampling, engagement with the affected "
          "community, and discussions concerning the disputed boundaries of the affected area and the "
          "identification of damaged farms."),
    ("p", "The initial investigation identified iron-rich, sediment-laden discharges entering local "
          "water resources and farmlands through six distinct discharge points. The subsequent assessment "
          "also highlighted persistent disagreements over AML\u2019s geofencing exercise, access to affected "
          "farms, the proposed damaged-farm survey, and the identification and compensation of affected "
          "crop owners."),
    ("p", "Although the EPA communicated its preliminary findings and initiated further investigative "
          "activities, the October 13 engagement did not resolve the outstanding environmental, "
          "agricultural, and social issues. Community representatives maintained that further "
          "consultation with their legal representatives and elders, together with an assessment of "
          "damaged farms, would be necessary before they could determine their final position."),
    ("p", "The EPA should therefore continue its independent technical investigation, verify the full "
          "extent of the affected area, review AML\u2019s regulatory compliance, and establish an "
          "appropriately documented process for assessing agricultural damage and addressing outstanding "
          "community concerns. The planned follow-up visit should prioritise the RAP-related issues, "
          "enforcement of the Corrective Action Plans, and clarification of the farm-damage assessment "
          "process."),
    ("h2", "Recommendations"),
    (PH, "Final recommendations (immediate interventions, non-compliance / penalty matrix, remediation "
         "and livelihood measures), following the format of the initial report."),

    # ===================================================================
    ("pagebreak",),
    ("h1", "Appendices"),
    ("h2", "Appendix A: Photos from the Investigation"),
    ("p", "Plates 1\u20134: VA group sampling points on the Wehyee and Pompleh streams, Bolo Town, Nimba "
          "County, October 13, 2026 (GPS Map Camera stamps)."),
    ("photos", [(PHOTO_DIR / fn, capt) for fn, capt in VA_PHOTOS]),
    (PH, "Photographs from the ES and JC groups and from the community consultation."),
    ("h2", "Appendix B: Source Documents"),
    ("bullets", [
        "Bolo Town Investigation Drafted Report V2 \u2013 Comprehensive Investigation Report on Water "
        "Pollution from ArcelorMittal Mining Operations at Bolo Town (preliminary investigation, "
        "August 13, 2026) \u2013 used as the structural template for this report.",
        "Social Team Draft Report \u2013 AML Assessment (October 13, 2026).",
        "ES Group \u2013 Physical Observations at Following Sampling Points (Yeewa, Yeewa Korweny 1 & 2).",
        "Team Varney Armah \u2013 Pompleh & Wehyee field notes and photographs.",
        "Bolo Town Sample Information (Joint) \u2013 sample register and TSS results.",
    ]),
]
