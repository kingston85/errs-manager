/* offline.js — the whole backend, in the browser, for the single-file edition.
 * Only active when window.CMU_OFFLINE is set (see tools/build_offline.js).
 * Intercepts fetch("/api/…") and window.open("/api/…") and serves them from an
 * in-browser copy of the dataset, persisted to localStorage.
 *
 * NOTE: accounts here are a convenience for one browser — this is not a server,
 * so treat the sign-in as demo-level security (exactly like the workbook). */
(function () {
  "use strict";
  if (!window.CMU_OFFLINE) return;
  const CMU = window.CMU;

  const LS_KEY = "cmu-offline-data-v1";
  const BASE = window.CMU_BASE_DATA;
  let canStore = true;
  try { localStorage.setItem("cmu-t", "1"); localStorage.removeItem("cmu-t"); } catch (e) { canStore = false; }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function hashPw(pw, salt) {
    let h = 5381; const s = String(salt) + ":" + String(pw);
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return "o" + h.toString(16);
  }
  function seedUsers() {
    const users = [];
    const mk = (username, fullName, role, password) => {
      const salt = Math.random().toString(36).slice(2, 11);
      users.push({ username, fullName, role, active: true, salt, hash: hashPw(password, salt), created: new Date().toISOString().slice(0, 10), lastLogin: null, mustChange: true });
    };
    mk("admin", "Administrator", "Admin", "Welcome@2026");
    (BASE.users || []).forEach((u) => { if (u.username !== "admin") mk(u.username, u.fullName, u.role, "Welcome@2026"); });
    return users;
  }
  function load() {
    if (canStore) { try { const d = JSON.parse(localStorage.getItem(LS_KEY)); if (d && d.sheets) return d; } catch (e) {} }
    return null;
  }
  let data = load();
  if (!data) { data = clone(BASE); data._app = { users: seedUsers(), audit: [] }; saveNow(); }
  if (!data._app) data._app = { users: seedUsers(), audit: [] };
  let settings = data._app.settings || { loginRequired: false, demoBanner: true };
  const sessions = new Map();
  let session = null; // current signed-in user (this tab)

  function saveNow() { if (canStore) { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {} } }
  function audit(action, detail) {
    data._app.audit.push({ ts: new Date().toISOString(), user: session ? session.username : "demo", action, detail: String(detail).slice(0, 500) });
    if (data._app.audit.length > 3000) data._app.audit.splice(0, data._app.audit.length - 3000);
    saveNow();
  }
  function err(code, msg) { const e = new Error(msg); e.status = code; return e; }

  function nextIds() {
    return {
      company: CMU.nextId(data, "companies"), licence: CMU.nextId(data, "licences"),
      clearanceLine: CMU.nextId(data, "clearances"), clearanceNo: CMU.nextGroupId(data, "clearances"),
      billLine: CMU.nextId(data, "bills"), billNo: CMU.nextBillNo(data),
      payment: CMU.nextId(data, "payments"), issue: CMU.nextId(data, "issues"),
      correspondence: CMU.nextId(data, "correspondence"),
    };
  }
  function publicData() {
    const d = clone(data); delete d._app;
    d.settings = { loginRequired: settings.loginRequired, demoBanner: settings.demoBanner };
    d.nextIds = nextIds();
    return d;
  }
  const companyName = (id) => { const c = data.sheets.companies.rows.find((r) => r[0] === id); return c ? c[1] : ""; };

  /* ------------------------------------------------ ops (grid edits) */
  function applyOps(ops) {
    for (const op of ops || []) {
      const sheet = data.sheets[op.sheet]; if (!sheet) throw err(404, "Unknown sheet: " + op.sheet);
      const def = CMU.SHEETS[op.sheet];
      if (op.op === "setCell") {
        const row = sheet.rows[op.row];
        if (!(op.row >= 0 && op.row < sheet.rows.length)) throw err(400, "Row out of range");
        if (def && def.columns[op.col] && def.columns[op.col].calc) throw err(400, "Column is calculated – edit the source record instead");
        while (row.length < op.col + 1) row.push(null);
        row[op.col] = op.value === "" ? null : op.value;
      } else if (op.op === "insertRow") {
        const at = op.at == null ? sheet.rows.length : op.at;
        const vals = op.values || [];
        if (def && def.idPrefix && def.idCol != null && !vals[def.idCol]) vals[def.idCol] = CMU.nextId(data, op.sheet);
        sheet.rows.splice(at, 0, vals);
      } else if (op.op === "deleteRow") {
        const ri = op.row;
        if (!(ri >= 0 && ri < sheet.rows.length)) throw err(400, "Row out of range");
        if (op.sheet === "companies") {
          const cid = sheet.rows[ri][0];
          const used = data.sheets.licences.rows.some((r) => r[1] === cid) || data.sheets.clearances.rows.some((r) => r[2] === cid) ||
            data.sheets.bills.rows.some((r) => r[2] === cid) || data.sheets.payments.rows.some((r) => r[1] === cid);
          if (used) throw err(400, `Company ${cid} still has licences, clearances, bills or payments on record – it cannot be deleted.`);
        }
        sheet.rows.splice(ri, 1);
      } else throw err(400, "Unknown op");
    }
    saveNow();
    return { applied: (ops || []).length, nextIds: nextIds() };
  }

  /* ------------------------------------------------ record forms */
  function recCompany(b) {
    const sh = data.sheets.companies, r = b.record || {};
    if (b.action === "new") {
      if (!r.name) throw err(400, "Company Name is required");
      const warnings = [];
      if (sh.rows.some((x) => x[1] && x[1].toLowerCase() === String(r.name).toLowerCase())) warnings.push(`A company with a similar name already exists: ${r.name}`);
      const id = CMU.nextId(data, "companies");
      sh.rows.push([id, r.name, r.sector || null, r.location || null, r.otherNames || null, null, null, null, null, null]);
      audit("record-new", `Company ${id} – ${r.name}`); return { id, warnings };
    }
    if (b.action === "update") {
      const row = sh.rows.find((x) => x[0] === r.id); if (!row) throw err(404, "Company not found: " + r.id);
      if (!r.name) throw err(400, "Company Name is required");
      row[1] = r.name; row[2] = r.sector || null; row[3] = r.location || null; row[4] = r.otherNames || null;
      audit("record-update", `Company ${r.id}`); return { id: r.id };
    }
    if (b.action === "delete") {
      const i = sh.rows.findIndex((x) => x[0] === r.id); if (i < 0) throw err(404, "Company not found: " + r.id);
      const used = data.sheets.licences.rows.some((x) => x[1] === r.id) || data.sheets.clearances.rows.some((x) => x[2] === r.id) ||
        data.sheets.bills.rows.some((x) => x[2] === r.id) || data.sheets.payments.rows.some((x) => x[1] === r.id);
      if (used) throw err(400, `Company ${r.id} still has licences, clearances, bills or payments – it cannot be deleted.`);
      sh.rows.splice(i, 1); audit("record-delete", `Company ${r.id}`); return { id: r.id };
    }
    throw err(400, "Unknown action");
  }

  function recLicence(b) {
    const sh = data.sheets.licences, r = b.record || {}, warnings = [];
    if (r.licenceNo && sh.rows.some((x) => x[10] === r.licenceNo && x[0] !== r.id)) warnings.push(`Licence no. ${r.licenceNo} is already recorded on another licence – verify before issuing.`);
    if (b.action === "new" || b.action === "update") {
      if (!r.companyId) throw err(400, "Company is required");
      if (!r.category) throw err(400, "Licence Category is required");
      if (!r.type) throw err(400, "Licence / Certificate Type is required");
    }
    let id = r.id;
    if (b.action === "new") {
      id = CMU.nextId(data, "licences");
      sh.rows.push([id, r.companyId, companyName(r.companyId), r.nameRecorded || null, r.category, r.type, r.location || null,
        r.applicationDate || null, r.responseDate || null, r.refCode || null, r.licenceNo || null,
        r.dateIssued || null, r.expiryDate || null, null, r.remarks || null, r.source || "Form entry", r.billNo || null]);
    } else if (b.action === "update") {
      const row = sh.rows.find((x) => x[0] === r.id); if (!row) throw err(404, "Licence not found: " + r.id);
      row[1] = r.companyId; row[2] = companyName(r.companyId); row[3] = r.nameRecorded || null;
      row[4] = r.category; row[5] = r.type; row[6] = r.location || null;
      row[7] = r.applicationDate || null; row[8] = r.responseDate || null; row[9] = r.refCode || null;
      row[10] = r.licenceNo || null; row[11] = r.dateIssued || null; row[12] = r.expiryDate || null;
      row[14] = r.remarks || null; row[16] = r.billNo || null;
    } else if (b.action === "delete") {
      const i = sh.rows.findIndex((x) => x[0] === r.id); if (i < 0) throw err(404, "Licence not found: " + r.id);
      sh.rows.splice(i, 1);
      data.sheets.licenceChemicals.rows = data.sheets.licenceChemicals.rows.filter((x) => x[0] !== r.id);
      data.sheets.licenceVehicles.rows = data.sheets.licenceVehicles.rows.filter((x) => x[0] !== r.id);
      data.sheets.licenceEffluent.rows = data.sheets.licenceEffluent.rows.filter((x) => x[0] !== r.id);
      audit("record-delete", `Licence ${r.id} (with its chemicals, vehicles and effluent lines)`);
      return { id: r.id, warnings };
    } else throw err(400, "Unknown action");

    data.sheets.licenceChemicals.rows = data.sheets.licenceChemicals.rows.filter((x) => x[0] !== id);
    (r.chemicals || []).forEach((c) => {
      if (!c.name && !c.epaRegNo && !c.qty) return;
      data.sheets.licenceChemicals.rows.push([id, r.licenceNo || null, companyName(r.companyId), c.name || null, c.epaRegNo || null, c.type || null,
        c.qty != null && c.qty !== "" ? +c.qty : null, c.unit || null, c.consignmentRef || null]);
    });
    data.sheets.licenceVehicles.rows = data.sheets.licenceVehicles.rows.filter((x) => x[0] !== id);
    (r.vehicles || []).forEach((v) => {
      if (!v.vehicleType && !v.regNo && !v.epaRegNo) return;
      data.sheets.licenceVehicles.rows.push([id, r.licenceNo || null, companyName(r.companyId), v.vehicleType || null, v.regNo || null, v.epaRegNo || null]);
    });
    data.sheets.licenceEffluent.rows = data.sheets.licenceEffluent.rows.filter((x) => x[0] !== id);
    const eff = [];
    (r.effluent || []).forEach((e) => {
      if (e.receivingWater) eff.push([id, r.licenceNo || null, companyName(r.companyId), "Setting", 1, "Receiving water", e.receivingWater, null, null, null, null, null, null]);
      if (e.maxVolume !== "" && e.maxVolume != null) eff.push([id, r.licenceNo || null, companyName(r.companyId), "Setting", 2, "Max. volume (m³/day)", e.maxVolume, null, null, null, null, null, null]);
      if (e.dischargePoint) eff.push([id, r.licenceNo || null, companyName(r.companyId), "Setting", 3, "Discharge point / facility", e.dischargePoint, null, null, null, null, null, null]);
    });
    (r.limits || []).forEach((l, i) => {
      if (!l.parameter && !l.limit) return;
      eff.push([id, r.licenceNo || null, companyName(r.companyId), "Limit", i + 1, l.parameter || null, l.unit || null, l.limit !== "" && l.limit != null ? l.limit : null, l.sampleType || null, l.testingSchedule || null, l.stage || null, null, null]);
    });
    (r.coordinates || []).forEach((c, i) => {
      if (!c.vertex && !c.easting && !c.northing) return;
      eff.push([id, r.licenceNo || null, companyName(r.companyId), "Coordinate", i + 1, c.table || null, c.vertex || null, c.easting ?? null, c.northing ?? null, null, null, null, null]);
    });
    (r.sources || []).forEach((s, i) => {
      if (!s.source && !s.receivingUnit && !s.x) return;
      eff.push([id, r.licenceNo || null, companyName(r.companyId), "Source", i + 1, s.source || null, s.receivingUnit || null, s.x ?? null, s.y ?? null, null, null, null, null]);
    });
    data.sheets.licenceEffluent.rows.push(...eff);
    audit(b.action === "new" ? "record-new" : "record-update", `Licence ${id} – ${companyName(r.companyId)} (${r.category})`);
    return { id, warnings };
  }

  function recClearance(b) {
    const sh = data.sheets.clearances, r = b.record || {}, warnings = [];
    const lines = (r.lines || []).filter((l) => (l.chemicalStandard || l.chemicalRecorded || l.qty));
    let clearanceNo = r.clearanceNo;
    if (b.action !== "delete") {
      if (!r.companyId) throw err(400, "Company is required");
      if (!r.clearanceDate) throw err(400, "Clearance Date is required");
      if (!lines.length) throw err(400, "At least one chemical line is required");
    }
    if (b.action === "new") clearanceNo = CMU.nextGroupId(data, "clearances");
    if (b.action === "delete") {
      const before = sh.rows.length;
      data.sheets.clearances.rows = sh.rows.filter((x) => x[1] !== clearanceNo);
      if (data.sheets.clearances.rows.length === before) throw err(404, "Clearance not found: " + clearanceNo);
      audit("record-delete", `Clearance ${clearanceNo}`); return { clearanceNo, warnings };
    }
    sh.rows = sh.rows.filter((x) => x[1] !== clearanceNo);
    lines.forEach((l) => {
      sh.rows.push([CMU.nextId(data, "clearances"), clearanceNo, r.companyId, companyName(r.companyId),
        l.chemicalRecorded || l.chemicalStandard || null, l.chemicalStandard || null,
        l.qty != null && l.qty !== "" ? +l.qty : null, l.unit || null, null, null,
        l.blNo || r.blNoDefault || null, r.refNo || null, r.clearanceDate || null,
        r.remarks || null, r.source || "Form entry", r.eta || null, r.billNo || null]);
    });
    audit(b.action === "new" ? "record-new" : "record-update", `Clearance ${clearanceNo} – ${companyName(r.companyId)} · ${lines.length} line(s)`);
    return { clearanceNo, warnings };
  }

  function recBill(b) {
    const sh = data.sheets.bills, r = b.record || {};
    const lines = (r.lines || []).filter((l) => (l.service || l.amount != null));
    let billNo = r.billNo;
    if (b.action !== "delete") {
      if (!r.companyId) throw err(400, "Company is required");
      if (!r.billDate) throw err(400, "Bill Date is required");
      if (!r.billType) throw err(400, "Bill Type is required");
      if (!lines.length) throw err(400, "At least one service line is required");
      lines.forEach((l) => { if (l.amount == null || l.amount === "" || isNaN(+l.amount)) throw err(400, "Every service line needs an amount"); });
    }
    if (b.action === "new") billNo = CMU.nextBillNo(data);
    if (b.action === "delete") {
      const before = sh.rows.length;
      data.sheets.bills.rows = sh.rows.filter((x) => x[1] !== billNo);
      if (data.sheets.bills.rows.length === before) throw err(404, "Bill not found: " + billNo);
      audit("record-delete", `Bill ${billNo}`); return { billNo };
    }
    sh.rows = sh.rows.filter((x) => x[1] !== billNo);
    lines.forEach((l) => {
      sh.rows.push([CMU.nextId(data, "bills"), billNo, r.companyId, companyName(r.companyId), r.nameRecorded || companyName(r.companyId),
        r.activity || null, r.location || null, l.service || null, l.details || null, +l.amount || 0,
        r.billDate || null, null, null, null, r.source || "Form entry", r.billRefNo || null,
        r.contactPerson || null, r.contactTitle || null, r.billType || null, null, null, r.linkedRecord || null]);
    });
    audit(b.action === "new" ? "record-new" : "record-update", `Bill ${billNo} – ${companyName(r.companyId)}`);
    return { billNo };
  }

  function recPayment(b) {
    const sh = data.sheets.payments, r = b.record || {}, warnings = [];
    if (b.action !== "delete") {
      if (!r.companyId) throw err(400, "Company is required");
      if (!r.purpose) throw err(400, "Purpose / Services is required");
      if (r.amount == null || r.amount === "" || isNaN(+r.amount)) throw err(400, "Amount (USD) is required");
      if (!r.paymentDate) throw err(400, "Payment Date is required");
    }
    if (r.receiptNo && sh.rows.some((x) => String(x[7]) === String(r.receiptNo) && x[0] !== r.id))
      warnings.push(`Receipt no. ${r.receiptNo} is already recorded – verify before saving.`);
    if (r.billNo) {
      const billLines = data.sheets.bills.rows.filter((x) => x[1] === r.billNo);
      if (!billLines.length) warnings.push(`Bill ${r.billNo} was not found – the payment will not count against any bill.`);
      else {
        const billed = billLines.reduce((s, x) => s + (+x[9] || 0), 0);
        const paid = data.sheets.payments.rows.filter((x) => x[11] === r.billNo && x[0] !== r.id).reduce((s, x) => s + (+x[5] || 0), 0);
        if (paid + (+r.amount || 0) > billed + 0.005) warnings.push(`This payment ($${(+r.amount || 0).toLocaleString()}) is more than the balance on bill ${r.billNo} (billed $${billed.toLocaleString()}, already paid $${paid.toLocaleString()}).`);
      }
    }
    if (b.action === "delete") {
      const i = sh.rows.findIndex((x) => x[0] === r.id); if (i < 0) throw err(404, "Payment not found: " + r.id);
      sh.rows.splice(i, 1); audit("record-delete", `Payment ${r.id}`); return { id: r.id, warnings };
    }
    let id = r.id;
    const vals = [id, r.companyId, companyName(r.companyId), r.nameRecorded || companyName(r.companyId), r.purpose || null,
      r.amount !== "" && r.amount != null ? +r.amount : null, r.paymentDate || null, r.receiptNo || null,
      r.recordGroup || null, r.remarks || null, r.source || "Form entry", r.billNo || null];
    if (b.action === "new") { id = CMU.nextId(data, "payments"); vals[0] = id; sh.rows.push(vals); }
    else {
      const row = sh.rows.find((x) => x[0] === r.id); if (!row) throw err(404, "Payment not found: " + r.id);
      for (let i = 0; i < vals.length; i++) row[i] = vals[i];
    }
    audit(b.action === "new" ? "record-new" : "record-update", `Payment ${id} – ${companyName(r.companyId)}`);
    return { id, warnings };
  }

  function recIssue(b) {
    const sh = data.sheets.issues, r = b.record || {};
    if (b.action === "delete") {
      const i = sh.rows.findIndex((x) => x[0] === r.id); if (i < 0) throw err(404, "Issue not found: " + r.id);
      sh.rows.splice(i, 1); audit("record-delete", `Issue ${r.id}`); return { id: r.id };
    }
    const vals = [r.id, r.register || null, r.record || null, r.source || null, r.issueFound || null, r.actionTaken || null, r.followUpStatus || "Open"];
    if (b.action === "new") {
      if (!r.issueFound) throw err(400, "Issue Found is required");
      vals[0] = CMU.nextId(data, "issues"); sh.rows.push(vals); audit("record-new", `Issue ${vals[0]}`); return { id: vals[0] };
    }
    const row = sh.rows.find((x) => x[0] === r.id); if (!row) throw err(404, "Issue not found: " + r.id);
    for (let i = 0; i < vals.length; i++) row[i] = vals[i];
    audit("record-update", `Issue ${r.id}`); return { id: r.id };
  }

  function recCorr(b) {
    const sh = data.sheets.correspondence, r = b.record || {};
    if (b.action === "delete") {
      const i = sh.rows.findIndex((x) => x[0] === r.id); if (i < 0) throw err(404, "Record not found: " + r.id);
      sh.rows.splice(i, 1); audit("record-delete", `Correspondence ${r.id}`); return { id: r.id };
    }
    const vals = [r.id, r.companyId || null, r.companyId ? companyName(r.companyId) : null, r.nameRecorded || null,
      r.type || null, r.activity || null, r.description || null, r.refNo || null, r.dateIssued || null];
    if (b.action === "new") { vals[0] = CMU.nextId(data, "correspondence"); sh.rows.push(vals); audit("record-new", `Correspondence ${vals[0]}`); return { id: vals[0] }; }
    const row = sh.rows.find((x) => x[0] === r.id); if (!row) throw err(404, "Record not found: " + r.id);
    for (let i = 0; i < vals.length; i++) row[i] = vals[i];
    audit("record-update", `Correspondence ${r.id}`); return { id: r.id };
  }

  const RECORDS = { company: recCompany, licence: recLicence, clearance: recClearance, bill: recBill, payment: recPayment, issue: recIssue, correspondence: recCorr };

  /* ------------------------------------------------ export */
  function csvEscape(v) { if (v == null) return ""; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function exportCsv(key) {
    const sheet = data.sheets[key]; if (!sheet) throw err(404, "Unknown sheet");
    const def = CMU.SHEETS[key];
    const headers = def ? def.columns.map((c) => c.label) : sheet.headers;
    const lines = [headers.map(csvEscape).join(",")];
    sheet.rows.forEach((row, ri) => {
      lines.push(headers.map((h, ci) => {
        const colDef = def ? def.columns[ci] : null;
        if (colDef && (colDef.calc || colDef.calcJoin)) return CMU.displayValue(data, key, ri, ci);
        return row[ci];
      }).map(csvEscape).join(","));
    });
    return { csv: lines.join("\r\n"), name: "CMU " + sheet.name + ".csv" };
  }

  /* ------------------------------------------------ fetch interception */
  function jsonResponse(code, obj) {
    return Promise.resolve({ ok: code >= 200 && code < 300, status: code, json: () => Promise.resolve(obj) });
  }
  function download(filename, text, type) {
    const mime = type || "text/plain";
    let href;
    try { href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: mime })); }
    catch (e) { href = "data:" + mime + ";charset=utf-8," + encodeURIComponent("\ufeff" + text); }
    const a = document.createElement("a");
    a.href = href; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }

  const fails = new Map();
  function handle(method, path, body, token) {
    const user = token ? sessions.get(token) || null : session;
    const needUser = () => { if (settings.loginRequired && !user) throw err(401, "Sign in required"); if (settings.loginRequired && user && user.role === "Viewer") throw err(403, "Viewer accounts cannot change records"); };
    const needAdmin = () => { if (!user || user.role !== "Admin") throw err(403, "Administrator sign-in required for this action"); };

    if (path === "/api/data" && method === "GET") return publicData();
    if (path === "/api/me" && method === "GET") return { user: session ? { username: session.username, fullName: session.fullName, role: session.role } : null, loginRequired: settings.loginRequired };
    if (path === "/api/next-ids" && method === "GET") return nextIds();
    if (path === "/api/macro" && method === "GET") return { code: window.CMU_MACRO_TEXT || "" };
    if (path === "/api/audit" && method === "GET") return { entries: data._app.audit.slice().reverse(), me: session ? session.fullName + " (" + session.role + ")" : null };
    if (path.startsWith("/api/export/") && method === "GET") { const key = path.slice("/api/export/".length).replace(/\.csv$/, ""); return exportCsv(key); }
    if (path === "/api/backup" && method === "GET") return publicData();
    if (path === "/api/ops" && method === "POST") { needUser(); return applyOps(body.ops); }
    if (path.startsWith("/api/record/") && method === "POST") {
      needUser();
      const fn = RECORDS[path.slice("/api/record/".length)];
      if (!fn) throw err(404, "Unknown record type");
      return Object.assign({ ok: true, nextIds: nextIds() }, fn(body));
    }
    if (path === "/api/settings/lists" && method === "POST") {
      needUser();
      if (body.lists) for (const [k, v] of Object.entries(body.lists)) if (Array.isArray(v)) data.lists[k] = v.map((x) => (typeof x === "string" ? x.trim() : x)).filter(Boolean);
      if (body.printSettings) Object.assign(data.printSettings, body.printSettings);
      audit("settings", "Dropdown lists / print settings updated"); saveNow(); return { ok: true };
    }
    if (path === "/api/settings/fees" && method === "POST") {
      needUser();
      if (body.services) data.fees.services = body.services;
      if (body.billTypes) data.fees.billTypes = body.billTypes;
      audit("settings", "Fee schedule updated"); saveNow(); return { ok: true };
    }
    if (path === "/api/login" && method === "POST") {
      const u = data._app.users.find((x) => x.username === String(body.username || ""));
      const f = fails.get(body.username) || { count: 0, until: 0 };
      if (f.until > Date.now()) throw err(429, `Too many failed attempts – try again in ${Math.ceil((f.until - Date.now()) / 60000)} minute(s)`);
      if (!u || !u.active || u.hash !== hashPw(String(body.password || ""), u.salt)) {
        f.count++; if (f.count >= 5) { f.until = Date.now() + 600000; f.count = 0; }
        fails.set(String(body.username), f); throw err(401, "Wrong username or password");
      }
      fails.delete(String(body.username));
      const tk = "off-" + Math.random().toString(36).slice(2);
      sessions.set(tk, { username: u.username, fullName: u.fullName, role: u.role });
      session = sessions.get(tk);
      u.lastLogin = new Date().toISOString();
      audit("login", u.fullName + " signed in (offline edition)"); saveNow();
      return { token: tk, user: { username: u.username, fullName: u.fullName, role: u.role }, mustChange: !!u.mustChange };
    }
    if (path === "/api/logout" && method === "POST") { if (session) audit("logout", session.fullName + " signed out"); session = null; sessions.clear(); return { ok: true }; }
    if (path === "/api/password" && method === "POST") {
      if (!session) throw err(400, "Sign in first to change a password");
      const acc = data._app.users.find((x) => x.username === session.username);
      if (!acc || acc.hash !== hashPw(String(body.oldPassword || ""), acc.salt)) throw err(400, "Current password is wrong");
      if (!body.newPassword || String(body.newPassword).length < 6) throw err(400, "New password must be at least 6 characters");
      acc.hash = hashPw(String(body.newPassword), acc.salt); acc.mustChange = false;
      audit("password", acc.username + " changed their password"); saveNow(); return { ok: true };
    }
    if (path === "/api/users" && method === "GET") {
      needAdmin();
      return { users: data._app.users.map((u) => ({ username: u.username, fullName: u.fullName, role: u.role, active: u.active, created: u.created, lastLogin: u.lastLogin, mustChange: u.mustChange })) };
    }
    if (path === "/api/users/save" && method === "POST") {
      needAdmin();
      const b = body; let u = data._app.users.find((x) => x.username === b.username);
      if (b.action === "delete") {
        if (u && u.username === session.username) throw err(400, "You cannot delete your own account");
        data._app.users = data._app.users.filter((x) => x.username !== b.username);
        audit("users", `Deleted user ${b.username}`); saveNow(); return { ok: true };
      }
      if (!u) {
        const salt = Math.random().toString(36).slice(2, 11);
        u = { username: b.username, fullName: b.fullName || b.username, role: b.role || "Officer", active: true, salt, hash: hashPw(b.newPassword || "Welcome@2026", salt), created: new Date().toISOString().slice(0, 10), lastLogin: null, mustChange: true };
        data._app.users.push(u);
      } else {
        if (b.fullName != null) u.fullName = b.fullName;
        if (b.role != null) u.role = b.role;
        if (b.active != null) u.active = !!b.active;
        if (b.newPassword) { u.salt = Math.random().toString(36).slice(2, 11); u.hash = hashPw(String(b.newPassword), u.salt); u.mustChange = true; }
      }
      audit("users", `Saved user ${b.username}`); saveNow(); return { ok: true };
    }
    if (path === "/api/settings/mode" && method === "POST") {
      needAdmin();
      if (body.loginRequired != null) { settings.loginRequired = !!body.loginRequired; data._app.settings = settings; saveNow(); audit("settings", (settings.loginRequired ? "Enabled" : "Disabled") + " sign-in requirement"); }
      return { loginRequired: settings.loginRequired };
    }
    if (path === "/api/restore" && method === "POST") {
      needAdmin();
      const payload = body.data || body;
      if (!payload || !payload.sheets || !payload.sheets.companies) throw err(400, "Not a valid CMU backup file");
      data = payload; if (!data._app) data._app = { users: seedUsers(), audit: [] };
      session = null; sessions.clear();
      audit("restore", "Database restored from a backup file"); saveNow(); return { ok: true };
    }
    if (path === "/api/reset" && method === "POST") {
      if (settings.loginRequired && (!session || session.role !== "Admin")) throw err(403, "Administrator sign-in required");
      const keep = data._app;
      data = clone(BASE); data._app = keep;
      audit("reset", "Database reset to the original upload"); saveNow(); return { ok: true };
    }
    throw err(404, "Unknown API endpoint: " + path);
  }

  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (url, opts) {
    if (typeof url === "string" && url.indexOf("/api/") === 0) {
      const method = (opts && opts.method) || "GET";
      let body = {};
      if (opts && opts.body) { try { body = JSON.parse(opts.body); } catch (e) {} }
      const token = (opts && opts.headers && (opts.headers["X-CMU-Token"] || opts.headers["x-cmu-token"])) || "";
      try { return jsonResponse(200, handle(method, url.split("?")[0], body, token)); }
      catch (e) { return jsonResponse(e.status || 500, { error: e.message || "Error" }); }
    }
    if (typeof url === "string" && url === "/css/app.css") {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(window.CMU_CSS_TEXT || "") });
    }
    return realFetch ? realFetch(url, opts) : Promise.reject(new Error("Offline edition – no network"));
  };

  const realOpen = window.open;
  window.open = function (u) {
    if (typeof u === "string" && u.indexOf("/api/export/") === 0) {
      try { const r = exportCsv(u.slice("/api/export/".length).replace(/\.csv$/, "")); download(r.name, r.csv, "text/csv"); toast("CSV export started", "good"); }
      catch (e) { toast("Export failed: " + esc(e.message), "bad"); }
      return {};
    }
    if (typeof u === "string" && u === "/api/backup") {
      download(`cmu-database-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(publicData(), null, 1), "application/json");
      toast("Backup download started", "good");
      return {};
    }
    return realOpen ? realOpen.apply(window, arguments) : {};
  };

  window.CMU_OFFLINE_INFO = {
    storage: canStore,
    reset: function () { if (canStore) { try { localStorage.removeItem(LS_KEY); } catch (e) {} } data = clone(BASE); data._app = { users: seedUsers(), audit: [] }; saveNow(); },
  };
})();
