# -*- coding: utf-8 -*-
"""Content model for the ERRS Consolidated Third Quarter Report 2026.

The document is expressed as an ordered list of blocks.  Two renderers
(build_docx.py and build_pdf.py) consume this same model so that the Word and
PDF deliverables are identical in structure, numbering and wording.

Block types
-----------
cover                       the cover page
toc                         table of contents placeholder
lot / lof                   list of tables / list of figures placeholder
part      {num, title, subtitle}      full-page part divider
h1 / h2 / h3  {text}        numbered headings
para      {text, style}     body paragraph  (style: body | lead | note)
bullets   {items}           bulleted list
numbers   {items}           numbered list
callout   {title, items}    tinted information panel
table     {caption, head, rows, widths, align, note, small, zebra}
figure    {caption, path, width, note}
pagebreak
landscape_on / landscape_off
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
FIG = os.path.join(HERE, "figures")


def d(name):
    with open(os.path.join(DATA, name + ".json"), encoding="utf-8") as fh:
        return json.load(fh)


def f(name):
    return os.path.join(FIG, name)


DASH = "\u2014"

# =========================================================================
#  DOCUMENT METADATA
# =========================================================================
META = {
    "agency": "REPUBLIC OF LIBERIA",
    "agency2": "ENVIRONMENTAL PROTECTION AGENCY",
    "address": "Bright Building, 302-A Sekou Toure Avenue, Mamba Point\n"
               "P. O. Box 4024, 1000 Monrovia, 10 Liberia",
    "department": "DEPARTMENT OF ENVIRONMENTAL RESEARCH AND RADIATION SAFETY (ERRS)",
    "title": "Third Quarter Report, 2026",
    "subtitle": "Quarter III, 2026",
    "dept_line1": "Environmental Research and Radiation",
    "dept_line2": "Safety Department (ERRS)",
    "period_line": "(July 1 \u2013 September 30, 2026)",
    "cover_meta": [
        ("Reporting Department",
         "Environmental Research and Radiation Safety Laboratory"),
        ("Reporting Period", "July 1 \u2013 September 30, 2026"),
        ("Date Submitted", "September 2026"),
        ("Head of Department", "Rafael S. Ngumbu"),
        ("Contact Number", "0775764953"),
        ("Email", "rngumbu@epa.gov.lr / rafaelngumbu@yahoo.com"),
        ("Reporting Units",
         "Chemical Management Unit (CMU); Environmental Monitoring and "
         "Research Unit (EMRU); Radiation Safety Unit (RSU); "
         "Waste and Remediation Unit (WRU)"),
    ],
    "period": "Reporting Period: 1 July \u2013 30 September 2026",
    "units": "Chemical Management Unit (CMU)  \u00b7  Environmental Monitoring and "
             "Research Unit (EMRU)  \u00b7  Radiation Safety Unit (RSU)",
    "submitted_to": "Mr. Rafael S. Ngumbu, Sr., Manager/Director, "
                    "Environmental Research and Radiation Safety Department",
    "logo": f("epa_logo.jpeg"),
    "running_title": "Environmental Protection Agency  |  ERRS Department  |  Third Quarter Report 2026",
    "running_top": "REPUBLIC OF LIBERIA  |  ENVIRONMENTAL PROTECTION AGENCY",
}

# =========================================================================
#  BLOCKS
# =========================================================================
BLOCKS = []


def B(kind, **kw):
    kw["kind"] = kind
    BLOCKS.append(kw)
    return kw



# Quarter I and Quarter II values are carried forward from the
# ERRS Second Quarter Report 2026; Quarter III values are derived from the
# unit submissions consolidated in this report.
KPI_ROWS = [
    ["Radiation Safety Unit", "1", "Develop and Legislate Nuclear Act of "
     "Liberia 2026", "In Progress",
     "Responded to the second set of IAEA comments on the Radiation Safety Act",
     "Organised and held the Validation Programme for the Draft Radiation "
     "Safety Law; drafted Inspection Manual, operating guidelines and five "
     "(05) inspection checklists", "", "In Progress", "1 Act", DASH],
    ["", "2", "Conduct Basic Radiation Trainings for 50 Radiographers and 50 "
     "Radiation workers for health Facilities and Industrial and Mining "
     "facilities", "0", "0", "0", "", "0", "100 Workers", "0%"],
    ["", "6", "Conduct Nationwide inventory of Radiation Sources at about "
     "fifty (50) health, mining and industrial facilities across Liberia.",
     "0", "7 medical facilities + 4 mining-radiation monitoring inventories "
     "(11 total)", "0", "", "11", "50 Facilities", "22%"],
    ["Chemical Management Unit", "4", "Conduct Nationwide Chemical inventory "
     "at about 60 industrial facilities across Liberia.", "None conducted",
     "1 nationwide inventory (LIDA, Freeport, Monrovia)", "None conducted",
     "", "1", "60 Facilities", "1.7%"],
    ["", "7", "Issue chemical registration and importation licenses to 60 "
     "proponents", "41 Chemical Registration + 6 Chemical Importation "
     "licenses issued", "10 Chemical Registration + 4 Chemical Importation "
     "licenses issued", "3 Chemical Registration + 5 Chemical Importation "
     "licences issued", "", "69 (47 Q1 + 14 Q2 + 8 Q3)", "60 Proponents",
     "115% (target met)"],
    ["", "9", "Issue annual effluent discharge licenses to about 30 "
     "proponents across Liberia", "4 Effluent Discharge licenses issued",
     "4 Effluent Discharge licenses issued",
     "5 Effluent Discharge licences issued", "", "13 (4 Q1 + 4 Q2 + 5 Q3)",
     "30 Proponents", "43.3%"],
    ["", "14", "Issue chemical disposal licenses to five (5) proponents",
     "None issued", "None issued", "None issued", "", "None", "5 Proponents",
     "0%"],
    ["", "15", "Issue fumigation licenses to 10 proponents",
     "4 Fumigation licenses issued", "3 Fumigation licenses issued",
     "1 Fumigation licence issued", "", "8 (4 Q1 + 3 Q2 + 1 Q3)",
     "10 Proponents", "80%"],
    ["", "16", "Issue licenses to four (4) chemical transporting firms",
     "3 Transportation licenses issued", "1 Transportation license issued",
     "2 Transportation licences issued", "", "6 (3 Q1 + 1 Q2 + 2 Q3)",
     "4 Firms", "150% (target met)"],
    ["", "17", "Restore or remediate five (5) polluted sites.",
     "None reported",
     "1 site remediated: Sethi Ferro Fabrik, Iron Factory (14-day exercise)",
     "None reported by CMU; EMRU reported 1 restoration (chemical spillage "
     "site, Bomi Highway) and 1 remediation (gold mine, Upper Montserrado / "
     "Lower Margibi)", "", "3", "5 Sites", "60%"],
    ["", "20", "Conduct training of fumigation applicators", "None reported",
     "1 BCRP training conducted (Bong County, April)", "None reported", "",
     "1 training conducted", "All existing applicators", DASH],
    ["Environmental Monitoring and Research Unit", "3", "Equip EPA central "
     "laboratory with advanced analytical equipment, reagents & field "
     "compliance monitoring tool kits including mobile laboratory",
     "Ongoing", "Ongoing", "Ongoing", "", "Ongoing", "1 Lab & 1 Mobile Lab",
     DASH],
    ["", "5", "Hire two (2) Lab technicians, two (2) quality control "
     "officers, and two (2) laboratory supervisors for quality laboratory "
     "delivery services", "Ongoing", "Ongoing", "Ongoing", "", "Ongoing",
     "6 Staff", DASH],
    ["", "8", "Issue annual laboratory accreditation to about 12 analytical "
     "laboratories", "None issued",
     "6 laboratory accreditations issued (BMMC x4, GLM, ArcelorMittal)",
     "1 laboratory accreditation issued (MNG Gold Liberia, Bong County)", "",
     "7", "12 Laboratories", "58.3%"],
    ["", "10", "Analyze environmental quality media (water, soil, sediments, "
     "air, noise, vibration, vegetation) and conduct environmental "
     "monitoring", "53 lab results processed; 44 site verifications "
     "conducted", "36 lab results processed; 66 environmental investigations "
     "conducted", "19 lab results received; 91 environmental investigations "
     "conducted; 6 laboratory analysis exercises", "",
     "108 lab results; 201 investigations", "All required facilities", DASH],
    ["", "11", "Review, Update, and Validate the 2022 Environmental "
     "Inspection Manual of Liberia", "Ongoing", "Ongoing", "Ongoing", "",
     "Ongoing", "1 Manual", DASH],
    ["", "12", "Review Environmental monitoring reports submitted by 100 "
     "proponents.", "34 environmental monitoring reports reviewed",
     "27 environmental monitoring reports reviewed",
     "26 environmental monitoring reports reviewed", "",
     "87 (34 Q1 + 27 Q2 + 26 Q3)", "100 Proponents", "87%"],
    ["", "21", "Issue Annual Certification to Sachet Water Factories in "
     "Liberia", "75 certificates printed; 43 certificates picked up",
     "36 certificates printed; 32 certificates picked up",
     "11 certificates printed; 11 certificates issued", "",
     "122 printed; 86 issued", "All Producers", DASH],
    ["Waste and Remediation Unit", "22", "Conduct National Mapping and "
     "Registration of 100 Waste Generators and 50 Service Providers",
     "Ongoing assessments of waste service providers",
     "26 waste service providers assessed and classified (10 in April, 10 in "
     "May, 6 in June)",
     "17 applications received (3 July, 7 August, 7 September); ongoing "
     "assessment of waste service providers\u2019 facilities", "",
     "26 assessed (Q1\u2013Q2) + 17 applications received (Q3) = 43 "
     "providers engaged",
     "150 (100 Generators, 50 Providers)", "28.7%"],
    ["", "23", "Conduct Environmental Monitoring at 50 Waste Facilities",
     "Ongoing facility assessments",
     "Ongoing facility assessments; multiple ESIA site verifications",
     "Ongoing assessment of waste service providers\u2019 facilities; "
     "contributed to multiple ESIA site verification exercises arising from "
     "technical review sittings; attended the RAP Verification", "",
     "Ongoing", "50 Facilities", DASH],
    ["", "24", "Conduct five (5) Public Awareness Campaigns on Waste "
     "Segregation and Disposal",
     "Composting training and awareness campaigns conducted",
     "Attended World Environment Day celebration; attended 3rd KYE session",
     "4 engagements: International World Ozone Day (Buchanan); 7th edition "
     "of Know Your Environment (KYE); 3-day validation and technical "
     "session on stakeholder mobilisation, sectoral engagement and GHG data "
     "collection; UNOSD / Korea Environment Corporation scoping mission and "
     "one-day workshop on waste and the circular economy", "",
     "Ongoing: multiple awareness and stakeholder engagements",
     "5 Campaigns", DASH],
    ["", "25", "Issue waste management licenses to 50 waste services "
     "providers", "Accreditations prepared for qualifying companies",
     "15 applications responded to; 11 waste certificates issued",
     "15 applications responded to; 4 waste certificates issued", "",
     "15 (11 Q2 + 4 Q3)", "50 Providers", "30%"],
    ["Cross-Cutting / All Units (General ERRS)", "13", "Conduct "
     "environmental investigation and research in at least two thematic "
     "areas and publish findings in scientific journals",
     "51 environmental investigations conducted",
     "66 environmental investigations conducted (EMRU)",
     "91 environmental investigations conducted (EMRU)", "",
     "208 (51 Q1 + 66 Q2 + 91 Q3)", "2 Thematic Areas", DASH],
    ["", "18", "Conduct two training sessions for Chemical Handlers and "
     "First Respondents", "None reported", "None reported", "None reported",
     "", "None reported", "2 Training Sessions", "0%"],
    ["", "19", "Develop an automated database system of the ERRS Laboratory",
     "Cloud database set up for document verification", "Ongoing",
     "RSU updated its facilities and communication databases; RAIS issues "
     "resolved with IAEA support", "",
     "Cloud database established; ongoing maintenance", "1 System", DASH],
]


# ------------------------------------------------------------------ front
B("cover")
B("pagebreak")
B("toc")
B("pagebreak")
B("lot")
B("pagebreak")
B("lof")

# =========================================================================
#  1.  EXECUTIVE SUMMARY
# =========================================================================
B("pagebreak")
B("h1", text="Executive Summary")
B("para", style="lead", text="The third quarter of 2026 was a period of "
  "sustained regulatory and field activity for the Environmental Research "
  "and Radiation Safety (ERRS) Department. This report consolidates the "
  "quarterly submissions of the Chemical Management Unit (CMU), the "
  "Environmental Monitoring and Research Unit (EMRU) and the Radiation "
  "Safety Unit (RSU) and the Waste and Remediation Unit (WRU) for the "
  "period 1 July to 30 September 2026.")
B("para", text="The Chemical Management Unit maintained a full response rate "
  "on all applications received, recording thirty-eight (38) applications "
  "and thirty-eight (38) responses. The Unit issued thirty-five (35) "
  "regulatory instruments: nineteen (19) chemical release/clearances, five "
  "(5) chemical importation licences, five (5) effluent discharge licences, "
  "three (3) chemical registration licences, two (2) annual transportation "
  "licences and one (1) fumigation licence. Chemical release/clearances "
  "again represented the largest single category, accounting for "
  "fifty-four percent (54%) of all instruments issued. The Unit also "
  "conducted six (6) chemical escort operations covering eighty-eight (88) "
  "trucks of explosives, ferric chloride and ammonium nitrate.")
B("para", text="The Environmental Monitoring and Research Unit sustained "
  "strong field performance, conducting ninety-one (91) environmental "
  "investigation and monitoring activities and analysing ninety-one (91) "
  "environmental quality media for soil, water and air. The Unit received "
  "thirty-five (35) sachet water applications and responded to all "
  "thirty-five (35), issued twenty-six (26) response letters, received "
  "fourteen (14) payments and nineteen (19) laboratory results, printed "
  "eleven (11) certificates and issued eleven (11) certificates to "
  "proponents. It further issued one (1) laboratory accreditation, reviewed "
  "twenty-six (26) environmental monitoring reports and received six (6) "
  "complaints, including three (3) noise pollution complaints that "
  "prompted night-time field measurement exercises.")
B("para", text="The Radiation Safety Unit advanced its regulatory "
  "infrastructure, issuing four (4) radiation bills, seven (7) radiation "
  "importation licences and three (3) possess-and-use licences. The Unit "
  "organised and held the Validation Programme for the Draft Radiation "
  "Safety Law, drafted an Inspection Manual, operating guidelines and five "
  "(05) inspection checklists, calibrated Radiation Safety Laboratory "
  "equipment and resolved outstanding issues with the RAIS system with IAEA "
  "support. Three (3) staff attended IAEA fellowships and regional training "
  "in Ethiopia and Tanzania.")
B("para", text="Across the Department, performance continued to be "
  "constrained by cross-cutting systemic challenges: inadequate logistical "
  "resources, in particular vehicles and fuel; insufficient personal "
  "protective equipment for chemical handlers; shortages of computers and "
  "IT infrastructure; staffing gaps; and the need for specialised technical "
  "training in dosimetry, regulatory reporting systems and laboratory "
  "analysis. Low proponent engagement and incomplete parameter reporting "
  "continued to weaken the evidence base available for timely "
  "decision-making.")
B("para", text="The Waste and Remediation Unit received seventeen (17) "
  "waste management applications during the quarter (three (3) in July, "
  "seven (7) in August and seven (7) in September), responded to "
  "fifteen (15) applications and issued four (4) waste certificates. The "
  "Unit continued its assessment of waste service providers\u2019 "
  "facilities, contributed to multiple Environmental and Social Impact "
  "Assessment (ESIA) site verification exercises, and represented the "
  "Agency at national and international engagements, including the seventh "
  "meeting of the Expert Working Group on the review of Annex II in Geneva, "
  "the Jeju International Environment Forum in Korea and International "
  "World Ozone Day in Buchanan.")

# =========================================================================
#  2.  SUMMARY OF THE DEPARTMENT'S MANDATES
# =========================================================================
B("h1", text="Summary of the Department\u2019s Mandates")
B("para", text="The ERRS Department plays a central role in safeguarding "
  "Liberia\u2019s environmental and public health through research, "
  "monitoring, licensing, and regulatory oversight.")
B("para", text="The ERRS Department, originally established under the "
  "EPA\u2019s Department of Compliance and Enforcement, is mandated to "
  "conduct routine environmental monitoring and research across various "
  "environmental media, including water, soil, air, radiation, and noise. "
  "The primary goal is to generate empirical data that informs national "
  "policies aimed at preventing environmental degradation, mitigating "
  "pollution, and minimizing the impacts of development activities on "
  "ecosystems and human health.")
B("para", text="Structurally, the Department comprises four core units:")
B("bullets", items=[
    "Chemical Management Unit (CMU)",
    "Environmental Monitoring and Research Unit (EMRU)",
    "Radiation Safety Unit (RSU)",
    "Waste and Remediation Unit (WRU)",
])
B("para", text="These units collaboratively execute the department\u2019s "
  "broad mandate, which includes:")
B("bullets", items=[
    "Issuing licenses and permits for the importation, use, discharge, and "
    "disposal of chemicals and radiation sources;",
    "Accrediting analytical laboratories, waste handlers, industries, and "
    "health facilities for the safe use and management of hazardous "
    "substances;",
    "Maintaining national registries for chemicals and radiation sources in "
    "accordance with Part IV, Section 44 and Part IX, Section 96 of the "
    "Environmental Protection and Management Law of Liberia;",
    "Reviewing environmental monitoring reports submitted by regulated "
    "entities;",
    "Designing and implementing research programs to address emerging and "
    "existing environmental issues;",
    "Promoting public awareness and stakeholder engagement in environmental "
    "monitoring and decision-making.",
])
B("para", text="The ERRS Department is led by a director and operates under a "
  "proposed structure that formalizes its specialized units, each playing a "
  "vital role in supporting Liberia\u2019s environmental governance and "
  "regulatory compliance framework.")
B("para", text="This report documents the Department\u2019s performance and "
  "initiatives undertaken during the third quarter of 2026 (July to "
  "September 2026), building on the activities of the first and second "
  "quarters to offer a broader context for understanding the progress and "
  "strategic direction of the ERRS Department.")

# =========================================================================
#  3.  OUTSTANDING ACHIEVEMENTS DURING THE QUARTER
# =========================================================================
B("h1", text="Outstanding Achievements During the Quarter")

B("h2", text="Chemical Management Unit (CMU)")
B("para", text="During the third quarter of 2026 (July\u2013September), the "
  "Chemical Management Unit demonstrated exemplary operational efficiency, "
  "achieving a full response rate on all applications received. The Unit "
  "received thirty-eight (38) applications and issued thirty-eight (38) "
  "responses, and issued a total of thirty-five (35) regulatory instruments "
  "across six categories: sixteen (16) formal licences (chemical "
  "registration, importation, effluent discharge, fumigation and "
  "transportation) and nineteen (19) chemical release/clearances. Chemical "
  "release/clearances represented the largest single category, accounting "
  "for fifty-four percent (54%) of all regulatory instruments issued.")
B("para", text="Specifically, the Unit issued three (3) Chemical "
  "Registration Licences, five (5) Chemical Importation Licences, five (5) "
  "Effluent Discharge Licences, one (1) Fumigation Licence and two (2) "
  "Annual Transportation Licences, alongside nineteen (19) Chemical "
  "Release/Clearances. The Unit conducted six (6) chemical escort "
  "operations covering eighty-eight (88) trucks of explosives, ferric "
  "chloride and ammonium nitrate between 5 and 24 September 2026.")
B("para", text="No nationwide chemical inventory, verification/inspection "
  "investigation, training, seizure or chemical disposal licence was "
  "recorded during the quarter. A laboratory chemical inventory of school "
  "laboratories has been scheduled to commence in the next reporting "
  "period.")

B("h2", text="Environmental Monitoring and Research Unit (EMRU)")
B("para", text="During the third quarter of 2026, the EMRU sustained robust "
  "monitoring and research activity. The Unit received thirty-five (35) "
  "applications for sachet water and responded to all thirty-five (35). It "
  "issued twenty-six (26) response letters to proponents, received fourteen "
  "(14) payments from EPA receipts, printed eleven (11) certificates and "
  "issued eleven (11) certificates to compliant proponents. The laboratory "
  "received and processed nineteen (19) results from applicants, and the "
  "Unit issued one (1) laboratory accreditation, to MNG Gold Liberia in "
  "Bong County.")
B("para", text="The Unit reviewed twenty-six (26) environmental monitoring "
  "reports submitted by proponents and conducted ninety-one (91) "
  "environmental investigation and monitoring activities across multiple "
  "counties. These included the GIZ-coordinated Joint Anti-Mineral "
  "Smuggling awareness exercises in Grand Cape Mount County, a large "
  "multi-agency assessment programme of mineral and sachet water "
  "facilities, contamination investigations at the Monrovia Industrial "
  "Park, pollution investigations at ArcelorMittal in Nimba County, and "
  "noise pollution investigations in Congo Town and Sinkor. Six (6) "
  "complaints were received during the quarter. Six (6) laboratory analysis "
  "exercises were conducted on twenty-six (26) water samples.")

B("h2", text="Radiation Safety Unit (RSU)")
B("para", text="During the third quarter of 2026, the Radiation Safety Unit "
  "expanded its regulatory and compliance activities. The Unit issued four "
  "(4) radiation bills, seven (7) radiation importation licences to Bea "
  "Mountain Mining Corporation and three (3) possess-and-use licences to "
  "AMI Expeditionary Health Care and ArcelorMittal. Non-compliance notices "
  "were prepared and sent to facilities operating radiation-emitting "
  "equipment, and follow-up communications were issued to facilities that "
  "had not completed the licensing process.")
B("para", text="The Unit organised and held the Validation Programme for the "
  "Draft Radiation Safety Law and drafted several regulatory documents, "
  "including an Inspection Manual, guidelines for operating imaging "
  "equipment and five (05) inspection checklists. Radiation Safety "
  "Laboratory equipment (survey meters and the IdentiFinder) was "
  "calibrated, and outstanding issues with the RAIS system were resolved "
  "with support from the IAEA.")
B("para", text="Three (3) staff attended foreign training: the IAEA "
  "Fellowship on Notification and Authorization in Ethiopia (1\u201331 July "
  "2026), the IAEA Fellowship on Inspection and Enforcement in Tanzania "
  "(1\u201331 August 2026) and the Regional Training on Radiation Protection "
  "in the Context of Non-Medical Human Imaging, Inspection Devices and "
  "Consumer Products in Dar es Salaam (20\u201324 July 2026). Staff also "
  "participated in the Africa CDC/One Health Workshop on the Liberia "
  "National Laboratory Policy and Strategic Plan (2026\u20132030) and in "
  "several ESIA technical review sittings and site verification visits.")

B("h2", text="Waste and Remediation Unit (WRU)")
B("para", text="During the third quarter of 2026, the Waste and "
  "Remediation Unit continued the assessment of waste service "
  "providers\u2019 facilities and processed seventeen (17) waste "
  "management applications, of which fifteen (15) were responded to and "
  "four (4) proceeded to the issuance of waste certificates. The Unit "
  "contributed to multiple Environmental and Social Impact Assessment "
  "(ESIA) site verification exercises arising from technical review "
  "sittings, maintained regular telephone follow-ups with proponents on "
  "response letters, and prepared responses and certificates of "
  "accreditation for waste companies.")
B("para", text="The Unit also represented the Agency at a substantial "
  "number of national and international engagements during the quarter, "
  "including the seventh meeting of the Expert Working Group on the review "
  "of Annex II held in Geneva, Switzerland; the 2026 Green Solution Support "
  "Programme and the Jeju International Environment Forum in Korea; a "
  "scoping mission on waste management and the circular economy conducted "
  "with the UNOSD and the Korea Environment Corporation, including a "
  "one-day workshop on waste; International World Ozone Day activities in "
  "Buchanan; a three-day validation and technical session on stakeholder "
  "mobilisation, sectoral engagement and greenhouse gas data collection; a "
  "five-day training workshop organised by the Liberia Water and Sewer "
  "Corporation (LWSC); the RAP Verification; and the seventh edition of "
  "Know Your Environment (KYE) organised by Planning and Policy.")

# =========================================================================
#  4.  PROGRESS TRACKING Q3 2026
# =========================================================================
B("h1", text="Progress Tracking, Quarter III 2026")

B("h2", text="Key Performance Indicators (KPIs), Quarter III 2026")
B("para", text="The KPI results for the third quarter of 2026 reflect "
  "continued progress across the reporting units\u2019 core mandates, while "
  "highlighting areas requiring further support and strategic intervention. "
  "Quarter I and Quarter II figures are carried forward from the ERRS "
  "Second Quarter Report 2026 so that achievement is tracked cumulatively "
  "across the first nine months of the year.")
B("landscape_on")
B("table",
  caption="Key Performance Indicators (KPIs): progress tracking "
          "Q1\u2013Q3 2026 (cumulative)",
  head=["Unit", "No.", "Key deliverable", "Q1 2026", "Q2 2026", "Q3 2026",
        "Q4 2026", "Cumulative (9M)", "Annual target", "% achieved"],
  rows=KPI_ROWS,
  widths=[8, 4.5, 14.5, 12, 14, 15, 4.5, 11, 8, 8],
  align=["l", "c", "l", "l", "l", "l", "c", "l", "l", "c"],
  small=True, xsmall=True,
  note="Q1 and Q2 entries are reproduced from the ERRS Second Quarter Report "
       "2026; Quarter III entries are drawn from the four unit submissions "
       "consolidated in this report. Q4 2026 is reserved. For Output 22 the "
       "cumulative figure combines providers assessed in Quarters I\u2013II "
       "with applications received in Quarter III.")
B("landscape_off")
B("figure", caption="Cumulative KPI achievement at the end of Quarter III "
  "2026 against 2026 annual targets", path=f("figA_kpi_progress.png"),
  width=6.3)
B("para", text="The figure above visualises cumulative progress over the "
  "first nine months of the year against the annual targets established for "
  "2026. Two chemical licensing targets have already been met and exceeded, "
  "while radiation source inventory, nationwide chemical inventory, "
  "chemical disposal licensing and radiography training remain materially "
  "behind target. Waste management licensing has advanced to fifteen (15) "
  "certificates against an annual target of fifty (50) providers.")

B("h2", text="KPI Achievements and Remaining Tasks, Quarter III 2026")

B("h3", text="Chemical Management Unit")
B("para", text="The Chemical Management Unit maintained strong licensing "
  "performance, issuing thirty-five (35) regulatory instruments against a "
  "full (100%) response rate on the thirty-eight (38) applications "
  "received. Outputs included sixteen (16) formal licences (3 chemical "
  "registration, 5 chemical importation, 5 effluent discharge, 1 fumigation "
  "and 2 transportation licences) and nineteen (19) chemical "
  "release/clearances, alongside six (6) chemical escort operations. "
  "Remaining tasks for the year include the nationwide chemical inventory, "
  "for which one (1) of sixty (60) target facilities has been completed, "
  "and chemical disposal licensing, which remains at zero against a target "
  "of five (5) proponents.")
B("figure", caption="Breakdown of CMU regulatory instruments issued, "
  "Quarter III 2026", path=f("figB_cmu_instruments_pie.png"), width=6.3)
B("para", text="The chart above breaks down the thirty-five (35) regulatory "
  "instruments issued by the Chemical Management Unit during the third "
  "quarter. Chemical release/clearances dominate the Unit\u2019s output at "
  "54.3%, consistent with the pattern observed in Quarter II, and reflect "
  "the high volume of trade-related regulatory support provided by the Unit.")

B("h3", text="Environmental Monitoring and Research Unit")
B("para", text="The Environmental Monitoring and Research Unit delivered "
  "strong field results: thirty-five (35) application letters received and "
  "responded to, nineteen (19) laboratory results processed, eleven (11) "
  "certificates printed and eleven (11) issued, one (1) laboratory "
  "accreditation issued, twenty-six (26) monitoring reports reviewed and "
  "ninety-one (91) environmental investigations conducted, the highest "
  "quarterly investigation count recorded so far in 2026. The "
  "quarter-over-quarter summary and overall performance grade are presented "
  "below.")
B("table",
  caption="EMRU summary of activities by quarter, 2026",
  head=["Category", "Quarter I", "Quarter II", "Quarter III"],
  rows=[
      ["Number of Foreign Events Attended", "1", "0", "4"],
      ["Number of Local Events", "0", "0", "3"],
      ["Number of Environmental Investigations", "51", "66", "91"],
      ["Number of Local Trainings Conducted", "0", "0", "0"],
      ["Number of Sachet Water applications received", "84", "31", "35"],
      ["Number of Sachet Water responses", "84", "31", "35"],
      ["Number of Response letters issued", "51", "32", "26"],
      ["Number of applicants who paid", "49", "37", "14"],
      ["Number of environmental quality analyses", "53", "36", "91"],
      ["Laboratory Accreditation", "0", "6", "1"],
      ["Number of Monitoring activities conducted", "63", "66", "91"],
      ["Number of Sachet Water certificates issued", "43", "32", "11"],
      ["Number of Sachet water certificates printed", "75", "36", "11"],
      ["Number of Site Verifications", "44", "Not separately reported", "0"],
      ["Number of Laboratory Results", "53", "36", "19"],
  ],
  widths=[43, 19, 19, 19], align=["l", "c", "c", "c"],
  note="Quarter I and Quarter II figures are reproduced from the ERRS Second "
       "Quarter Report 2026.")
B("figure", caption="EMRU quarter-on-quarter activity trend, 2026",
  path=f("figD_emru_quarters.png"), width=6.3)
B("figure", caption="EMRU operational activity summary, Quarter III 2026",
  path=f("figC_emru_activity.png"), width=6.3)
B("table",
  caption="EMRU overall performance grade, Quarter III 2026",
  head=["No.", "Output description", "Planned activities", "Indicators",
        "Targets", "Progress", "Status"],
  rows=[
      ["1", "Issue annual laboratory accreditation",
       "Assess and accredit analytical laboratories",
       "Number of accreditations issued", "12 laboratories",
       "1 issued in Q3 (7 cumulative)", "On track"],
      ["2", "Analyse environmental quality media",
       "Sample and analyse water, soil and air",
       "Number of media analysed", "All required facilities",
       "91 analysed in Q3", "Achieved"],
      ["3", "Conduct environmental monitoring and investigations",
       "Field investigations, site verifications, complaint response",
       "Number of investigations", "All required facilities",
       "91 conducted in Q3", "Achieved"],
      ["4", "Review environmental monitoring reports",
       "Review proponent submissions against national standards",
       "Number of reports reviewed", "100 proponents",
       "26 reviewed in Q3 (87 cumulative)", "On track"],
      ["5", "Issue annual certification to sachet water factories",
       "Process applications, laboratory testing and certification",
       "Certificates printed and issued", "All producers",
       "11 printed and 11 issued in Q3", "Behind target"],
      ["6", "Conduct site verifications of sachet water proponents",
       "Field verification of applicant premises",
       "Number of site verifications", "All applicants",
       "0 conducted in Q3", "Not started"],
  ],
  widths=[6, 16.5, 20.5, 14, 13, 17, 13],
  align=["c", "l", "l", "l", "l", "l", "c"], small=True)

B("h3", text="Radiation Safety Unit")
B("para", text="The Radiation Safety Unit concentrated on regulatory "
  "infrastructure during the quarter, issuing four (4) bills, seven (7) "
  "importation licences and three (3) possess-and-use licences, and holding "
  "the Validation Programme for the Draft Radiation Safety Law. No medical "
  "or industrial facility inventory, inspection or occupational radiation "
  "safety training was conducted during the quarter, leaving the national "
  "inventory at eleven (11) of the fifty (50) target facilities and the "
  "training indicator at zero. The summary of the Unit\u2019s major "
  "activities for the quarter is presented below.")
B("table",
  caption="RSU summary of major activities, Quarter III 2026",
  head=["Category", "2026\n(Quarter III)", "Annual target\n(2026)",
        "Total completed", "Percentage completed (%)"],
  rows=[
      ["Number of Medical facilities inventoried", "0", "50", "7", DASH],
      ["Number of industrial facilities inventoried", "0", DASH, "0", DASH],
      ["Number of Mining Radiation Monitoring and Inventories", "0", DASH, "4",
       DASH],
      ["Number of operators/radiographers trained", "0", "50", "0", "0%"],
      ["Number of trained persons under personnel monitoring", "0", "50", "0",
       "0%"],
      ["Number of Publications", "0", "2", "0", "0%"],
      ["Number of Internal Training(s) Conducted", "0", "N/A", "0", "\u2013"],
      ["Number of Bills issued", "4", "N/A", "5", "\u2013"],
      ["Number of Radiation Importation License(s) issued", "7", "N/A", "7",
       "\u2013"],
      ["Number of Radiation Possess & Use License(s) issued", "3", "N/A", "3",
       "\u2013"],
  ],
  widths=[40, 15, 15, 15, 15], align=["l", "c", "c", "c", "c"], small=True,
  note="Reproduced from the RSU Quarter III 2026 submission. Cells shown as "
       "\u2014 were left blank in the source unit report.")

B("h3", text="Waste and Remediation Unit")
B("para", text="The Waste and Remediation Unit processed seventeen (17) "
  "waste management applications during the quarter, responded to fifteen "
  "(15) and issued four (4) waste certificates. Application volume rose "
  "sharply after July, with seven (7) applications received in each of "
  "August and September against three (3) in July. Eleven (11) of the "
  "seventeen applications concerned non-hazardous municipal waste and five "
  "(5) concerned hazardous streams (scrap, used tyres, used batteries, "
  "used cables, plastics, medical waste and sewage), while one (1) was a "
  "request for an acquaintance meeting.")
B("table",
  caption="WRU summary of activities, Quarter III 2026",
  head=["Category", "July", "August", "September", "Quarter III total"],
  rows=[["Waste management applications received", "3", "7", "7", "17"],
        ["Applications responded to", DASH, DASH, DASH, "15"],
        ["Waste certificates issued", DASH, DASH, DASH, "4"],
        ["Non-hazardous (municipal) undertakings applied for", "3", "3", "5",
         "11"],
        ["Hazardous waste undertakings applied for", "0", "3", "2", "5"],
        ["Other requests (acquaintance meeting)", "0", "1", "0", "1"]],
  widths=[44, 12, 14, 16, 14], align=["l", "c", "c", "c", "c"],
  note="Applications responded to and certificates issued were reported for "
       "the quarter as a whole and are not disaggregated by month in the "
       "source unit report.")
B("figure", caption="WRU waste management applications received by month, "
  "Quarter III 2026", path=f("figF_wru_applications.png"), width=5.9)
B("para", text="Application volume more than doubled from July to August "
  "and held at that level in September, indicating growing engagement by "
  "waste service providers with the accreditation process.")
B("figure", caption="WRU waste application pipeline, Quarter III 2026",
  path=f("figG_wru_pipeline.png"), width=6.1)
B("para", text="The pipeline shows attrition between application and "
  "certification: fifteen (15) of the seventeen (17) applications received "
  "a formal response, but only four (4) reached certification within the "
  "quarter. The Unit records that several requests for permits were "
  "responded to but the proponents concerned are yet to come into "
  "compliance.")
B("figure", caption="Classification of waste undertakings applied for, WRU, "
  "Quarter III 2026", path=f("figH_wru_streams.png"), width=6.1)
B("para", text="Non-hazardous municipal waste accounts for just under "
  "two-thirds of the applications received, with hazardous streams "
  "(scrap metal, used tyres, used batteries, used cables, plastics, "
  "medical waste and sewage) making up a further 29.4%. Against the "
  "annual targets, the Unit has now issued fifteen (15) waste management "
  "certificates of the fifty (50) planned for 2026 (30%), and forty-three "
  "(43) generators and providers have been assessed or have applied of the "
  "one hundred and fifty (150) targeted (28.7%). Environmental monitoring "
  "of waste facilities and the public awareness campaign programme remain "
  "ongoing.")

B("h3", text="Field Activity Across the Department")
B("figure", caption="Field investigations, escorts and assessments by unit, "
  "Quarter III 2026", path=f("figE_field_by_unit.png"), width=6.0)
B("para", text="The figure compares the primary field-based activities of "
  "each unit for the quarter. The Environmental Monitoring and Research Unit "
  "accounted for the overwhelming majority of field activity with ninety-one "
  "(91) investigations, followed by the Waste and Remediation Unit with "
  "seventeen (17) waste management applications processed. The Radiation "
  "Safety Unit recorded no facility inspection or inventory during the "
  "quarter.")

# =========================================================================
#  5.  DETAILED SUMMARY OF UNDERTAKINGS
# =========================================================================
B("h1", text="Detailed Summary of Undertakings")
B("para", style="lead", text="The sections that follow reproduce each "
  "unit\u2019s Quarter III 2026 submission in full, in the order Chemical "
  "Management Unit, Environmental Monitoring and Research Unit, Radiation "
  "Safety Unit and Waste and Remediation Unit. Content, wording and figures "
  "are carried over from the source unit reports without abridgement.")

B("h2", text="Chemical Management Unit (CMU)")
B("h3", text="Report Particulars")
B("table",
  caption="Chemical Management Unit report particulars",
  head=["Description", "Detail"],
  rows=[
      ["To", "Mr. Rafael S. Ngumbu, Manager, ERRS Department"],
      ["From", "Mr. Emmanuel Suah, Head of Chemical Management Unit"],
      ["Contact", "+231 775520872  \u00b7  esuah@epa.gov.lr"],
      ["Reporting quarter", "Quarter Three, 2026"],
      ["Reporting period", "July 1 \u2013 September 30, 2026"],
      ["Reporting date", "September 28, 2024"],
  ],
  widths=[26, 74], align=["l", "l"],
  note="Reporting date reproduced exactly as recorded in the source unit report.")

B("h3", text="Background")
B("para", text="The Chemical Management Unit is one of the Units in the "
  "Environmental Research and Radiation Safety Department at the Environmental "
  "Protection Agency. In collaboration with relevant sections, units, and "
  "departments of the EPA and other national and international stakeholders, "
  "the Unit was established to implement relevant provisions of the Agency\u2019s "
  "Act and the Environmental Protection and Management Laws. Understanding the "
  "chemical sector as one of the largest industrial sectors in the world and a "
  "fast emerging in Liberia, and considering the adverse consequences of "
  "unsound chemical management, the Unit was also established to undertake "
  "actions to prevent and mitigate the impacts on the environment, human health "
  "and economy of chemical accidents.")
B("para", text="The Unit supports the Agency in achieving several specific "
  "targets of the Sustainable Development Goals. It is a collaborative hub for "
  "implementing Multilateral Environmental Agreements (MEAs) on chemicals and "
  "hazardous waste. It works closely with focal points of the Stockholm "
  "Convention on Persistent Organic Pollutants (POPs), Vienna Convention for "
  "the Protection of the Ozone Layer, the Montreal Protocol on Substances that "
  "Deplete the Ozone Layer, Minamata Convention on Mercury, Rotterdam "
  "Convention on the Prior Informed Consent Procedure on Hazardous Chemicals "
  "and Pesticides in International Trade, and the Basel Convention on the "
  "Control of Trans-boundary Movement of Hazardous Wastes and their Disposal "
  "for effective delivery.")
B("para", text="The Unit issues chemical registration and importation licenses, "
  "chemical importation clearances, effluent discharge licenses, chemical "
  "disposal licenses, fumigation licenses. Additionally, the Unit serves as the "
  "Custodian of the Pollutant and Chemical Registry and is responsible for "
  "verifying and inspecting relevant proponents\u2019 applications and activities.")
B("para", text="This report covers activities beginning in July to September "
  "2026. The Chemical Management Unit (CMU) demonstrated exemplary operational "
  "efficiency during July\u2013September, achieving a response rate on all "
  "applications received. The unit issued a total of 15 licenses and 19 "
  "clearances, such as chemical registration, chemical importation, Chemical "
  "Transportation, fumigation, and effluent discharge licenses. The unit "
  "conducted critical chemical escort operations.")

B("h3", text="Activities Summary for the Quarter")
B("table",
  caption="Activities summary, Chemical Management Unit, Quarter III 2026",
  head=["Indicator", "Number"],
  rows=[
      ["Number of Foreign Events Attended", "0"],
      ["Number of Local Events Attended", "0"],
      ["Number of Verification / Inspection Investigations", "0"],
      ["Number of Training Conducted", "0"],
      ["Number of Non-bill or Letters Communicated", "0"],
      ["Number of Other Activities Conducted", "0"],
      ["Number of Meetings Attended", DASH],
      ["Number of Applications Received", "38"],
      ["Number of Responses", "38"],
      ["Number of Chemical Escorts", "0"],
      ["Chemical Clearances / Letters", "19"],
      ["Nationwide Chemical Inventory", "0"],
      ["Chemical Registration Licenses", "3"],
      ["Chemical Importation Licenses", "5"],
      ["Effluent Discharge Licenses", "5"],
      ["Number of Chemical Seizures", "0"],
      ["Annual Transportation License", "2"],
      ["Chemical Disposal Licenses", "0"],
      ["Number of Fumigation License", DASH],
  ],
  widths=[74, 26], align=["l", "c"],
  note="An em dash (\u2014) indicates a cell left blank in the source unit "
       "report. The entry for chemical escorts is reproduced as submitted; six "
       "escort operations are itemised in Table 9 below.")

B("figure", caption="Regulatory instruments issued by the Chemical Management "
  "Unit, Quarter III 2026", path=f("fig01_cmu_instruments.png"), width=6.3)
B("figure", caption="Application response performance, Chemical Management "
  "Unit, Quarter III 2026", path=f("fig02_cmu_response.png"), width=3.6)

B("h3", text="Major Deliverables")

B("h4", text="Applications Received and Responded To")
B("table",
  caption="Applications received and responded to, CMU, Quarter III 2026",
  head=["No.", "Applicant", "Location"],
  rows=d("cmu_applications"),
  widths=[8, 52, 40], align=["c", "l", "l"], small=True,
  note="Locations shown as \u2014 were not stated in the source unit report.")

B("h4", text="Chemical Registration Licenses Issued")
B("table",
  caption="Chemical registration licenses issued, CMU, Quarter III 2026",
  head=["No.", "Institution", "Address"],
  rows=[["1", "Cavalla Rubber Corporation", "Maryland County"],
        ["2", "Maryland Oil Palm Plantation", "Maryland County"],
        ["3", "Jeety Rubber, LLC", "Margibi County"]],
  widths=[10, 50, 40], align=["c", "l", "l"])

B("h4", text="Effluent Discharge Licenses Issued")
B("table",
  caption="Effluent discharge licenses issued, CMU, Quarter III 2026",
  head=["No.", "Institution", "Address"],
  rows=[["1", "Maryland Oil Palm Plantation", DASH],
        ["2", "Cavalla Rubber Corporation", DASH],
        ["3", "Arcelor Mittal Liberia", DASH],
        ["4", "Jeety Rubber, LLC", DASH],
        ["5", "Bea Mountain Mining Inc. (Matambo Pit)", DASH]],
  widths=[10, 50, 40], align=["c", "l", "l"])

B("h4", text="Chemical Release / Clearances Issued")
B("table",
  caption="Chemical release and clearances issued, CMU, Quarter III 2026",
  head=["No.", "Institution", "Address"],
  rows=[["1", "Bea Mountain Mining Corp. (8X)", "Grand Cape Mount"],
        ["2", "Bea Mountain Mining Inc. (5X)", DASH],
        ["3", "LIPFOCO (5X)", DASH],
        ["4", "Supreme Liberia Inc.", DASH]],
  widths=[10, 50, 40], align=["c", "l", "l"],
  note="The multiplier in parentheses denotes the number of clearances issued "
       "to the proponent, giving the quarter total of nineteen (19) clearances.")

B("h4", text="Fumigation License Issued")
B("table",
  caption="Fumigation license issued, CMU, Quarter III 2026",
  head=["No.", "Institution", "Address"],
  rows=[["1", "New Green World", "Russel Avenue, 15\u201316 Streets"]],
  widths=[10, 50, 40], align=["c", "l", "l"])

B("h4", text="Chemical Disposal License Issued")
B("table",
  caption="Chemical disposal licenses issued, CMU, Quarter III 2026",
  head=["No.", "Institution", "Address"],
  rows=[["\u2013", "None", "\u2013"]],
  widths=[10, 50, 40], align=["c", "l", "l"])

B("h4", text="Chemical Escorts Conducted")
B("table",
  caption="Chemical escort operations conducted, CMU, Quarter III 2026",
  head=["No.", "Chemical escorted", "Date", "Number of trucks"],
  rows=[["1", "Explosive", "September 5, 2026", "6 trucks"],
        ["2", "Ferric chloride", "September 9, 2026", "3 trucks (6 Six)"],
        ["3", "Explosive", "September 18, 2026", "24 trucks"],
        ["4", "Ammonium nitrate", "September 22, 2026", "16 trucks"],
        ["5", "Ammonium nitrate", "September 23, 2026", "16 trucks"],
        ["6", "Ammonium nitrate", "September 24, 2026", "23 trucks"],
        ["", "Total", "", "88 trucks"]],
  widths=[8, 34, 30, 28], align=["c", "l", "l", "c"], total_row=True,
  note="Consignment details reproduced as recorded in the source unit report.")
B("figure", caption="Chemical escort operations by consignment and date, "
  "CMU, Quarter III 2026", path=f("fig03_cmu_escorts.png"), width=6.3)

B("h4", text="Chemical Inventory Conducted")
B("table",
  caption="Chemical inventory conducted, CMU, Quarter III 2026",
  head=["No.", "Institution", "Address"],
  rows=[["\u2013", "None", "\u2013"]],
  widths=[10, 50, 40], align=["c", "l", "l"])

B("h4", text="Chemical Importation Licenses Issued")
B("table",
  caption="Chemical importation licenses issued, CMU, Quarter III 2026",
  head=["No.", "Institution", "Address"],
  rows=[["1", "CGGC Mining Services", DASH],
        ["2", "Cavalla Rubber Corporation", DASH],
        ["3", "Golden SIFCA", DASH],
        ["4", "Maryland Oil Palm Plantation", DASH],
        ["5", "Firestone Liberia, LLC", DASH]],
  widths=[10, 50, 40], align=["c", "l", "l"])

B("h4", text="Chemical Seizure Incidents")
B("table",
  caption="Chemical seizure incidents, CMU, Quarter III 2026",
  head=["No.", "Institution", "Address"],
  rows=[["\u2013", "None", "\u2013"]],
  widths=[10, 50, 40], align=["c", "l", "l"])

B("h4", text="Chemical Transportation Licenses Issued")
B("table",
  caption="Chemical transportation licenses issued, CMU, Quarter III 2026",
  head=["No.", "Institution", "Address"],
  rows=[["1", "AND Incorporated", DASH],
        ["2", "Everette Transport Corporation", DASH]],
  widths=[10, 50, 40], align=["c", "l", "l"])

B("h3", text="Other Deliverables")
B("table",
  caption="Other deliverables, CMU, Quarter III 2026",
  head=["Category", "Status"],
  rows=[["Other Letters / Non-bill Communicated", "None"],
        ["Meetings Attended", "None"],
        ["Verifications / Inspections / Investigations", "None"],
        ["Other Activities", DASH]],
  widths=[60, 40], align=["l", "l"])

B("h3", text="Activities Deferred or Planned for the Next Quarter")
B("table",
  caption="Activities deferred or planned for the next quarter, CMU",
  head=["No.", "Activity"],
  rows=[["1", "Laboratory chemical inventory: an inventory of laboratories "
              "chemical in school laboratories will commence next month to "
              "support the effective management, safe handling, storage, and "
              "disposal of chemicals, while minimizing potential risks to human "
              "health, environmental quality, and laboratory safety."]],
  widths=[8, 92], align=["c", "l"])


B("h2", text="Environmental Monitoring and Research Unit (EMRU)")
B("h3", text="Report Particulars")
B("table",
  caption="Environmental Monitoring and Research Unit report particulars",
  head=["Description", "Detail"],
  rows=[
      ["Reporting unit", "Environmental Monitoring and Research"],
      ["Date", "September 1, 2026"],
      ["Reporting period", "July \u2013 September 2026"],
      ["Report compiled by", "Stephen M. Gibson"],
      ["Head of Unit", "Joseph F. Charles"],
      ["Contact number", "0777932238"],
      ["Email", "josefacha2020@gmail.com  /  jcharles@epa.gov.lr"],
  ],
  widths=[26, 74], align=["l", "l"])

B("h3", text="Summary of the Unit\u2019s Mandates")
B("para", text="The Environmental Monitoring and Research Unit (EMR) operates "
  "under the Environmental Research and Radiation Safety Department (ERRS). It "
  "is mandated to conduct environmental research and routine monitoring of key "
  "environmental media, including water, soil, air, radiation and noise, "
  "across Liberia. The Unit\u2019s primary objective is to generate "
  "reliable, evidence-based analytical data to inform policy development and "
  "decision-making processes aimed at preventing future environmental "
  "disasters, reducing pollution risks, and minimizing the environmental and "
  "bioreceptor impacts associated with development projects and other human "
  "activities.")
B("para", text="In addition to monitoring and research, the EMR Unit designs "
  "and implements research and development programs that support environmental "
  "compliance monitoring while addressing existing and emerging environmental "
  "challenges. The Unit also provides public information and environmental "
  "education to promote awareness and encourage the active participation of an "
  "informed citizenry in environmental quality planning and monitoring "
  "initiatives. The Unit is headed by Assistant Director Joseph Charles, who "
  "provides strategic leadership and technical oversight for all EMR activities.")
B("para", text="During this quarter, the Environmental Monitoring and Research "
  "Unit conducted a comprehensive internal review to assess progress in "
  "implementing its 2026 work plan, in alignment with the operational framework "
  "and strategic objectives of the Environmental Research and Radiation Safety "
  "Department (ERRS).")

B("h3", text="Key Activities Carried Out During the Review Period")
B("bullets", items=[
    "Analyzed environmental quality media (soil, water, & air)",
    "Monitored facilities.",
    "Received applications for sachet water",
    "Responded to applications",
    "Printed out certificates",
])

B("h3", text="Outcomes Achieved")
B("para", text="As a result of these activities, the Environmental Monitoring "
  "and Research Unit achieved the following outcomes:")
B("bullets", items=[
    "Received Thirty-five (35) applications for sachet water.",
    "Responded to thirty five (35) applicants",
    "Received fourteen (14) payments from EPA receipts",
    "Printed eleven (11) certificates for sachet water.",
    "Issued eleven (11) certificates to Proponents",
    "Issued twenty Six (26) response letters to proponents.",
    "Received Ninteen (19) lab results from applicants.",
    "Issued Six (1) Laboratory accreditation to proponent.",
    "Analyzed Ninty (91) environmental quality media for (soil, water, and air).",
    "Reviewed Twenty-six (26) environmental monitoring reports submitted by the "
    "proponent.",
    "Conducted Ninty one (91) environmental media investigations.",
    "Conducted six (6) labotaory analysis",
])

B("h3", text="Detailed Summary of Undertakings During the Third Quarter 2026")

B("h4", text="Foreign Meetings, Trainings or Workshops Attended by Staff")
B("table",
  caption="Foreign meetings, trainings or workshops attended by staff of EMR",
  head=["Indicator", "Number"],
  rows=[["Total number of foreign events attended", "4"],
        ["Total number of staff who attended foreign events", "4"]],
  widths=[74, 26], align=["l", "c"])

B("h4", text="Domestic Meetings, Trainings or Workshops Attended by Staff")
B("table",
  caption="Domestic meetings, trainings or workshops attended by staff of EMR",
  head=["Indicator", "Number"],
  rows=[["Total number of local events attended", "3"],
        ["Total number of staff who attended local events", "3"]],
  widths=[74, 26], align=["l", "c"])

B("h4", text="Environmental Investigations and Monitoring Conducted")
B("para", text="The Unit conducted ninety-one (91) environmental investigation "
  "and monitoring activities during the quarter. The full schedule of "
  "undertakings is set out below.")
B("table",
  caption="Environmental investigations and monitoring conducted during "
          "Quarter III, 2026",
  head=["No.", "Investigation description and summary"],
  rows=d("emr_investigations") + [["", "Total activities: 91"]],
  widths=[7, 93], align=["c", "l"], small=True, total_row=True,
  note="Entries are reproduced as recorded in the source unit report, "
       "including the month markers inserted by the Unit.")
B("figure", caption="Environmental investigations and monitoring activities by "
  "month, EMR Unit, Quarter III 2026", path=f("fig06_emr_investigations.png"),
  width=5.4)

B("h4", text="Training Conducted by Staff of the ERRS Department")
B("table",
  caption="Training conducted by staff of the ERRS Department",
  head=["S/N", "Staff / Division facilitating",
        "Training description and summary / host institution"],
  rows=[["1.", DASH, DASH],
        ["2.", DASH, DASH],
        ["", "Total number of trainings conducted", "0"]],
  widths=[8, 32, 60], align=["c", "l", "l"], total_row=True)

B("h4", text="Laboratory Accreditation Issued")
B("table",
  caption="Laboratory accreditation issued, EMR Unit, Quarter III 2026",
  head=["S/N", "Company", "Location"],
  rows=[["1", "MNG Gold Liberia", "Bong County"],
        ["", "Total number of lab accreditation issued", "1"]],
  widths=[10, 50, 40], align=["c", "l", "l"], total_row=True)

B("h4", text="Complaints Received")
B("table",
  caption="Complaints received by the EMR Unit, Quarter III 2026",
  head=["S/N", "Proponent", "Location", "Nature of complaint"],
  rows=[
      ["1.", "NP Liberia Limited and Fouani Brother corporation",
       "Gardnersville, Japaness Freeway / Montserrado",
       "Environmental contamination investigation at both NP Liberia Limited "
       "and Fouani Brother corporation located in the Industrial Park based on "
       "a complaint of salt spillage and paticulates causing corrosion on "
       "cooking gas stoarge tank"],
      ["2.", "Arcelor Mittal", "Bolo town, yekepa, Nimba county",
       "Environmental pollution investigation in, following a complaint about "
       "Arcelor Mittal pollution of their waters."],
      ["3.", DASH, "White House community in Congo town, Montserrado",
       "Environemntal investigation concerning waste water pollution"],
      ["4.", DASH, "Gbangay Town Community, Montserrado",
       "Environmental investigation concerning alleged noise pollution"],
      ["5.", "Filed in by Mr. Amara Kamara and some prominent individuals",
       "Puertotorre community in Congo town, Paynesville, Montserrado",
       "Environmental Investigation concerning noise pollution"],
      ["6.", "Filed by the Management of Monroe chicken restaurant.",
       "3rd street, Sinkor Montserrado",
       "Environmmental investigation concerning Noise pollution"],
      ["", "Total number of complaints received", "", "Six (6)"],
  ],
  widths=[6, 24, 26, 44], align=["c", "l", "l", "l"], small=True,
  total_row=True)
B("figure", caption="Complaints received by nature of complaint, EMR Unit, "
  "Quarter III 2026", path=f("fig08_emr_complaints.png"), width=5.6)

B("h3", text="Sachet Water Third Quarter Report, July \u2013 September 2026")

B("h4", text="Total Applications Received and Responded To")
B("table",
  caption="Sachet water applications received and responded to, "
          "July \u2013 September 2026",
  head=["No.", "Facility name", "Owner name", "Location", "Contacts"],
  rows=d("emr_t8_applications") + [
      ["", "Total applications received and responded to", "", "",
       "Thirty-Five (35)"]],
  widths=[6, 24, 20, 30, 20], align=["c", "l", "l", "l", "l"], small=True,
  total_row=True,
  note="The serial number 32 appears twice in the source unit report; both "
       "entries are reproduced unchanged.")

B("h4", text="Total Response Letters Picked Up")
B("table",
  caption="Sachet water response letters picked up, July \u2013 September 2026",
  head=["No.", "Company name", "Location", "Comments", "Recommendations"],
  rows=d("emr_t9_response_letters") + [
      ["", "Total response letters picked up", "", "", "Twenty-Six (26)"]],
  widths=[6, 22, 21, 22, 29], align=["c", "l", "l", "l", "l"], small=True,
  total_row=True)

B("h4", text="Total Applicants That Paid")
B("table",
  caption="Sachet water applicants that paid, July \u2013 September 2026",
  head=["No.", "Company name", "Proponent name", "Location", "Contacts"],
  rows=d("emr_t10_paid") + [
      ["", "Total applicants that paid", "", "", "Fourteen (14)"]],
  widths=[6, 24, 20, 30, 20], align=["c", "l", "l", "l", "l"], small=True,
  total_row=True)

B("h4", text="Total Certificates Printed Out")
B("table",
  caption="Sachet water certificates printed out, July \u2013 September 2026",
  head=["No.", "Company name", "Proponent name", "Location", "Contacts"],
  rows=d("emr_t11_printed") + [
      ["", "Total certificates printed out", "", "", "Eleven (11)"]],
  widths=[6, 24, 20, 30, 20], align=["c", "l", "l", "l", "l"], small=True,
  total_row=True)

B("h4", text="Total Certificates Issued")
B("table",
  caption="Sachet water certificates issued, July \u2013 September 2026",
  head=["No.", "Company name", "Owner name", "Location", "Contact"],
  rows=d("emr_t12_issued") + [
      ["", "Total certificates issued", "", "", "Eleven (11)"]],
  widths=[6, 24, 20, 30, 20], align=["c", "l", "l", "l", "l"], small=True,
  total_row=True)

B("h4", text="Total Lab Results Received")
B("table",
  caption="Sachet water laboratory results received, July \u2013 September 2026",
  head=["No.", "Company name", "Owner\u2019s name", "Location"],
  rows=d("emr_t13_lab_results") + [
      ["", "Total lab results received", "", "Ninteen (19)"]],
  widths=[7, 28, 25, 40], align=["c", "l", "l", "l"], small=True,
  total_row=True)

B("h4", text="Total Site Verifications")
B("table",
  caption="Sachet water site verifications, July \u2013 September 2026",
  head=["No.", "Proponent name", "Location"],
  rows=[[DASH, DASH, DASH],
        ["", "Total sites verification", "One (0)"]],
  widths=[10, 45, 45], align=["c", "l", "l"], total_row=True,
  note="Total reproduced exactly as stated in the source unit report.")

B("h4", text="Summary of Sachet Water Activities")
B("table",
  caption="Summary of sachet water activities, EMR Unit, Quarter III 2026",
  head=["Activity", "Frequency"],
  rows=[["Total Application Letters Received", "35"],
        ["Total Application Responded To", "35"],
        ["Total Response Letters Issued", "26"],
        ["Total Applicants that Paid", "14"],
        ["Total Sites Verification", "0"],
        ["Total Labs Conducted", "19"],
        ["Total Certificate Printed Out", "11"],
        ["Total Certificate Issued", "11"],
        ["Total Amount", "$3,150"]],
  widths=[70, 30], align=["l", "c"])
B("figure", caption="Sachet water certification workflow, EMR Unit, "
  "Quarter III 2026", path=f("fig04_emr_sachet_pie.png"), width=6.3)
B("figure", caption="Sachet water certification pipeline, EMR Unit, "
  "Quarter III 2026", path=f("fig05_emr_sachet_pipeline.png"), width=6.3)

B("h3", text="Laboratory Analysis Conducted During July \u2013 September 2026")
B("para", text="Activities description: laboratory analysis conducted and "
  "parameters analyzed for:")
B("table",
  caption="Laboratory analyses conducted, EMR Unit, July \u2013 September 2026",
  head=["No.", "Date", "Samples and location", "Parameters analyzed"],
  rows=[
      ["1", "July 27, 2026",
       "Two (2) surface water samples from Kinjor, Grand Cape Mount County",
       "PH, ORP, EC, TDS, Salinity, and Turbidity, sulfate, cyanide, Iron, "
       "Nitrate, Copper."],
      ["2", "August 11, 2026",
       "Two (2) surface water samples and one (1) ground water sample from the "
       "Monrovia Industrial Pack, LPRC Community, Gardnesville",
       "PH, ORP, EC, TDS, Salinity, and Temperature, Turbidity, sulfate, "
       "Chlorine and Bromine."],
      ["3", "August 17, 2026",
       "Eight (8) surface water samples and one (1) ground water from Bolo "
       "town, Arcelor Mittal Liberia, Nimba County",
       "PH, EC, ORP, Salinity, TDS, Turbidity, Zinc, Nitrite, Chromium, Iron, "
       "Copper, Ammonia and Nitrate."],
      ["4", "August 25, 2026",
       "Two (2) surface water samples and seven (7) ground water samples from "
       "Bea Mountain, Kinjor, Grand Cape Mount County",
       "PH, EC, ORP, Salinity, TDS, and Temperature."],
      ["5", "August 28, 2026",
       "Two (2) ground water samples from Golden Loaf Artisanal Bakery, "
       "Airfield Shark Junction",
       "PH, EC, Salinity, Turbidity, TDS, and Temperature."],
      ["6", "September 02, 2026",
       "One (1) surface water sample from Monrovia Club Breweries sludge pit, "
       "Montserrado County",
       "PH, ORP, EC, TDS, Salinity, and Temperature."],
  ],
  widths=[6, 15, 39, 40], align=["c", "l", "l", "l"], small=True)
B("figure", caption="Samples analysed per laboratory exercise, EMR Unit, "
  "Quarter III 2026", path=f("fig09_emr_lab_samples.png"), width=6.3)

B("h3", text="Laboratory Accreditation, Third Quarter Report "
              "(July \u2013 September)")
B("table",
  caption="Laboratory accreditation record, EMR Unit, Quarter III 2026",
  head=["Field", "Record"],
  rows=[["No.", "1"],
        ["Proponent name", "MNG Gold Mine"],
        ["Address", "Congo town, Tubman boulevard"],
        ["Contact person", "Cem Aktay"],
        ["Contact number", "0776330358 / 0886526019"],
        ["No. of sites", "1"],
        ["Application date", "12/08/2026"],
        ["Response date", "17/08/2026"],
        ["Amount paid (USD)", "2,525.00"],
        ["Receipt no.", "4789"],
        ["Payment date", "07/09/2026"],
        ["Certification date", "07/09/2026"],
        ["Expiration date", "06/09/2026"]],
  widths=[34, 66], align=["l", "l"],
  note="All values reproduced exactly as recorded in the source unit report.")

B("h4", text="Administrative Notes")
B("bullets", items=[
    "Application Date: Date the written application/expression of interest is "
    "officially received.",
    "Response Date: Date of EPA/ERRS formal response to the proponent.",
    "Amount Paid, Receipt No. and Payment Date: Verify against the official "
    "payment/financial record.",
    "Certification Date: Date the accreditation certificate is issued.",
    "Expiration Date: Date the accreditation certificate expires in accordance "
    "with the approved validity period.",
])

B("h3", text="Third Quarter Surveillance Reports")
B("h4", text="Summary of the Third Quarter, 2026")
B("bullets", items=[
    "Total number of reports received = 26",
    "Diseases or events reported = Water Quality; Soil Quality; Air Quality",
    "Total number of reporting site/proponents = 40",
    "Number of reporting site/proponents that did not report = n/a",
])

B("h4", text="Summary of July, 2026")
B("bullets", items=[
    "Total number of reports received = 7",
    "Diseases or events reported = Water Quality; Soil Quality; Air Quality",
    "Total number of reporting site/proponents = 9",
    "Number of reporting site/proponents that did not report = n/a",
])

B("table",
  caption="Water quality: timeliness and completeness of reporting by "
          "companies, July 2026",
  head=["No.", "Reporting proponents", "Current monthly\n(Timeliness)",
        "Current monthly\n(Completeness)", "% Cumulative\ntimeliness",
        "% Cumulative\ncompleteness"],
  rows=[
      ["1", "Sethi Ferro Fabrik", "L", "100%", "50%", "75%"],
      ["2", "Cavalla Resources Liberia INC-Geo Fantro", "T", "100%", "100%", "100%"],
      ["3", "Cavalla Resources Liberia Inc-Kitoma", "T", "100%", "100%", "100%"],
      ["4", "Rainbow Paint Factory", "T", "100%", "100%", "100%"],
      ["5", "BUMU International Liberia INC", "L", "100%", "50%", "75%"],
      ["6", "Atlantic Shipping Liberia Company Limited Incorporated", "L",
       "100%", "50%", "75%"],
      ["7", "International Aluminium Factory", "T", "100%", "100%", "100%"],
      ["8", "International Aluminium Factory", "T", "100%", "100%", "100%"],
      ["9", "Golden SIFCA Incorporated", "L", "100%", "50%", "75%"],
  ],
  widths=[6, 34, 15, 15, 15, 15],
  align=["c", "l", "c", "c", "c", "c"], small=True)

B("table",
  caption="Legend: reporting timeliness and completeness classification",
  head=["Classification", "Code", "Cumulative performance band", "Range"],
  rows=[["On time", "T", "\u2265 80% on time / complete", "High"],
        ["Late", "L", "\u2265 50 \u2013 79.9% on time / complete", "Moderate"],
        ["No report received", "NR", "< 50% on time / complete", "Low"]],
  widths=[28, 12, 40, 20], align=["l", "c", "l", "c"])

B("table",
  caption="Soil quality: timeliness and completeness of reporting by "
          "companies, July 2026",
  head=["No.", "Reporting proponents", "Current monthly\n(Timeliness)",
        "Current monthly\n(Completeness)", "% Cumulative\ntimeliness",
        "% Cumulative\ncompleteness"],
  rows=[
      ["1", "Sethi Ferro Fabrik", "NR", "0%", "0%", "0%"],
      ["2", "Cavalla Resources Liberia INC-Geo Fantro", "T", "100%", "100%", "100%"],
      ["3", "Cavalla Resources Liberia Inc-Kitoma", "T", "100%", "100%", "100%"],
      ["4", "Rainbow Paint Factory", "T", "100%", "100%", "100%"],
      ["5", "BUMU International Liberia INC", "NR", "0%", "0%", "0%"],
      ["6", "Atlantic Shipping Liberia Company Limited Incorporated", "L",
       "100%", "50%", "75%"],
      ["7", "International Aluminium Factory", "T", "100%", "100%", "100%"],
      ["8", "International Aluminium Factory", "NR", "0%", "0%", "0%"],
      ["9", "Golden SIFCA Incorporated", "L", "100%", "50%", "75%"],
  ],
  widths=[6, 34, 15, 15, 15, 15],
  align=["c", "l", "c", "c", "c", "c"], small=True)

B("landscape_on")
B("table",
  caption="Summary of water, soil and air quality analysis reported by each "
          "proponent to EPA-Liberia for July, 2026",
  head=["Company", "pH", "SS", "NH\u2084", "NO\u2083", "CO", "CO\u2082",
        "NO\u2082", "VOC", "PM2.5", "pH", "NO\u2082", "NO\u2083", "NH\u2084",
        "CEC"],
  group_head=[("", 1), ("Water Quality", 4), ("Air Quality", 5),
              ("Soil Quality", 5)],
  rows=[
      ["Permissible range / limit", "6.5\u20138.0", "\u2264 10.0\n(mg/l)",
       "\u2264 1.0\n(mg/l)", "\u2264 40.0\n(mg/l)", "50\n(ppm)",
       "350\u20131000\n(ppm)", "5\n(ppm)", "0.6\u20131.0\n(ppm)", "10",
       "n/a", "n/a", "n/a", "n/a", "n/a"],
      ["Sethi Ferro Fabrik", "7.07", "8.57", "n/a", "0.48", "165", "421",
       "1.65", "n/a", "12.1", "NR", "NR", "NR", "NR", "NR"],
      ["Cavalla Resources Liberia INC-Geo Fantro", "6.5", "n/a", "0.01",
       "0.735", "NR", "NR", "NR", "NR", "NR", "4.75", "n/a", "n/a", "n/a",
       "4.5"],
      ["Cavalla Resources Liberia Inc-Kitoma", "<0.05", "n/a", "0.15", "0.543",
       "NR", "NR", "NR", "NR", "NR", "4.43", "n/a", "n/a", "n/a", "7.1"],
      ["Rainbow Paint Factory", "7.18", "0.43", "n/a", "0.003", "16", "178.5",
       "1.7", "n/a", "5.25", "5.88", "n/a", "n/a", "n/a", "n/a"],
      ["BUMU International Liberia INC", "7.3", "n/a", "n/a", "2.6", "n/a",
       "46.2", "0.35", "0.056", "17", "NR", DASH, "NR", "NR", "NR"],
      ["Atlantic Shipping Liberia Company Limited Incorporated", "7.35", "9.27",
       "n/a", "0.5", "5", "5.25", "0.03", "0.001", "4.67", "6.56", "0.45",
       "n/a", "n/a", "48.3"],
      ["International Aluminium Factory", "7.25", "n/a", "n/a", "0.4", "482.25",
       "5.15", "n/a", "0.08", "6.55", "5.52", "n/a", "n/a", "n/a", "110.2"],
      ["International Aluminium Factory", "7.25", "n/a", "n/a", "0.4", "11",
       "540.4", "0.006", "<0.001", "5.29", "NR", "NR", "NR", "NR", "NR"],
      ["Golden SIFCA Incorporated", "6.84", "9.21", "n/a", "0.45", "20.3",
       "430", "0.68", "n/a", "6.65", "6.38", "<0.001", "n/a", "n/a", "<0.001"],
  ],
  widths=[20, 5.5, 5.5, 5.5, 5.5, 6.5, 7.5, 5.5, 6.5, 5.5, 5.5, 5.5, 5.5, 5.5,
          5.5],
  align=["l"] + ["c"] * 14, small=True, xsmall=True,
  note="NR = acceptable/normal range; SS = Suspended Solids; NH\u2084 = Ammonia; "
       "NO\u2082 = Nitrate; NO\u2083 = Nitrite; CO = Carbon monoxide; "
       "CO\u2082 = Carbon dioxide; VOC = Volatile. Values are reproduced as "
       "reported by each proponent.")
B("landscape_off")

B("h4", text="Summary of August 2026")
B("bullets", items=[
    "Total number of reports received = 11",
    "Diseases or events reported = Water Quality; Soil Quality; Air Quality",
    "Total number of reporting site/proponents = 17",
    "Number of reporting site/proponents that did not report = n/a",
])
B("table",
  caption="Water quality: timeliness and completeness of reporting by "
          "companies/proponents, August 2026",
  head=["No.", "Reporting proponents", "Current monthly\n(Timeliness)",
        "Current monthly\n(Completeness)", "% Cumulative\ntimeliness",
        "% Cumulative\ncompleteness"],
  rows=[
      ["1", "Bea Mountain Mining Corp, Ndablama", "L", "100%", "50%", "75%"],
      ["2", "Star Ready Mix Concrete Corporation", "L", "100%", "50%", "75%"],
      ["3", "Bea Mountain Mining Corp, Matambo Project area", "L", "100%",
       "50%", "75%"],
      ["4", "Bea Mountain Mining Corp, Weajue", "L", "100%", "50%", "75%"],
      ["5", "Bea Mountain Mining Corp. New Liberty Gold mine", "L", "100%",
       "50%", "75%"],
      ["6", "MNG Gold Mine", "T", "100%", "100%", "100%"],
      ["7", "Liberia Agriculture Company", "L", "100%", "50%", "75%"],
      ["8", "Krish Veneer Industries Inc.", "T", "100%", "100%", "100%"],
      ["9", "RM group INC", "T", "100%", "100%", "100%"],
      ["10", "Cheema and Chahal (C & C) INC", "L", "100%", "50%", "100%"],
      ["11", "Mano Palm Oil Industries", "T", "100%", "100%", "100%"],
      ["12", "B & B Rubber Factory", "L", "100%", "50%", "75%"],
      ["13", "Modern Oil Factory", "L", "100%", "50%", "75%"],
      ["14", "Pan Oxygen Factory", "T", "100%", "100%", "100%"],
  ],
  widths=[6, 34, 15, 15, 15, 15],
  align=["c", "l", "c", "c", "c", "c"], small=True)
B("figure", caption="Timeliness of proponent reporting to the EMR Unit, "
  "Quarter III 2026", path=f("fig07_emr_reporting_quality.png"), width=6.3)


B("h2", text="Radiation Safety Unit (RSU)")
B("h3", text="Report Particulars")
B("table",
  caption="Radiation Safety Unit report particulars",
  head=["Description", "Detail"],
  rows=[["Report title", "Radiation Safety Unit Report (Quarter III)"],
        ["Date", "September 28, 2026"],
        ["Reporting period", "Quarter III (July \u2013 September 2026)"],
        ["Reporting quarter", "Quarter III, 2026"],
        ["Director of the Department", "Mr. Rafael S. Ngumbu, Sr."],
        ["Contact number", "0775764953"],
        ["Email", "rngumbu@epa.gov.lr  /  rafaelngumbu@yahoo.com"]],
  widths=[26, 74], align=["l", "l"])

B("h3", text="Unit Staff")
B("table",
  caption="Radiation Safety Unit staff",
  head=["Name", "Position"],
  rows=[["Varney Evanson Armah", "Assistant Director, RSU"],
        ["Mildred Chuka Piah", "Radiation Safety Laboratory Supervisor"],
        ["Amula B. Dorley", "Radiation Safety Laboratory Technician, Medical "
                            "and Industrial (pending)"],
        ["Abubakar Jawo", "Radiation Safety Laboratory Technician, Medical and "
                          "Industrial (pending)"],
        ["Korpo F. Kollie", "Support Staff"]],
  widths=[34, 66], align=["l", "l"])

B("h3", text="Summary of the Unit\u2019s Responsibilities")
B("para", text="The Radiation Safety Unit is charged with the responsibility of "
  "coordinating and driving every activity related to Importation, Exportation, "
  "Possess, Use, Transfer, Disposal, and Monitoring of radiation sources within "
  "the country. The Unit, through the Department of Environmental Research and "
  "Radiation Safety, documents and reports Regulatory Information of Interest "
  "to External Parties (e.g., the International Atomic Energy Agency, AFRA) as "
  "part of the country\u2019s international obligations.")
B("para", text="The responsibilities of the Unit are as follows:")
B("bullets", items=[
    "To coordinate the drafting, finalization, and validation of the "
    "Radiation/Nuclear Law of Liberia.",
    "Conduct Inspection of radiation sources.",
    "To conduct a Nationwide Radiation source inventory at medical and "
    "industrial facilities.",
    "To document the Radiation sources inventory data for the status and "
    "location of sources throughout the country.",
    "To conduct basic occupational radiation safety and protection training for "
    "operators of radiation-generating devices/sources in medical and "
    "industrial activities involving the use of ionizing radiation.",
    "To prepare and to issue licenses for institutions possessing "
    "radiation-generating devices/sources.",
    "To update Liberia\u2019s RASIMS database for reporting to the country\u2019s "
    "Technical Officer at IAEA.",
    "To integrate data and document information of sub-projects coordinated by "
    "various counterparts within the Agency.",
])

B("h3", text="Outstanding Achievements During Quarter III of 2026 Under Review")
B("numbers", items=[
    "Attended the IAEA Fellowship on Notification and Authorization in "
    "Ethiopia, July 1\u201331, 2026",
    "Prepared Licenses for applicants",
    "Prepared and sent non-compliance notices to facilities operating "
    "radiation-emitting equipment",
    "Attended the IAEA Fellowship on Inspection and Enforcement in Tanzania, "
    "August 1\u201331, 2026",
    "Participated in the Regional Training on Radiation Protection in the "
    "Context of Non-Medical Human Imaging, Inspection Devices and Consumer "
    "Products in Dar Es Salaam, Tanzania, from July 20\u201324, 2026",
    "Drafted several regulatory documents (Inspection Manual, Guidelines for "
    "operating imaging equipment, and five (05) Inspection Checklists)",
    "Calibrated equipment of the Radiation Safety Lab (survey meters, "
    "IdentiFinder)",
    "Organized and held the Validation Program for the Draft Radiation Safety "
    "Law",
    "Resolved issues with the RAIS system with support from the IAEA",
    "Participated in the Africa CDC/One Health Workshop on the Development of "
    "Liberia National Laboratory Policy & Strategic Plan (2026\u20132030) "
    "(one person)",
    "Participated in the Advanced QuickBooks Training for Finance Staff "
    "(one person)",
    "Held meetings with applicants and licensees to discuss non-compliance "
    "issues",
    "Participated in several site verification visits organized by the ESIA",
    "Reviewed and responded to applications for radiation licenses",
    "Identified Health and Industrial facilities for inspection and inventory",
    "Sent follow-up communications to facilities that have not completed the "
    "licensing process",
    "Prepared and followed up on the requests of the Unit",
    "Updated a database for facilities with radiation sources",
    "Updated the Communication Database of the Unit",
    "Participated in several ESIA Technical Review Sittings.",
    "Prepared the Unit\u2019s quarterly report",
])

B("h3", text="RSU Activities During Quarter III of 2026")

B("h4", text="Radiation Bills Issued")
B("table",
  caption="Radiation bills issued, RSU, Quarter III 2026",
  head=["No.", "Institution", "Location"],
  rows=[["1", "BMMC", "New Liberty Gold Mine, Grand Cape Mount County, Liberia."],
        ["2", "Jahmale Medical Solutions",
         "AB Tolbert Road, ELWA Junction, Paynesville City"],
        ["3", "SDA Cooper Hospital", "12th Street, Sinkor"],
        ["4", "Capital Link", "Buchanan, Grand Bassa County"]],
  widths=[8, 34, 58], align=["c", "l", "l"])

B("h4", text="Radiation Licenses Issued")
B("table",
  caption="Radiation licenses issued, RSU, Quarter III 2026",
  head=["Institution", "Type of licenses", "Number of licenses"],
  rows=[["Bea Mountain Mining Corporation (BMMC)", "Importation Licenses", "7"],
        ["AMI Expeditionary Health Care", "Possess and Use Licenses", "1"],
        ["ArcelorMittal", "Possess and Use", "2"],
        ["Total", "", "10"]],
  widths=[46, 34, 20], align=["l", "l", "c"], total_row=True)
B("figure", caption="Radiation licenses issued by institution and type, RSU, "
  "Quarter III 2026", path=f("fig11_rsu_licences.png"), width=6.0)

B("h4", text="National Basic Occupational Radiation Safety and Protection "
              "Training")
B("table",
  caption="National basic occupational radiation safety and protection "
          "training, RSU, Quarter III 2026",
  head=["Institution", "Number of persons trained", "Location", "Date"],
  rows=[["None", "\u2013", DASH, "\u2013"]],
  widths=[34, 24, 24, 18], align=["l", "c", "l", "c"])

B("h4", text="Environmental, Industrial and Medical Radiation Facilities "
              "Inspected")
B("table",
  caption="Environmental, industrial and medical radiation facilities inspected "
          "in Quarter III, 2026",
  head=["Facility name and location", "Facility type", "Date"],
  rows=[[DASH, DASH, DASH]],
  widths=[50, 28, 22], align=["l", "l", "c"],
  note="No entries were recorded against this table in the source unit report.")

B("h4", text="Medical and Industrial Facilities Inventoried")
B("table",
  caption="Medical and industrial facilities inventoried during Quarter III, "
          "2026",
  head=["Facility\u2019s name and location", "Facility type", "Date"],
  rows=[[DASH, DASH, DASH]],
  widths=[50, 28, 22], align=["l", "l", "c"],
  note="No entries were recorded against this table in the source unit report.")

B("h4", text="Staff Trained During Quarter III 2026")
B("table",
  caption="Staff trained during Quarter III 2026, RSU",
  head=["S/N", "Name of staff", "Location", "Category"],
  rows=[["1.", "Varney E. Armah", "Ethiopia", "In-person"],
        ["2.", "Mildred Chuka Piah", "Tanzania", "In-person"],
        ["3.", "Abubakar Jawo", "Tanzania", "In-person"]],
  widths=[10, 40, 25, 25], align=["c", "l", "l", "l"])

B("h4", text="Summary of Major Activities")
B("table",
  caption="Summary of major activities, RSU, Quarter III 2026",
  head=["Category", "2026\n(Quarter III)", "Annual target\n(2026)",
        "Total completed", "Percentage completed (%)"],
  rows=[
      ["Number of Medical facilities inventoried", "0", "50", "7", DASH],
      ["Number of industrial facilities inventoried", "0", DASH, "0", DASH],
      ["Number of Mining Radiation Monitoring and Inventories", "0", DASH, "4",
       DASH],
      ["Number of operators/radiographers trained", "0", "50", "0", "0%"],
      ["Number of trained persons under personnel monitoring", "0", "50", "0",
       "0%"],
      ["Number of Publications", "0", "2", "0", "0%"],
      ["Number of Internal Training(s) Conducted", "0", "N/A", "0", "\u2013"],
      ["Number of Bills issued", "4", "N/A", "5", "\u2013"],
      ["Number of Radiation Importation License(s) issued", "7", "N/A", "7",
       "\u2013"],
      ["Number of Radiation Possess & Use License(s) issued", "3", "N/A", "3",
       "\u2013"],
  ],
  widths=[40, 15, 15, 15, 15], align=["l", "c", "c", "c", "c"], small=True,
  note="Cells shown as \u2014 were left blank in the source unit report.")
B("figure", caption="Quarter III output against annual targets, RSU, 2026",
  path=f("fig12_rsu_targets.png"), width=6.3)
B("figure", caption="Regulatory output of the Radiation Safety Unit, "
  "Quarter III 2026", path=f("fig13_rsu_instruments.png"), width=6.3)

B("h2", text="Waste and Remediation Unit (WRU)")
B("h3", text="Report Particulars")
B("table",
  caption="Waste and Remediation Unit report particulars",
  head=["Description", "Detail"],
  rows=[["Reporting unit", "Waste and Remediation Unit (WRU)"],
        ["Date", "September 29, 2026"],
        ["Reporting period", "July \u2013 September 2026"],
        ["Head of Unit", "Margaret M. Beyslow"],
        ["Contact number", "0886957001  /  0770958385"],
        ["Email", "mbeyslow@epa.gov.lr"]],
  widths=[26, 74], align=["l", "l"])

B("h3", text="Summary of the Unit\u2019s Mandates")
B("para", text="The Waste and Remediation Unit (WRU) is a Unit of the "
  "Department of Environmental Research and Radiation Safety, charged with "
  "the responsibility of developing environmental regulation, guidelines, "
  "Safety and standards which help turn the goal of environmental "
  "protection into quantified and enforceable laws. The unit conducts "
  "scientific analyses to validate adherence or conform to regulation, "
  "guidelines and standards as defined by the regulative instruments. WRU "
  "also oversees environmental regulations related to waste, pollution and "
  "pollution sources to assess and control the impact of pollutants on the "
  "environment.")
B("para", text="The WR Unit is headed by an Assistant Director.")

B("h3", text="Department Strategic Goals")
B("para", text="The WR Unit work to support the Department of "
  "Environmental Research and Radiation Safety in achieving the cardinal "
  "two strategy goals amongst others developed from the eight (8) strategy "
  "goals of the EPA.")
B("bullets", items=[
    "Goal 1. Developing and enforcing Environmental Laws, Regulations and "
    "Guidelines",
    "Goal 2. Ensuring effective Environmental Monitoring, audit and "
    "evaluation.",
])

B("h3", text="Outstanding Achievements During the Quarter Under Review")
B("bullets", items=[
    "Ongoing assessment of waste service providers\u2019 facilities.",
    "Contributed to multiple Environmental and Social Impact Assessment "
    "(ESIA) site verification exercises arising from technical review "
    "sittings, ensuring compliance with environmental standards and "
    "regulatory requirements.",
    "Participated in a three (3) days validation and technical session, "
    "Stakeholders Mobilization, Sectoral engagement and GHG Data "
    "Collection.",
    "Participated in the seventh meeting of the Expert Working Group on the "
    "review of annexes II, held in Geneva, Switzerland.",
    "Participated in the International World Ozone\u2019s Day\u2019s "
    "activities held in Buchana.",
    "Conducted a scoping mission on waste management and the Circular "
    "Economy in collaboration with the UNOSD and the Korean Environment "
    "Corporation, including a one day workshop on waste.",
    "Attended Five (5) days training workshop organized by the Liberia "
    "Water and Sewer Corporation (LWSC).",
    "Attended the RAP Verification.",
    "Participated in the 2026 Green Solution Support Program and Jeju "
    "international Environment forum in Korea.",
    "Participated in the seventh edition of KNOW YOUR ENVIRONMENT (KYE) "
    "organized by Planning And Policy.",
    "Regular follow-ups through phone calls to proponents for response "
    "letters.",
    "Participated in ESIA meetings and consultation activities.",
    "Prepared responses and certificate of accreditation for Waste "
    "companies.",
])

B("h3", text="Applications Received During the Quarter")
B("table",
  caption="Waste management applications received, July 2026",
  head=["No.", "Company name", "Undertaking"],
  rows=[["1.", "Dumpa Hero Inc.", "Non-Hazardous (municipal)"],
        ["2.", "Sylvester Toe sanitation Service",
         "Non-Hazardous (Municipal)"],
        ["3.", "Divine Sanitation Services Inc.",
         "Non-Hazardous (Municipal)"]],
  widths=[8, 46, 46], align=["c", "l", "l"])
B("table",
  caption="Waste management applications received, August 2026",
  head=["No.", "Company name", "Undertaking"],
  rows=[["1.", "ARK Group of Companies", "Non-Hazardous (municipal)"],
        ["2.", "Vision Care Cleaners Business Incorporation",
         "Non-Hazardous (Municipal)"],
        ["3.", "Number Group of Companies", "Hazardous (Scraps and Plastic)"],
        ["4.", "Eco-Green Environmental & Waste Solution",
         "Hazardous (Medical)"],
        ["5.", "Z.L Integrated Waste Management Solution",
         "Non-Hazardous (Municipal)"],
        ["6.", "S.S.W Incorporated",
         "Hazardous (Scrap, Used Tires, Used Batteries, Used Cables)"],
        ["7.", "Eco-Clean Liberia Inc",
         "Request for Acquaintance Meeting"]],
  widths=[8, 40, 52], align=["c", "l", "l"])
B("table",
  caption="Waste management applications received, September 2026",
  head=["No.", "Company name", "Undertaking"],
  rows=[["1.", "JEMB Inc.", "Non-Hazardous (municipal)"],
        ["2.", "AM Public Sanitation Service", "Non-Hazardous (municipal)"],
        ["3.", "GIVO Africa", "Hazardous (Plastic)"],
        ["4.", "Libra Sanitation Incorporated", "Hazardous (Sewage)"],
        ["5.", "Environmental Service Enterprise",
         "Non-Hazardous (Municipal)"],
        ["6.", "OCEANS", "Non-Hazardous (Municipal)"],
        ["7.", "T. K Group of Companies", "Non-Hazardous (Municipal)"]],
  widths=[8, 46, 46], align=["c", "l", "l"])

B("h3", text="Applications Responded To")
B("table",
  caption="Waste management applications responded to, Quarter III 2026",
  head=["No.", "Company name", "Location / undertaking"],
  rows=[["1.", "JEMB Inc.", "Non-Hazardous (municipal)"],
        ["2.", "AM Public Sanitation Service", "Non-Hazardous (Municipal)"],
        ["3.", "ARK Group of Companies", "Non-Hazardous (Municipal)"],
        ["4.", "GIVO Africa", "Hazardous (Plastic)"],
        ["5.", "Libra Sanitation Incorporated", "Hazardous (Sewage)"],
        ["6.", "Environmental Service Enterprise",
         "Non-Hazardous (Municipal)"],
        ["7.", "Dumpa Hero Inc.", "Non-Hazardous (Municipal)"],
        ["8.", "Sylvester Toe Sanitation Service",
         "Non-Hazardous (Municipal) N"],
        ["9.", "Vision Care Cleaners Business Incorporation",
         "Non-Hazardous (Municipal)"],
        ["10.", "WORK-LIBERIA Group of Companies",
         "Hazardous (Scrap, Used Tires, Used batteries)"],
        ["11.", "North Star Industrial Inc.", "Hazardous (Scraps)"],
        ["12.", "Number Group of Companies",
         "Non-Hazardous (Scrap and Plastic)"],
        ["13.", "Divine Sanitation Services Inc.",
         "Non-Hazardous (Municipal)"],
        ["14.", "OCEANS", "Non-Hazardous (Municipal)"],
        ["15.", "T. K Group of Companies", "Non-Hazardous (Municipal)"],
        ["", "Total applications responded to", "15"]],
  widths=[8, 40, 52], align=["c", "l", "l"], total_row=True,
  note="Reproduced as recorded in the source unit report, including the "
       "stray character against serial 8 and the classification of Number "
       "Group of Companies, which is listed as hazardous on receipt of the "
       "application and as non-hazardous in the response table.")

B("h3", text="Waste Certificates Issued")
B("table",
  caption="Waste certificates issued, Quarter III 2026",
  head=["No.", "Company", "Location / classification"],
  rows=[["1.", "North Star Industrial Inc.",
         "Hazardous (Scraps) Battery Factory, Somalia Drive"],
        ["2.", "Numbers Group Of Companies",
         "New Town Community Upper Johnson"],
        ["3.", "Universal Impex Inc.", "Hazardous (Scrap)"],
        ["4.", "GIGAS Waste Management",
         "Hazardous (Used tires, used filters, Used Batteries) Morris Farm "
         "Paynesville"],
        ["", "Total certificates issued", "4"]],
  widths=[8, 34, 58], align=["c", "l", "l"], total_row=True)
B("para", text="Kindly note that there are several requests for permit that "
  "have been responded to but the proponents are yet to come to "
  "compliance.")

# =========================================================================
#  6.  CHALLENGES
# =========================================================================
B("h1", text="Challenges")

B("h2", text="Chemical Management Unit (CMU)")
B("bullets", items=[
    "Lack of Personal Protective Equipment (PPE): chemical handlers should "
    "be provided with the necessary personal protective equipment to "
    "guarantee their safety and compliance with occupational health and "
    "safety regulations.",
    "Inadequate workspace furniture: the current workspace available to the "
    "Unit and the ERRS Department at large is adequate but lacks better "
    "furniture. Due to this, the team has not been able to properly "
    "organize its documents and equipment to perform their activities in "
    "the Unit.",
    "Free Port implementation setbacks: the Unit is experiencing setbacks in "
    "the effective implementation of its duties at the Free Port of "
    "Monrovia, due to the proposed training that is yet to be conducted by "
    "the National Port Authority (NPA).",
])

B("h2", text="Environmental Monitoring and Research Unit (EMRU)")
B("para", text="Key challenges faced by the unit during the quarter include, "
  "but are not limited to:")
B("bullets", items=[
    "Monitoring activities are delayed due to poor road conditions, limited "
    "logistics, and reliance on a personal low-clearance vehicle, which "
    "restricts access to sites, slows field operations, and poses safety and "
    "equipment risks.",
    "Proponent engagement remains low, with late and partially compliant "
    "report submissions, weakening report tracking, and reducing the value "
    "of data for timely decision-making.",
    "Key environmental parameters (NO\u2083, Co, NH\u2084, PM2.5, and "
    "consistent pH) are frequently missing, alongside variable compliance "
    "with national standards and EPA benchmarks, highlighting gaps in "
    "technical capacity, supervision, and enforcement.",
    "Assigning police personnel during site verifications is recommended to "
    "strengthen compliance and support smooth field operations.",
])
B("para", text="We request that the administration address some of these "
  "constraints.")
B("h3", text="Lessons Learned")
B("para", text="The delegation of tasks has strengthened accountability and "
  "responsibility within the team, thereby improving overall performance. "
  "This focused approach has enhanced staff morale and reinforced the "
  "mission of the ERRS Department. Consequently, unit personnel have "
  "developed a comprehensive work plan outlining strategic interventions to "
  "advance the EPA\u2019s growth and development.")
B("para", text="Nevertheless, the unit\u2019s challenges underscore the "
  "pressing need for adequate resources and institutional support for "
  "environmental management and analytical functions. Delays in "
  "inspections, shortages of critical laboratory reagents and equipment, "
  "and insufficient logistical support have constrained the unit\u2019s "
  "operational effectiveness. These limitations compromise the timeliness "
  "and accuracy of environmental assessments and impede the unit\u2019s "
  "capacity to address emerging environmental issues.")

B("h2", text="Radiation Safety Unit (RSU)")
B("bullets", items=[
    "Insufficient number of vehicles for the ERRS department to conduct "
    "inventory and inspections at facilities possessing radiation-generating "
    "devices/sources in the counties.",
    "Delay in the publication of the draft Regulation to support and affirm "
    "full regulatory activities.",
    "Inadequacy of training for RSU staff in the operation of the RADKOR "
    "Dosimetry System for personnel dose assessment and reporting.",
    "Insufficient training in the use of RASIMS to report on the "
    "country\u2019s TSAs. Full establishment of regulatory control to "
    "designate responsibilities for reporting internally (nationally).",
    "Insufficiency in the number of competent staff within the Unit.",
])

B("h2", text="Waste and Remediation Unit (WRU)")
B("bullets", items=[
    "Limited logistics: lack of computers, vehicles and fuel for fieldwork.",
    "The Unit does not have a functional printer.",
    "Insufficient staffing to meet workload demands.",
    "Lack of scratch cards to communicate with proponents and amongst "
    "staffs.",
    "Delay in processing documentation from receipt to certification.",
])
B("h3", text="Lessons Learned", unnumbered=True)
B("bullets", items=[
    "The unit is squarely positioned as a powerhouse in the department of "
    "ERRS.",
    "Better reporting and communication of activities significantly enhance "
    "the agency\u2019s ability to meet its mandate. The WR unit plays a "
    "pivotal role in supporting environmental protection and compliance.",
])

# =========================================================================
#  7.  RECOMMENDATIONS
# =========================================================================
B("h1", text="Recommendations")

B("h2", text="Chemical Management Unit (CMU)")
B("para", text="The Unit recommends the following:")
B("bullets", items=[
    "The provision of PPE for chemical handlers to mitigate risks "
    "associated with chemical exposure and enhance the overall safety "
    "standards within the unit's operations.",
    "Improve interdepartmental and unit coordination and collaborations.",
])

B("h2", text="Environmental Monitoring and Research Unit (EMRU)")
B("para", text="To address these challenges and enhance the unit's efficacy, "
  "the following recommendations are proposed:")
B("bullets", items=[
    "Strengthen reporting compliance through clear deadlines, legal "
    "enforcement, and structured follow-up for late submissions.",
    "Mandate complete parameter reporting, with emphasis on NO\u2083 and "
    "consistent pH monitoring across all proponents.",
    "Provide technical guidance and capacity building to improve data "
    "quality and regulatory adherence.",
    "Enhance routine monitoring through spot checks, periodic audits, and "
    "expanded digital reporting systems for timely, complete, and real-time "
    "surveillance.",
    "Escalate corrective actions by enforcing action plans and prioritizing "
    "repeat non-compliant sites in line with EPA frameworks.",
    "Utilize the EPA vehicle to improve field mobility, productivity, and "
    "timely completion of activities.",
    "Provide additional computers and software to accelerate data processing "
    "and reporting, strengthening overall monitoring, analysis, and response "
    "capacity.",
])
B("para", text="The provision of additional computers and software will "
  "improve the timely delivery of results. With adequate resources, "
  "strategic planning, and targeted investment, the unit can overcome "
  "current challenges, strengthen environmental monitoring, analysis, and "
  "response, and more effectively fulfill its mandate to protect "
  "environmental quality.")

B("h2", text="Radiation Safety Unit (RSU)")
B("para", text="Recommendations and opportunities for the next period:")
B("bullets", items=[
    "Acquire the support of Management to publish the draft regulation;",
    "Sign and publish the drafted Radiation Fees Schedule (Schedule 5)",
    "Increase national inventory coverage to about 85% for medical and "
    "industrial practices involving the use of radiation in Liberia.",
    "Follow up with the IAEA on the request for the operation of the OSLD "
    "machine for dose assessment.",
    "Provide basic occupational radiation safety training to all medical "
    "facilities in Liberia and its proximity whose activities and practices "
    "involve the use of ionizing radiation.",
    "Attract more foreign training courses to enhance the skill set and "
    "competence of RSU staff.",
    "Recruit new radiation protection staff or transfer trained radiation "
    "protection staff to the unit.",
])

B("h2", text="Waste and Remediation Unit (WRU)")
B("para", text="The Unit strongly recommends that the below mentioned "
  "challenges and logistical constraints outlined be addressed to enable "
  "technicians respond adequately to emerging environmental incidents of "
  "waste related issues and to enable the Unit conduct more "
  "inspections/assessment on Waste activities and companies.")
B("bullets", items=[
    "Address the logistical constraints of the Unit: computers, "
    "vehicles, fuel for fieldwork, a functional printer and scratch cards "
    "for communication with proponents.",
    "Strengthen staffing so that the Unit can meet its workload demands and "
    "shorten the time taken to process documentation from receipt to "
    "certification.",
    "Provide requisite training opportunities and upgradation for staff of "
    "the unit to enhance their work in scientific research, compliance "
    "monitoring and data logging.",
])

# =========================================================================
#  8.  CONCLUSION
# =========================================================================
B("h1", text="Conclusion")
B("para", text="The third quarter of 2026 marked a period of sustained "
  "regulatory action and operational delivery for the Environmental "
  "Research and Radiation Safety (ERRS) Department. Across its core "
  "mandates of environmental monitoring, chemical management and radiation "
  "safety, the reporting units demonstrated continued commitment to "
  "safeguarding Liberia\u2019s environmental integrity and public health.")
B("para", text="The Chemical Management Unit maintained full operational "
  "responsiveness, issuing thirty-five (35) regulatory instruments against "
  "a one hundred percent (100%) response rate on thirty-eight (38) "
  "applications, and conducting six (6) chemical escort operations covering "
  "eighty-eight (88) trucks of hazardous consignments. Two of its annual "
  "licensing targets, chemical registration and importation and chemical "
  "transportation, have now been met and exceeded for 2026.")
B("para", text="The Environmental Monitoring and Research Unit recorded its "
  "strongest field quarter of the year, conducting ninety-one (91) "
  "environmental investigations and analysing ninety-one (91) environmental "
  "quality media, while managing the sachet water certification pipeline "
  "from thirty-five (35) applications through to eleven (11) certificates "
  "issued. Persistent challenges with delayed proponent reporting and "
  "incomplete parameter coverage nonetheless continued to limit the "
  "evidential value of the surveillance data.")
B("para", text="The Radiation Safety Unit advanced its regulatory framework "
  "by holding the Validation Programme for the Draft Radiation Safety Law, "
  "drafting an inspection manual, operating guidelines and five (05) "
  "inspection checklists, calibrating laboratory equipment and resolving "
  "outstanding RAIS issues with IAEA support, while issuing four (4) bills "
  "and ten (10) licences. Facility inventory and occupational radiation "
  "safety training, however, recorded no output during the quarter and "
  "remain materially behind their annual targets.")
B("para", text="Across the Department, performance continued to be "
  "constrained by cross-cutting systemic challenges: inadequate "
  "logistical resources (vehicles, fuel and computers), insufficient "
  "personal protective equipment, and the need for specialised technical "
  "training in dosimetry, laboratory analysis and regulatory reporting "
  "systems. Strategic investment in these areas remains imperative to "
  "enhance the ERRS Department\u2019s operational resilience, ensure "
  "stricter regulatory compliance, and fully realise its mandate of "
  "protecting Liberia\u2019s environment in the quarter ahead.")
B("para", text="The Waste and Remediation Unit sustained the growth of "
  "its accreditation pipeline, receiving seventeen (17) waste management "
  "applications, responding to fifteen (15) and issuing four (4) waste "
  "certificates, while continuing the assessment of waste service "
  "providers\u2019 facilities and contributing to ESIA site verification "
  "exercises. The Unit also carried the Department\u2019s representation "
  "at a demanding schedule of national and international engagements. Its "
  "throughput nonetheless remains constrained by the absence of vehicles, "
  "computers and a functional printer, by insufficient staffing, and by "
  "delays in moving documentation from receipt to certification, the "
  "principal reason why only four (4) of the fifteen (15) applications "
  "answered during the quarter reached certification.")

# =========================================================================
#  ANNEX
# =========================================================================
B("h1", text="Annex and Pictorials")

B("h3", text="Report on Noise Pollution Investigation Conducted in the Peuto "
              "Dela Torres Compound, Oldest Congo Town, Montserrado County, "
              "Republic of Liberia")

B("h3", text="Background", unnumbered=True)
B("para", text="On 14 September 2026, the Environmental Protection Agency (EPA) "
  "received a formal complaint from residents of Peuto Dela Torres Compound "
  "concerning excessive noise, public disturbances, amplified music, street "
  "activities, and other activities reportedly affecting the residential "
  "environment.")
B("para", text="The complainants requested the EPA to investigate the reported "
  "activities, identify the sources of noise, conduct appropriate noise-level "
  "assessments, verify applicable permits, and take appropriate measures where "
  "violations are established.")
B("para", text="Based on the urgency of the complaint, an EPA technical team "
  "conducted field verification at approximately 7:30 p.m. The area was "
  "observed to be a mixed residential, commercial, and entertainment "
  "environment. Noise was observed to originate from multiple sources, "
  "including amplified music from entertainment centers and businesses, "
  "pedestrians, megaphones, and vehicular movement. A noise meter was used to "
  "obtain field readings at eleven (11) locations.")
B("para", text="Meanwhile, two of the complainants declined to allow the "
  "investigation team access to their premises, stating that it was already "
  "late. Consequently, noise level readings could not be recorded at those "
  "locations.")

B("h3", text="Noise Qualities Data Recorded", unnumbered=True)
B("table",
  caption="Noise levels recorded at the Peuto Dela Torres Compound, "
          "14 September 2026",
  head=["No.", "Measurement location / source", "Field observation",
        "Reading\n(dBA)", "Coordinates", "Time",
        "Permissible\nlimit (night)"],
  rows=[
      ["1.", "Rear of Cllr. Francis Korkpor's fence",
       "Pedestrians and music; no vehicle movement observed", "62.5",
       "6.270661, -10.7400045", "7:28", "55 dBA"],
      ["2.", "Front gate of Cllr. Francis Korkpor's residence",
       "General environmental activities", "62.7", "6.2707293, -10.7399801",
       "7:32", "55 dBA"],
      ["3.", "In front of General Merchandise Store, between three "
              "entertainment centers", "Three entertainment centers playing "
              "music", "79.8", "6.27035797, -10.74017802", "7:38", "55 dBA"],
      ["4.", "In front of entertainment center associated with Miss Doris "
              "Zagbar", "Music from smaller speaker; larger speaker reportedly "
              "used on weekends", "94.8", "6.26995953, -10.74042023", "7:44",
       "55 dBA"],
      ["5.", "Miss Awinner Domah's Business Center, main road",
       "Business/general road activities", "94.8", "6.2699881, -10.7404402",
       "7:48", "55 dBA"],
      ["6.", "Miss Millter's Business Center, One Step Corner",
       "Music being played", "86.8", "6.2695226, -10.7406856", "7:50",
       "55 dBA"],
      ["7.", "Derrick G. Teah's Entertainment Center", "Music being played",
       "87.1", "6.26914987, -10.74090233", "7:57", "55 dBA"],
      ["8.", "Main road toward Mr. Amara Kamara and other residences",
       "Music from surrounding shops", "77.1", "6.2688929, -10.7410699", DASH,
       "55 dBA"],
      ["9.", "In front of Mr. Amara Kamara's residence",
       "Normal community activities; complainant contacted", "62.8",
       "6.2688815, -10.7411116", "8:04", "55 dBA"],
      ["10.", "In front of Madam Felecia France's gate",
       "Measurement taken outside compound; gateman contacted", "64.2",
       "6.2688752, -10.74112235", "8:10", "55 dBA"],
      ["11.", "Along fence of Cllr. Philip A.Z. Banks' residence",
       "Occupants reportedly out of the country", "62.9",
       "6.2699058, -10.7404459", "8:28", "55 dBA"],
  ],
  widths=[6, 23, 22, 9, 18, 7, 15],
  align=["c", "l", "l", "c", "l", "c", "c"], small=True)
B("figure", caption="Recorded noise levels against the permissible night-time "
  "limit, Peuto Dela Torres Compound, 14 September 2026",
  path=f("fig10_emr_noise.png"), width=6.3)

B("h3", text="Conclusion", unnumbered=True)
B("para", text="The field investigation confirmed the presence of multiple "
  "identifiable noise sources within the Peuto Dela Torres Compound, "
  "particularly amplified music associated with commercial and entertainment "
  "activities.")
B("para", text="The recorded readings, ranging from 62.5 to 94.8 dBA, indicate "
  "elevated noise conditions at several monitoring points and provide "
  "sufficient basis for continued regulatory assessment and follow-up "
  "compliance monitoring.")
B("para", text="A final determination of regulatory non-compliance is based on "
  "validated measurements recorded in accordance with the applicable EPA "
  "measurement procedures.")

B("figure", caption="EPA technical team conducting night-time noise level "
  "measurements, Tubman Boulevard, Montserrado County, 15 September 2026",
  path=f("emr_p32_img.jpeg"), width=5.4, photo=True)

# =========================================================================
#  PART THREE  —  RADIATION SAFETY UNIT
# =========================================================================
