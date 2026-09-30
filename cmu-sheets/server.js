#!/usr/bin/env node
/* CMU Sheets server — zero-dependency Node.js (http only).
 * Serves the frontend, the dataset, and a JSON API with:
 *   cell/row editing, record forms, lists & fee settings, users & auth, audit log,
 *   CSV export, backup/restore/reset. Data persists to data/cmu-live.json.
 * Run: node server.js   (or npm start)  — defaults to port 3000, HOST 0.0.0.0 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const querystring = require("querystring");

const CMU = require("./public/jslib/cmu.js");

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = path.join(__dirname, "data");
const BASE_FILE = path.join(DATA_DIR, "cmu-base.json");
const LIVE_FILE = path.join(DATA_DIR, "cmu-live.json");
const MACRO_FILE = path.join(DATA_DIR, "macro-code.txt");

/* ------------------------------------------------------------------ data layer */
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function loadBase() { return JSON.parse(fs.readFileSync(BASE_FILE, "utf8")); }

function loadLive() {
  try {
    const d = JSON.parse(fs.readFileSync(LIVE_FILE, "utf8"));
    if (d && d.sheets) return d;
  } catch (e) { /* no live overlay yet */ }
  return null;
}

let data = loadLive() || loadBase();
let liveDirty = false;
let saveTimer = null;

function persist() {
  liveDirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!liveDirty) return;
    try {
      fs.writeFileSync(LIVE_FILE + ".tmp", JSON.stringify(data));
      fs.renameSync(LIVE_FILE + ".tmp", LIVE_FILE);
      liveDirty = false;
    } catch (e) { console.error("persist failed:", e.message); }
  }, 400);
}

/* ------------------------------------------------------------------ state: users, sessions, audit */
function hashPassword(password, salt) {
  return crypto.createHash("sha256").update(String(salt) + ":" + String(password), "utf8").digest("hex");
}

function seedUsers(base) {
  const users = [];
  const mk = (username, fullName, role, password, mustChange) => {
    const salt = crypto.randomBytes(9).toString("hex");
    users.push({
      username, fullName, role, active: true, salt, hash: hashPassword(password, salt),
      created: new Date().toISOString().slice(0, 10), lastLogin: null, mustChange: !!mustChange,
    });
  };
  mk("admin", "Administrator", "Admin", "Welcome@2026", true);
  (base.users || []).forEach((u) => { if (u.username !== "admin") mk(u.username, u.fullName, u.role, "Welcome@2026", true); });
  return users;
}

let settings = {
  loginRequired: false, // matches the workbook's "No-login mode: full access enabled"
  demoBanner: true,
};

if (!data._app) data._app = {};
if (!Array.isArray(data._app.users) || !data._app.users.length) data._app.users = seedUsers(data);
if (!Array.isArray(data._app.audit)) data._app.audit = [];
if (data._app.settings) settings = Object.assign(settings, data._app.settings);

const sessions = new Map(); // token -> {username, role, fullName}
const loginFails = new Map(); // username -> {count, until}

function saveApp() {
  data._app.settings = settings;
  persist();
}

function audit(user, action, detail) {
  data._app.audit.push({ ts: new Date().toISOString(), user: user || "demo", action, detail: String(detail).slice(0, 500) });
  if (data._app.audit.length > 5000) data._app.audit.splice(0, data._app.audit.length - 5000);
  persist();
}

function findUser(username) { return data._app.users.find((u) => u.username === username); }

/* ------------------------------------------------------------------ helpers */
function publicData() {
  const d = deepClone(data);
  delete d._app;
  d.settings = { loginRequired: settings.loginRequired, demoBanner: settings.demoBanner };
  d.nextIds = nextIds();
  return d;
}

function nextIds() {
  return {
    company: CMU.nextId(data, "companies"),
    licence: CMU.nextId(data, "licences"),
    clearanceLine: CMU.nextId(data, "clearances"),
    clearanceNo: CMU.nextGroupId(data, "clearances"),
    billLine: CMU.nextId(data, "bills"),
    billNo: CMU.nextBillNo(data),
    payment: CMU.nextId(data, "payments"),
    issue: CMU.nextId(data, "issues"),
    correspondence: CMU.nextId(data, "correspondence"),
  };
}

function sheetOr404(key) {
  if (!data.sheets[key]) throw httpError(404, "Unknown sheet: " + key);
  return data.sheets[key];
}
function httpError(code, msg) { const e = new Error(msg); e.status = code; return e; }

function rowNumToIdx(sheet, rowNum) { // 1-based row number → array index
  const i = rowNum - 1;
  if (i < 0 || i >= sheet.rows.length) throw httpError(400, "Row out of range");
  return i;
}

