#!/usr/bin/env node
/* Smoke test — exercises the whole API surface with fetch (Node 18+).
 * Run with the server up:  node tools/smoke.js [base-url]  */
"use strict";
const BASE = process.argv[2] || "http://localhost:3000";
let failures = 0;

async function req(method, url, body, headers = {}) {
  const res = await fetch(BASE + url, { method, headers: { "Content-Type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, json };
}
function check(name, cond, extra) {
  if (cond) console.log("  ✔", name);
  else { failures++; console.log("  ✘", name, extra || ""); }
}

(async () => {
  console.log("CMU Sheets smoke test →", BASE);

  // static
  const idx = await fetch(BASE + "/").then((r) => r.text());
  check("index.html served", idx.includes("CMU Database"));
  const css = await fetch(BASE + "/css/app.css").then((r) => r.status);
  check("css served", css === 200);
  const lib = await fetch(BASE + "/jslib/cmu.js").then((r) => r.status);
  check("jslib served", lib === 200);

  // data
  const data = (await req("GET", "/api/data")).json;
  check("data loads", data && data.sheets && data.sheets.companies.rows.length === 70, "companies=" + (data && data.sheets.companies.rows.length));
  check("next ids", data.nextIds && data.nextIds.company === "CMU-071" && data.nextIds.licence === "LIC-071" && data.nextIds.clearanceNo === "CLN-148", JSON.stringify(data.nextIds));
  check("fees present", data.fees.services.length === 11 && data.fees.billTypes.length === 7);
  check("lists present", data.lists.signatories.length === 3 && data.lists.chemicals.length >= 50);
  check("print settings present", data.printSettings["Account number"] === "6100064132");

  // grid ops
  const co = await req("POST", "/api/ops", { ops: [{ op: "setCell", sheet: "companies", row: 0, col: 3, value: "TEST LOC" }] });
  check("setCell", co.status === 200 && co.json.applied === 1);
  const d2 = (await req("GET", "/api/data")).json;
  check("setCell persisted", d2.sheets.companies.rows[0][3] === "TEST LOC");
  await req("POST", "/api/ops", { ops: [{ op: "setCell", sheet: "companies", row: 0, col: 3, value: "18th Street, Sinkor / Grand Cape Mount" }] });
  const d3 = (await req("GET", "/api/data")).json;
  check("setCell reverted", d3.sheets.companies.rows[0][3].startsWith("18th Street"));
  const calc = await req("POST", "/api/ops", { ops: [{ op: "setCell", sheet: "companies", row: 0, col: 6, value: 5 }] });
  check("calc column rejected", calc.status === 400);
  const ins = await req("POST", "/api/ops", { ops: [{ op: "insertRow", sheet: "issues", at: 0, values: [null, "Test", "T-1", null, "smoke test issue", null, "Open"] }] });
  check("insertRow with auto id", ins.status === 200 && ins.json.nextIds.issue === "ISS-024");
  const del = await req("POST", "/api/ops", { ops: [{ op: "deleteRow", sheet: "issues", row: 0 }] });
  check("deleteRow", del.status === 200);
  const delCo = await req("POST", "/api/ops", { ops: [{ op: "deleteRow", sheet: "companies", row: 0 }] });
  check("protected company delete blocked", delCo.status === 400);

  // records
  const newCo = await req("POST", "/api/record/company", { action: "new", record: { name: "Smoke Test Industries", sector: "Manufacturing", location: "Monrovia" } });
  check("company new", newCo.status === 200 && newCo.json.id === "CMU-071", JSON.stringify(newCo.json));
  const dupWarn = await req("POST", "/api/record/company", { action: "new", record: { name: "smoke test industries" } });
  check("duplicate name warning", dupWarn.status === 200 && dupWarn.json.warnings.length > 0);
  const updCo = await req("POST", "/api/record/company", { action: "update", record: { id: "CMU-071", name: "Smoke Test Industries Ltd", sector: "Manufacturing" } });
  check("company update", updCo.status === 200);

  const lic = await req("POST", "/api/record/licence", { action: "new", record: {
    companyId: "CMU-071", category: "Chemical Importation (CIL)", type: "Chemical Importation",
    licenceNo: "EPA/CIL-TEST-1", dateIssued: "2026-09-30", expiryDate: "2026-12-31",
    chemicals: [{ name: "Sodium Cyanide", epaRegNo: "EPA-1", type: "Toxic", qty: 500, unit: "kg" }],
    limits: [{ parameter: "pH", unit: "pH units", limit: "6–9", testingSchedule: "Monthly" }],
  } });
  check("licence new (with chemicals+limits)", lic.status === 200 && lic.json.id === "LIC-071", JSON.stringify(lic.json));
  const dlic = (await req("GET", "/api/data")).json;
  const licRow = dlic.sheets.licences.rows.find((r) => r[0] === "LIC-071");
  check("licence row stored", !!licRow && licRow[2] === "Smoke Test Industries Ltd");
  check("licence chemicals saved", dlic.sheets.licenceChemicals.rows.some((r) => r[0] === "LIC-071" && r[3] === "Sodium Cyanide"));
  check("licence effluent limits saved", dlic.sheets.licenceEffluent.rows.some((r) => r[0] === "LIC-071" && r[3] === "Limit" && r[5] === "pH"));

  const clr = await req("POST", "/api/record/clearance", { action: "new", record: {
    companyId: "CMU-071", clearanceDate: "2026-09-30", refNo: "ED/EPA-01/TEST/26/RL", eta: "N/A",
    lines: [{ chemicalStandard: "Sodium Cyanide", qty: 1000, unit: "kg" }, { chemicalStandard: "Caustic Soda (Sodium Hydroxide)", qty: 2, unit: "MT" }],
  } });
  check("clearance new", clr.status === 200 && clr.json.clearanceNo === "CLN-148", JSON.stringify(clr.json));

  const bill = await req("POST", "/api/record/bill", { action: "new", record: {
    companyId: "CMU-071", billDate: "2026-09-30", billType: "Licence – New Application", billRefNo: "ED/EPA-01/T/26/RL",
    lines: [{ service: "Annual Chemical Registration License", amount: 1500 }, { service: "Chemical Importation License", details: "case by case", amount: 500 }],
  } });
  check("bill new", bill.status === 200 && /BN-2026-0\d\d/.test(bill.json.billNo), JSON.stringify(bill.json));
  const bn = bill.json.billNo;

  const pay = await req("POST", "/api/record/payment", { action: "new", record: {
    companyId: "CMU-071", purpose: "CIL", amount: 1000, paymentDate: "2026-09-30", receiptNo: 99999, billNo: bn,
  } });
  check("payment new", pay.status === 200 && pay.json.id === "PAY-055", JSON.stringify(pay.json));
  const payOver = await req("POST", "/api/record/payment", { action: "new", record: { companyId: "CMU-071", purpose: "x", amount: 99999, paymentDate: "2026-09-30", billNo: bn } });
  check("payment over-balance warning", payOver.status === 200 && payOver.json.warnings.length > 0);

  // auth
  const badLogin = await req("POST", "/api/login", { username: "admin", password: "wrong" });
  check("bad login rejected", badLogin.status === 401);
  const login = await req("POST", "/api/login", { username: "admin", password: "Welcome@2026" });
  check("login ok", login.status === 200 && login.json.token && login.json.mustChange === true);
  const tok = { "X-CMU-Token": login.json.token };
  const chpw = await req("POST", "/api/password", { oldPassword: "Welcome@2026", newPassword: "NewPass123" }, tok);
  check("change password", chpw.status === 200);
  const relogin = await req("POST", "/api/login", { username: "admin", password: "NewPass123" });
  check("login with new password", relogin.status === 200 && relogin.json.mustChange === false);
  const tok2 = { "X-CMU-Token": relogin.json.token };
  const usersNoAuth = await req("GET", "/api/users");
  check("users list needs admin", usersNoAuth.status === 403);
  const users = await req("GET", "/api/users", null, tok2);
  check("users list as admin", users.status === 200 && users.json.users.length >= 2);
  const addu = await req("POST", "/api/users/save", { action: "add", username: "tester", fullName: "Test Officer", role: "Officer", newPassword: "TestPass1" }, tok2);
  check("add user", addu.status === 200);
  const modeOn = await req("POST", "/api/settings/mode", { loginRequired: true }, tok2);
  check("login required toggle", modeOn.status === 200 && modeOn.json.loginRequired === true);
  const blocked = await req("POST", "/api/ops", { ops: [{ op: "setCell", sheet: "issues", row: 0, col: 1, value: "x" }] });
  check("anonymous edit blocked when login required", blocked.status === 401);
  await req("POST", "/api/settings/mode", { loginRequired: false }, tok2);

  // export & audit & macro
  const csv = await fetch(BASE + "/api/export/companies").then((r) => r.text());
  check("csv export", csv.split("\n")[0].includes("Company ID") && csv.includes("Bea Mountain"));
  const audit = (await req("GET", "/api/audit")).json;
  check("audit log written", audit.entries.length > 10);
  const macro = (await req("GET", "/api/macro")).json;
  check("macro code served", macro.code.length > 50000 && macro.code.includes("CMU"));

  // computed values in export
  const licCsv = await fetch(BASE + "/api/export/licences").then((r) => r.text());
  check("licence status computed in export", licCsv.includes("Active") && licCsv.includes("Pending – no licence no."));

  // reset back to base (keeps users)
  const reset = await req("POST", "/api/reset", null, tok2);
  check("reset", reset.status === 200);
  const d4 = (await req("GET", "/api/data")).json;
  check("reset restored 70 companies", d4.sheets.companies.rows.length === 70 && d4.nextIds.company === "CMU-071");

  console.log(failures === 0 ? "\nALL CHECKS PASSED ✔" : `\n${failures} CHECK(S) FAILED ✘`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error("smoke crashed:", e); process.exit(1); });
