/* CMU shared library — sheet definitions, computed columns, formatting, helpers.
 * Runs in the browser (window.CMU) and under Node (module.exports) so the
 * server and the client always agree on how derived values are calculated. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CMU = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------------------------------------------ date utils */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(v) {
    if (v == null || v === "") return "";
    const d = new Date(v + (String(v).length === 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return String(v);
    return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  }
  function fmtLongDate(v) {
    if (v == null || v === "") return "";
    const d = new Date(v + (String(v).length === 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return String(v);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

  /* ------------------------------------------------------------------ number utils */
  function fmtNum(v, dec) {
    if (v == null || v === "" || isNaN(+v)) return "";
    const n = +v;
    if (dec != null) return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n).toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 3 });
  }
  function fmtMoney(v) {
    if (v == null || v === "" || isNaN(+v)) return "";
    return "$" + (+v).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function chunkWords(n) {
    let s = "";
    if (n >= 100) { s += ONES[Math.floor(n / 100)] + " hundred"; n %= 100; if (n) s += " "; }
    if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += "-" + ONES[n % 10]; }
    else if (n > 0) s += ONES[n];
    return s;
  }
  function intWords(num) {
    let n = Math.floor(Math.abs(num));
    if (n === 0) return "zero";
    const groups = [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"]];
    let parts = [];
    for (const [div, name] of groups) {
      if (n >= div) { parts.push(chunkWords(Math.floor(n / div)), name); n %= div; }
    }
    if (n > 0) parts.push(chunkWords(n));
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }
  function amountWords(v) {
    if (v == null || v === "" || isNaN(+v)) return "";
    const n = +v;
    const dollars = Math.floor(n);
    const cents = Math.round((n - dollars) * 100);
    const centsTxt = cents ? ` and ${intWords(cents)} cents` : "";
    return `UNITED STATES DOLLARS-${intWords(dollars).toUpperCase()}${centsTxt.toUpperCase()} (US$${n.toFixed(2)})`;
  }

  /* ------------------------------------------------------------------ sheet definitions
   * Column indexes refer to positions inside each sheet's row arrays.
   * calc: computed at render/export time — never stored. */
  const S = {
    companies: {
      name: "Companies", group: "register", icon: "🏢", idCol: 0, idPrefix: "CMU-",
      columns: [
        { label: "Company ID", type: "id", w: 105, link: { screen: "company" } },
        { label: "Company Name", type: "text", w: 270, required: true },
        { label: "Sector / Activity", type: "text", w: 175, opts: "sectors" },
        { label: "Location", type: "text", w: 200 },
        { label: "Other Names Recorded", type: "text", w: 260 },
        { label: "Licences (No.)", type: "num", w: 95, calc: "companyLicences" },
        { label: "Clearances (No.)", type: "num", w: 105, calc: "companyClearances" },
        { label: "Total Cleared (kg)", type: "num", w: 130, calc: "companyKg" },
        { label: "Total Billed (USD)", type: "money", w: 125, calc: "companyBilled" },
        { label: "Total Paid (USD)", type: "money", w: 120, calc: "companyPaid" },
      ],
    },
    licences: {
      name: "Licences & Certificates", group: "register", icon: "📜", idCol: 0, idPrefix: "LIC-",
      columns: [
        { label: "Record ID", type: "id", w: 90, link: { screen: "licence" } },
        { label: "Company ID", type: "link", w: 100, opts: "companies", link: { screen: "company", match: "id" } },
        { label: "Company Name", type: "text", w: 250, calcJoin: { sheet: "companies", keyCol: 1, match: 0, from: 1, fallbackCol: 1 } },
        { label: "Name as Recorded", type: "text", w: 200 },
        { label: "Licence Category", type: "text", w: 185, opts: "licenceCategory" },
        { label: "Licence / Certificate Type", type: "text", w: 220, opts: "licenceType" },
        { label: "Location", type: "text", w: 180 },
        { label: "Application Date", type: "date", w: 115 },
        { label: "Response Date", type: "date", w: 115 },
        { label: "Reference Code", type: "text", w: 150 },
        { label: "Licence / Certificate No.", type: "text", w: 180 },
        { label: "Date Issued", type: "date", w: 110 },
        { label: "Expiry Date", type: "date", w: 110 },
        { label: "Status", type: "status", w: 195, calc: "licenceStatus" },
        { label: "Remarks", type: "text", w: 260 },
        { label: "Source", type: "text", w: 220 },
        { label: "Bill No.", type: "link", w: 110, opts: "billNos", link: { screen: "bill", match: "billNo" } },
      ],
    },
    licenceChemicals: {
      name: "Licence Chemicals", group: "register", icon: "⚗️", idCol: null, child: "licences",
      columns: [
        { label: "Licence Record ID", type: "link", w: 120, opts: "licenceIds", link: { screen: "licence", match: "id" } },
        { label: "Licence No.", type: "text", w: 170, calcJoin: { sheet: "licences", match: 0, from: 10 } },
        { label: "Company", type: "text", w: 240, calcJoin: { sheet: "licences", match: 0, from: 2 } },
        { label: "Trade or IUPAC Name", type: "text", w: 260 },
        { label: "EPA Registration No.", type: "text", w: 160 },
        { label: "Type", type: "text", w: 140 },
        { label: "Stipulated Qty", type: "num", w: 110 },
        { label: "Unit", type: "text", w: 70, opts: "units" },
        { label: "Consignment Ref. (BL/IPD No.)", type: "text", w: 200 },
      ],
    },
    licenceVehicles: {
      name: "Licence Vehicles", group: "register", icon: "🚛", idCol: null, child: "licences",
      columns: [
        { label: "Licence Record ID", type: "link", w: 120, opts: "licenceIds", link: { screen: "licence", match: "id" } },
        { label: "Licence No.", type: "text", w: 170, calcJoin: { sheet: "licences", match: 0, from: 10 } },
        { label: "Company", type: "text", w: 240, calcJoin: { sheet: "licences", match: 0, from: 2 } },
        { label: "Vehicle Type", type: "text", w: 150, opts: "vehicleTypes" },
        { label: "Vehicle Registration No.", type: "text", w: 170 },
        { label: "EPA Registration No.", type: "text", w: 170 },
      ],
    },
    licenceEffluent: {
      name: "Licence Effluent", group: "register", icon: "💧", idCol: null, child: "licences",
      columns: [
        { label: "Licence Record ID", type: "link", w: 120, opts: "licenceIds", link: { screen: "licence", match: "id" } },
        { label: "Licence No.", type: "text", w: 160, calcJoin: { sheet: "licences", match: 0, from: 10 } },
        { label: "Company", type: "text", w: 220, calcJoin: { sheet: "licences", match: 0, from: 2 } },
        { label: "Section", type: "text", w: 100, opts: ["Setting", "Limit", "Coordinate", "Source"] },
        { label: "Line", type: "num", w: 60 },
        { label: "Field 1", type: "text", w: 160 },
        { label: "Field 2", type: "text", w: 130 },
        { label: "Field 3", type: "text", w: 130 },
        { label: "Field 4", type: "text", w: 130 },
        { label: "Field 5", type: "text", w: 120 },
        { label: "Field 6", type: "text", w: 120 },
        { label: "Key", type: "text", w: 150 },
      ],
    },
    clearances: {
      name: "Chemical Clearances", group: "register", icon: "📦", idCol: 0, idPrefix: "CLR-", groupById: 1, groupPrefix: "CLN-",
      columns: [
        { label: "Record ID", type: "id", w: 92 },
        { label: "Clearance No.", type: "link", w: 110, opts: "clearanceNos", link: { screen: "clearance", match: "clearanceNo" } },
        { label: "Company ID", type: "link", w: 100, opts: "companies", link: { screen: "company", match: "id" } },
        { label: "Company Name", type: "text", w: 240, calcJoin: { sheet: "companies", keyCol: 2, match: 0, from: 1, fallbackCol: 3 } },
        { label: "Chemical as Recorded", type: "text", w: 240 },
        { label: "Chemical (Standard)", type: "text", w: 220, opts: "chemicals" },
        { label: "Qty as Recorded", type: "num", w: 110 },
        { label: "Unit", type: "text", w: 80, opts: "units" },
        { label: "Qty (kg)", type: "num", w: 105, calc: "qtyKg" },
        { label: "Qty (MT)", type: "num", w: 95, calc: "qtyMt" },
        { label: "B/L / Invoice / AWB No.", type: "text", w: 190 },
        { label: "Clearance Ref. No.", type: "text", w: 165 },
        { label: "Clearance Date", type: "date", w: 115 },
        { label: "Remarks", type: "text", w: 240 },
        { label: "Source", type: "text", w: 210 },
        { label: "ETA", type: "text", w: 90 },
        { label: "Bill No.", type: "link", w: 110, opts: "billNos", link: { screen: "bill", match: "billNo" } },
      ],
    },
    bills: {
      name: "Bills & Invoices", group: "register", icon: "🧾", idCol: 0, idPrefix: "BIL-", groupById: 1, groupPrefix: "BN-",
      columns: [
        { label: "Bill ID", type: "id", w: 88 },
        { label: "Bill No.", type: "link", w: 112, opts: "billNos", link: { screen: "bill", match: "billNo" } },
        { label: "Company ID", type: "link", w: 100, opts: "companies", link: { screen: "company", match: "id" } },
        { label: "Company Name", type: "text", w: 235, calcJoin: { sheet: "companies", keyCol: 2, match: 0, from: 1, fallbackCol: 3 } },
        { label: "Name as Recorded", type: "text", w: 190 },
        { label: "Activity", type: "text", w: 130, opts: "sectors" },
        { label: "Location", type: "text", w: 160 },
        { label: "Purpose / Licence Billed", type: "text", w: 230, opts: "services" },
        { label: "Chemical", type: "text", w: 200 },
        { label: "Amount Billed (USD)", type: "money", w: 135 },
        { label: "Bill Date", type: "date", w: 110 },
        { label: "Company Total Billed (USD)", type: "money", w: 150, calc: "companyBilled" },
        { label: "Company Total Paid (USD)", type: "money", w: 145, calc: "companyPaid" },
        { label: "Payment Status", type: "status", w: 150, calc: "paymentStatus" },
        { label: "Source", type: "text", w: 190 },
        { label: "Bill Ref. No.", type: "text", w: 165 },
        { label: "Contact Person", type: "text", w: 150 },
        { label: "Contact Title", type: "text", w: 150 },
        { label: "Bill Type", type: "text", w: 175, opts: "billTypes" },
        { label: "Paid on this Bill (USD)", type: "money", w: 140, calc: "paidOnBill" },
        { label: "Bill Status", type: "status", w: 165, calc: "billStatus" },
        { label: "Linked Record", type: "text", w: 150 },
      ],
    },
    payments: {
      name: "Payments & Receipts", group: "register", icon: "💵", idCol: 0, idPrefix: "PAY-",
      columns: [
        { label: "Record ID", type: "id", w: 92 },
        { label: "Company ID", type: "link", w: 100, opts: "companies", link: { screen: "company", match: "id" } },
        { label: "Company Name", type: "text", w: 240, calcJoin: { sheet: "companies", keyCol: 1, match: 0, from: 1, fallbackCol: 2 } },
        { label: "Name as Recorded", type: "text", w: 190 },
        { label: "Purpose / Services", type: "text", w: 230, opts: "servicePurpose" },
        { label: "Amount (USD)", type: "money", w: 115 },
        { label: "Payment Date", type: "date", w: 115 },
        { label: "Receipt No.", type: "text", w: 100 },
        { label: "Record Group", type: "text", w: 150, opts: "recordGroup" },
        { label: "Remarks", type: "text", w: 260 },
        { label: "Source", type: "text", w: 190 },
        { label: "Bill No.", type: "link", w: 110, opts: "billNos", link: { screen: "bill", match: "billNo" } },
      ],
    },
    issues: {
      name: "Notes & Issues", group: "register", icon: "🗒️", idCol: 0, idPrefix: "ISS-",
      columns: [
        { label: "Issue #", type: "id", w: 88 },
        { label: "Register", type: "text", w: 180 },
        { label: "Record", type: "text", w: 170 },
        { label: "Source", type: "text", w: 200 },
        { label: "Issue Found", type: "text", w: 420 },
        { label: "Action Taken", type: "text", w: 300 },
        { label: "Follow-up Status", type: "status", w: 170 },
      ],
    },
    correspondence: {
      name: "Correspondence", group: "register", icon: "✉️", idCol: 0, idPrefix: "COR-",
      columns: [
        { label: "Record ID", type: "id", w: 95 },
        { label: "Company ID", type: "link", w: 100, opts: "companies", link: { screen: "company", match: "id" } },
        { label: "Company Name", type: "text", w: 240, calcJoin: { sheet: "companies", keyCol: 1, match: 0, from: 1, fallbackCol: 2 } },
        { label: "Name as Recorded", type: "text", w: 190 },
        { label: "Type", type: "text", w: 160, opts: ["Violation Notice", "Reminder Letter", "Shutdown Notice", "Other"] },
        { label: "Activity", type: "text", w: 150 },
        { label: "Description", type: "text", w: 320 },
        { label: "EPA Reference No.", type: "text", w: 180 },
        { label: "Date Issued", type: "date", w: 115 },
      ],
    },
    srcBmmc: {
      name: "SRC BMMC Log", group: "source", icon: "📚", readonlyHint: true,
      columns: [
        { label: "CHEMICALS", type: "text", w: 300 },
        { label: "QUANTATY KGS", type: "num", w: 130 },
        { label: "DATE", type: "text", w: 150 },
        { label: "BILL OF LEADING", type: "text", w: 220 },
      ],
    },
    srcReceipts: {
      name: "SRC CMU Receipts", group: "source", icon: "📚", readonlyHint: true,
      columns: [
        { label: "Company", type: "text", w: 240 },
        { label: "Amount Paid USD", type: "money", w: 130 },
        { label: "Purpose", type: "text", w: 220 },
        { label: "Date", type: "date", w: 120 },
        { label: "Receipt No.", type: "text", w: 110 },
      ],
    },
  };

  /* ------------------------------------------------------------------ computations */
  const KG_PER_UNIT = { kg: 1, mt: 1000, l: 1, litre: 1, liters: 1, ltr: 1, pcs: null, "": 1 };

  function qtyKg(qty, unit) {
    if (qty == null || qty === "" || isNaN(+qty)) return null;
    const u = String(unit || "kg").toLowerCase().trim();
    const f = KG_PER_UNIT[u];
    if (f == null) return null; // Unverified units
    if (u === "" ) return +qty;
    return +qty * f;
  }
  function licenceStatus(licenceNo, expiryDate, ref) {
    if (!licenceNo) return "Pending – no licence no.";
    if (!expiryDate) return "Issued – expiry not recorded";
    const t = today();
    return expiryDate >= t ? "Active" : "Expired";
  }

  function index(data, sheetKey, col) {
    const m = new Map();
    (data.sheets[sheetKey].rows || []).forEach((r) => { const k = r[col]; if (k != null) m.set(String(k), r); });
    return m;
  }

  /* Build lookup maps once per dataset; passed around for fast joins. */
  function buildIndexes(data) {
    const ix = {};
    ix.companyById = index(data, "companies", 0);
    ix.licenceById = index(data, "licences", 0);
    ix.billByNo = new Map();
    (data.sheets.bills.rows || []).forEach((r) => { if (r[1]) ix.billByNo.set(String(r[1]), r); });
    ix.clearanceByNo = new Map();
    (data.sheets.clearances.rows || []).forEach((r) => { if (r[1]) ix.clearanceByNo.set(String(r[1]), r); });
    return ix;
  }

  function companyStats(data, companyId, ixIn) {
    const ix = ixIn || buildIndexes(data);
    let licences = 0, clearances = 0, kg = 0, billed = 0, paid = 0;
    data.sheets.licences.rows.forEach((r) => { if (r[1] === companyId) licences++; });
    data.sheets.clearances.rows.forEach((r) => {
      if (r[2] === companyId) { clearances++; const k = qtyKg(r[6], r[7]); if (k != null) kg += k; }
    });
    data.sheets.bills.rows.forEach((r) => { if (r[2] === companyId && !isNaN(+r[9])) billed += +r[9]; });
    data.sheets.payments.rows.forEach((r) => { if (r[1] === companyId && !isNaN(+r[5])) paid += +r[5]; });
    return { licences, clearances, kg, billed, paid };
  }

  function billRollups(data) {
    const byCompanyBilled = {}, byCompanyPaid = {}, byBillPaid = {}, billAmount = {}, billLines = {};
    data.sheets.bills.rows.forEach((r) => {
      const co = r[2]; if (!co) return;
      byCompanyBilled[co] = (byCompanyBilled[co] || 0) + (+r[9] || 0);
      if (!billLines[r[1]]) billLines[r[1]] = { total: 0, first: r };
      billLines[r[1]].total += (+r[9] || 0);
    });
    data.sheets.payments.rows.forEach((r) => {
      const co = r[1]; if (!co) return;
      byCompanyPaid[co] = (byCompanyPaid[co] || 0) + (+r[5] || 0);
      if (r[11]) byBillPaid[String(r[11])] = (byBillPaid[String(r[11])] || 0) + (+r[5] || 0);
    });
    return { byCompanyBilled, byCompanyPaid, byBillPaid, billLines };
  }

  /* Compute the value of a calculated cell for sheet/rowIdx/colIdx. */
  function calcCell(data, sheetKey, rowIdx, colIdx, ix) {
    const row = data.sheets[sheetKey].rows[rowIdx];
    if (!row) return null;
    const def = S[sheetKey].columns[colIdx];
    if (!def || !def.calc) return null;
    ix = ix || buildIndexes(data);
    switch (def.calc) {
      case "licenceStatus": return licenceStatus(row[10], row[12]);
      case "qtyKg": return qtyKg(row[6], row[7]);
      case "qtyMt": { const k = qtyKg(row[6], row[7]); return k == null ? null : +(k / 1000).toFixed(4); }
      case "companyLicences": case "companyClearances": case "companyKg": case "companyBilled": case "companyPaid": {
        let companyId;
        if (sheetKey === "companies") companyId = row[0];
        else companyId = row[2];
        if (sheetKey === "bills" && (def.calc === "companyBilled" || def.calc === "companyPaid")) {
          const ru = billRollups(data);
          return def.calc === "companyBilled" ? ru.byCompanyBilled[companyId] || 0 : ru.byCompanyPaid[companyId] || 0;
        }
        const st = companyStats(data, companyId, ix);
        return def.calc === "companyLicences" ? st.licences : def.calc === "companyClearances" ? st.clearances :
          def.calc === "companyKg" ? +st.kg.toFixed(2) : def.calc === "companyBilled" ? st.billed : st.paid;
      }
      case "paymentStatus": {
        const ru = billRollups(data);
        const co = row[2], b = ru.byCompanyBilled[co] || 0, p = ru.byCompanyPaid[co] || 0;
        if (!b) return "No payment on record";
        if (p <= 0) return "No payment on record";
        return p + 0.005 >= b ? "Paid" : "Part paid";
      }
      case "paidOnBill": {
        const ru = billRollups(data);
        return ru.byBillPaid[String(row[1])] || 0;
      }
      case "billStatus": {
        const ru = billRollups(data);
        const co = row[2], b = ru.byCompanyBilled[co] || 0, p = ru.byCompanyPaid[co] || 0;
        if (p > 0 && p + 0.005 >= b) return "Paid (company account)";
        if (p > 0) return "Part paid (company account)";
        return "Unpaid";
      }
      default: return null;
    }
  }

  /* The displayed value for a cell: stored value, joined value, or computed value. */
  function displayValue(data, sheetKey, rowIdx, colIdx, ix) {
    const row = data.sheets[sheetKey].rows[rowIdx];
    if (!row) return null;
    const def = S[sheetKey].columns[colIdx];
    if (!def) return row[colIdx];
    if (def.calc) return calcCell(data, sheetKey, rowIdx, colIdx, ix);
    if (def.calcJoin) return joinValue(data, sheetKey, row, colIdx);
    return row[colIdx];
  }

  function joinValue(data, sheetKey, row, colIdx) {
    const def = S[sheetKey].columns[colIdx];
    if (!def || !def.calcJoin) return row ? row[colIdx] : null;
    const idVal = row[def.calcJoin.keyCol != null ? def.calcJoin.keyCol : 0];
    if (idVal != null) {
      for (const r of data.sheets[def.calcJoin.sheet].rows) {
        if (String(r[def.calcJoin.match]) === String(idVal)) {
          const v = r[def.calcJoin.from];
          if (v != null && v !== "") return v;
        }
      }
    }
    const fb = def.calcJoin.fallbackCol != null ? row[def.calcJoin.fallbackCol] : null;
    return fb != null ? fb : null;
  }

  /* Next sequential ids, e.g. CMU-071, LIC-071, CLN-148, BN-2026-021 */
  function nextId(data, sheetKey) {
    const sh = data.sheets[sheetKey];
    const def = S[sheetKey];
    if (!def || !def.idPrefix || def.idCol == null) return null;
    const re = new RegExp("^" + def.idPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)");
    let max = 0;
    (sh.rows || []).forEach((r) => {
      const v = r[def.idCol];
      if (typeof v === "string") { const m = re.exec(v); if (m) max = Math.max(max, parseInt(m[1], 10)); }
    });
    return def.idPrefix + String(max + 1).padStart(3, "0");
  }
  function nextGroupId(data, sheetKey) {
    const sh = data.sheets[sheetKey];
    const def = S[sheetKey];
    if (!def || !def.groupPrefix || def.groupById == null) return null;
    const re = new RegExp("^" + def.groupPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)");
    let max = 0;
    (sh.rows || []).forEach((r) => {
      const v = r[def.groupById];
      if (typeof v === "string") { const m = re.exec(v); if (m) max = Math.max(max, parseInt(m[1], 10)); }
    });
    return def.groupPrefix + String(max + 1).padStart(3, "0");
  }
  function nextBillNo(data) {
    const year = new Date().getFullYear();
    const re = /^BN-(\d{4})-(\d+)$/;
    let max = 0;
    data.sheets.bills.rows.forEach((r) => { const m = re.exec(String(r[1] || "")); if (m && +m[1] === year) max = Math.max(max, +m[2]); });
    return `BN-${year}-${String(max + 1).padStart(3, "0")}`;
  }

  function statusClass(v) {
    if (!v) return "";
    const s = String(v).toLowerCase();
    if (s === "active" || s === "paid" || s === "closed") return "st-green";
    if (s.startsWith("pending") || s.startsWith("part paid") || s.startsWith("open") || s.startsWith("issued")) return "st-amber";
    if (s === "expired" || s === "unpaid" || s.includes("no payment")) return "st-red";
    return "st-gray";
  }

  /* Dashboard aggregates */
  function dashboard(data) {
    const ix = buildIndexes(data);
    const companies = data.sheets.companies.rows.length;
    const licences = data.sheets.licences.rows;
    let numbered = 0, pending = 0, active = 0, issuedNoExpiry = 0, expired = 0;
    const byCat = {};
    licences.forEach((r) => {
      const st = licenceStatus(r[10], r[12]);
      if (st === "Pending – no licence no.") pending++; else numbered++;
      if (st === "Active") active++; else if (st === "Issued – expiry not recorded") issuedNoExpiry++; else if (st === "Expired") expired++;
      const cat = r[4] || "(no category)";
      byCat[cat] = byCat[cat] || { total: 0, active: 0, issued: 0, pending: 0, expired: 0 };
      byCat[cat].total++;
      if (st === "Active") byCat[cat].active++;
      else if (st === "Pending – no licence no.") byCat[cat].pending++;
      else if (st === "Expired") byCat[cat].expired++;
      else byCat[cat].issued++;
    });
    let clearanceLines = 0, totalKg = 0;
    const byChemical = {};
    const monthly = {};
    for (let m = 1; m <= 12; m++) monthly[m] = { clearances: 0, kg: 0, payments: 0, paid: 0, billed: 0, licencesIssued: 0 };
    let noDateClearances = 0, noDateKg = 0, noDatePayments = 0, noDatePaid = 0, noDateBilled = 0, noDateLicences = 0;
    data.sheets.clearances.rows.forEach((r) => {
      clearanceLines++;
      const k = qtyKg(r[6], r[7]);
      if (k != null) totalKg += k;
      const std = r[5] || r[4] || "Other / Unspecified";
      byChemical[std] = byChemical[std] || { shipments: 0, kg: 0 };
      byChemical[std].shipments++;
      if (k != null) byChemical[std].kg += k;
      const d = r[12];
      if (d && /^\d{4}-\d{2}/.test(String(d))) {
        const m = +String(d).slice(5, 7);
        monthly[m].clearances++; if (k != null) monthly[m].kg += k;
      } else { noDateClearances++; if (k != null) noDateKg += k; }
    });
    data.sheets.payments.rows.forEach((r) => {
      const d = r[6], amt = +r[5] || 0;
      if (d && /^\d{4}-\d{2}/.test(String(d))) { const m = +String(d).slice(5, 7); monthly[m].payments++; monthly[m].paid += amt; }
      else { noDatePayments++; noDatePaid += amt; }
    });
    data.sheets.bills.rows.forEach((r) => {
      const d = r[10], amt = +r[9] || 0;
      if (d && /^\d{4}-\d{2}/.test(String(d))) { const m = +String(d).slice(5, 7); monthly[m].billed += amt; }
      else noDateBilled += amt;
    });
    licences.forEach((r) => {
      const d = r[11];
      if (d && /^\d{4}-\d{2}/.test(String(d))) { const m = +String(d).slice(5, 7); monthly[m].licencesIssued++; }
      else if (r[10]) noDateLicences++;
    });
    const ru = billRollups(data);
    let totalBilled = 0, totalPaid = 0, openIssues = 0;
    data.sheets.bills.rows.forEach((r) => totalBilled += +r[9] || 0);
    data.sheets.payments.rows.forEach((r) => totalPaid += +r[5] || 0);
    data.sheets.issues.rows.forEach((r) => { if (String(r[6] || "").toLowerCase().startsWith("open")) openIssues++; });

    const billGroups = {};
    Object.keys(ru.billLines).forEach((bn) => {
      const g = ru.billLines[bn];
      const first = g.first;
      const co = first[2];
      const billed = g.total;
      const paidCo = ru.byCompanyPaid[co] || 0;
      const paidBill = ru.byBillPaid[bn] || 0;
      let status;
      if (paidBill > 0) status = paidBill + 0.005 >= billed ? "Paid" : "Part paid";
      else status = paidCo > 0 ? (paidCo + 0.005 >= (ru.byCompanyBilled[co] || 0) ? "Paid (company account)" : "Part paid (company account)") : "Unpaid";
      billGroups[bn] = { billNo: bn, company: first[3], billDate: first[10], billed, paid: paidBill || Math.min(paidCo, billed), status, billType: first[18] };
    });
    const outstanding = Object.values(billGroups)
      .filter((b) => b.status !== "Paid" && b.status !== "Paid (company account)")
      .sort((a, b) => (a.billDate < b.billDate ? -1 : 1));
    const paymentStatus = { paid: 0, paidAmt: 0, part: 0, partAmt: 0, none: 0, noneAmt: 0 };
    Object.values(billGroups).forEach((b) => {
      if (b.status.startsWith("Paid")) { paymentStatus.paid++; paymentStatus.paidAmt += b.billed; }
      else if (b.status.startsWith("Part paid")) { paymentStatus.part++; paymentStatus.partAmt += b.billed; }
      else { paymentStatus.none++; paymentStatus.noneAmt += b.billed; }
    });
    const chemicals = Object.entries(byChemical).map(([name, v]) => ({ name, shipments: v.shipments, kg: v.kg, mt: v.kg / 1000 }))
      .sort((a, b) => b.kg - a.kg);

    return {
      companies, licencesNumbered: numbered, licencesPending: pending, active, issuedNoExpiry, expired,
      clearanceLines, totalKg, totalMt: totalKg / 1000, totalBilled, totalPaid, openIssues,
      byCategory: byCat, monthly, noDate: { clearances: noDateClearances, kg: noDateKg, payments: noDatePayments, paid: noDatePaid, billed: noDateBilled, licences: noDateLicences },
      chemicals, billGroups, outstanding, paymentStatus,
    };
  }

  /* System check – health of the data */
  function systemCheck(data) {
    const checks = [];
    const push = (area, ok, detail) => checks.push({ area, ok, detail });
    const sheetOk = (k) => data.sheets[k] && Array.isArray(data.sheets[k].rows);
    ["companies", "licences", "licenceChemicals", "licenceVehicles", "licenceEffluent", "clearances", "bills", "payments", "issues", "correspondence", "srcBmmc", "srcReceipts"].forEach((k) =>
      push("Registers", sheetOk(k), `${S[k] ? S[k].name : k}: ${sheetOk(k) ? data.sheets[k].rows.length + " rows" : "missing"}`));

    const ids = (sheetKey, col) => data.sheets[sheetKey].rows.map((r) => r[col]).filter(Boolean);
    const dup = (arr) => { const seen = {}; const d = {}; arr.forEach((v) => { seen[v] = (seen[v] || 0) + 1; if (seen[v] === 2) d[v] = true; }); return Object.keys(d); };

    const companyIds = ids("companies", 0);
    push("Record IDs", dup(companyIds).length === 0, dup(companyIds).length ? "Duplicate Company IDs: " + dup(companyIds).join(", ") : `${companyIds.length} company IDs, all unique`);
    const licIds = ids("licences", 0);
    push("Record IDs", dup(licIds).length === 0, dup(licIds).length ? "Duplicate Licence IDs: " + dup(licIds).join(", ") : `${licIds.length} licence IDs, all unique`);
    const dupLicNos = dup(ids("licences", 10).filter(Boolean));
    push("Record IDs", dupLicNos.length === 0, dupLicNos.length ? "Same licence no. used by more than one record: " + dupLicNos.slice(0, 6).join(", ") + (dupLicNos.length > 6 ? "…" : "") + " (see remarks on those rows)" : "Licence numbers unique per record");

    const companySet = new Set(companyIds.map(String));
    const orphans = [];
    data.sheets.licences.rows.forEach((r) => { if (r[1] && !companySet.has(String(r[1]))) orphans.push(`${r[0]}→${r[1]}`); });
    data.sheets.bills.rows.forEach((r) => { if (r[2] && !companySet.has(String(r[2]))) orphans.push(`${r[0]}→${r[2]}`); });
    push("Links", orphans.length === 0, orphans.length ? "Records pointing at a Company ID that does not exist: " + orphans.slice(0, 8).join(", ") : "Every licence/bill links to an existing company");

    const billNos = new Set(ids("bills", 1).map(String));
    const payOrphans = data.sheets.payments.rows.filter((r) => r[11] && !billNos.has(String(r[11]))).map((r) => r[0]);
    push("Links", payOrphans.length === 0, payOrphans.length ? "Payments linked to a Bill No. that does not exist: " + payOrphans.join(", ") : "All payment→bill links valid");

    const receipts = {};
    let dupReceipts = 0;
    data.sheets.payments.rows.forEach((r) => { if (r[7]) { receipts[r[7]] = (receipts[r[7]] || 0) + 1; } });
    Object.values(receipts).forEach((n) => { if (n > 1) dupReceipts++; });
    push("Data quality", dupReceipts === 0, dupReceipts ? `${dupReceipts} receipt number(s) used more than once` : "Receipt numbers unique");

    let badQty = data.sheets.clearances.rows.filter((r) => qtyKg(r[6], r[7]) == null && r[6] != null).length;
    push("Data quality", badQty === 0, badQty ? `${badQty} clearance line(s) with a unit that cannot be converted to kg (e.g. Unverified)` : "All clearance quantities convertible to kg");

    const openIssues = data.sheets.issues.rows.filter((r) => String(r[6] || "").toLowerCase().startsWith("open")).length;
    push("Notes & Issues", openIssues === 0, openIssues ? `${openIssues} open data issue(s) – review them on the Notes & Issues register` : "No open data issues");

    const listsOk = data.lists && data.lists.licenceCategory && data.lists.licenceCategory.length > 0;
    push("Settings", listsOk, "Dropdown lists, fee schedule and print settings loaded");
    push("Settings", (data.fees.billTypes || []).length > 0, `${(data.fees.services || []).length} services · ${(data.fees.billTypes || []).length} bill types with letter wording`);
    return checks;
  }

  return {
    SHEETS: S, MONTHS, fmtDate, fmtLongDate, today, fmtNum, fmtMoney, amountWords, intWords,
    qtyKg, licenceStatus, buildIndexes, companyStats, billRollups, calcCell, displayValue, joinValue,
    nextId, nextGroupId, nextBillNo, statusClass, dashboard, systemCheck,
  };
});
