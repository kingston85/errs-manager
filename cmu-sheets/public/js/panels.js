/* Panels — every non-grid, non-form screen: Main Menu (home), Dashboard,
 * Lists editor, Fee Schedule editor, Users & passwords, Audit log, System
 * check, User manual, and the original VBA code viewer. */
(function () {
  "use strict";
  const CMU = window.CMU;

  /* ================================================================ HOME */
  function home(mount) {
    const d = Store.state.data;
    const dash = CMU.dashboard(d);
    const figs = [
      { l: "Companies", v: dash.companies, go: "sheet/companies" },
      { l: "Licences", v: dash.licencesNumbered + dash.licencesPending, go: "sheet/licences" },
      { l: "Clearances (lines)", v: dash.clearanceLines, go: "sheet/clearances" },
      { l: "Total cleared (MT)", v: CMU.fmtNum(Math.round(dash.totalMt)), go: "dashboard" },
      { l: "Billed / Paid", v: CMU.fmtMoney(dash.totalBilled) + " / " + CMU.fmtMoney(dash.totalPaid), go: "dashboard" },
    ];
    const user = Store.state.user;
    const regBtns = [
      ["companies", "Companies", "Master list with live totals per company"],
      ["licences", "Licences & Certificates", "Every CRL, CIL, EDL, transport licence"],
      ["licenceChemicals", "Licence Chemicals", "Chemicals approved on each licence"],
      ["licenceVehicles", "Licence Vehicles", "Trucks on transport licences"],
      ["licenceEffluent", "Licence Effluent", "EDL parameters, limits & geo-reference"],
      ["clearances", "Chemical Clearances", "One row per chemical cleared"],
      ["bills", "Bills & Invoices", "One row per bill service line"],
      ["payments", "Payments & Receipts", "Every payment received"],
      ["issues", "Notes & Issues", "Data-issue log"],
      ["correspondence", "Correspondence", "Violation & reminder letters"],
    ];
    const printBtns = [
      ["crl", "Print CRL", "Chemical Registration License"],
      ["cil", "Print CIL", "Chemical Importation License"],
      ["edl", "Print EDL", "Effluent Discharge License"],
      ["edlrp", "Print EDL RP", "EDL – retention pond version"],
      ["clearance", "Print Clearance", "To-whom-it-may-concern letter"],
      ["bill", "Print Bill", "Bill letter with fee table"],
    ];
    mount.innerHTML = `
      <div class="screen">
        <div class="home-hero">
          <div>
            <h1>🧪 CMU Database 2026</h1>
            <p>EPA Liberia · ERRS · Chemical Management Unit — companies, licences, clearances, bills and payments in one live workbook, with printable CRLs, CILs, EDLs, clearance letters and bill letters.</p>
          </div>
          <div class="home-status">
            <div>${user ? `Signed in: <b>${esc(user.fullName)}</b> <span class="badge">${esc(user.role)}</span>` : `🔓 Demo mode <span class="badge">full access</span>`}</div>
            <div>System version <span class="badge">${esc(d.meta.codeVersion)}</span> · data from <span class="badge">${esc(d.meta.source)}</span></div>
          </div>
        </div>

        <div class="quickfigs">${figs.map((f) => `<div class="qf" data-go="${f.go}"><div class="v">${f.v}</div><div class="l">${f.l}</div></div>`).join("")}</div>

        <div class="menu-sec"><h2>⚡ Quick actions</h2><div class="menu-grid">
          <button class="menu-btn" data-go="form/bill"><span class="ic">🧾</span><div><b>Create New Bill</b><span class="d">Multi-service bill with suggested fees</span></div></button>
          <button class="menu-btn" data-act="find"><span class="ic">🔎</span><div><b>Find / Print a Record</b><span class="d">Search every register at once</span></div></button>
        </div></div>

        <div class="menu-sec"><h2>📝 Data-entry forms</h2><div class="menu-grid">
          <button class="menu-btn" data-go="form/company"><span class="ic">🏢</span><div><b>Register Company</b><span class="d">Add to the Companies register</span></div></button>
          <button class="menu-btn" data-go="form/licence"><span class="ic">📜</span><div><b>Licence / Certificate</b><span class="d">CRL · CIL · EDL · Fumigation · Transport</span></div></button>
          <button class="menu-btn" data-go="form/clearance"><span class="ic">📦</span><div><b>Chemical Clearance</b><span class="d">One letter, up to 20 chemicals</span></div></button>
          <button class="menu-btn" data-go="form/bill"><span class="ic">🧾</span><div><b>Bill / Invoice</b><span class="d">Up to 10 services per bill</span></div></button>
          <button class="menu-btn" data-go="form/payment"><span class="ic">💵</span><div><b>Record Payment</b><span class="d">Link to a bill, update its status</span></div></button>
        </div></div>

        <div class="menu-sec"><h2>📚 Registers (the database)</h2><div class="menu-grid">
          ${regBtns.map(([k, n, desc]) => `<button class="menu-btn" data-go="sheet/${k}"><span class="ic">${CMU.SHEETS[k].icon}</span><div><b>${esc(n)}</b><span class="d">${esc(desc)} · ${d.sheets[k].rows.length} rows</span></div></button>`).join("")}
        </div></div>

        <div class="menu-sec"><h2>🖨 Print Centre</h2><div class="menu-grid">
          ${printBtns.map(([k, n, desc]) => `<button class="menu-btn" data-go="print/${k}"><span class="ic">🖨</span><div><b>${esc(n)}</b><span class="d">${esc(desc)}</span></div></button>`).join("")}
        </div></div>

        <div class="menu-sec"><h2>📊 Reports &amp; settings</h2><div class="menu-grid">
          <button class="menu-btn" data-go="dashboard"><span class="ic">📊</span><div><b>Dashboard</b><span class="d">Live figures, monthly activity, outstanding bills</span></div></button>
          <button class="menu-btn" data-go="fees"><span class="ic">💰</span><div><b>Fee Schedule &amp; Letter Wording</b><span class="d">Services, suggested fees, bill letter text</span></div></button>
          <button class="menu-btn" data-go="lists"><span class="ic">📋</span><div><b>Dropdown Lists</b><span class="d">Chemicals, sectors, signatories, print settings</span></div></button>
          <button class="menu-btn" data-go="users"><span class="ic">👥</span><div><b>Users &amp; Passwords</b><span class="d">Accounts, roles, sign-in mode</span></div></button>
          <button class="menu-btn" data-go="check"><span class="ic">🩺</span><div><b>System Check</b><span class="d">Health of IDs, links and data quality</span></div></button>
          <button class="menu-btn" data-go="audit"><span class="ic">🕵️</span><div><b>Audit Log</b><span class="d">Every change, who made it and when</span></div></button>
          <button class="menu-btn" data-go="code"><span class="ic">⚙️</span><div><b>System Code</b><span class="d">The original workbook VBA, for reference</span></div></button>
          <button class="menu-btn" data-go="manual"><span class="ic">📘</span><div><b>User Manual</b><span class="d">How everything works</span></div></button>
        </div></div>

        <div class="menu-sec"><h2>📚 Source data (do not edit)</h2><div class="menu-grid">
          <button class="menu-btn" data-go="sheet/srcBmmc"><span class="ic">📚</span><div><b>SRC BMMC Log</b><span class="d">Original BMMC clearance log · ${d.sheets.srcBmmc.rows.length} rows</span></div></button>
          <button class="menu-btn" data-go="sheet/srcReceipts"><span class="ic">📚</span><div><b>SRC CMU Receipts</b><span class="d">Original CMU receipts log · ${d.sheets.srcReceipts.rows.length} rows</span></div></button>
        </div></div>
      </div>`;
    mount.querySelectorAll("[data-go]").forEach((b) => { b.onclick = () => App.go(b.dataset.go); });
    mount.querySelector('[data-act="find"]').onclick = () => App.findModal();
  }

  /* ================================================================ DASHBOARD */
  function dashboard(mount) {
    const d = Store.state.data;
    const dash = CMU.dashboard(d);
    const months = CMU.MONTHS;
    const maxKg = Math.max(1, ...Object.values(dash.monthly).map((m) => m.kg), dash.noDate.kg);
    const cats = Object.entries(dash.byCategory).sort((a, b) => b[1].total - a[1].total);
    const chems = dash.chemicals.slice(0, 14);
    const maxChem = Math.max(1, ...chems.map((c) => c.kg));

    const monthRows = months.map((m, i) => {
      const mm = dash.monthly[i + 1];
      return `<tr><td>${m} 2026</td><td class="n">${mm.clearances}</td><td class="n">${CMU.fmtNum(Math.round(mm.kg))}</td>
        <td><div class="hbar"><span style="width:${Math.round((mm.kg / maxKg) * 100)}%"></span></div></td>
        <td class="n">${mm.payments}</td><td class="n">${CMU.fmtMoney(mm.paid)}</td><td class="n">${CMU.fmtMoney(mm.billed)}</td><td class="n">${mm.licencesIssued}</td></tr>`;
    }).join("") + `<tr><td><i>Date not recorded</i></td><td class="n">${dash.noDate.clearances}</td><td class="n">${CMU.fmtNum(Math.round(dash.noDate.kg))}</td><td></td><td class="n">${dash.noDate.payments}</td><td class="n">${CMU.fmtMoney(dash.noDate.paid)}</td><td class="n">${CMU.fmtMoney(dash.noDate.billed)}</td><td class="n">${dash.noDate.licences}</td></tr>
      <tr style="font-weight:700;background:#f8f9fa"><td>TOTAL</td><td class="n">${dash.clearanceLines}</td><td class="n">${CMU.fmtNum(Math.round(dash.totalKg))}</td><td></td><td class="n">${Object.values(dash.monthly).reduce((s, m) => s + m.payments, 0) + dash.noDate.payments}</td><td class="n">${CMU.fmtMoney(dash.totalPaid)}</td><td class="n">${CMU.fmtMoney(dash.totalBilled)}</td><td class="n">${Object.values(dash.monthly).reduce((s, m) => s + m.licencesIssued, 0) + dash.noDate.licences}</td></tr>`;

    mount.innerHTML = `
      <div class="screen">
        <div class="page-head">
          <div><h1>📊 2026 Database Dashboard</h1><div class="sub">All figures are live — they update the moment a record is saved anywhere in the workbook. Nothing to refresh.</div></div>
          <div class="grow"></div>
          <button class="btn act-export">⬇ Export summary CSV</button>
        </div>

        <div class="kpis">
          <div class="kpi"><div class="v">${dash.companies}</div><div class="l">Companies</div></div>
          <div class="kpi"><div class="v">${dash.licencesNumbered}</div><div class="l">Licences / certs numbered</div></div>
          <div class="kpi"><div class="v">${dash.licencesPending}</div><div class="l">Licences pending</div></div>
          <div class="kpi"><div class="v">${dash.clearanceLines}</div><div class="l">Clearance lines</div></div>
          <div class="kpi"><div class="v">${CMU.fmtNum(Math.round(dash.totalMt))} MT</div><div class="l">Total cleared</div></div>
          <div class="kpi"><div class="v">${CMU.fmtMoney(dash.totalBilled)}</div><div class="l">Total billed</div></div>
          <div class="kpi"><div class="v">${CMU.fmtMoney(dash.totalPaid)}</div><div class="l">Total paid</div></div>
          <div class="kpi"><div class="v" style="color:${dash.openIssues ? "#b06000" : "#137333"}">${dash.openIssues}</div><div class="l">Open data issues</div></div>
        </div>

        <div class="dashgrid">
          <div class="card"><div class="card-h">Monthly activity 2026</div><div class="card-b" style="padding:6px 10px">
            <table class="dt"><thead><tr><th>Month</th><th class="n">Clearances</th><th class="n">Cleared (kg)</th><th></th><th class="n">Payments</th><th class="n">Amount paid</th><th class="n">Amount billed</th><th class="n">Licences issued</th></tr></thead>
            <tbody>${monthRows}</tbody></table>
          </div></div>

          <div>
            <div class="card" style="margin-bottom:14px"><div class="card-h">Licences &amp; certificates by category</div><div class="card-b" style="padding:6px 10px">
              <table class="dt"><thead><tr><th>Category</th><th class="n">Total</th><th>Status mix</th><th class="n">Active</th><th class="n">Issued*</th><th class="n">Pending</th><th class="n">Expired</th></tr></thead><tbody>
                ${cats.map(([cat, v]) => `<tr><td>${esc(cat)}</td><td class="n"><b>${v.total}</b></td>
                  <td><div class="stackbar"><span class="sb-green" style="width:${Math.round((v.active / v.total) * 100)}%"></span><span class="sb-blue" style="width:${Math.round((v.issued / v.total) * 100)}%"></span><span class="sb-amber" style="width:${Math.round((v.pending / v.total) * 100)}%"></span><span class="sb-red" style="width:${Math.round((v.expired / v.total) * 100)}%"></span></div></td>
                  <td class="n">${v.active}</td><td class="n">${v.issued}</td><td class="n">${v.pending}</td><td class="n">${v.expired}</td></tr>`).join("")}
                <tr style="font-weight:700;background:#f8f9fa"><td>TOTAL</td><td class="n">${dash.licencesNumbered + dash.licencesPending}</td><td></td><td class="n">${dash.active}</td><td class="n">${dash.issuedNoExpiry}</td><td class="n">${dash.licencesPending}</td><td class="n">${dash.expired}</td></tr>
              </tbody></table>
              <div class="hint" style="padding:4px 8px">* Issued – expiry not recorded. Status is calculated from the licence number and expiry date.</div>
            </div></div>

            <div class="card"><div class="card-h">Bills — payment status</div><div class="card-b" style="padding:6px 10px">
              <table class="dt"><thead><tr><th>Payment status</th><th class="n">Bills (No.)</th><th class="n">Amount billed</th></tr></thead><tbody>
                <tr><td><span class="pill st-green">Paid</span></td><td class="n">${dash.paymentStatus.paid}</td><td class="n">${CMU.fmtMoney(dash.paymentStatus.paidAmt)}</td></tr>
                <tr><td><span class="pill st-amber">Part paid</span></td><td class="n">${dash.paymentStatus.part}</td><td class="n">${CMU.fmtMoney(dash.paymentStatus.partAmt)}</td></tr>
                <tr><td><span class="pill st-red">Unpaid</span></td><td class="n">${dash.paymentStatus.none}</td><td class="n">${CMU.fmtMoney(dash.paymentStatus.noneAmt)}</td></tr>
              </tbody></table>
            </div></div>
          </div>
        </div>

        <div class="dashgrid" style="margin-top:14px">
          <div class="card"><div class="card-h">Clearances by chemical (standardised names) — top ${chems.length}</div><div class="card-b" style="padding:6px 10px">
            <table class="dt"><thead><tr><th>Chemical (Standard)</th><th class="n">Shipments</th><th class="n">Qty (MT)</th><th style="width:30%">Share</th></tr></thead><tbody>
              ${chems.map((c) => `<tr><td>${esc(c.name)}</td><td class="n">${c.shipments}</td><td class="n">${CMU.fmtNum(Math.round(c.mt * 10) / 10)}</td>
                <td><div class="hbar green"><span style="width:${Math.max(2, Math.round((c.kg / maxChem) * 100))}%"></span></div></td></tr>`).join("")}
            </tbody></table>
          </div></div>

          <div class="card"><div class="card-h">Outstanding bills (unpaid / part paid) — use this list to follow up payments</div><div class="card-b" style="padding:6px 10px">
            <table class="dt"><thead><tr><th>Bill No.</th><th>Company</th><th>Bill date</th><th class="n">Billed</th><th class="n">Paid</th><th>Status</th></tr></thead><tbody>
              ${dash.outstanding.map((b) => `<tr data-bill="${esc(b.billNo)}" style="cursor:pointer"><td><b>${esc(b.billNo)}</b></td><td>${esc(b.company)}</td><td>${CMU.fmtDate(b.billDate)}</td><td class="n">${CMU.fmtMoney(b.billed)}</td><td class="n">${CMU.fmtMoney(b.paid)}</td><td><span class="pill ${CMU.statusClass(b.status)}">${esc(b.status)}</span></td></tr>`).join("") || `<tr><td colspan="6" class="muted">Nothing outstanding 🎉</td></tr>`}
            </tbody></table>
          </div></div>
        </div>
      </div>`;
    mount.querySelectorAll("[data-bill]").forEach((tr) => tr.onclick = () => App.go("form/bill", { findBillNo: tr.dataset.bill }));
    mount.querySelector(".act-export").onclick = () => {
      const lines = ["CMU Dashboard summary 2026", "", "Quick figures",
        `Companies,${dash.companies}`, `Licences numbered,${dash.licencesNumbered}`, `Licences pending,${dash.licencesPending}`,
        `Clearance lines,${dash.clearanceLines}`, `Total cleared kg,${Math.round(dash.totalKg)}`,
        `Total billed USD,${dash.totalBilled}`, `Total paid USD,${dash.totalPaid}`, `Open data issues,${dash.openIssues}`, "",
        "Monthly activity", "Month,Clearances,Cleared kg,Payments,Amount paid,Amount billed,Licences issued"];
      CMU.MONTHS.forEach((m, i) => {
        const mm = dash.monthly[i + 1];
        lines.push(`${m} 2026,${mm.clearances},${Math.round(mm.kg)},${mm.payments},${mm.paid},${mm.billed},${mm.licencesIssued}`);
      });
      lines.push("", "Outstanding bills", "Bill No,Company,Bill date,Billed,Paid,Status");
      dash.outstanding.forEach((b) => lines.push([b.billNo, `"${b.company}"`, b.billDate || "", b.billed, b.paid, b.status].join(",")));
      const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "cmu-dashboard-summary.csv"; a.click();
      toast("Dashboard summary exported", "good");
    };
  }

  /* ================================================================ LISTS */
  function lists(mount) {
    const d = Store.state.data;
    const simpleLists = [
      ["licenceCategory", "Licence Category", "CRL / CIL / EDL / Dewatering / Fumigation / Transport"],
      ["licenceType", "Licence / Certificate Type", "The specific licence chosen on the Licence Form"],
      ["units", "Units", "kg · MT · L · pcs (clearance & chemical quantities)"],
      ["chemicals", "Chemical (Standard)", "Standardised chemical names for clearances"],
      ["sectors", "Sector / Activity", "Company sectors"],
      ["servicePurpose", "Service / Purpose", "Used on the Payment Form"],
      ["recordGroup", "Record Group", "How a payment was recorded"],
      ["parameters", "Parameter", "Effluent discharge parameters"],
      ["effluentUnits", "Effluent Unit", "Units for discharge limits"],
      ["testingSchedules", "Testing Schedule", "Daily / Weekly / Monthly…"],
      ["vehicleTypes", "Vehicle Type", "Transport licence vehicles"],
    ];
    mount.innerHTML = `
      <div class="screen screen-narrow">
        <div class="page-head"><div><h1>📋 Dropdown Lists</h1>
          <div class="sub">Options used by the input forms. Add a new option at the bottom of any list — the dropdowns expand automatically. Changes apply everywhere immediately.</div></div></div>
        <div class="grid2">
          ${simpleLists.map(([key, name, desc]) => `
            <div class="card"><div class="card-h">🔤 ${esc(name)} <span class="grow" style="flex:1"></span><span class="muted small">${desc}</span></div>
              <div id="list_${key}"></div></div>`).join("")}
        </div>

        <div class="card" style="margin-top:14px"><div class="card-h">✍️ Signatories — names &amp; titles printed on documents</div><div class="card-b" id="sigs"></div></div>
        <div class="card" style="margin-top:14px"><div class="card-h">🏢 Signatory offices — office line, contacts and reference prefix</div><div class="card-b" id="offices"></div></div>
        <div class="card" style="margin-top:14px"><div class="card-h">🖨 Print settings — letterhead, bank account, signatory defaults</div><div class="card-b" id="pset"></div></div>
      </div>`;

    function drawSimple(key) {
      const el = mount.querySelector("#list_" + key);
      const items = d.lists[key] || [];
      el.innerHTML = items.map((v, i) => `<div class="listrow"><input data-i="${i}" value="${esc(v)}"><button class="rm" data-i="${i}" title="Remove">✕</button></div>`).join("") +
        `<div class="addlist"><input placeholder="Add a new option…" data-new><button class="btn small primary">Add</button></div>`;
      el.querySelectorAll(".listrow input").forEach((inp) => inp.onchange = () => { items[+inp.dataset.i] = inp.value.trim(); save(); });
      el.querySelectorAll(".rm").forEach((b) => b.onclick = () => { items.splice(+b.dataset.i, 1); save(); drawSimple(key); });
      const addInp = el.querySelector("[data-new]");
      const doAdd = () => { const v = addInp.value.trim(); if (!v) return; items.push(v); save(); drawSimple(key); };
      el.querySelector(".addlist button").onclick = doAdd;
      addInp.onkeydown = (e) => { if (e.key === "Enter") doAdd(); };
    }
    simpleLists.forEach(([key]) => drawSimple(key));

    function drawSigs() {
      const el = mount.querySelector("#sigs");
      el.innerHTML = `<table class="lines-table"><thead><tr><th style="width:70px">#</th><th>Signatory (label)</th><th>Name</th><th>Title</th><th class="rm"></th></tr></thead><tbody>
        ${d.lists.signatories.map((s, i) => `<tr><td class="ln">${i + 1}</td>
          <td><input data-i="${i}" data-k="label" value="${esc(s.label || "")}"></td>
          <td><input data-i="${i}" data-k="name" value="${esc(s.name || "")}"></td>
          <td><input data-i="${i}" data-k="title" value="${esc(s.title || "")}"></td>
          <td class="rm"><button data-i="${i}">✕</button></td></tr>`).join("")}
        </tbody></table><button class="btn small act-add" style="margin-top:6px">＋ Add signatory</button>`;
      el.querySelectorAll("input").forEach((inp) => inp.onchange = () => { d.lists.signatories[+inp.dataset.i][inp.dataset.k] = inp.value.trim(); save(); });
      el.querySelectorAll(".rm button").forEach((b) => b.onclick = () => { d.lists.signatories.splice(+b.dataset.i, 1); save(); drawSigs(); });
      el.querySelector(".act-add").onclick = () => { d.lists.signatories.push({ label: "New signatory", name: "", title: "" }); save(); drawSigs(); };
    }
    function drawOffices() {
      const el = mount.querySelector("#offices");
      el.innerHTML = `<table class="lines-table"><thead><tr><th style="width:70px">#</th><th>Signatory</th><th>Office line</th><th>Contact line</th><th>Ref. prefix</th><th class="rm"></th></tr></thead><tbody>
        ${d.lists.offices.map((s, i) => `<tr><td class="ln">${i + 1}</td>
          <td><input data-i="${i}" data-k="signatory" value="${esc(s.signatory || "")}"></td>
          <td><input data-i="${i}" data-k="officeLine" value="${esc(s.officeLine || "")}"></td>
          <td><input data-i="${i}" data-k="contactLine" value="${esc(s.contactLine || "")}"></td>
          <td><input data-i="${i}" data-k="refPrefix" value="${esc(s.refPrefix || "")}"></td>
          <td class="rm"><button data-i="${i}">✕</button></td></tr>`).join("")}
        </tbody></table><button class="btn small act-add" style="margin-top:6px">＋ Add office</button>`;
      el.querySelectorAll("input").forEach((inp) => inp.onchange = () => { d.lists.offices[+inp.dataset.i][inp.dataset.k] = inp.value.trim(); save(); });
      el.querySelectorAll(".rm button").forEach((b) => b.onclick = () => { d.lists.offices.splice(+b.dataset.i, 1); save(); drawOffices(); });
      el.querySelector(".act-add").onclick = () => { d.lists.offices.push({ signatory: "", officeLine: "", contactLine: "", refPrefix: "" }); save(); drawOffices(); };
    }
    function drawPrintSettings() {
      const el = mount.querySelector("#pset");
      const keys = Object.keys(d.printSettings);
      el.innerHTML = keys.map((k) => `<div class="frow" style="grid-template-columns:230px 1fr"><label>${esc(k)}</label><input class="fin" data-k="${esc(k)}" value="${esc(d.printSettings[k])}"></div>`).join("");
      el.querySelectorAll("input").forEach((inp) => inp.onchange = () => { d.printSettings[inp.dataset.k] = inp.value; save(); });
    }
    function save() {
      Store.saveLists({ lists: d.lists, printSettings: d.printSettings }).catch((e) => toast(esc(e.message), "bad"));
    }
    drawSigs(); drawOffices(); drawPrintSettings();
  }

  /* ================================================================ FEES */
  function fees(mount) {
    const d = Store.state.data;
    mount.innerHTML = `
      <div class="screen screen-narrow">
        <div class="page-head"><div><h1>💰 Fee Schedule &amp; Letter Wording</h1>
          <div class="sub">Every bill has ONE Bill Type. The Bill Type decides which services are allowed and exactly which letter wording prints. Edit a sentence here and every bill of that type changes. ${esc(d.fees.footnote || "")}</div></div></div>

        <div class="card"><div class="card-h">1. Services (what can be billed)</div><div class="card-b" id="svc"></div></div>
        <div class="card" style="margin-top:14px"><div class="card-h">2. Bill types &amp; letter wording <span class="muted small" style="font-weight:400">— one row = one complete letter. Only {SERVICES} and {DETAILS} are filled in automatically.</span></div><div class="card-b" id="bt"></div></div>
      </div>`;
    function drawSvc() {
      const el = mount.querySelector("#svc");
      el.innerHTML = `<table class="lines-table"><thead><tr><th style="width:70px">#</th><th>Service</th><th>Bill Group</th><th style="width:110px">Suggested Fee (USD)</th><th>Notes</th><th class="rm"></th></tr></thead><tbody>
        ${d.fees.services.map((s, i) => `<tr><td class="ln">${i + 1}</td>
          <td><input data-i="${i}" data-k="service" value="${esc(s.service || "")}"></td>
          <td><input data-i="${i}" data-k="group" value="${esc(s.group || "")}"></td>
          <td><input data-i="${i}" data-k="fee" value="${esc(s.fee ?? "")}"></td>
          <td><input data-i="${i}" data-k="notes" value="${esc(s.notes || "")}"></td>
          <td class="rm"><button data-i="${i}">✕</button></td></tr>`).join("")}
        </tbody></table><button class="btn small act-add" style="margin-top:6px">＋ Add service</button>`;
      el.querySelectorAll("input").forEach((inp) => {
        inp.onchange = () => {
          const s = d.fees.services[+inp.dataset.i];
          s[inp.dataset.k] = inp.dataset.k === "fee" ? (inp.value === "" ? null : +inp.value) : inp.value;
          save();
        };
      });
      el.querySelectorAll(".rm button").forEach((b) => b.onclick = () => { d.fees.services.splice(+b.dataset.i, 1); save(); drawSvc(); });
      el.querySelector(".act-add").onclick = () => { d.fees.services.push({ service: "New service", group: "Other", fee: null, notes: "" }); save(); drawSvc(); };
    }
    function drawBt() {
      const el = mount.querySelector("#bt");
      el.innerHTML = d.fees.billTypes.map((b, i) => `
        <div class="card" style="margin-bottom:12px;border-color:#e6e9ef">
          <div class="card-h" style="background:#f8f9fa">
            <input data-i="${i}" data-k="type" value="${esc(b.type || "")}" style="border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-weight:600">
            <span class="muted small">Group:</span><input data-i="${i}" data-k="group" value="${esc(b.group || "")}" style="border:1px solid var(--line);border-radius:6px;padding:4px 8px;width:110px">
            <label class="small" style="margin-left:12px"><input type="checkbox" data-i="${i}" data-k="showFeeTable" ${b.showFeeTable ? "checked" : ""}> Show fee table</label>
            <span style="flex:1"></span>
            <button class="rm btn small danger" data-i="${i}">Remove</button>
          </div>
          <div class="card-b">
            <div class="frow" style="grid-template-columns:150px 1fr"><label>Opening paragraph</label><textarea class="fin" rows="2" data-i="${i}" data-k="opening">${esc(b.opening)}</textarea></div>
            <div class="frow" style="grid-template-columns:150px 1fr"><label>Extra paragraph <span class="muted">(optional)</span></label><textarea class="fin" rows="3" data-i="${i}" data-k="extra">${esc(b.extra)}</textarea></div>
            <div class="frow" style="grid-template-columns:150px 1fr"><label>Bill sentence (starts)</label><input class="fin" data-i="${i}" data-k="billSentence" value="${esc(b.billSentence)}"></div>
            <div class="frow" style="grid-template-columns:150px 1fr"><label>Collection paragraph</label><textarea class="fin" rows="3" data-i="${i}" data-k="collection">${esc(b.collection)}</textarea></div>
          </div>
        </div>`).join("") + `<button class="btn small act-add">＋ Add bill type</button>`;
      el.querySelectorAll("input,textarea").forEach((inp) => {
        inp.onchange = () => {
          const b = d.fees.billTypes[+inp.dataset.i];
          b[inp.dataset.k] = inp.dataset.k === "showFeeTable" ? inp.checked : inp.value;
          save();
        };
      });
      el.querySelectorAll(".rm").forEach((b) => b.onclick = () => { d.fees.billTypes.splice(+b.dataset.i, 1); save(); drawBt(); });
      el.querySelector(".act-add").onclick = () => { d.fees.billTypes.push({ type: "New bill type", group: "Other", opening: "", extra: "", billSentence: "The total bill is", collection: "", showFeeTable: false }); save(); drawBt(); };
    }
    function save() { Store.saveFees({ services: d.fees.services, billTypes: d.fees.billTypes }).catch((e) => toast(esc(e.message), "bad")); }
    drawSvc(); drawBt();
  }

  /* ================================================================ USERS */
  async function users(mount) {
    const me = Store.state.user;
    const isAdmin = me && me.role === "Admin";
    let list = [];
    if (isAdmin) { try { list = (await Store.users()).users; } catch (e) { toast(esc(e.message), "bad"); } }
    mount.innerHTML = `
      <div class="screen screen-narrow">
        <div class="page-head"><div><h1>👥 Users &amp; Passwords</h1>
          <div class="sub">Accounts, roles and the sign-in mode. Roles: <b>Admin</b> (everything, manages users) · <b>Officer</b> (data entry and printing) · <b>Viewer</b> (read-only).</div></div></div>

        ${!Store.state.data.settings.loginRequired ? `<div class="warnbox">🔓 <b>Demo / no-login mode is ON</b> — everyone has full access without signing in, exactly like the workbook's “No-login mode”. An administrator can require sign-in below.</div>` : `<div class="warnbox" style="background:#e6f4ea;border-color:#34a85366;color:#137333">🔐 Sign-in is <b>required</b> — visitors must sign in with an account.</div>`}

        <div class="card"><div class="card-h">✏️ Change my password</div><div class="card-b">
          ${me ? `
            <div class="frow" style="grid-template-columns:170px 1fr"><label>Current password</label><input class="fin" type="password" id="pw_old"></div>
            <div class="frow" style="grid-template-columns:170px 1fr"><label>New password</label><input class="fin" type="password" id="pw_new" placeholder="At least 6 characters"></div>
            <button class="btn primary act-chpw">Change password</button>` : `<p class="muted">Sign in first (top-right) to change your password.</p>`}
        </div></div>

        ${isAdmin ? `
        <div class="card" style="margin-top:14px"><div class="card-h">👤 Staff accounts</div><div class="card-b" style="padding:6px 10px">
          <table class="dt"><thead><tr><th>Username</th><th>Full name</th><th>Role</th><th>Active</th><th>Created</th><th>Last login</th><th></th></tr></thead><tbody id="rows"></tbody></table>
        </div></div>
        <div class="card" style="margin-top:14px"><div class="card-h">➕ Add a user</div><div class="card-b">
          <div class="grid3">
            <div><label class="small">Username</label><input class="fin" id="nu_user" placeholder="e.g. jkpana"></div>
            <div><label class="small">Full name</label><input class="fin" id="nu_name"></div>
            <div><label class="small">Role</label><select class="fin" id="nu_role"><option>Officer</option><option>Admin</option><option>Viewer</option></select></div>
          </div>
          <div style="margin-top:8px"><label class="small">Initial password (they must change it at first sign-in)</label><input class="fin" id="nu_pass" placeholder="Welcome@2026"></div>
          <button class="btn primary act-adduser" style="margin-top:8px">Add user</button>
        </div></div>
        <div class="card" style="margin-top:14px"><div class="card-h">🔐 Sign-in mode</div><div class="card-b">
          <button class="btn ${Store.state.data.settings.loginRequired ? "danger" : "good"} act-mode">
            ${Store.state.data.settings.loginRequired ? "Turn OFF sign-in requirement (demo mode)" : "Require sign-in for everyone"}
          </button>
          <p class="hint" style="margin-top:6px">In demo mode the app behaves like the shared workbook: full access without a password.</p>
        </div></div>` : `<div class="card" style="margin-top:14px"><div class="card-b"><p class="muted">Sign in as an administrator to manage accounts. ${me ? "You are signed in as " + esc(me.fullName) + " (" + esc(me.role) + ")." : ""}</p></div></div>`}
      </div>`;

    if (me) {
      mount.querySelector(".act-chpw").onclick = async () => {
        try { await Store.changePassword(mount.querySelector("#pw_old").value, mount.querySelector("#pw_new").value); toast("Password changed", "good"); mount.querySelector("#pw_old").value = mount.querySelector("#pw_new").value = ""; }
        catch (e) { toast(esc(e.message), "bad"); }
      };
    }
    if (!isAdmin) return;

    const drawRows = () => {
      mount.querySelector("#rows").innerHTML = list.map((u) => `<tr>
        <td><b>${esc(u.username)}</b></td>
        <td><input class="fin" style="padding:3px 8px" data-u="${esc(u.username)}" data-k="fullName" value="${esc(u.fullName)}"></td>
        <td><select class="fin" style="padding:3px 8px" data-u="${esc(u.username)}" data-k="role">${["Admin", "Officer", "Viewer"].map((r) => `<option ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></td>
        <td><input type="checkbox" data-u="${esc(u.username)}" data-k="active" ${u.active ? "checked" : ""}></td>
        <td>${esc(u.created || "")}</td><td>${u.lastLogin ? esc(u.lastLogin.replace("T", " ").slice(0, 16)) : "—"}</td>
        <td style="white-space:nowrap">
          <button class="btn small act-reset" data-u="${esc(u.username)}" title="Set a new password">🔑 Reset pw</button>
          <button class="btn small danger act-del" data-u="${esc(u.username)}">✕</button>
        </td></tr>`).join("");
      mount.querySelectorAll("#rows input, #rows select").forEach((inp) => {
        inp.onchange = async () => {
          const payload = { username: inp.dataset.u, action: "update" };
          payload[inp.dataset.k] = inp.dataset.k === "active" ? inp.checked : inp.value;
          try { await Store.saveUser(payload); toast("Saved " + inp.dataset.u, "good"); list = (await Store.users()).users; }
          catch (e) { toast(esc(e.message), "bad"); }
        };
      });
      mount.querySelectorAll(".act-reset").forEach((b) => b.onclick = async () => {
        const pw = prompt("New password for " + b.dataset.u + " (they must change it at next sign-in):");
        if (!pw) return;
        try { await Store.saveUser({ username: b.dataset.u, newPassword: pw }); toast("Password reset for " + b.dataset.u, "good"); }
        catch (e) { toast(esc(e.message), "bad"); }
      });
      mount.querySelectorAll(".act-del").forEach((b) => b.onclick = async () => {
        if (!confirm("Delete user " + b.dataset.u + "?")) return;
        try { await Store.saveUser({ username: b.dataset.u, action: "delete" }); list = (await Store.users()).users; drawRows(); toast("User deleted", "good"); }
        catch (e) { toast(esc(e.message), "bad"); }
      });
    };
    drawRows();
    mount.querySelector(".act-adduser").onclick = async () => {
      const payload = { action: "add", username: mount.querySelector("#nu_user").value.trim(), fullName: mount.querySelector("#nu_name").value.trim(), role: mount.querySelector("#nu_role").value, newPassword: mount.querySelector("#nu_pass").value || "Welcome@2026" };
      try { await Store.saveUser(payload); toast("User added", "good"); list = (await Store.users()).users; drawRows(); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    mount.querySelector(".act-mode").onclick = async () => {
      const target = !Store.state.data.settings.loginRequired;
      if (target && !confirm("Require every visitor to sign in?")) return;
      try { await Store.setLoginRequired(target); await Store.refresh(); toast(target ? "Sign-in is now required" : "Demo mode on — full access without signing in", "good"); users(mount); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
  }

  /* ================================================================ AUDIT */
  async function audit(mount) {
    let entries = [];
    try { entries = (await Store.auditLog()).entries; } catch (e) { toast(esc(e.message), "bad"); }
    mount.innerHTML = `
      <div class="screen screen-narrow">
        <div class="page-head"><div><h1>🕵️ Audit Log</h1>
          <div class="sub">Every change made through this system — who did it, when, and what. Also records sign-ins and settings changes.</div></div>
          <div class="grow"></div><button class="btn act-export">⬇ Export CSV</button></div>
        <div class="card"><div class="card-b" style="padding:6px 10px">
          <table class="dt"><thead><tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody id="rows"></tbody></table>
        </div></div></div>`;
    const draw = (filterUser, filterAction) => {
      const rows = entries.filter((e) => (!filterUser || e.user === filterUser) && (!filterAction || e.action === filterAction));
      mount.querySelector("#rows").innerHTML = rows.slice(0, 400).map((e) => `<tr>
        <td style="white-space:nowrap">${esc(e.ts.replace("T", " ").slice(0, 19))}</td>
        <td><b>${esc(e.user)}</b></td><td>${esc(e.action)}</td><td class="muted">${esc(e.detail)}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">No entries${entries.length ? " (filters too narrow — showing latest 400)" : " yet"}</td></tr>`;
    };
    draw();
    mount.querySelector(".act-export").onclick = () => {
      const csv = "When,User,Action,Detail\r\n" + entries.map((e) => [e.ts, e.user, e.action, '"' + String(e.detail).replace(/"/g, '""') + '"'].join(",")).join("\r\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "cmu-audit-log.csv"; a.click();
    };
  }

  /* ================================================================ SYSTEM CHECK */
  function check(mount) {
    const d = Store.state.data;
    const checks = CMU.systemCheck(d);
    const nBad = checks.filter((c) => !c.ok).length;
    mount.innerHTML = `
      <div class="screen screen-narrow">
        <div class="page-head"><div><h1>🩺 System Check</h1>
          <div class="sub">Replaces the workbook's Setup Check and CMU System Doctor. Every check is computed live from the current data.</div></div></div>
        <div class="card">
          <div class="card-h">Health check <span class="grow" style="flex:1"></span>
            ${nBad === 0 ? `<span class="pill st-green">✔ All checks passed</span>` : `<span class="pill st-amber">${nBad} item(s) need attention</span>`}</div>
          <div>
            ${checks.map((c) => `<div class="checkrow"><span class="st ${c.ok ? "ok-green" : "ok-amber"}">${c.ok ? "✔ OK" : "⚠ CHECK"}</span><div><b>${esc(c.area)}</b><br><span class="muted">${esc(c.detail)}</span></div></div>`).join("")}
          </div>
        </div>
        <div class="card" style="margin-top:14px"><div class="card-h">💾 Data management</div><div class="card-b">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn act-backup">⬇ Download backup (JSON)</button>
            <label class="btn" style="cursor:pointer">⬆ Restore from backup…<input type="file" accept=".json" style="display:none" class="inp-restore"></label>
            <button class="btn danger act-reset">↺ Reset to the original upload</button>
          </div>
          <p class="hint" style="margin-top:8px">A backup contains every register, the lists, fees and print settings as a single JSON file — restore it on any installation. Reset discards all changes made since the workbook was loaded. Restoring and resetting need an administrator when sign-in is required.</p>
        </div></div>
        <div class="card" style="margin-top:14px"><div class="card-h">About this system</div><div class="card-b small">
          <p><b>CMU Database ${esc(d.meta.codeVersion)}</b> — web edition of “${esc(d.meta.source)}”, built ${esc(d.meta.built)}.</p>
          <p>Registers: ${Object.keys(CMU.SHEETS).map((k) => `${CMU.SHEETS[k].name} (${d.sheets[k].rows.length})`).join(" · ")}.</p>
          <p class="muted">The original workbook's VBA macros are not needed in the web edition — its buttons, forms, login and print engine are all replaced by this system. The code is kept for reference under <a href="#/code">System Code</a>.</p>
        </div></div>
      </div>`;
    mount.querySelector(".act-backup").onclick = () => { window.open("/api/backup", "_blank"); toast("Backup download started", "good"); };
    mount.querySelector(".inp-restore").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm("Restore the database from " + file.name + "?\n\nThis replaces every register, the lists, fees and print settings with the backup's contents.")) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        await Store.api("POST", "/api/restore", { data: payload });
        await Store.refresh();
        toast("Database restored from backup", "good");
        App.render();
      } catch (err) { toast("Restore failed: " + esc(err.message), "bad"); }
    };
    mount.querySelector(".act-reset").onclick = async () => {
      if (!confirm("Reset the database to the original upload?\n\nEvery change made since the workbook was loaded is discarded (user accounts are kept).")) return;
      try { await Store.resetData(); toast("Database reset to the original upload", "good"); App.render(); }
      catch (err) { toast(esc(err.message), "bad"); }
    };
  }

  /* ================================================================ MANUAL */
  function manual(mount) {
    mount.innerHTML = `
      <div class="screen"><div class="manual">
        <h1>📘 CMU Database — User Manual</h1>
        <p class="muted">EPA Liberia · ERRS · Chemical Management Unit Database 2026 · Web edition ${esc(Store.state.data.meta.codeVersion)} — adapted from the workbook manual (v1.0, 27 September 2026).</p>

        <h2>1. About this system</h2>
        <p>This is the web edition of the CMU DATABASE workbook: the same registers, forms, print pages, fee schedule and dashboard — but as a live web app. Everything is saved to the server automatically; there is no file to keep as <i>.xlsm</i> and no macros to enable.</p>
        <table>
          <tr><th>User</th><th>Main tasks</th><th>Screens used most</th></tr>
          <tr><td>Data-entry officer</td><td>Register companies, record licences, clearances, bills and payments; print letters</td><td>Forms, Print Centre, Find / Print a Record</td></tr>
          <tr><td>Supervisor / Unit head</td><td>Monitor activity and outstanding bills; review data issues; approve letters</td><td>Dashboard, Registers, Notes &amp; Issues</td></tr>
          <tr><td>Administrator</td><td>Manage users and passwords, fees, dropdown lists</td><td>Users &amp; Passwords, Fee Schedule, Lists</td></tr>
        </table>

        <h2>2. Getting started — opening and signing in</h2>
        <div class="tip">Open the app in any modern browser — desktop, tablet or phone. No Excel needed.</div>
        <ul>
          <li>If sign-in is required, enter your username and password. The first time you sign in you are asked to create your own password (at least 6 characters). After 5 wrong attempts the account locks for 10 minutes.</li>
          <li>In demo (no-login) mode — the default, like the workbook's “No-login mode: full access enabled” — you can use everything without signing in.</li>
          <li>Check the top-right corner to see who is signed in (or “Demo mode”).</li>
          <li>Everything saves automatically — the badge in the top bar shows <b>✓ All changes saved</b>. There is no Ctrl+S to remember.</li>
        </ul>

        <h2>3. How the system is organised</h2>
        <p>Every screen is one of five groups. The groups use the same colours as the sheet tabs at the bottom, so you can always tell what kind of screen you are on.</p>
        <table>
          <tr><th>Group</th><th>Screens</th><th>What you do there</th></tr>
          <tr><td>Data-entry forms</td><td>Company, Licence, Clearance, Bill, Payment</td><td>Add, find, update or delete records</td></tr>
          <tr><td>Registers (database)</td><td>Companies, Licences &amp; Certificates, Licence Chemicals, Licence Vehicles, Licence Effluent, Chemical Clearances, Bills &amp; Invoices, Payments &amp; Receipts, Notes &amp; Issues, Correspondence</td><td>Where every saved record is stored — view, sort, filter, edit cells, copy out</td></tr>
          <tr><td>Print Centre</td><td>Print CRL, CIL, EDL, EDL RP, Clearance, Bill</td><td>Produce official licences and letters (print, PDF or Word)</td></tr>
          <tr><td>Reports &amp; settings</td><td>Dashboard, Fee Schedule, Lists, Users, System Check, Audit Log, System Code, this Manual</td><td>Summaries, fees, dropdown values, accounts, health checks</td></tr>
          <tr><td>Source data</td><td>SRC BMMC Log, SRC CMU Receipts</td><td>Original logs kept for reference — do not edit</td></tr>
        </table>
        <p>A typical case moves from left to right: company → licence → clearance → bill → payment → printed letter. Every record carries the Company ID, which keeps all the registers linked together.</p>

        <h2>4. The Main Menu</h2>
        <p>The Main Menu (🏠 in the top bar) is the home screen. Every button opens a form, a register, a print page or a tool. Quick Figures shows live totals of companies, licences, clearances and amounts billed / paid.</p>
        <div class="tip">💡 Every screen has a dark <b>Main Menu</b> button in the top bar, and the sheet tabs at the bottom always take you straight to any register.</div>

        <h2>5. Record numbers and cell colours</h2>
        <p>Record numbers are issued automatically when you click Save New (or + Row on a register). Never type a new ID yourself. To change an existing record, type its ID in the form and click Find Record.</p>
        <table>
          <tr><th>Prefix</th><th>Record</th><th>Created by</th></tr>
          <tr><td>CMU-###</td><td>Company</td><td>Company Form</td></tr>
          <tr><td>LIC-###</td><td>Licence or certificate</td><td>Licence Form</td></tr>
          <tr><td>CLN-###</td><td>Clearance (one letter, up to 20 chemicals)</td><td>Clearance Form</td></tr>
          <tr><td>CLR-###</td><td>One chemical line inside a clearance</td><td>Clearance Form (automatic)</td></tr>
          <tr><td>BN-YYYY-###</td><td>Bill (one letter)</td><td>Bill Form</td></tr>
          <tr><td>BIL-###</td><td>One service line inside a bill</td><td>Bill Form (automatic)</td></tr>
          <tr><td>PAY-###</td><td>Payment / receipt</td><td>Payment Form</td></tr>
          <tr><td>ISS-###</td><td>Data issue</td><td>Issues log</td></tr>
          <tr><td>COR-###</td><td>Correspondence entry</td><td>Correspondence log</td></tr>
        </table>
        <p>In the registers, <span style="background:#fafafa;border:1px solid #eee;padding:0 6px" class="muted"><i>italic grey columns are calculated</i></span> — status, totals, kg conversions. They fill in automatically from the other registers; never type over them (you can't).</p>

        <h2>6. Everyday tasks — step by step</h2>
        <h3>6.1 Register a new company</h3>
        <ul>
          <li>On the Main Menu click <b>Register Company</b>.</li>
          <li>Leave <b>Company ID</b> blank — the grey text shows the next number. Type the official <b>Company Name</b> (required), choose the <b>Sector / Activity</b>, then the <b>Location</b> and any <b>Other Names</b> separated by ;</li>
          <li>Check the Form Status bar shows ✓, then click <b>Save New</b>.</li>
        </ul>
        <div class="tip">💡 Search first with Find / Print a Record to avoid registering the same company twice — saving warns you when a similar name already exists.</div>
        <h3>6.2 Record a licence or certificate</h3>
        <ul>
          <li>Click <b>Licence / Certificate Form</b>. Leave the Record ID blank for a new licence.</li>
          <li>Choose the <b>Company</b>, <b>Licence Category</b> (CRL, CIL, EDL, Dewatering, Fumigation, Transportation…), <b>Type</b> and <b>Location</b>; enter the application and response dates.</li>
          <li>When the licence is issued, enter the <b>Licence / Certificate No.</b>, <b>Date Issued</b> and <b>Expiry Date</b>. Without a number the licence shows as Pending.</li>
          <li>For CIL / CRL licences list the approved chemicals in the chemical grid; for EDL licences complete the effluent sections (receiving water, volume, discharge point, limits — and for retention-pond licences the geo-reference and discharge sources); for transport licences list the vehicles.</li>
          <li>Click <b>Save New</b>. Chemicals, vehicles and effluent details save automatically with the licence.</li>
        </ul>
        <h3>6.3 Record a chemical clearance</h3>
        <ul>
          <li>Click <b>Chemical Clearance Form</b>, then Clear Form.</li>
          <li>Fill the letter details: company, clearance date, EPA ref. no. (e.g. ED/EPA-01/388/26/RL), default B/L, ETA.</li>
          <li>List each chemical on its own line — choose the unit (kg, MT, L…) — quantities convert to kg automatically and the total in kg and MT is shown at the bottom.</li>
          <li>Click <b>Save New</b>. The clearance gets a CLN number and each line a CLR number.</li>
          <li>Print the letter from the OUTPUT button or the Print Centre.</li>
        </ul>
        <h3>6.4 Create a bill</h3>
        <ul>
          <li>Fastest way: <b>Create New Bill</b> on the Main Menu opens the Bill Form. Choose the <b>Bill Type</b> first — it decides the allowed services and the exact letter wording.</li>
          <li>Suggested fees come from the Fee Schedule, and the total and amount in words update as you type.</li>
          <li>Each bill gets a number BN-YYYY-### and prints from Print Bill.</li>
        </ul>
        <h3>6.5 Record a payment</h3>
        <ul>
          <li>Click <b>Record Payment / Receipt</b>.</li>
          <li>Choose the <b>Bill No.</b> being paid — the amount billed, paid so far and balance are shown, with a <b>Pay full balance</b> button.</li>
          <li>Enter the <b>Amount</b>, <b>Payment Date</b>, <b>Receipt No.</b> and any remarks, then <b>Save New</b>. You are warned if the amount is more than the balance or the receipt number was already used. The bill's payment status updates automatically.</li>
        </ul>
        <h3>6.6 Find, update or delete a record</h3>
        <ul>
          <li><b>Find / Print a Record</b> (the search box in the top bar, or Ctrl+K): type any part of a company name, ID, B/L, reference, licence, bill or receipt number. Open loads the record into its form; Print opens its print page.</li>
          <li>On any form: type the ID and click <b>Find Record</b>, change the yellow fields, then <b>Update Record</b>.</li>
          <li>In any register: double-click a blue linked ID to open that record in its form.</li>
          <li><b>Delete Record</b> asks for confirmation. Companies that still have licences, clearances, bills or payments cannot be deleted.</li>
        </ul>
        <h3>6.7 Print a licence, clearance letter or bill</h3>
        <ul>
          <li>Open the print page from the Print Centre (or the OUTPUT button on a form).</li>
          <li>Pick the record and check the line says <b>✔ Ready to print</b> (warnings tell you when something is missing).</li>
          <li>Set <b>Print letterhead</b> to No when printing on pre-printed EPA letterhead paper, and choose who the letter is <b>Signed by</b>.</li>
          <li>Click <b>Print</b> — or <b>Save as Word</b> to keep an electronic copy. Your browser's print dialog can also “Save as PDF”.</li>
        </ul>
        <table>
          <tr><th>Print page</th><th>Produces</th></tr>
          <tr><td>Print CRL</td><td>Annual Chemical Registration License</td></tr>
          <tr><td>Print CIL</td><td>Chemical Importation License with its chemical list</td></tr>
          <tr><td>Print EDL</td><td>Annual Effluent Discharge License</td></tr>
          <tr><td>Print EDL RP</td><td>Effluent Discharge License — retention pond version with geo-reference tables</td></tr>
          <tr><td>Print Clearance</td><td>“To whom it may concern” chemical clearance letter</td></tr>
          <tr><td>Print Bill</td><td>Bill / invoice letter with fee table and amount in words</td></tr>
        </table>

        <h2>7. The registers (database)</h2>
        <p>Registers work like a spreadsheet: click any cell to select it, type to replace, Enter to edit, Ctrl+C / Ctrl+V to copy and paste, click a column letter to sort, and use the ▾ filter on a column header to filter by values. The status bar at the bottom shows the count, sum and average of your selection.</p>
        <div class="warn">⚠ Prefer the forms for adding whole records — they issue the IDs and keep the links correct. Cell editing is best for small corrections. The Source column shows where each record came from (for example “Upload: Clearances.pdf p.12”).</div>

        <h2>8. Dashboard</h2>
        <ul>
          <li>Key figures: companies, licences numbered, licences pending, clearances, total cleared (MT), total billed, total paid and open data issues.</li>
          <li>Monthly Activity 2026: clearances, tonnage, payments and amounts billed per month.</li>
          <li>Licences &amp; Certificates by Category: total, active, issued without expiry, pending, expired.</li>
          <li>Outstanding Bills: every unpaid or part-paid bill — use this list to follow up payments (click a row to open the bill).</li>
        </ul>
        <div class="tip">💡 All Dashboard figures are live — they update the moment a record is saved. There is nothing to refresh.</div>

        <h2>9. Notes &amp; Issues — the data-issue log</h2>
        <p>When a record cannot be confirmed (unreadable scan, a quantity that disagrees with a letter, a possible duplicate), log it here with the register, record, source, the issue found, the action taken and a follow-up status. Review the Open items regularly, correct the record through its form, and set the status to Closed.</p>

        <h2>10. Settings and administration</h2>
        <table>
          <tr><th>Setting</th><th>Where</th><th>Who</th><th>What to do</th></tr>
          <tr><td>Fees and bill wording</td><td>Fee Schedule</td><td>Administrator</td><td>Change a suggested fee or the paragraphs printed on each bill type</td></tr>
          <tr><td>Dropdown values</td><td>Lists</td><td>Administrator</td><td>Add a new chemical, sector, unit or signatory</td></tr>
          <tr><td>Users and passwords</td><td>Users &amp; Passwords</td><td>Administrator</td><td>Add users, set roles, reset passwords, deactivate leavers, require sign-in</td></tr>
          <tr><td>Own password</td><td>Users &amp; Passwords</td><td>Everyone</td><td>Change your password at any time</td></tr>
        </table>

        <h2>11. Source data sheets</h2>
        <p>SRC BMMC Log and SRC CMU Receipts hold the original logs the database was built from. They are kept only for checking and audit. Do not edit them; corrections belong in the registers through the forms.</p>

        <h2>12. Troubleshooting</h2>
        <table>
          <tr><th>Problem</th><th>What to do</th></tr>
          <tr><td>Form Status shows ✗ Missing …</td><td>A required field (*) is empty — fill the fields listed, then save</td></tr>
          <tr><td>“Calculated — edit the source record”</td><td>That column is computed from other registers; change the records it comes from</td></tr>
          <tr><td>Record not found</td><td>Use Find / Print a Record and search part of the name</td></tr>
          <tr><td>Print page says “not found”</td><td>Pick the record from the dropdown</td></tr>
          <tr><td>A total looks wrong</td><td>Check Unit and Qty on the clearance line — kg, MT and L convert; “Unverified” does not</td></tr>
          <tr><td>Forgot password</td><td>Ask the administrator to reset it in Users &amp; Passwords (or use demo mode)</td></tr>
          <tr><td>Made a mistake in a cell</td><td>Ctrl+Z undoes grid edits; the Audit Log shows every change</td></tr>
        </table>

        <h2>13. Quick reference card</h2>
        <table>
          <tr><th>✔ DO</th><th>✘ DON'T</th></tr>
          <tr><td>Use the forms to add or change records</td><td>Type over grey calculated columns</td></tr>
          <tr><td>Search before registering a new company</td><td>Delete rows directly in a register that other records link to</td></tr>
          <tr><td>Log unclear data in Notes &amp; Issues</td><td>Share your password</td></tr>
          <tr><td>Check the Dashboard's Outstanding Bills</td><td>Edit the SRC source-data sheets</td></tr>
        </table>
      </div></div>`;
  }

  /* ================================================================ SYSTEM CODE (original VBA) */
  async function code(mount) {
    let txt = "";
    try { txt = (await Store.api("GET", "/api/macro")).code; } catch (e) { txt = "Could not load: " + e.message; }
    mount.innerHTML = `
      <div class="screen">
        <div class="page-head"><div><h1>⚙️ System Code — the original workbook VBA</h1>
          <div class="sub">The Macro Setup sheet of “${esc(Store.state.data.meta.source)}” contained ~2,300 lines of VBA that powered the workbook's buttons, pop-up forms, login and print engine. The web edition replaces all of it — this copy is kept for reference and audit.</div></div>
          <div class="grow"></div><button class="btn act-dl">⬇ Download macro-code.txt</button></div>
        <pre class="code">${esc(txt)}</pre>
      </div>`;
    mount.querySelector(".act-dl").onclick = () => {
      const blob = new Blob([txt], { type: "text/plain" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "macro-code.txt"; a.click();
    };
  }

  window.Panels = { home, dashboard, lists, fees, users, audit, check, manual, code };
})();
