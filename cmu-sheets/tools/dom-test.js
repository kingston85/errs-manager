#!/usr/bin/env node
/* DOM test — boots the real app in JSDOM against the running server and
 * exercises the main screens: home, tabs, grid rendering, selection, editing,
 * forms, print centre, dashboard, lists, fees, users, manual, check, find.
 * Run with the server up:  node tools/dom-test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const BASE = process.argv[2] || "http://localhost:3000";
let failures = 0, errors = [];
function check(name, cond, extra) {
  if (cond) console.log("  ✔", name);
  else { failures++; console.log("  ✘", name, extra || ""); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  const dom = new JSDOM(html, {
    url: BASE + "/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = (url, opts) => fetch(url.startsWith("http") ? url : BASE + url, opts);
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.confirm = () => true;
      window.alert = () => {};
      window.prompt = () => null;
      window.print = () => {};
      window.open = (u) => ({});
      window.addEventListener("error", (e) => errors.push(e.message));
    },
  });
  const { window } = dom;
  const { document } = window;

  // load scripts in order, like the browser would
  for (const src of ["/jslib/cmu.js", "/js/store.js", "/js/grid.js", "/js/forms.js", "/js/print.js", "/js/panels.js", "/js/app.js"]) {
    const code = fs.readFileSync(path.join(__dirname, "../public", src), "utf8");
    try { window.eval(code); } catch (e) { failures++; console.log("  ✘ script load", src, e.message); }
  }
  await sleep(900); // boot: init + render

  console.log("CMU Sheets DOM test →", BASE);
  check("no window errors on boot", errors.length === 0, errors.slice(0, 3).join(" | "));
  check("home rendered", !!document.querySelector(".home-hero"), "home hero missing");
  check("quick figures rendered", document.querySelectorAll(".qf").length >= 5);
  check("menu buttons rendered", document.querySelectorAll(".menu-btn").length >= 30);
  check("32 sheet tabs (31 workbook sheets + Correspondence)", document.querySelectorAll("#tabbar .tab").length === 32, "got " + document.querySelectorAll("#tabbar .tab").length);

  // ---- grid
  window.location.hash = "#/sheet/companies";
  await sleep(250);
  let rows = document.querySelectorAll("table.sheet tbody tr");
  check("companies grid rows", rows.length === 70, "got " + rows.length);
  check("column headers", document.querySelectorAll("thead th.colhead").length === 10);
  check("letters row", document.querySelectorAll("thead th.letter").length === 10);
  const firstCell = document.querySelector("table.sheet td");
  check("first data cell", firstCell && firstCell.textContent === "CMU-001", firstCell && firstCell.textContent);
  const bmmcRow = [...rows].find((r) => r.textContent.includes("Bea Mountain"));
  check("computed licences count cell", bmmcRow && [...bmmcRow.querySelectorAll("td")][5].textContent === "3", bmmcRow && [...bmmcRow.querySelectorAll("td")][5].textContent);
  check("computed billed money cell", bmmcRow && [...bmmcRow.querySelectorAll("td")][8].textContent === "$233,651", bmmcRow && [...bmmcRow.querySelectorAll("td")][8].textContent);
  check("statusbar info", document.getElementById("statusbar").textContent.includes("70 of 70 rows"));

  // selection
  firstCell.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  await sleep(30);
  check("cell selected (focuscell)", !!document.querySelector("td.focuscell"));
  check("formula bar address", document.getElementById("fxName") === null || document.querySelector(".fx-name").textContent === "A1", document.querySelector(".fx-name") && document.querySelector(".fx-name").textContent);

  // sort via letter click
  const letterB = document.querySelector('thead th.letter[data-ci="1"]');
  letterB.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(200);
  const firstAfterSort = document.querySelector("table.sheet tbody tr td");
  check("sort by name asc", firstAfterSort && firstAfterSort.textContent !== "CMU-001", firstAfterSort && firstAfterSort.textContent);

  // quick filter
  const quick = document.querySelector(".grid-quick");
  quick.value = "fumigation";
  quick.dispatchEvent(new window.Event("input", { bubbles: true }));
  await sleep(250);
  check("quick filter narrows rows", document.querySelectorAll("table.sheet tbody tr").length < 70, "rows=" + document.querySelectorAll("table.sheet tbody tr").length);
  quick.value = "";
  quick.dispatchEvent(new window.Event("input", { bubbles: true }));
  await sleep(150);

  // licences grid: computed status + join
  window.location.hash = "#/sheet/licences";
  await sleep(250);
  const licRows = document.querySelectorAll("table.sheet tbody tr");
  check("licences grid rows", licRows.length === 69, "got " + licRows.length);
  const licText = document.body.textContent;
  check("licence status pills rendered", document.querySelectorAll("td.status .pill").length === 69);
  check("company name joined", [...licRows][0].textContent.includes("Bea Mountain Mining Corporation"));

  // clearances grid: kg conversion computed
  window.location.hash = "#/sheet/clearances";
  await sleep(250);
  const clrFirst = document.querySelector("table.sheet tbody tr");
  const clrCells = [...clrFirst.querySelectorAll("td")];
  check("clearance kg computed", clrCells[8].textContent === "160,000", clrCells[8].textContent);
  check("clearance MT computed", clrCells[9].textContent === "160", clrCells[9].textContent);
  check("clearance company joined", clrCells[3].textContent.includes("MNG Gold"));

  // bills grid: rollups computed
  window.location.hash = "#/sheet/bills";
  await sleep(250);
  const billRow = [...document.querySelectorAll("table.sheet tbody tr")].find((r) => r.textContent.includes("BN-2026-002"));
  const bc = [...billRow.querySelectorAll("td")];
  check("bill company total billed", bc[11].textContent === "$11,150", bc[11].textContent);
  check("bill company total paid", bc[12].textContent === "$13,675", bc[12].textContent);
  check("bill payment status pill", bc[13].textContent.includes("Paid"), bc[13].textContent);

  // ---- forms
  window.location.hash = "#/form/company";
  await sleep(200);
  check("company form rendered", !!document.querySelector("#fstat") && document.getElementById("fstat").textContent.includes("Missing"));
  const fName = document.getElementById("f_name");
  fName.value = "DOM Test Co";
  fName.dispatchEvent(new window.Event("input", { bubbles: true }));
  check("form status turns ok", document.getElementById("fstat").className.includes("ok"), document.getElementById("fstat").textContent);
  check("next id hint", document.body.textContent.includes("CMU-071"));

  window.location.hash = "#/form/licence";
  await sleep(200);
  check("licence form rendered", !!document.getElementById("f_licno"));
  check("licence form chemical lines", document.querySelectorAll("#chems .lines-table tbody tr").length === 1);
  check("licence form sections", document.body.textContent.includes("EFFLUENT DETAILS") && document.body.textContent.includes("GEO-REFERENCE"));
  // find LIC-027
  document.getElementById("f_id").value = "LIC-027";
  document.querySelector(".act-find").click();
  await sleep(150);
  check("licence find loads record", document.getElementById("f_company").value.includes("Bea Mountain"), document.getElementById("f_company").value);
  check("licence find shows chemicals", document.querySelectorAll("#chems .lines-table tbody tr").length >= 1, "chem rows=" + document.querySelectorAll("#chems .lines-table tbody tr").length);

  window.location.hash = "#/form/clearance";
  await sleep(200);
  check("clearance form rendered", !!document.getElementById("f_no"));
  window.location.hash = "#/form/bill";
  await sleep(200);
  check("bill form rendered", !!document.getElementById("f_type") && document.getElementById("f_type").options.length === 8);
  window.location.hash = "#/form/payment";
  await sleep(200);
  const billSel = document.getElementById("f_billno");
  check("payment form bill dropdown", billSel && billSel.options.length === 21, "options=" + (billSel && billSel.options.length));
  window.location.hash = "#/form/issue";
  await sleep(200);
  check("issue form rendered", !!document.querySelector('[data-k="issueFound"]'));

  // ---- print centre
  for (const p of ["crl", "cil", "edl", "edlrp", "clearance", "bill"]) {
    window.location.hash = "#/print/" + p;
    await sleep(150);
    const docPage = document.querySelector(".doc-page");
    check("print " + p + " renders doc", !!docPage && docPage.textContent.length > 300, (docPage && docPage.textContent.slice(0, 90)) || "no doc");
  }
  window.location.hash = "#/print/clearance";
  await sleep(150);
  const rec = document.getElementById("c_rec");
  rec.value = "CLN-140";
  rec.dispatchEvent(new window.Event("change", { bubbles: true }));
  await sleep(200);
  check("clearance doc loads record", document.querySelector(".doc-page").textContent.includes("Mano Manufacturing"), document.querySelector(".doc-page").textContent.slice(0, 80));
  check("clearance doc has consignment table", document.querySelector(".doc-page").textContent.includes("LIQUID CHLORINE"));

  window.location.hash = "#/print/bill";
  await sleep(150);
  const recB = document.getElementById("c_rec");
  const bnOpt = [...recB.options].find((o) => o.value.includes("BN-2026-009"));
  recB.value = bnOpt.value;
  recB.dispatchEvent(new window.Event("change", { bubbles: true }));
  await sleep(200);
  const billDoc = document.querySelector(".doc-page").textContent;
  check("bill doc loads record", billDoc.includes("SAYMINEE EXPRESS SERVICES"), JSON.stringify(billDoc.slice(200, 500)));
  check("bill doc amount in words", billDoc.includes("UNITED STATES DOLLARS-"), billDoc.slice(0, 200));
  check("bill doc eco-bank line", billDoc.includes("Eco-Bank"));

  window.location.hash = "#/print/edl";
  await sleep(150);
  const recL = document.getElementById("c_rec");
  const licOpt = [...recL.options].find((o) => o.value === "LIC-038");
  recL.value = "LIC-038";
  recL.dispatchEvent(new window.Event("change", { bubbles: true }));
  await sleep(200);
  check("EDL doc conditions", document.querySelector(".doc-page").textContent.includes("sewerage discharge limits"));

  // ---- dashboard
  window.location.hash = "#/dashboard";
  await sleep(250);
  check("dashboard kpis", document.querySelectorAll(".kpi").length === 8);
  check("dashboard monthly table", document.querySelectorAll("#main table.dt tbody tr").length >= 14);
  check("dashboard outstanding bills", document.body.textContent.includes("Outstanding bills"));
  const dashKpi = [...document.querySelectorAll(".kpi")].map((k) => k.textContent);
  check("dashboard totals", dashKpi.some((t) => t.includes("$279,151")) && dashKpi.some((t) => t.includes("$434,983")), dashKpi[5] + dashKpi[6]);

  // ---- settings screens
  window.location.hash = "#/lists";
  await sleep(200);
  check("lists editor rendered", document.querySelectorAll(".listrow").length > 30);
  window.location.hash = "#/fees";
  await sleep(200);
  check("fees editor rendered", document.querySelectorAll("#svc .lines-table tbody tr").length === 11);
  check("bill types editor", document.querySelectorAll("#bt .card").length === 7);
  window.location.hash = "#/users";
  await sleep(300);
  check("users screen rendered", document.body.textContent.includes("Change my password"));
  check("users demo notice", document.body.textContent.includes("Demo / no-login mode is ON"));
  window.location.hash = "#/check";
  await sleep(200);
  check("system check rendered", document.querySelectorAll(".checkrow").length >= 15, "rows=" + document.querySelectorAll(".checkrow").length);
  window.location.hash = "#/manual";
  await sleep(200);
  check("manual rendered", document.body.textContent.includes("Record numbers and cell colours"));
  window.location.hash = "#/audit";
  await sleep(400);
  check("audit rendered", document.querySelectorAll("#rows tr").length >= 1, "rows=" + document.querySelectorAll("#rows tr").length);
  window.location.hash = "#/code";
  await sleep(300);
  check("macro code rendered", document.querySelector("pre.code") && document.querySelector("pre.code").textContent.includes("Option Explicit"));

  // ---- find modal
  window.App.findModal("bea mountain");
  await sleep(200);
  check("find modal opens", !!document.querySelector(".modal"));
  const findItems = document.querySelectorAll(".fr-item");
  check("find results", findItems.length >= 3, "items=" + findItems.length);
  document.querySelector(".modal .x").click();

  // ---- cell edit through UI (issues sheet — safe)
  window.location.hash = "#/sheet/issues";
  await sleep(250);
  const target = document.querySelector("table.sheet tbody tr td");
  target.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  await sleep(30);
  target.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true }));
  await sleep(60);
  const editor = document.querySelector(".cell-editor");
  check("cell editor opens", !!editor);
  if (editor) {
    editor.value = "ISS-001";
    editor.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await sleep(400);
  }
  check("no window errors total", errors.length === 0, errors.slice(0, 4).join(" | "));

  console.log(failures === 0 ? "\nALL DOM CHECKS PASSED ✔" : `\n${failures} DOM CHECK(S) FAILED ✘`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error("dom test crashed:", e); process.exit(1); });
