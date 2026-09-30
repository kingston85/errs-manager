/* Print Centre — the six official documents (CRL, CIL, EDL, EDL RP, Clearance
 * letter, Bill letter), reproduced from the workbook's Print pages with live
 * data, signatory selection, letterhead toggle, print / Word / copy output. */
(function () {
  "use strict";
  const CMU = window.CMU;

  const EDL_CONDITIONS = [
    "This license refers to the discharge of treated trade effluent from only the proposed development of {COMPANY};",
    "The total volume of the treated trade effluent discharged to {WATER} shall not exceed {VOL}m³/day;",
    "Part V Section 61 of EPML strictly prohibits the pollution of any water body in any form and manner. Any violation against this provision is punishable by fine and/or other legal action consistent with the EPML. This license does not cover the discharge in whatsoever form of untreated effluent from the licensee’s facility to any water course or wetland;",
    "All effluent shall be treated to meet the following sewerage discharge limits:",
    "The Licensee must monitor and ensure discharges from its facility meet the limits as specified in the above table. The figure represents permissible effluent limits and the licensee must comply with the effluent limits in the tables unless otherwise indicated, regardless of the frequency of monitoring or reporting requirement;",
    "A comprehensive effluent analysis report should be presented to the Agency quarterly by the Licensee. The Licensee shall hire an EPA accredited third party Laboratory to collect and test effluent samples to gage adherence to the license for all parameters mentioned herein.",
    "The licensee shall keep all results submitted by third party Laboratory as per the reporting schedule and include same in monitoring reports submitted to the Agency (if applicable) or submit same when requested by inspectors of the Agency;",
    "In the event that a test result by the third party Laboratory records an exceedance of any of the parameters in the Table, the Licensee shall discontinue discharging into the stream and notify the Agency immediately;",
    "This license does not cover the discharge of mineral oil, diesel and any other pollutant into the stream; all hazardous waste shall be handled by an EPA certified hazardous waste handler. The licensee shall keep all records of the name, address and permit number of the waste service contractor hired, the date on which the waste was transported offsite, the type and quantity of waste transported (in m³), and the location of disposal;",
    "All over ground storage tanks areas and drums storage areas which contain oils, chemicals, or other substances which are or could be harmful to the aquatic environment shall be rendered impervious to the material stored therein. Additionally, these areas shall be bunded and designed in order to give protection to sewer, surface water and groundwater on spillage or seepage of the materials;",
    "Storm water shall be separately collected and discharged to the water drain via an oil interceptor. A readily and safely accessible monitoring chamber shall be constructed on the storm water pipeline to allow for inspection and sampling of the storm water being discharged;",
    "The wastewater/effluent treatment equipment and facility at the premises shall be operational and in use at all times when effluent is being discharged. The Agency shall be notified, through writing, about any malfunction of the equipment;",
    "The licensee shall conduct visual inspection of the effluent discharge and storm water discharge points on a weekly basis. Records of all inspections shall be kept in a logbook. If it appears that there is any abnormalities, the Licensee shall notify the Agency through writing, and initial an investigation into the possible cause(s) of the abnormalities;",
    "The Licensee shall immediately notify the Agency, through writing, after occurrence of any accidental discharge, spillage or deposit of any pollutants or potential pollutant which enters or is likely to enter the water or cause pollution;",
    "The Licensee shall notify the Agency, through writing, immediately prior to the commencement of the licensed discharge;",
    "The Licensee shall notify the Agency, through writing, within 72 hours of any environmental emergency onsite and off-site, including all measures taken to remedy the situation;",
    "The Licensee shall notify the Agency, through writing, in an event of decommissioning, abandonment or changes in operation/site;",
    "A readily and safely accessible monitoring chamber, approved by the Agency shall be provided and maintained by the Licensee on the foul sewer pipeline to allow sampling of treated effluent. The chamber shall incorporate an automatic flow measurement equipment, which will continuously indicate, integrate and record the hourly and total daily flow (in m³) of treated effluent;",
    "A copy of these records shall be presented to the Agency quarterly and included in monitoring reports submitted to the Agency (if applicable). They shall also be maintained on site for inspection and submitted when requested by inspectors of the Agency;",
    "The licensee shall nominate a suitable qualified persons who shall be responsible for the supervision, control and monitoring of all discharge arising at the premises as well as giving information on all such discharge to the Agency. The names, telephone numbers and details of these persons shall be submitted to the Agency prior to commencement of discharge/operation;",
    "The licensee must ensure adherence to the license conditions at all time. Any violation of the license conditions will incur a penalty consistent with Section 112 of the Environmental Protection and Management Law of Liberia;",
    "The Agency reserves itself the right to conduct routine documentary and compliance monitoring at all time without any hindrance from the licensee or any of its employees or associates.",
  ];
  const CRL_CONDITIONS = [
    "This license does not apply to the importation of chemicals, it applies only to the registration of the chemicals listed in the application letter;",
    "Issuance of this license does not authorize the licensee to import any of the listed chemicals without obtaining chemical importation licenses from the EPA. A chemical importation license must be obtained from the Agency prior to the importation of any of the listed chemicals;",
    "Any importation without prior approval from the Agency is a violation of this license condition and will incur a penalty consistent with Section 112 of the Environmental Protection and Management Law of Liberia;",
    "This license only applies to the chemicals specified in the application, additional chemicals must be declared and registered with the EPA.",
  ];
  const CIL_CONDITIONS = [
    "The importation must not exceed the quantity stipulated in this license; any exceedance of this quantity without prior approval from the Agency is a violation of this license condition and will incur a penalty;",
    "A written notification should be made with importation documents and details of the consignment at least two weeks before the arrival and transportation of the consignment;",
    "Ensure that the quality of the chemical complies with the information in the attached label and with the literature and specifications published in the MSDS by the manufacturer;",
    "Notify the EPA immediately in case of any significant change to the information in the application;",
    "Undertake adequate safety and security measures while transporting the consignment from the port of entry to the storage site. No person shall handle, offer for transport, or transport chemicals unless he/she is trained or certified by the EPA; a list of certified transporters can be obtained from the Agency;",
    "Notify the Agency within 24 hours in case of emergency or accidental release to the environment;",
    "This license only applies to the chemicals specified in this license. It does not include the importation of narcotics drugs or any chemicals banned under international conventions;",
    "This license is valid for importation through authorized custom entry points into Liberia only;",
    "This license is valid until the end of the year, however, expires immediately after the clearance of the stipulated consignments and quantities from the port of entry.",
    "Any violation of this license condition will incur a penalty consistent with Section 112 of the Environmental Protection and Management Law of Liberia;",
  ];

  function ps(key) { return Store.state.data.printSettings[key] || ""; }
  function signatoryByName(label) { return Store.state.data.lists.signatories.find((s) => s.label === label) || Store.state.data.lists.signatories[0]; }

  function letterheadHtml(show) {
    if (!show) return `<div class="lh-space"></div>`;
    return `<div class="lh">
      <div class="seal">ENVIRONMENTAL<br>PROTECTION<br>AGENCY<br>• LIBERIA •</div>
      <div class="l1">${esc(ps("Letterhead line 1"))}</div>
      <div class="l2">${esc(ps("Letterhead line 2"))}</div>
      <div class="l3">${esc(ps("Letterhead line 3"))}</div>
      <div class="l3">${esc(ps("Letterhead line 4"))}</div>
      <div class="l3">${esc(ps("Letterhead line 5"))}</div>
    </div>`;
  }
  function signBlock(sig) {
    return `<div class="doc-sign">
      <div class="line"></div>
      <b>${esc(sig.name)}</b><br><span class="role">${esc(sig.title)}</span>
    </div>`;
  }
  function fmtIssueDate(d) { // "15th January, 2026"
    if (!d) return "________";
    const dt = new Date(d + "T00:00:00");
    if (isNaN(dt)) return String(d);
    const day = dt.getDate();
    const suf = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
    return `${day}${suf} ${CMU.MONTHS[dt.getMonth()]}, ${dt.getFullYear()}`;
  }

  /* ---------------- record lookups ---------------- */
  function licenceById(id) { return Store.state.data.sheets.licences.rows.find((r) => r[0] === id); }
  function licenceChildren(id) {
    return {
      chems: Store.state.data.sheets.licenceChemicals.rows.filter((r) => r[0] === id),
      eff: Store.state.data.sheets.licenceEffluent.rows.filter((r) => r[0] === id),
      vehicles: Store.state.data.sheets.licenceVehicles.rows.filter((r) => r[0] === id),
    };
  }
  function effluentOf(id) {
    const out = { receivingWater: "", maxVolume: "", dischargePoint: "", limits: [], coords: [], sources: [] };
    licenceChildren(id).eff.forEach((r) => {
      const sec = r[3], line = r[4];
      if (sec === "Setting") { if (line === 1) out.receivingWater = r[6] || ""; if (line === 2) out.maxVolume = r[6] || ""; if (line === 3) out.dischargePoint = r[6] || ""; }
      else if (sec === "Limit") out.limits.push({ parameter: r[5], unit: r[6], limit: r[7], sampleType: r[8], testingSchedule: r[9], stage: r[10] });
      else if (sec === "Coordinate") out.coords.push({ table: r[5], vertex: r[6], easting: r[7], northing: r[8] });
      else if (sec === "Source") out.sources.push({ source: r[5], receivingUnit: r[6], x: r[7], y: r[8] });
    });
    return out;
  }
  function clearanceGroup(no) { return Store.state.data.sheets.clearances.rows.filter((r) => r[1] === no); }
  function billGroup(no) { return Store.state.data.sheets.bills.rows.filter((r) => r[1] === no); }

  /* ---------------- document builders ---------------- */
  function buildLicenceDoc(lic, sig, letterhead, variant) {
    const kids = licenceChildren(lic[0]);
    const eff = effluentOf(lic[0]);
    const company = lic[2] || "";
    const location = lic[6] || "";
    const isCil = variant === "cil";
    const isEdl = variant === "edl" || variant === "edlrp";
    const isRp = variant === "edlrp";
    let body = "";
    let title = "";
    if (variant === "crl") {
      title = "ANNUAL CHEMICAL REGISTRATION LICENSE";
      body = `
        <p class="doc-p">This is to certify that</p>
        <div class="doc-licensee">${esc(company).toUpperCase()}</div>
        ${location ? `<div class="doc-loc">(Located at ${esc(location)})</div>` : ""}
        <p class="doc-p">Is hereby granted this Annual Chemical Registration License, pursuant to Part 5 Section 51-53 of the Environmental Protection and Management Law of Liberia and Section 5.5 &amp; 5.6 of the National Environmental Policy of Liberia, for the registration of Industrial Chemicals, subject to the EPA Act, the Chemical Guideline of Liberia and conditions specified in this license.</p>
        <div class="doc-sec">PRODUCT INFORMATION</div>
        ${chemTable(kids.chems, false)}
        <div class="doc-sec">CONDITIONS</div>
        <ol class="doc-cond">${CRL_CONDITIONS.map((c) => `<li>${esc(c)}</li>`).join("")}</ol>`;
    } else if (isCil) {
      title = "CHEMICAL IMPORTATION LICENSE";
      body = `
        <p class="doc-p">This is to certify that</p>
        <div class="doc-licensee">${esc(company).toUpperCase()}</div>
        ${location ? `<div class="doc-loc">(Located at ${esc(location)})</div>` : ""}
        <p class="doc-p">Is hereby granted this Chemical Importation License, pursuant to Part 5 Section 51-53 of the Environmental Protection and Management Laws of Liberia and Section 5.5 of the National Environmental Policy of Liberia, for the importation of the following chemical within the territorial boundaries of the Republic of Liberia subject to the EPA Act, the Chemical Guideline of Liberia and conditions specified in this license.</p>
        <div class="doc-sec">PRODUCT INFORMATION</div>
        ${chemTable(kids.chems, true)}
        <div class="doc-sec">CONDITIONS</div>
        <ol class="doc-cond">${CIL_CONDITIONS.map((c) => `<li>${esc(c)}</li>`).join("")}</ol>`;
    } else {
      title = isRp ? "EFFLUENT DISCHARGE & RETENTION POND LICENSE" : "ANNUAL EFFLUENT DISCHARGE LICENSE";
      const intro = isRp
        ? `In pursuant to Part 5 Section 56-60 of the Environmental Protection and Management Law of Liberia (EPML), this Effluent Discharge &amp; Retention Pond License is hereby issued to ${esc(company)} (hereafter called the licensee) for the discharge of treated effluents subject to the Act of the Environmental Protection Agency of Liberia, the Liberia Water Quality Standards and all other conditions specified in this license.`
        : `In pursuant to Part 5 Section 56-60 of the Environmental Protection and Management Law of Liberia, this annual Effluent Discharge License is hereby issued for the discharge of treated effluent subject to the Act of the Environmental Protection Agency of Liberia, the Environmental Protection and Management Law of Liberia, the Liberia Water Quality Standards and the conditions specified in this license.`;
      let geo = "";
      if (isRp) {
        const t1a = eff.coords.filter((c) => String(c.table) === "1A");
        const t1b = eff.coords.filter((c) => String(c.table) === "1B");
        geo = `
          <div class="doc-sec">1. &nbsp;PROJECT GEO-REFERENCE</div>
          <p class="doc-p">The project for which this permit is issued bears the following geographical coordinates:</p>
          <p><b>Table 1A: Metes and bounds of the discharge sources</b></p>
          <table class="doc-table"><tr><th>Vertex</th><th>Easting</th><th>Northing</th></tr>
            ${t1a.map((c) => `<tr><td>${esc(c.vertex || "")}</td><td>${esc(c.easting ?? "")}</td><td>${esc(c.northing ?? "")}</td></tr>`).join("") || `<tr><td colspan="3">(no coordinates entered — add them on the Licence Form, GEO-REFERENCE section)</td></tr>`}
          </table>
          <p><b>Table 1B: Metes and bounds of the discharge sources</b></p>
          <table class="doc-table"><tr><th>Discharge source</th><th>X</th><th>Y</th></tr>
            ${eff.sources.map((s) => `<tr><td>${esc(s.source || "")}</td><td>${esc(s.x ?? "")}</td><td>${esc(s.y ?? "")}</td></tr>`).join("") || `<tr><td colspan="3">(none entered)</td></tr>`}
          </table>
          ${t1b.length ? `<table class="doc-table"><tr><th>Vertex</th><th>Easting</th><th>Northing</th></tr>${t1b.map((c) => `<tr><td>${esc(c.vertex || "")}</td><td>${esc(c.easting ?? "")}</td><td>${esc(c.northing ?? "")}</td></tr>`).join("")}</table>` : ""}
          <div class="doc-sec">2. &nbsp;DISCHARGE SOURCES</div>
          <table class="doc-table"><tr><th>Discharge source</th><th>Receiving unit</th></tr>
            ${eff.sources.map((s) => `<tr><td>${esc(s.source || "")}</td><td>${esc(s.receivingUnit || "")}</td></tr>`).join("") || `<tr><td colspan="2">(none entered)</td></tr>`}
          </table>
          <div class="doc-sec">3. &nbsp;CONDITIONS</div>
          <p class="doc-p"><b>3.1</b> This license refers to the discharge of treated trade effluent from only the proposed development of ${esc(company)};</p>
          <p class="doc-p"><b>3.2</b> The total volume of the treated trade effluent discharged to ${esc(eff.receivingWater || "________")} shall not exceed ${esc(eff.maxVolume || "____")}m³/day, discharged at ${esc(eff.dischargePoint || "________")};</p>
          <p class="doc-p"><b>3.3</b> All effluent shall be treated to meet the following sewerage discharge limits:</p>
          ${limitsTable(eff.limits, isRp)}
          <p class="doc-p"><b>3.4</b> The Licensee must monitor and ensure discharges from its facility meet the limits specified in the above table, and comply with all other conditions of this license consistent with the Environmental Protection and Management Law (EPML) of Liberia. Any violation of the license conditions will incur a penalty consistent with Section 112 of the EPML.</p>`;
      } else {
        geo = `
          <div class="doc-sec">CONDITIONS</div>
          <ol class="doc-cond">${EDL_CONDITIONS.map((c, i) => {
            let t = c.replace("{COMPANY}", company).replace("{WATER}", eff.receivingWater || "________").replace("{VOL}", eff.maxVolume || "____");
            if (i === 3) return `<li>${esc(t)}</li>` + limitsTable(eff.limits, false);
            return `<li>${esc(t)}</li>`;
          }).join("")}</ol>`;
      }
      body = `
        <div class="doc-sec">LICENSEE</div>
        <div class="doc-licensee">${esc(company).toUpperCase()}</div>
        ${location ? `<div class="doc-loc">LOCATION: ${esc(location)}</div>` : `<div class="doc-loc">LOCATION</div>`}
        <p class="doc-p">${intro}</p>
        ${geo}`;
    }
    return `
      ${letterheadHtml(letterhead)}
      <div class="doc-licno">License No. ${esc(lic[10] || "________")}</div>
      <div class="doc-title">${title}</div>
      <div class="doc-subtitle">(Issued under Part II Section VI of the EPA Act)</div>
      ${body}
      <div class="doc-dates"><span>Issued Date: <b>${fmtIssueDate(lic[11])}</b></span><span>Expired Date: <b>${fmtIssueDate(lic[12])}</b></span></div>
      ${signBlock(sig)}
      <div class="doc-motto">“Ensuring environmental protection &amp; conserving biodiversity.”</div>`;
  }
  function chemTable(chems, cil) {
    if (!chems.length) return `<div class="doc-note">No chemicals are recorded for this licence — add them on the Licence Form (CHEMICALS ON THIS LICENCE) so they print here.</div>`;
    const head = cil
      ? `<tr><th>No.</th><th>Trade or IUPAC Name</th><th>EPA / Registration #.</th><th>Stipulated Qty (kg/L)</th><th>Consignment Reference (BL/IPD No.)</th></tr>`
      : `<tr><th>No.</th><th>Trade or IUPAC Name</th><th>EPA Registration #.</th><th>Types</th></tr>`;
    const rows = chems.map((c, i) => cil
      ? `<tr><td>${i + 1}</td><td>${esc(c[3] || "")}</td><td>${esc(c[4] || "")}</td><td>${esc(c[6] != null ? CMU.fmtNum(c[6]) + (c[7] ? " " + c[7] : "") : "")}</td><td>${esc(c[8] || "")}</td></tr>`
      : `<tr><td>${i + 1}</td><td>${esc(c[3] || "")}</td><td>${esc(c[4] || "")}</td><td>${esc(c[5] || "")}</td></tr>`);
    return `<table class="doc-table">${head}${rows.join("")}</table>`;
  }
  function limitsTable(limits, withStage) {
    if (!limits.length) return `<div class="doc-note">No discharge limits recorded — add them on the Licence Form (DISCHARGE LIMITS).</div>`;
    const head = withStage
      ? `<tr><th>Parameter</th><th>Unit</th><th>Limit</th><th>Sample Type</th><th>Testing Schedule</th><th>Discharge Stage</th></tr>`
      : `<tr><th>Parameter</th><th>Unit</th><th>Limit</th><th>Testing Schedule</th></tr>`;
    const rows = limits.map((l) => withStage
      ? `<tr><td>${esc(l.parameter || "")}</td><td>${esc(l.unit || "")}</td><td>${esc(l.limit ?? "")}</td><td>${esc(l.sampleType || "")}</td><td>${esc(l.testingSchedule || "")}</td><td>${esc(l.stage || "")}</td></tr>`
      : `<tr><td>${esc(l.parameter || "")}</td><td>${esc(l.unit || "")}</td><td>${esc(l.limit ?? "")}</td><td>${esc(l.testingSchedule || "")}</td></tr>`);
    return `<table class="doc-table">${head}${rows.join("")}</table>`;
  }

  function buildClearanceDoc(group, sig, letterhead) {
    const first = group[0];
    const company = first[3] || "";
    const rows = group.map((r) => `<tr><td>${esc(r[4] || r[5] || "").toUpperCase()}</td><td>${r[6] != null ? esc(CMU.fmtNum(r[6])) + (r[7] ? " " + esc(String(r[7]).toUpperCase()) : " KGS") : ""}</td><td>${esc(r[10] || "")}</td><td>${esc(r[15] || "N/A")}</td></tr>`).join("");
    const totalKg = group.reduce((s, r) => { const k = CMU.qtyKg(r[6], r[7]); return s + (k || 0); }, 0);
    return `
      ${letterheadHtml(letterhead)}
      <div class="doc-licno">${esc(first[11] || "")}</div>
      <div style="text-align:right">${esc(CMU.fmtLongDate(first[12]))}</div>
      <div class="doc-title" style="margin-top:26px">TO WHOM IT MAY CONCERN</div>
      <p class="doc-p">This is to testify that <b>${esc(company)}</b> is in the process of obtaining the Environmental Protection Agency (EPA) Importation License issued for the clearance of the following consignments:</p>
      <table class="doc-table"><tr><th style="width:45%">Description</th><th>Weight (Kgs)</th><th>BL/ Invoice No.</th><th>ETA</th></tr>${rows}
      <tr><td style="text-align:right"><b>TOTAL</b></td><td colspan="3"><b>${CMU.fmtNum(Math.round(totalKg))} KGS (${(totalKg / 1000).toFixed(3)} MT)</b></td></tr></table>
      <p class="doc-p">We, therefore, request that you grant them clearance for the chemicals mentioned above while the license is being processed.</p>
      <p class="doc-p">Please accept the assurances of my highest esteem and consideration as we strive for environmental sustainability for now and successive generations.</p>
      <p class="doc-p"><b>Kind regards,</b></p>
      ${signBlock(sig)}
      <div class="doc-motto">“Ensuring environmental protection &amp; conserving biodiversity.”</div>`;
  }

  function buildBillDoc(group, sig, letterhead, opts) {
    const d = Store.state.data;
    const first = group[0];
    const bt = d.fees.billTypes.find((b) => b.type === first[18]) || d.fees.billTypes[0];
    const services = [...new Set(group.map((r) => r[7]).filter(Boolean))];
    const details = group[0][8] || "";
    const total = group.reduce((s, r) => s + (+r[9] || 0), 0);
    const ru = CMU.billRollups(d);
    const paid = ru.byBillPaid[first[1]] || 0;
    const opening = (bt.opening || "").replace("{SERVICES}", services.join(", ")).replace("{DETAILS}", details);
    const salutation = opts.salutation ? `Dear ${esc(opts.salutation)}:` : "Dear Sir/Madam:";
    const office = d.lists.offices.find((o) => o.signatory === sig.label);
    return `
      ${letterheadHtml(letterhead)}
      ${office ? `<div class="doc-p" style="text-align:center;font-size:12px;margin:2px 0 10px">${esc(office.officeLine)}${office.contactLine ? " · " + esc(office.contactLine) : ""}</div>` : ""}
      <div style="text-align:right">${esc(CMU.fmtLongDate(first[10]))}</div>
      ${first[15] ? `<div style="text-align:right;font-size:12.5px">Ref: ${esc(first[15])}</div>` : ""}
      <p class="doc-p" style="margin-top:22px">${esc(companyBlock(first))}</p>
      <p class="doc-p">${salutation}</p>
      <p class="doc-p">${esc(opening)}</p>
      ${bt.extra ? `<p class="doc-p">${esc(bt.extra).replace(/\n/g, "<br>")}</p>` : ""}
      <p class="doc-p">${esc(bt.billSentence || "The total bill is")} <b>${esc(CMU.amountWords(total))}</b> payable at the ${esc(ps("Bank name"))}; Account Number: ${esc(ps("Account number"))}; Account Title: ${esc(ps("Account title"))}.</p>
      ${bt.showFeeTable ? `<table class="doc-table"><tr><th>No.</th><th>Service</th><th>Details / Chemical(s)</th><th>Amount (USD)</th></tr>
        ${group.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r[7] || "")}</td><td>${esc(r[8] || "")}</td><td style="text-align:right">${CMU.fmtMoney(r[9])}</td></tr>`).join("")}
        <tr><td colspan="3" style="text-align:right"><b>TOTAL</b></td><td style="text-align:right"><b>${CMU.fmtMoney(total)}</b></td></tr>
        ${paid > 0 ? `<tr><td colspan="3" style="text-align:right"><b>Paid on this bill</b></td><td style="text-align:right"><b>${CMU.fmtMoney(paid)}</b></td></tr>` : ""}
      </table>` : ""}
      ${opts.seventyTwo ? `<p class="doc-p"><b>Kindly note that payment must be made within ${esc(ps("Payment deadline (words)"))} of the date of this letter.</b></p>` : ""}
      <p class="doc-p">${esc(bt.collection || "")}</p>
      <p class="doc-p">Please accept the assurances of my highest esteem and consideration as we strive for environmental sustainability for now and for successive generations.</p>
      <p class="doc-p"><b>Kind regards,</b></p>
      ${signBlock(sig)}
      <div class="doc-cc">CC: Finance Department</div>
      <div class="doc-motto">“Ensuring environmental protection &amp; conserving biodiversity.”</div>`;
  }
  function companyBlock(billRow) {
    let t = (billRow[3] || "").toUpperCase();
    if (billRow[6]) t += "<br>" + esc(billRow[6]);
    if (billRow[16]) t += "<br>Attn: " + esc(billRow[16]) + (billRow[17] ? " — " + esc(billRow[17]) : "");
    return t;
  }

  /* ---------------- screen ---------------- */
  const PAGES = {
    crl: { title: "Print CRL — Chemical Registration License", pick: "licence", variant: "crl", letterhead: true },
    cil: { title: "Print CIL — Chemical Importation License", pick: "licence", variant: "cil", letterhead: true },
    edl: { title: "Print EDL — Effluent Discharge License", pick: "licence", variant: "edl", letterhead: true },
    edlrp: { title: "Print EDL RP — Effluent Discharge & Retention Pond License", pick: "licence", variant: "edlrp", letterhead: true },
    clearance: { title: "Print Clearance — chemical clearance letter", pick: "clearance", letterhead: false },
    bill: { title: "Print Bill — bill / invoice letter", pick: "bill", letterhead: true },
  };

  function render(mount, pageKey, params) {
    const page = PAGES[pageKey] || PAGES.crl;
    const d = Store.state.data;
    let sel = params && params.id ? String(params.id) : "";
    let sigLabel = "Executive Director";
    let letterhead = page.letterhead;
    let salutation = "";
    let seventyTwo = false;

    mount.innerHTML = `
      <div class="screen">
        <div class="page-head">
          <div><h1>🖨 ${esc(page.title)}</h1>
          <div class="sub">Pick the record, choose who signs, set the letterhead, then Print, Save as Word, or Copy text. Set “Print letterhead” to No when printing on pre-printed EPA letterhead paper — the space at the top is kept.</div></div>
        </div>
        <div class="printwrap">
          <div id="docMount"></div>
          <div class="card"><div class="card-b" id="controls"></div></div>
        </div>
      </div>`;
    const $ = (s) => mount.querySelector(s);
    const docMount = $("#docMount");
    const controls = $("#controls");

    function options() {
      if (page.pick === "licence") {
        return d.sheets.licences.rows.map((r) => ({ v: r[0], label: `${r[0]} — ${r[2] || ""} ${r[10] ? "· " + r[10] : ""} · ${r[4] || ""}` }));
      }
      if (page.pick === "clearance") {
        const seen = new Set(); const out = [];
        d.sheets.clearances.rows.forEach((r) => { if (!seen.has(r[1])) { seen.add(r[1]); out.push({ v: r[1], label: `${r[1]} — ${r[3] || ""} (${CMU.fmtDate(r[12])})` }); } });
        return out.reverse();
      }
      const seen = new Set(); const out = [];
      d.sheets.bills.rows.forEach((r) => { if (!seen.has(r[1])) { seen.add(r[1]); out.push({ v: r[1], label: `${r[1]} — ${r[3] || ""} — ${CMU.fmtMoney(r[9])}` }); } });
      return out.reverse();
    }

    function currentRecord() {
      if (page.pick === "licence") return licenceById(sel);
      if (page.pick === "clearance") { const g = clearanceGroup(sel); return g.length ? g : null; }
      const g = billGroup(sel); return g.length ? g : null;
    }

    function warnings() {
      const rec = currentRecord();
      if (!rec) return ["Choose a record to print."];
      const out = [];
      if (page.pick === "licence") {
        const cat = (rec[4] || "").toLowerCase();
        const t = (rec[5] || "").toLowerCase();
        const isEdlPage = page.variant === "edl" || page.variant === "edlrp";
        const isEdlRec = cat.includes("effluent") || cat.includes("dewatering") || t.includes("effluent") || t.includes("dewatering");
        if (isEdlPage && !isEdlRec) out.push(`⚠ This record is ${rec[4] || "not an EDL"} — the EDL layout may not fit it.`);
        if (!isEdlPage && isEdlRec) out.push(`⚠ This record is an ${rec[4]} — use Print EDL / Print EDL RP for effluent licences.`);
        if (page.variant === "cil" && !rec[10]) out.push("⚠ No licence number yet — the license will print with a blank number (Pending).");
        if (page.variant === "edlrp" && !t.includes("retention")) out.push("ℹ Switch to Print EDL for standard (non retention-pond) effluent licences.");
      }
      if (page.pick === "bill" && !rec[0][15]) out.push("⚠ No Bill Ref. No. — add it on the Bill Form");
      return out;
    }

    function docHtml() {
      const sig = signatoryByName(sigLabel);
      const rec = currentRecord();
      if (!rec) return `<div class="doc-note">Choose a record from the panel on the right to see the document here.</div>`;
      if (page.pick === "licence") return buildLicenceDoc(rec, sig, letterhead, page.variant);
      if (page.pick === "clearance") return buildClearanceDoc(rec, sig, letterhead);
      return buildBillDoc(rec, sig, letterhead, { salutation, seventyTwo });
    }

    function redraw() {
      docMount.innerHTML = `<div class="doc-page" id="docPage">${docHtml()}</div>`;
      controls.innerHTML = `
        <div class="frow" style="grid-template-columns:110px 1fr"><label>Record</label>
          <select class="fin" id="c_rec"><option value="">(choose…)</option>${options().map((o) => `<option value="${esc(o.v)}" ${o.v === sel ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select></div>
        <div class="frow" style="grid-template-columns:110px 1fr"><label>Signed by</label>
          <select class="fin" id="c_sig">${d.lists.signatories.map((s) => `<option ${s.label === sigLabel ? "selected" : ""}>${esc(s.label)}</option>`).join("")}</select></div>
        <div class="frow" style="grid-template-columns:110px 1fr"><label>Print letterhead</label>
          <select class="fin" id="c_lh"><option value="yes" ${letterhead ? "selected" : ""}>Yes — print the EPA letterhead</option><option value="no" ${!letterhead ? "selected" : ""}>No — pre-printed paper</option></select></div>
        ${page.pick === "bill" ? `
        <div class="frow" style="grid-template-columns:110px 1fr"><label>Salutation</label><input class="fin" id="c_sal" placeholder="e.g. Mr. Isaac Bestman (blank = Sir/Madam)" value="${esc(salutation)}"></div>
        <div class="frow" style="grid-template-columns:110px 1fr"><label>72-hour line</label><select class="fin" id="c_72"><option value="no" ${!seventyTwo ? "selected" : ""}>No</option><option value="yes" ${seventyTwo ? "selected" : ""}>Yes — add the payment deadline sentence</option></select></div>` : ""}
        <div style="margin:10px 0 6px;font-weight:600">OUTPUT</div>
        <div style="display:grid;gap:8px">
          <button class="btn primary act-print">🖨 Print</button>
          <button class="btn act-word">📄 Save as Word</button>
          <button class="btn act-copy">📋 Copy text</button>
        </div>
        <div style="margin-top:12px" id="warnbox"></div>`;
      const w = warnings();
      controls.querySelector("#warnbox").innerHTML = w.length ? `<div class="warnbox">${w.map((x) => esc(x)).join("<br>")}</div>` : `<div class="formstatus ok" style="margin:0">✔ Ready to print</div>`;
      controls.querySelector("#c_rec").onchange = (e) => { sel = e.target.value; redraw(); };
      controls.querySelector("#c_sig").onchange = (e) => { sigLabel = e.target.value; redraw(); };
      controls.querySelector("#c_lh").onchange = (e) => { letterhead = e.target.value === "yes"; redraw(); };
      const sal = controls.querySelector("#c_sal"); if (sal) sal.oninput = (e) => { salutation = e.target.value; docMount.innerHTML = `<div class="doc-page">${docHtml()}</div>`; };
      const h72 = controls.querySelector("#c_72"); if (h72) h72.onchange = (e) => { seventyTwo = e.target.value === "yes"; redraw(); };
      controls.querySelector(".act-print").onclick = () => {
        if (!currentRecord()) return toast("Choose a record first", "bad");
        printHtml(docMount.innerHTML);
      };
      controls.querySelector(".act-word").onclick = () => {
        if (!currentRecord()) return toast("Choose a record first", "bad");
        const html = `<html><head><meta charset="utf-8"><title>${esc(page.title)}</title><style>body{font-family:"Times New Roman",serif;font-size:14px;line-height:1.5;max-width:760px;margin:24px auto}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 6px;font-size:12.5px}</style></head><body>${docMount.innerHTML}</body></html>`;
        const blob = new Blob(["\ufeff", html], { type: "application/msword" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = (sel || "document").replace(/[^\w-]/g, "_") + ".doc";
        a.click();
        toast("Word document downloaded", "good");
      };
      controls.querySelector(".act-copy").onclick = () => {
        const txt = docMount.innerText;
        navigator.clipboard && navigator.clipboard.writeText(txt).then(() => toast("Document text copied", "good"));
      };
    }
    redraw();
    if (!sel) {
      // auto-select a sensible default record (the newest), like the workbook
      const opts = options();
      if (opts.length) { sel = opts[opts.length - 1].v; redraw(); }
    }
  }

  async function printHtml(inner) {
    let css = "";
    try { css = await (await fetch("/css/app.css")).text(); } catch (e) {}
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 12mm; }
      body { margin: 0; background: #fff; }
      ${css}
      .doc-page { border: none; box-shadow: none; padding: 0; max-width: none; }
      .doc-note { display: none; }
    </style></head><body><div class="doc-page" style="max-width:186mm;margin:0 auto">${inner}</div></body></html>`);
    doc.close();
    setTimeout(() => { frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(() => frame.remove(), 4000); }, 250);
  }

  window.PrintCenter = { render, printHtml };
})();
