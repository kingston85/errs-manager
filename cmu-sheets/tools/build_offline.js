#!/usr/bin/env node
/* Build the single-file offline edition: cmu-database-2026-offline.html
 * One file = the whole system (interface + data + backend-in-the-browser).
 * Open it by double-clicking — no server, no Node, no internet needed.
 * Run:  node tools/build_offline.js  */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const pub = (p) => path.join(ROOT, "public", p);
const read = (p) => fs.readFileSync(p, "utf8");

const css = read(pub("css/app.css"));
const baseJson = read(path.join(ROOT, "data", "cmu-base.json"));
const macro = read(path.join(ROOT, "data", "macro-code.txt"));
const scripts = ["jslib/cmu.js", "js/store.js", "js/grid.js", "js/forms.js", "js/print.js", "js/panels.js", "js/offline.js", "js/app.js"];

let html = read(pub("index.html"));

const extraCss = `
.offline-bar{background:#fef7e0;border-bottom:1px solid #f9c94a;color:#7a5300;padding:6px 14px;font-size:12px;display:flex;gap:14px;align-items:center;flex:0 0 auto;flex-wrap:wrap}
.offline-bar b{color:#5c3f00}
.offline-bar .spacer{flex:1}
.offline-bar button{border:1px solid #d9a800;background:#fff;border-radius:6px;padding:3px 10px;font-size:11.5px;cursor:pointer}
`;

const offlineBar = `<div class="offline-bar">📴 <b>Offline edition</b> — the whole CMU Database in one file. Your changes are saved in this browser.
    <span class="spacer"></span>
    <button onclick="if(confirm('Erase the changes saved in this browser and reload the original data?')){CMU_OFFLINE_INFO.reset();location.reload();}">↺ Reset saved changes</button>
  </div>`;

const prelude = [
  "<script>",
  "window.CMU_OFFLINE = true;",
  "window.CMU_CSS_TEXT = " + JSON.stringify(css + extraCss).replace(/<\//g, "<\\/") + ";",
  "window.CMU_BASE_DATA = " + baseJson.replace(/<\//g, "<\\/") + ";",
  "window.CMU_MACRO_TEXT = " + JSON.stringify(macro).replace(/<\//g, "<\\/") + ";",
  "</script>",
].join("\n");

function injectScript(name) {
  const tag = '<script src="/' + name + '"></script>';
  if (!html.includes(tag)) throw new Error("Missing script tag: " + tag);
  const code = read(pub(name));
  const inline = "<script>\n/* ===== " + name + " ===== */\n" + code + "\n</script>";
  // IMPORTANT: function replacer — a string replacer would mangle $& $' $$ in the code
  html = html.replace(tag, () => inline);
}

// stylesheet
html = html.replace('<link rel="stylesheet" href="/css/app.css">', () => "<style>\n" + css + extraCss + "\n</style>");
// offline banner after <body>
html = html.replace("<body>", () => "<body>\n  " + offlineBar);
// inline each script
scripts.forEach(injectScript);
// prelude before the first inlined script
html = html.replace("<script>\n/* ===== jslib/cmu.js ===== */", () => prelude + "\n<script>\n/* ===== jslib/cmu.js ===== */");
// title comment
html = html.replace("</title>", () => "</title>\n<!-- CMU Database 2026 — OFFLINE SINGLE-FILE EDITION. The entire system in one file. No server needed. -->");

const out = path.join(ROOT, "cmu-database-2026-offline.html");
fs.writeFileSync(out, html);
// also publish it as the repository-root index.html so GitHub Pages
// (source: main /) serves the app directly at the site root
const rootIndex = path.join(ROOT, "..", "index.html");
fs.writeFileSync(rootIndex, html);
const mb = (fs.statSync(out).size / 1048576).toFixed(2);
console.log("Built " + out + " (" + mb + " MB) and ../index.html for GitHub Pages.");