function normalizeValue(colDef, v) {
  if (v === "" || v == null) return null;
  return v;
}

/* ------------------------------------------------------------------ API: grid ops */
function applyOps(ops, user) {
  const applied = [];
  for (const op of ops || []) {
    const sheet = sheetOr404(op.sheet);
    const def = CMU.SHEETS[op.sheet];
    if (op.op === "setCell") {
      const ri = op.row; // 0-based data row index
      if (!(ri >= 0 && ri < sheet.rows.length)) throw httpError(400, "Row out of range");
      const row = sheet.rows[ri];
      const old = row[op.col];
      if (def && def.columns[op.col] && def.columns[op.col].calc) throw httpError(400, "Column is calculated – edit the source record instead");
      while (row.length < (op.col + 1)) row.push(null);
      row[op.col] = normalizeValue(def && def.columns[op.col], op.value);
      applied.push({ op: "setCell", sheet: op.sheet, row: ri, col: op.col, from: old, to: row[op.col] });
    } else if (op.op === "insertRow") {
      const at = op.at == null ? sheet.rows.length : op.at;
      const vals = op.values || [];
      // auto id for id columns
      if (def && def.idPrefix && def.idCol != null && !vals[def.idCol]) {
        vals[def.idCol] = CMU.nextId(data, op.sheet);
      }
      if (def && def.groupPrefix && def.groupById != null && !vals[def.groupById]) {
        vals[def.groupPrefix] && (vals[def.groupById] = CMU.nextGroupId(data, op.sheet));
      }
      sheet.rows.splice(at, 0, vals);
      applied.push({ op: "deleteRow", sheet: op.sheet, at });
    } else if (op.op === "deleteRow") {
      const ri = op.row; // 0-based data row index
      if (!(ri >= 0 && ri < sheet.rows.length)) throw httpError(400, "Row out of range");
      if (op.sheet === "companies") {
        const cid = sheet.rows[ri][0];
        const used = data.sheets.licences.rows.some((r) => r[1] === cid) ||
          data.sheets.clearances.rows.some((r) => r[2] === cid) ||
          data.sheets.bills.rows.some((r) => r[2] === cid) ||
          data.sheets.payments.rows.some((r) => r[1] === cid);
        if (used) throw httpError(400, `Company ${cid} still has licences, clearances, bills or payments on record – it cannot be deleted.`);
      }
      const removed = sheet.rows.splice(ri, 1)[0];
      applied.push({ op: "insertRow", sheet: op.sheet, at: ri, values: removed });
    } else throw httpError(400, "Unknown op " + op.op);
  }
  if (applied.length) audit(user, "grid-edit", applied.map((a) => a.op + " " + a.sheet + (a.row != null ? " r" + (a.row + 1) : "")).join("; ").slice(0, 300) + (applied.length > 6 ? ` (+${applied.length - 6} more)` : ""));
  persist();
  return applied;
}

/* ------------------------------------------------------------------ API: record forms */
function companyName(companyId) {
  const co = data.sheets.companies.rows.find((r) => r[0] === companyId);
  return co ? co[1] : "";
}
function companyNameRecorded(companyId, fallback) {
  return fallback || companyName(companyId);
}

function recordCompany(body, user) {
  const sh = data.sheets.companies;
  const r = body.record || {};
  if (body.action === "new") {
    if (!r.name) throw httpError(400, "Company Name is required");
    const warnings = [];
    const dup = sh.rows.find((x) => x[1] && x[1].toLowerCase() === String(r.name).toLowerCase());
    if (dup) warnings.push(`A company with a similar name already exists: ${dup[0]} – ${dup[1]}`);
    const id = CMU.nextId(data, "companies");
    sh.rows.push([id, r.name, r.sector || null, r.location || null, r.otherNames || null, null, null, null, null, null]);
    audit(user, "record-new", `Company ${id} – ${r.name}`);
    return { id, warnings };
  }
  if (body.action === "update") {
    const row = sh.rows.find((x) => x[0] === r.id);
    if (!row) throw httpError(404, "Company not found: " + r.id);
    if (!r.name) throw httpError(400, "Company Name is required");
    row[1] = r.name; row[2] = r.sector || null; row[3] = r.location || null; row[4] = r.otherNames || null;
    audit(user, "record-update", `Company ${r.id} – ${r.name}`);
    return { id: r.id };
  }
  if (body.action === "delete") {
    const i = sh.rows.findIndex((x) => x[0] === r.id);
    if (i < 0) throw httpError(404, "Company not found: " + r.id);
    const cid = r.id;
    const used = data.sheets.licences.rows.some((x) => x[1] === cid) ||
      data.sheets.clearances.rows.some((x) => x[2] === cid) ||
      data.sheets.bills.rows.some((x) => x[2] === cid) ||
      data.sheets.payments.rows.some((x) => x[1] === cid);
    if (used) throw httpError(400, `Company ${cid} still has licences, clearances, bills or payments – it cannot be deleted.`);
    sh.rows.splice(i, 1);
    audit(user, "record-delete", `Company ${cid}`);
    return { id: cid };
  }
  throw httpError(400, "Unknown action");
}

