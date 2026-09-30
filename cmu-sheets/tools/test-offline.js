#!/usr/bin/env node
/* Offline edition test — loads the built single-file HTML in JSDOM with
 * scripts EXECUTING (runScripts:"dangerously") and drives the whole app:
 * boot, grids, form save, persistence, login, export, reset.
 * Run after `node tools/build_offline.js`:  node tools/test-offline.js */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const FILE = path.join(__dirname, "..", "cmu-database-2026-offline.html");
let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log("  ✔", name);
  else { failures++; console.log("  ✘", name, extra || ""); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const html = fs.readFileSync(FILE, "utf8");
  const downloads = [];
  const dom = new JSDOM(html, {
    url: "http://localhost/cmu-database-2026-offline.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(window) {
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.confirm = () => true;
      window.alert = () => {};
      window.prompt = () => null;
      window.print = () => {};
      window.addEventListener("error", (e) => errors.push(e.message));
    },
  });
  const { window } = dom;
  const { document } = window;
  const errors = [];
  window.addEventListener("error", (e) => { if (!errors.includes(e.message)) errors.push(e.message); });

  await sleep(1600); // boot

  console.log("CMU offline edition test →", path.basename(FILE));
  check("boots with no JS errors", errors.length === 0, errors.slice(0, 4).join(" | "));
  check("offline banner shown", !!document.querySelector(".offline-bar"));
  check("home rendered", !!document.querySelector(".home-hero"));
  check("quick figures", document.querySelectorAll(".qf").length >= 5);
  check("tabs", document.querySelectorAll("#tabbar .tab").length === 32, "got " + document.querySelectorAll("#tabbar .tab").length);
  check("offline storage available", window.CMU_OFFLINE_INFO && window.CMU_OFFLINE_INFO.storage === true);

  // grid
  window.location.hash = "#/sheet/companies";
  await sleep(300);
  check("companies grid 70 rows", document.querySelectorAll("table.sheet tbody tr").length === 70);
  const row1 = document.querySelector("table.sheet tbody tr");
  check("computed column value", [...row1.querySelectorAll("td")][5].textContent === "3");

  // form save → persistence
  window.location.hash = "#/form/company";
  await sleep(250);
  document.getElementById("f_name").value = "Offline Test Co";
  document.getElementById("f_name").dispatchEvent(new window.Event("input", { bubbles: true }));
  document.querySelector(".act-savenew").click();
  await sleep(500);
  check("form save issues CMU-071", document.getElementById("f_id").value === "CMU-071", document.getElementById("f_id").value);

  // persisted to localStorage?
  const saved = JSON.parse(window.localStorage.getItem("cmu-offline-data-v1"));
  check("saved to localStorage", saved && saved.sheets.companies.rows.length === 71 && saved.sheets.companies.rows[70][1] === "Offline Test Co");

  // reload simulation: new DOM from same localStorage? (jsdom localStorage is per-instance; simulate by re-boot in same window is complex — verify data API instead)
  const apiData = await window.Store.api("GET", "/api/data");
  check("api/data reflects the new row", apiData.sheets.companies.rows.length === 71 && apiData.nextIds.company === "CMU-072");

  // licence form save with children
  window.location.hash = "#/form/licence";
  await sleep(250);
  document.getElementById("f_company").value = "CMU-071 — Offline Test Co";
  document.getElementById("f_category").value = "Chemical Importation (CIL)";
  document.getElementById("f_type").value = "Chemical Importation";
  ["f_company", "f_category", "f_type"].forEach((id) => document.getElementById(id).dispatchEvent(new window.Event("input", { bubbles: true })));
  document.getElementById("f_licno").value = "EPA/CIL-OFF-1";
  document.querySelector(".act-savenew").click();
  await sleep(500);
  const d2 = await window.Store.api("GET", "/api/data");
  check("licence saved as LIC-071", d2.sheets.licences.rows.some((r) => r[0] === "LIC-071" && r[10] === "EPA/CIL-OFF-1"));

  // print page works offline (no network fetch for css)
  window.location.hash = "#/print/cil";
  await sleep(300);
  const docPage = document.querySelector(".doc-page");
  check("print CIL renders offline", !!docPage && docPage.textContent.length > 300, docPage && docPage.textContent.slice(0, 60));

  // login flow
  const login = await window.Store.api("POST", "/api/login", { username: "admin", password: "Welcome@2026" });
  check("offline login", login.token && login.user.role === "Admin");
  window.Store.state.token = login.token;
  try { window.localStorage.setItem("cmu-token", login.token); } catch (e) {}
  const users = await window.Store.api("GET", "/api/users");
  check("offline users list", users.users.length >= 2);

  // CSV export via patched window.open
  let csvOk = false;
  const origCreate = window.document.createElement.bind(window.document);
  window.document.createElement = function (t) { const el = origCreate(t); if (t === "a") { el.click = () => { csvOk = true; }; el.href = ""; } return el; };
  window.open("/api/export/companies");
  await sleep(100);
  check("CSV export downloads offline", csvOk);
  window.document.createElement = origCreate;

  // dashboard
  window.location.hash = "#/dashboard";
  await sleep(300);
  check("dashboard renders offline", document.querySelectorAll(".kpi").length === 8);
  check("dashboard shows new company count", [...document.querySelectorAll(".kpi")][0].textContent.includes("71"));

  // reset via API
  await window.Store.api("POST", "/api/reset", {});
  const d3 = await window.Store.api("GET", "/api/data");
  check("offline reset restores 70 companies", d3.sheets.companies.rows.length === 70 && d3.nextIds.company === "CMU-071");

  check("no JS errors at end", errors.length === 0, errors.slice(0, 4).join(" | "));
  console.log(failures === 0 ? "\nOFFLINE EDITION PASSED ✔" : `\n${failures} CHECK(S) FAILED ✘`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error("offline test crashed:", e); process.exit(1); });