function licenceChildren(licenceId) {
  const chems = data.sheets.licenceChemicals.rows.filter((x) => x[0] === licenceId);
  const vehicles = data.sheets.licenceVehicles.rows.filter((x) => x[0] === licenceId);
  const eff = data.sheets.licenceEffluent.rows.filter((x) => x[0] === licenceId);
  return { chems, vehicles, eff };
}

function recordLicence(body, user) {
  const sh = data.sheets.licences;
  const r = body.record || {};
  const warnings = [];
  if (r.licenceNo) {
    const dup = sh.rows.find((x) => x[10] === r.licenceNo && x[0] !== r.id);
    if (dup) warnings.push(`Licence no. ${r.licenceNo} is already recorded on ${dup[0]} (${dup[2]}) – verify before issuing.`);
  }
  if (body.action === "new" || body.action === "update") {
    if (!r.companyId) throw httpError(400, "Company is required");
    if (!r.category) throw httpError(400, "Licence Category is required");
    if (!r.type) throw httpError(400, "Licence / Certificate Type is required");
  }
  let id = r.id;
  if (body.action === "new") {
    id = CMU.nextId(data, "licences");
    sh.rows.push([id, r.companyId, companyName(r.companyId), r.nameRecorded || null, r.category, r.type, r.location || null,
      r.applicationDate || null, r.responseDate || null, r.refCode || null, r.licenceNo || null,
      r.dateIssued || null, r.expiryDate || null, null, r.remarks || null, r.source || "Form entry", r.billNo || null]);
  } else if (body.action === "update") {
    const row = sh.rows.find((x) => x[0] === r.id);
    if (!row) throw httpError(404, "Licence not found: " + r.id);
    row[1] = r.companyId; row[2] = companyName(r.companyId); row[3] = r.nameRecorded || null;
    row[4] = r.category; row[5] = r.type; row[6] = r.location || null;
    row[7] = r.applicationDate || null; row[8] = r.responseDate || null; row[9] = r.refCode || null;
    row[10] = r.licenceNo || null; row[11] = r.dateIssued || null; row[12] = r.expiryDate || null;
    row[14] = r.remarks || null; row[16] = r.billNo || null;
  } else if (body.action === "delete") {
    const i = sh.rows.findIndex((x) => x[0] === r.id);
    if (i < 0) throw httpError(404, "Licence not found: " + r.id);
    sh.rows.splice(i, 1);
    data.sheets.licenceChemicals.rows = data.sheets.licenceChemicals.rows.filter((x) => x[0] !== r.id);
    data.sheets.licenceVehicles.rows = data.sheets.licenceVehicles.rows.filter((x) => x[0] !== r.id);
    data.sheets.licenceEffluent.rows = data.sheets.licenceEffluent.rows.filter((x) => x[0] !== r.id);
    audit(user, "record-delete", `Licence ${r.id} (with its chemicals, vehicles and effluent lines)`);
    return { id: r.id, warnings };
  } else throw httpError(400, "Unknown action");

  // children: chemicals / vehicles / effluent
  data.sheets.licenceChemicals.rows = data.sheets.licenceChemicals.rows.filter((x) => x[0] !== id);
  (r.chemicals || []).forEach((c, i) => {
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
  const effRows = [];
  (r.effluent || []).forEach((e) => {
    if (e.receivingWater != null && e.receivingWater !== "") effRows.push([id, r.licenceNo || null, companyName(r.companyId), "Setting", 1, "Receiving water", e.receivingWater, null, null, null, null, null, null]);
    if (e.maxVolume != null && e.maxVolume !== "") effRows.push([id, r.licenceNo || null, companyName(r.companyId), "Setting", 2, "Max. volume (m³/day)", e.maxVolume, null, null, null, null, null, null]);
    if (e.dischargePoint != null && e.dischargePoint !== "") effRows.push([id, r.licenceNo || null, companyName(r.companyId), "Setting", 3, "Discharge point / facility", e.dischargePoint, null, null, null, null, null, null]);
  });
  (r.limits || []).forEach((l, i) => {
    if (!l.parameter && !l.limit) return;
    effRows.push([id, r.licenceNo || null, companyName(r.companyId), "Limit", i + 1, l.parameter || null, l.unit || null, l.limit != null && l.limit !== "" ? l.limit : null, l.sampleType || null, l.testingSchedule || null, l.stage || null, null, null]);
  });
  (r.coordinates || []).forEach((c, i) => {
    if (!c.vertex && !c.easting && !c.northing) return;
    effRows.push([id, r.licenceNo || null, companyName(r.companyId), "Coordinate", i + 1, c.table || null, c.vertex || null, c.easting != null && c.easting !== "" ? c.easting : null, c.northing != null && c.northing !== "" ? c.northing : null, null, null, null, null]);
  });
  (r.sources || []).forEach((s, i) => {
    if (!s.source && !s.receivingUnit && !s.x) return;
    effRows.push([id, r.licenceNo || null, companyName(r.companyId), "Source", i + 1, s.source || null, s.receivingUnit || null, s.x != null && s.x !== "" ? s.x : null, s.y != null && s.y !== "" ? s.y : null, null, null, null, null]);
  });
  data.sheets.licenceEffluent.rows.push(...effRows);
  audit(user, body.action === "new" ? "record-new" : "record-update",
    `Licence ${id} – ${companyName(r.companyId)} (${r.category})` + (effRows.length ? ` · ${effRows.length} effluent/geo line(s)` : ""));
  return { id, warnings };
}

function recordClearance(body, user) {
  const sh = data.sheets.clearances;
  const r = body.record || {};
  const warnings = [];
  const lines = (r.lines || []).filter((l) => (l.chemicalStandard || l.chemicalRecorded || l.qty));
  if (body.action !== "delete") {
    if (!r.companyId) throw httpError(400, "Company is required");
    if (!r.clearanceDate) throw httpError(400, "Clearance Date is required");
    if (!lines.length) throw httpError(400, "At least one chemical line is required");
  }
  let clearanceNo = r.clearanceNo;
  if (body.action === "new") {
    clearanceNo = CMU.nextGroupId(data, "clearances");
  } else if (body.action !== "delete") {
    if (!clearanceNo) throw httpError(400, "Clearance No. is required to update");
  }
  if (body.action === "delete") {
    const before = sh.rows.length;
    data.sheets.clearances.rows = sh.rows.filter((x) => x[1] !== clearanceNo);
    if (data.sheets.clearances.rows.length === before) throw httpError(404, "Clearance not found: " + clearanceNo);
    audit(user, "record-delete", `Clearance ${clearanceNo} (${before - data.sheets.clearances.rows.length} line(s))`);
    return { clearanceNo, warnings };
  }
  // replace all lines of this clearance
  data.sheets.clearances.rows = sh.rows.filter((x) => x[1] !== clearanceNo);
  lines.forEach((l) => {
    const id = CMU.nextId(data, "clearances");
    sh.rows.push([id, clearanceNo, r.companyId, companyName(r.companyId),
      l.chemicalRecorded || l.chemicalStandard || null, l.chemicalStandard || null,
      l.qty != null && l.qty !== "" ? +l.qty : null, l.unit || null, null, null,
      l.blNo || r.blNoDefault || null, r.refNo || null, r.clearanceDate || null,
      r.remarks || null, r.source || "Form entry", r.eta || null, r.billNo || null]);
  });
  audit(user, body.action === "new" ? "record-new" : "record-update",
    `Clearance ${clearanceNo} – ${companyName(r.companyId)} · ${lines.length} chemical line(s)`);
  return { clearanceNo, warnings };
}

function recordBill(body, user) {
  const sh = data.sheets.bills;
  const r = body.record || {};
  const lines = (r.lines || []).filter((l) => (l.service || l.amount != null));
  if (body.action !== "delete") {
    if (!r.companyId) throw httpError(400, "Company is required");
    if (!r.billDate) throw httpError(400, "Bill Date is required");
    if (!r.billType) throw httpError(400, "Bill Type is required");
    if (!lines.length) throw httpError(400, "At least one service line is required");
    lines.forEach((l) => { if (l.amount == null || l.amount === "" || isNaN(+l.amount)) throw httpError(400, "Every service line needs an amount"); });
  }
  let billNo = r.billNo;
  if (body.action === "new") billNo = CMU.nextBillNo(data);
  else if (body.action !== "delete" && !billNo) throw httpError(400, "Bill No. is required to update");

  if (body.action === "delete") {
    const before = sh.rows.length;
    data.sheets.bills.rows = sh.rows.filter((x) => x[1] !== billNo);
    if (data.sheets.bills.rows.length === before) throw httpError(404, "Bill not found: " + billNo);
    audit(user, "record-delete", `Bill ${billNo} (${before - data.sheets.bills.rows.length} line(s))`);
    return { billNo };
  }
  data.sheets.bills.rows = sh.rows.filter((x) => x[1] !== billNo);
  lines.forEach((l) => {
    const id = CMU.nextId(data, "bills");
    sh.rows.push([id, billNo, r.companyId, companyName(r.companyId), r.nameRecorded || companyName(r.companyId),
      r.activity || null, r.location || null, l.service || null, l.details || null, +l.amount || 0,
      r.billDate || null, null, null, null, r.source || "Form entry", r.billRefNo || null,
      r.contactPerson || null, r.contactTitle || null, r.billType || null, null, null, r.linkedRecord || null]);
  });
  audit(user, body.action === "new" ? "record-new" : "record-update",
    `Bill ${billNo} – ${companyName(r.companyId)} · ${lines.length} service line(s) · $${lines.reduce((s, l) => s + (+l.amount || 0), 0).toLocaleString()}`);
  return { billNo };
}

function recordPayment(body, user) {
  const sh = data.sheets.payments;
  const r = body.record || {};
  const warnings = [];
  if (body.action !== "delete") {
    if (!r.companyId) throw httpError(400, "Company is required");
    if (!r.purpose) throw httpError(400, "Purpose / Services is required");
    if (r.amount == null || r.amount === "" || isNaN(+r.amount)) throw httpError(400, "Amount (USD) is required");
    if (!r.paymentDate) throw httpError(400, "Payment Date is required");
  }
  if (r.receiptNo) {
    const dup = sh.rows.find((x) => String(x[7]) === String(r.receiptNo) && x[0] !== r.id);
    if (dup) warnings.push(`Receipt no. ${r.receiptNo} is already recorded on ${dup[0]} (${dup[2]}, ${dup[6]}) – verify before saving.`);
  }
  if (r.billNo) {
    const billLines = data.sheets.bills.rows.filter((x) => x[1] === r.billNo);
    if (!billLines.length) warnings.push(`Bill ${r.billNo} was not found – the payment will not count against any bill.`);
    else {
      const billed = billLines.reduce((s, x) => s + (+x[9] || 0), 0);
      const paid = data.sheets.payments.rows.filter((x) => x[11] === r.billNo && x[0] !== r.id).reduce((s, x) => s + (+x[5] || 0), 0);
      if (paid + (+r.amount || 0) > billed + 0.005) warnings.push(`This payment ($${(+r.amount || 0).toLocaleString()}) is more than the balance on bill ${r.billNo} (billed $${billed.toLocaleString()}, already paid $${paid.toLocaleString()}).`);
    }
  }
  if (body.action === "delete") {
    const i = sh.rows.findIndex((x) => x[0] === r.id);
    if (i < 0) throw httpError(404, "Payment not found: " + r.id);
    sh.rows.splice(i, 1);
    audit(user, "record-delete", `Payment ${r.id}`);
    return { id: r.id, warnings };
  }
  let id = r.id;
  const vals = [id, r.companyId, companyName(r.companyId), r.nameRecorded || companyName(r.companyId), r.purpose || null,
    r.amount != null && r.amount !== "" ? +r.amount : null, r.paymentDate || null, r.receiptNo != null && r.receiptNo !== "" ? r.receiptNo : null,
    r.recordGroup || null, r.remarks || null, r.source || "Form entry", r.billNo || null];
  if (body.action === "new") {
    id = CMU.nextId(data, "payments");
    vals[0] = id;
    sh.rows.push(vals);
  } else {
    const row = sh.rows.find((x) => x[0] === r.id);
    if (!row) throw httpError(404, "Payment not found: " + r.id);
    for (let i2 = 0; i2 < vals.length; i2++) row[i2] = vals[i2];
  }
  audit(user, body.action === "new" ? "record-new" : "record-update", `Payment ${id} – ${companyName(r.companyId)} · $${(+r.amount || 0).toLocaleString()}`);
  return { id, warnings };
}

function recordIssue(body, user) {
  const sh = data.sheets.issues;
  const r = body.record || {};
  if (body.action === "delete") {
    const i = sh.rows.findIndex((x) => x[0] === r.id);
    if (i < 0) throw httpError(404, "Issue not found: " + r.id);
    sh.rows.splice(i, 1);
    audit(user, "record-delete", `Issue ${r.id}`);
    return { id: r.id };
  }
  const vals = [r.id, r.register || null, r.record || null, r.source || null, r.issueFound || null, r.actionTaken || null, r.followUpStatus || "Open"];
  if (body.action === "new") {
    if (!r.issueFound) throw httpError(400, "Issue Found is required");
    vals[0] = CMU.nextId(data, "issues");
    sh.rows.push(vals);
    audit(user, "record-new", `Issue ${vals[0]}`);
    return { id: vals[0] };
  }
  const row = sh.rows.find((x) => x[0] === r.id);
  if (!row) throw httpError(404, "Issue not found: " + r.id);
  for (let i = 0; i < vals.length; i++) row[i] = vals[i];
  audit(user, "record-update", `Issue ${r.id}`);
  return { id: r.id };
}

function recordCorrespondence(body, user) {
  const sh = data.sheets.correspondence;
  const r = body.record || {};
  if (body.action === "delete") {
    const i = sh.rows.findIndex((x) => x[0] === r.id);
    if (i < 0) throw httpError(404, "Record not found: " + r.id);
    sh.rows.splice(i, 1);
    audit(user, "record-delete", `Correspondence ${r.id}`);
    return { id: r.id };
  }
  const vals = [r.id, r.companyId || null, r.companyId ? companyName(r.companyId) : null, r.nameRecorded || null,
    r.type || null, r.activity || null, r.description || null, r.refNo || null, r.dateIssued || null];
  if (body.action === "new") {
    vals[0] = CMU.nextId(data, "correspondence");
    sh.rows.push(vals);
    audit(user, "record-new", `Correspondence ${vals[0]}`);
    return { id: vals[0] };
  }
  const row = sh.rows.find((x) => x[0] === r.id);
  if (!row) throw httpError(404, "Record not found: " + r.id);
  for (let i = 0; i < vals.length; i++) row[i] = vals[i];
  audit(user, "record-update", `Correspondence ${r.id}`);
  return { id: r.id };
}

const RECORDS = {
  company: recordCompany, licence: recordLicence, clearance: recordClearance,
  bill: recordBill, payment: recordPayment, issue: recordIssue, correspondence: recordCorrespondence,
};

/* ------------------------------------------------------------------ API: settings */
function saveLists(body, user) {
  if (body.lists) {
    for (const [k, v] of Object.entries(body.lists)) {
      if (Array.isArray(v)) data.lists[k] = v.map((x) => (typeof x === "string" ? x.trim() : x)).filter(Boolean);
    }
    audit(user, "settings", "Dropdown lists updated: " + Object.keys(body.lists).join(", "));
  }
  if (body.printSettings) {
    Object.assign(data.printSettings, body.printSettings);
    audit(user, "settings", "Print settings updated: " + Object.keys(body.printSettings).join(", "));
  }
  persist();
}
function saveFees(body, user) {
  if (body.services) { data.fees.services = body.services; audit(user, "settings", "Fee schedule services updated"); }
  if (body.billTypes) { data.fees.billTypes = body.billTypes; audit(user, "settings", "Bill types & letter wording updated"); }
  persist();
}

/* ------------------------------------------------------------------ API: users & auth */
function currentUser(req) {
  const auth = req.headers["x-cmu-token"] || "";
  return sessions.get(auth) || null;
}
function requireAdmin(req) {
  const u = currentUser(req);
  if (!u || u.role !== "Admin") throw httpError(403, "Administrator sign-in required for this action");
  return u;
}

function handleAuth(req, body, resJson) {
  const url = req.url;
  if (url === "/api/login") {
    const { username, password } = body;
    const u = findUser(String(username || ""));
    const fails = loginFails.get(username) || { count: 0, until: 0 };
    if (fails.until > Date.now()) throw httpError(429, `Too many failed attempts – try again in ${Math.ceil((fails.until - Date.now()) / 60000)} minute(s)`);
    if (!u || !u.active || u.hash !== hashPassword(String(password || ""), u.salt)) {
      fails.count++;
      if (fails.count >= 5) { fails.until = Date.now() + 10 * 60 * 1000; fails.count = 0; }
      loginFails.set(String(username), fails);
      throw httpError(401, "Wrong username or password");
    }
    loginFails.delete(String(username));
    const token = crypto.randomBytes(18).toString("hex");
    sessions.set(token, { username: u.username, fullName: u.fullName, role: u.role });
    u.lastLogin = new Date().toISOString();
    u.mustChange = !!u.mustChange;
    persist();
    audit(u.username, "login", u.fullName + " signed in");
    return { token, user: { username: u.username, fullName: u.fullName, role: u.role }, mustChange: u.mustChange };
  }
  if (url === "/api/logout") {
    const u = currentUser(req);
    if (u) { audit(u.username, "logout", u.fullName + " signed out"); sessions.delete(req.headers["x-cmu-token"]); }
    return { ok: true };
  }
  if (url === "/api/password") {
    const u = currentUser(req) || (settings.loginRequired ? null : { username: "demo", fullName: "Demo mode", role: "Officer" });
    if (req.headers["x-cmu-token"]) {
      const acc = findUser(u.username);
      const { oldPassword, newPassword } = body;
      if (!acc || acc.hash !== hashPassword(String(oldPassword || ""), acc.salt)) throw httpError(400, "Current password is wrong");
      if (!newPassword || String(newPassword).length < 6) throw httpError(400, "New password must be at least 6 characters");
      acc.hash = hashPassword(String(newPassword), acc.salt);
      acc.mustChange = false;
      persist();
      audit(acc.username, "password", acc.username + " changed their password");
      return { ok: true };
    }
    throw httpError(400, "Sign in first to change a password");
  }
  if (url === "/api/users") {
    requireAdmin(req);
    return { users: data._app.users.map((u) => ({ username: u.username, fullName: u.fullName, role: u.role, active: u.active, created: u.created, lastLogin: u.lastLogin, mustChange: u.mustChange })) };
  }
  if (url === "/api/users/save") {
    const admin = requireAdmin(req);
    const { username, fullName, role, active, newPassword, action } = body;
    let u = findUser(username);
    if (action === "delete") {
      if (u.username === admin.username) throw httpError(400, "You cannot delete your own account");
      data._app.users = data._app.users.filter((x) => x.username !== username);
      audit(admin.username, "users", `Deleted user ${username}`);
      persist();
      return { ok: true };
    }
    if (!u) {
      if (!username || !/^[a-z0-9._-]{3,20}$/i.test(username)) throw httpError(400, "Username must be 3–20 characters (letters, numbers, . _ -)");
      const salt = crypto.randomBytes(9).toString("hex");
      u = { username, fullName: fullName || username, role: role || "Officer", active: true, salt, hash: hashPassword(newPassword || "Welcome@2026", salt), created: new Date().toISOString().slice(0, 10), lastLogin: null, mustChange: true };
      data._app.users.push(u);
      audit(admin.username, "users", `Added user ${username} (${u.role})`);
    } else {
      if (fullName != null) u.fullName = fullName;
      if (role != null) u.role = role;
      if (active != null) u.active = !!active;
      if (newPassword) { u.salt = crypto.randomBytes(9).toString("hex"); u.hash = hashPassword(String(newPassword), u.salt); u.mustChange = true; }
      audit(admin.username, "users", `Updated user ${username}`);
    }
    persist();
    return { ok: true };
  }
  if (url === "/api/settings/mode") {
    const admin = requireAdmin(req);
    if (body.loginRequired != null) { settings.loginRequired = !!body.loginRequired; saveApp(); audit(admin.username, "settings", (settings.loginRequired ? "Enabled" : "Disabled") + " sign-in requirement"); }
    return { loginRequired: settings.loginRequired };
  }
  throw httpError(404, "Not found");
}

/* ------------------------------------------------------------------ CSV export */
function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function exportCsv(key, withComputed) {
  const sheet = sheetOr404(key);
  const def = CMU.SHEETS[key];
  const headers = def ? def.columns.map((c) => c.label) : sheet.headers;
  const lines = [headers.map(csvEscape).join(",")];
  sheet.rows.forEach((row, ri) => {
    const vals = headers.map((h, ci) => {
      const colDef = def ? def.columns[ci] : null;
      if (withComputed && colDef && (colDef.calc || colDef.calcJoin)) {
        const v = CMU.displayValue(data, key, ri, ci);
        return v;
      }
      return row[ci];
    });
    lines.push(vals.map(csvEscape).join(","));
  });
  return lines.join("\r\n");
}

/* ------------------------------------------------------------------ static server */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon", ".woff2": "font/woff2",
};
function serveStatic(req, res) {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  if (p === "/macro-code.txt") p = "/macro-code.txt";
  const root = p.startsWith("/jslib/") || p.startsWith("/macro-code.txt") ? path.join(__dirname, "public") : path.join(__dirname, "public");
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(path.join(__dirname, "public"))) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(file, (err, buf) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(__dirname, "public", "index.html"), (e2, idx) => {
        if (e2) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(idx);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
}

/* ------------------------------------------------------------------ request plumbing */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > 25e6) { reject(httpError(413, "Body too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) {
        try { resolve(querystring.parse(raw)); } catch (e2) { resolve({}); }
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

async function handleApi(req, res) {
  try {
    const url = req.url.split("?")[0];
    const method = req.method;
    const body = method === "GET" ? {} : await readBody(req);

    if (url === "/api/data" && method === "GET") return sendJson(res, 200, publicData());
    if (url === "/api/me" && method === "GET") {
      const u = currentUser(req);
      return sendJson(res, 200, { user: u ? { username: u.username, fullName: u.fullName, role: u.role } : null, loginRequired: settings.loginRequired });
    }
    if (url === "/api/next-ids" && method === "GET") return sendJson(res, 200, nextIds());
    if (url === "/api/macro" && method === "GET") {
      const txt = fs.readFileSync(MACRO_FILE, "utf8");
      return sendJson(res, 200, { code: txt });
    }
    if (url === "/api/audit" && method === "GET") {
      const u = currentUser(req);
      const entries = data._app.audit.slice().reverse();
      return sendJson(res, 200, { entries, me: u ? u.fullName + " (" + u.role + ")" : null });
    }
    if (url.startsWith("/api/export/") && method === "GET") {
      const key = url.slice("/api/export/".length).replace(/\.csv$/, "");
      const csv = exportCsv(key, true);
      res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="CMU ${data.sheets[key] ? data.sheets[key].name : key}.csv"` });
      return res.end("\uFEFF" + csv);
    }
    if (url === "/api/backup" && method === "GET") {
      const d = deepClone(publicData());
      res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="cmu-database-backup-${new Date().toISOString().slice(0, 10)}.json"` });
      return res.end(JSON.stringify(d, null, 1));
    }
    if (url === "/api/restore" && method === "POST") {
      requireAdmin(req);
      const payload = body.data || body;
      if (!payload || !payload.sheets || !payload.sheets.companies) throw httpError(400, "Not a valid CMU backup file");
      data = payload;
      if (!data._app) data._app = {};
      if (!Array.isArray(data._app.users) || !data._app.users.length) data._app.users = seedUsers(data);
      if (!Array.isArray(data._app.audit)) data._app.audit = [];
      audit(currentUser(req).username, "restore", "Database restored from a backup file");
      persist();
      return sendJson(res, 200, { ok: true });
    }
    if (url === "/api/reset" && method === "POST") {
      const u = currentUser(req);
      if (settings.loginRequired && (!u || u.role !== "Admin")) throw httpError(403, "Administrator sign-in required");
      const keepUsers = data._app;
      data = loadBase();
      data._app = keepUsers;
      audit(u ? u.username : "demo", "reset", "Database reset to the original upload");
      persist();
      return sendJson(res, 200, { ok: true });
    }
    if (url === "/api/ops" && method === "POST") {
      const u = currentUser(req);
      if (settings.loginRequired && !u) throw httpError(401, "Sign in required");
      const viewerBlocked = settings.loginRequired && u && u.role === "Viewer";
      if (viewerBlocked) throw httpError(403, "Viewer accounts cannot change records");
      const applied = applyOps(body.ops, u ? u.username : "demo");
      return sendJson(res, 200, { applied: applied.length, nextIds: nextIds() });
    }
    if (url.startsWith("/api/record/") && method === "POST") {
      const u = currentUser(req);
      if (settings.loginRequired && !u) throw httpError(401, "Sign in required");
      if (settings.loginRequired && u && u.role === "Viewer") throw httpError(403, "Viewer accounts cannot change records");
      const kind = url.slice("/api/record/".length);
      const fn = RECORDS[kind];
      if (!fn) throw httpError(404, "Unknown record type");
      const result = fn(body, u ? u.username : "demo");
      return sendJson(res, 200, Object.assign({ ok: true, nextIds: nextIds() }, result));
    }
    if (url === "/api/settings/lists" && method === "POST") {
      const u = currentUser(req);
      if (settings.loginRequired && (!u || u.role === "Viewer")) throw httpError(403, settings.loginRequired ? "Viewer accounts cannot change settings" : "Sign in required");
      saveLists(body, u ? u.username : "demo");
      return sendJson(res, 200, { ok: true });
    }
    if (url === "/api/settings/fees" && method === "POST") {
      const u = currentUser(req);
      if (settings.loginRequired && (!u || u.role === "Viewer")) throw httpError(403, settings.loginRequired ? "Viewer accounts cannot change settings" : "Sign in required");
      saveFees(body, u ? u.username : "demo");
      return sendJson(res, 200, { ok: true });
    }
    if (url.startsWith("/api/auth/") || url === "/api/login" || url === "/api/logout" || url === "/api/password" || url === "/api/users" || url === "/api/users/save" || url === "/api/settings/mode") {
      const getOk = url === "/api/users" && method === "GET";
      if (!getOk && method !== "POST") throw httpError(405, "POST required");
      return sendJson(res, 200, handleAuth(req, body, sendJson));
    }
    throw httpError(404, "Unknown API endpoint: " + url);
  } catch (e) {
    return sendJson(res, e.status || 500, { error: e.message || "Server error" });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) return handleApi(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  const counts = Object.entries(data.sheets).map(([k, v]) => `${k}:${v.rows.length}`).join(" ");
  console.log(`CMU Sheets running → http://${HOST}:${PORT}`);
  console.log(`  sheets: ${counts}`);
  console.log(`  users : ${data._app.users.length} · sign-in ${settings.loginRequired ? "REQUIRED" : "optional (demo mode, full access)"}`);
  console.log(`  data  : ${loadLive() ? "live overlay" : "base (first edit creates the live overlay)"}`);
});
