/* Forms — the five data-entry forms (Company, Licence, Clearance, Bill, Payment)
 * plus the Issue & Correspondence logs. Mirrors the workbook's forms: yellow
 * inputs, required (*), form status bar, Find / Save New / Update / Delete. */
(function () {
  "use strict";
  const CMU = window.CMU;

  const companyOptions = () => Store.state.data.sheets.companies.rows.map((r) => ({ id: r[0], name: r[1] }));
  const companyDatalist = () => companyOptions().map((c) => `${c.id} — ${c.name}`);
  const resolveCompany = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    const m = /^(CMU-\d+)\s*—/.exec(s);
    if (m) return m[1];
    const co = companyOptions().find((c) => c.name.toLowerCase() === s.toLowerCase() || c.id.toLowerCase() === s.toLowerCase());
    return co ? co.id : null;
  };

  function frowHtml(label, inner, hint, req) {
    return `<div class="frow"><label>${label}${req ? ' <span class="req">*</span>' : ""}</label><div>${inner}</div>${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
  }

  /* ------------------------------------------------------------------ COMPANY */
  function companyForm(mount, params) {
    const nid = () => Store.state.data.nextIds.company;
    let model = { id: "", name: "", sector: "", location: "", otherNames: "" };
    mount.innerHTML = `
      <div class="screen screen-narrow">
        <div class="page-head">
          <div><h1>🏢 Company Registration Form</h1><div class="sub">Master list of all companies. Every record in every register links back to a Company ID created here.</div></div>
        </div>
        <div class="formwrap">
          <div>
            <div class="formstatus" id="fstat"></div>
            <div class="card"><div class="card-b">
              ${frowHtml("Company ID", `<input class="fin" id="f_id" placeholder="Leave blank for a NEW record" value="">`, `Leave blank for a NEW record (next ID: <b>${nid()}</b>). Type an existing ID and click Find to edit.`, false)}
              ${frowHtml("Company Name", `<input class="fin" id="f_name" placeholder="Official company name">`, "Enter the official company name", true)}
              ${frowHtml("Sector / Activity", `<input class="fin" id="f_sector" list="dl_sectors" placeholder="Choose or type">`, "Choose from list (add new sectors on the Lists screen)", false)}
              ${frowHtml("Location", `<input class="fin" id="f_location" placeholder="Street / town, county">`, false)}
              ${frowHtml("Other Names Recorded", `<input class="fin" id="f_other" placeholder="Other spellings used on documents">`, "Other spellings used on documents, separated by ;", false)}
              <datalist id="dl_sectors">${Store.state.data.lists.sectors.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
            </div></div>
          </div>
          <div class="recbtns">
            <button class="btn primary act-savenew">💾 Save New</button>
            <button class="btn act-find">🔎 Find Record</button>
            <button class="btn act-update">↺ Update Record</button>
            <button class="btn danger act-delete">🗑 Delete Record</button>
            <button class="btn act-clear">✕ Clear Form</button>
            <div class="outputbtns">
              <button class="btn small act-register">Open register</button>
            </div>
            <div class="acct-panel" id="acct"></div>
          </div>
        </div>
      </div>`;

    const $ = (id) => mount.querySelector("#" + id);
    const fields = ["id", "name", "sector", "location", "other"];
    const get = () => {
      model = { id: $("f_id").value.trim(), name: $("f_name").value.trim(), sector: $("f_sector").value.trim(), location: $("f_location").value.trim(), otherNames: $("f_other").value.trim() };
      return model;
    };
    const set = (m) => {
      $("f_id").value = m.id || ""; $("f_name").value = m.name || ""; $("f_sector").value = m.sector || "";
      $("f_location").value = m.location || ""; $("f_other").value = m.otherNames || "";
      model = m;
      status(); acct();
    };
    const status = () => {
      const m = get();
      const missing = [];
      if (m.id && !findCompany(m.id)) missing.push(`ID ${m.id} not found — clear it for a new record`);
      if (!m.name) missing.push("Company Name");
      const el = $("fstat");
      if (missing.length) { el.className = "formstatus bad"; el.innerHTML = "✖ Missing: " + missing.join("; "); }
      else { el.className = "formstatus ok"; el.innerHTML = `✓ ${m.id ? "Editing " + esc(m.id) : "Ready to save as " + nid()}${m.name ? " — " + esc(m.name) : ""}`; }
    };
    const findCompany = (id) => Store.state.data.sheets.companies.rows.find((r) => r[0] === id);
    const acct = () => {
      const m = get();
      const co = m.id && findCompany(m.id);
      const box = $("acct");
      if (!co) { box.innerHTML = `<b>Company account</b><br><span class="muted">Find a company to see its licences, clearances, billed and paid totals.</span>`; return; }
      const st = CMU.companyStats(Store.state.data, co[0]);
      box.innerHTML = `<b>Company account — ${esc(co[0])} · ${esc(co[1])}</b><br>
        Licences: <b>${st.licences}</b> · Clearances: <b>${st.clearances}</b><br>
        Total cleared: <b>${CMU.fmtNum(Math.round(st.kg))} kg</b><br>
        Billed: <b>${CMU.fmtMoney(st.billed)}</b> · Paid: <b>${CMU.fmtMoney(st.paid)}</b>`;
    };
    fields.forEach((f) => { const el = $("f_" + f); el.oninput = status; el.onchange = acct; });
    mount.querySelector(".act-savenew").onclick = async () => {
      const m = get();
      if (!m.name) return toast("Company Name is required", "bad");
      try {
        const res = await Store.record("company", { action: "new", record: m });
        set(Object.assign({}, m, { id: res.id }));
        (res.warnings || []).forEach((w) => toast("⚠ " + esc(w), "warn", 6000));
        toast(`Saved — company ${res.id} added to the register`, "good");
      } catch (e) { toast(esc(e.message), "bad"); }
    };
    mount.querySelector(".act-find").onclick = () => {
      const m = get();
      const co = findCompany(m.id) || (m.name ? Store.state.data.sheets.companies.rows.find((r) => r[1].toLowerCase() === m.name.toLowerCase()) : null);
      if (!co) return toast("Company not found — type the Company ID (e.g. CMU-001) or the exact name", "bad");
      set({ id: co[0], name: co[1] || "", sector: co[2] || "", location: co[3] || "", otherNames: co[4] || "" });
      toast("Loaded " + co[0], "good");
    };
    mount.querySelector(".act-update").onclick = async () => {
      const m = get();
      if (!m.id) return toast("Find a company first (type its ID and click Find Record)", "bad");
      try {
        await Store.record("company", { action: "update", record: m });
        toast("Updated " + m.id, "good");
      } catch (e) { toast(esc(e.message), "bad"); }
    };
    mount.querySelector(".act-delete").onclick = async () => {
      const m = get();
      if (!m.id) return toast("Find a company first", "bad");
      if (!confirm(`Delete company ${m.id} — ${m.name}?\n\nCompanies that still have licences, clearances, bills or payments cannot be deleted.`)) return;
      try { await Store.record("company", { action: "delete", record: m }); set({ id: "", name: "", sector: "", location: "", otherNames: "" }); toast("Company deleted", "good"); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    mount.querySelector(".act-clear").onclick = () => set({ id: "", name: "", sector: "", location: "", otherNames: "" });
    mount.querySelector(".act-register").onclick = () => App.go("sheet/companies");
    if (params && params.findId) { const co = findCompany(params.findId); if (co) set({ id: co[0], name: co[1] || "", sector: co[2] || "", location: co[3] || "", otherNames: co[4] || "" }); }
    status(); acct();
  }

  /* ------------------------------------------------------------------ LICENCE */
  function licenceForm(mount, params) {
    const d = () => Store.state.data;
    const nid = () => d().nextIds.licence;
    let model = emptyModel();
    function emptyModel() {
      return { id: "", companyId: "", nameRecorded: "", category: "", type: "", location: "", applicationDate: "", responseDate: "",
        refCode: "", licenceNo: "", dateIssued: "", expiryDate: "", remarks: "", billNo: "",
        chemicals: [{}], vehicles: [{}], effluent: [{ receivingWater: "", maxVolume: "", dischargePoint: "" }], limits: [{}], coordinates: [{}], sources: [{}] };
    }
    const catDatalist = () => `<datalist id="dl_cat">${d().lists.licenceCategory.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>`;
    const typeDatalist = () => `<datalist id="dl_type">${d().lists.licenceType.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>`;

    mount.innerHTML = `
      <div class="screen">
        <div class="page-head">
          <div><h1>📜 Licence &amp; Certificate Form</h1><div class="sub">CRL / CIL / EDL / Dewatering / Fumigation / Transport licences. Chemicals, vehicles and effluent details are saved with the licence and print on the official documents.</div></div>
        </div>
        <div class="formwrap" style="grid-template-columns: minmax(430px, 1fr) 280px">
          <div>
            <div class="formstatus" id="fstat"></div>
            <div class="card"><div class="card-b">
              ${frowHtml("Record ID", `<input class="fin" id="f_id" placeholder="Leave blank for a NEW record">`, `Leave blank for a NEW record (next ID: <b>${nid()}</b>). Type an existing ID and click Find to edit.`, false)}
              ${frowHtml("Company", `<input class="fin" id="f_company" list="dl_companies" placeholder="Type to search — CMU-001 — Name">`, "Choose the company", true)}
              <datalist id="dl_companies">${companyDatalist().map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
              ${frowHtml("Licence Category", `<input class="fin" id="f_category" list="dl_cat2" placeholder="CRL / CIL / EDL / Dewatering / Fumigation / Transport">`, false, true)}
              ${catDatalist().replace('id="dl_cat"', 'id="dl_cat2"')}
              ${frowHtml("Licence / Certificate Type", `<input class="fin" id="f_type" list="dl_type2" placeholder="Choose the specific licence">`, false, true)}
              ${typeDatalist().replace('id="dl_type"', 'id="dl_type2"')}
              ${frowHtml("Location", `<input class="fin" id="f_location" placeholder="Site address">`, false)}
              ${frowHtml("Application Date", `<input class="fin" id="f_appdate" type="date">`, "dd-mmm-yyyy", false)}
              ${frowHtml("Response Date", `<input class="fin" id="f_respdate" type="date">`, "Date EPA responded", false)}
              ${frowHtml("Reference Code", `<input class="fin" id="f_refcode" placeholder="e.g. ED/EPA-01/075/26/RL">`, false)}
              ${frowHtml("Licence / Certificate No.", `<input class="fin" id="f_licno" placeholder="Leave blank if not yet issued (status = Pending)">`, "Leave blank if not yet issued — status shows Pending", false)}
              ${frowHtml("Date Issued", `<input class="fin" id="f_issdate" type="date">`, false)}
              ${frowHtml("Expiry Date", `<input class="fin" id="f_expdate" type="date">`, "Usually 31-Dec of the licence year for annual licences", false)}
              ${frowHtml("Bill No.", `<input class="fin" id="f_billno" list="dl_billnos" placeholder="BN-2026-… (optional)">`, false)}
              <datalist id="dl_billnos">${d().nextIds && [...new Set(d().sheets.bills.rows.map((r) => r[1]))].map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
              ${frowHtml("Remarks", `<textarea class="fin" id="f_remarks" rows="2"></textarea>`, false)}
            </div></div>

            <div class="fsec">CHEMICALS ON THIS LICENCE <span class="small">(CRL / CIL — up to 15 lines; they print in the PRODUCT INFORMATION table)</span></div>
            <div id="chems"></div>

            <div class="fsec">VEHICLES <span class="small">(Annual Chemical Transportation licences — up to 12 trucks)</span></div>
            <div id="vehs"></div>

            <div class="fsec">EFFLUENT DETAILS <span class="small">(EDL only — prints in Conditions 1–3 of the EDL)</span></div>
            <div class="card"><div class="card-b">
              ${frowHtml("Receiving water", `<input class="fin eff" data-k="receivingWater" placeholder="e.g. the estuary">`, false)}
              ${frowHtml("Max. volume (m³/day)", `<input class="fin eff" data-k="maxVolume" placeholder="e.g. 10">`, false)}
              ${frowHtml("Discharge point / facility", `<input class="fin eff" data-k="dischargePoint" placeholder="e.g. in a containment tank">`, false)}
            </div></div>

            <div class="fsec">DISCHARGE LIMITS <span class="small">(up to 20 lines — only the parameters this licence requires)</span></div>
            <div id="limits"></div>

            <div class="fsec">GEO-REFERENCE <span class="small">(Retention-pond licences — Tables 1A / 1B, up to 20 lines)</span></div>
            <div id="coords"></div>

            <div class="fsec">DISCHARGE SOURCES <span class="small">(Retention-pond licences — Table 1B source list &amp; Table 2, up to 6 lines)</span></div>
            <div id="sources"></div>
          </div>

          <div class="recbtns">
            <button class="btn primary act-savenew">💾 Save New</button>
            <button class="btn act-find">🔎 Find Record</button>
            <button class="btn act-update">↺ Update Record</button>
            <button class="btn danger act-delete">🗑 Delete Record</button>
            <button class="btn act-clear">✕ Clear Form</button>
            <div class="outputbtns">
              <button class="btn small act-print" disabled title="Find a licence first">🖨 Print…</button>
              <button class="btn small act-register">Open register</button>
            </div>
            <div class="acct-panel" id="acct"></div>
          </div>
        </div>
      </div>`;

    const $ = (sel) => mount.querySelector(sel);
    const $$ = (sel) => mount.querySelectorAll(sel);

    /* line-table renderers */
    function linesTable(containerId, cols, rows, addLabel, max) {
      const el = $("#" + containerId);
      const head = `<tr><th class="ln">#</th>${cols.map((c) => `<th>${c.h}</th>`).join("")}<th class="rm"></th></tr>`;
      const body = rows.map((r, i) => `<tr>
        <td class="ln">${i + 1}</td>
        ${cols.map((c) => `<td>${c.input(r, i)}</td>`).join("")}
        <td class="rm"><button data-i="${i}" title="Remove line">✕</button></td></tr>`).join("");
      el.innerHTML = `<table class="lines-table"><thead>${head}</thead><tbody>${body}</tbody></table>
        <button class="btn small act-addline" ${rows.length >= max ? "disabled" : ""} style="margin-top:6px">＋ ${addLabel}</button>`;
      el.querySelector(".act-addline").onclick = () => { if (rows.length < max) { rows.push({}); renderLines(); } };
      el.querySelectorAll(".rm button").forEach((b) => { b.onclick = () => { rows.splice(+b.dataset.i, 1); if (!rows.length) rows.push({}); renderLines(); }; });
      el.querySelectorAll("input,select").forEach((inp) => {
        inp.oninput = () => { const r = rows[+inp.dataset.i]; if (r) r[inp.dataset.k] = inp.value; };
      });
    }
    function renderLines() {
      linesTable("chems", [
        { h: "Trade or IUPAC Name", input: (r, i) => `<input data-i="${i}" data-k="name" value="${esc(r.name || "")}">` },
        { h: "EPA Registration No.", input: (r, i) => `<input data-i="${i}" data-k="epaRegNo" value="${esc(r.epaRegNo || "")}">` },
        { h: "Type", input: (r, i) => `<input data-i="${i}" data-k="type" value="${esc(r.type || "")}">` },
        { h: "Stipulated Qty (CIL)", input: (r, i) => `<input data-i="${i}" data-k="qty" value="${esc(r.qty || "")}">` },
        { h: "Unit", input: (r, i) => `<input data-i="${i}" data-k="unit" list="dl_units" value="${esc(r.unit || "")}">` },
        { h: "Consignment Ref. (CIL)", input: (r, i) => `<input data-i="${i}" data-k="consignmentRef" value="${esc(r.consignmentRef || "")}">` },
      ], model.chemicals, "Add chemical line", 15);
      linesTable("vehs", [
        { h: "Vehicle Type", input: (r, i) => `<input data-i="${i}" data-k="vehicleType" list="dl_vtypes" value="${esc(r.vehicleType || "")}">` },
        { h: "Vehicle Registration No.", input: (r, i) => `<input data-i="${i}" data-k="regNo" value="${esc(r.regNo || "")}">` },
        { h: "EPA Registration No.", input: (r, i) => `<input data-i="${i}" data-k="epaRegNo" value="${esc(r.epaRegNo || "")}">` },
      ], model.vehicles, "Add vehicle", 12);
      linesTable("limits", [
        { h: "Parameter", input: (r, i) => `<input data-i="${i}" data-k="parameter" list="dl_params" value="${esc(r.parameter || "")}">` },
        { h: "Unit", input: (r, i) => `<input data-i="${i}" data-k="unit" list="dl_eunits" value="${esc(r.unit || "")}">` },
        { h: "Limit", input: (r, i) => `<input data-i="${i}" data-k="limit" value="${esc(r.limit || "")}">` },
        { h: "Sample Type", input: (r, i) => `<input data-i="${i}" data-k="sampleType" value="${esc(r.sampleType || "")}">` },
        { h: "Testing Schedule", input: (r, i) => `<input data-i="${i}" data-k="testingSchedule" list="dl_sched" value="${esc(r.testingSchedule || "")}">` },
        { h: "Discharge Stage (RP only)", input: (r, i) => `<input data-i="${i}" data-k="stage" value="${esc(r.stage || "")}">` },
      ], model.limits, "Add limit line", 20);
      linesTable("coords", [
        { h: "Table (1A or 1B)", input: (r, i) => `<input data-i="${i}" data-k="table" value="${esc(r.table || "")}" placeholder="1A / 1B">` },
        { h: "Vertex", input: (r, i) => `<input data-i="${i}" data-k="vertex" value="${esc(r.vertex || "")}">` },
        { h: "Easting", input: (r, i) => `<input data-i="${i}" data-k="easting" value="${esc(r.easting || "")}">` },
        { h: "Northing", input: (r, i) => `<input data-i="${i}" data-k="northing" value="${esc(r.northing || "")}">` },
      ], model.coordinates, "Add coordinate line", 20);
      linesTable("sources", [
        { h: "Discharge source", input: (r, i) => `<input data-i="${i}" data-k="source" value="${esc(r.source || "")}">` },
        { h: "Receiving unit", input: (r, i) => `<input data-i="${i}" data-k="receivingUnit" value="${esc(r.receivingUnit || "")}">` },
        { h: "X (Table 1B)", input: (r, i) => `<input data-i="${i}" data-k="x" value="${esc(r.x || "")}">` },
        { h: "Y (Table 1B)", input: (r, i) => `<input data-i="${i}" data-k="y" value="${esc(r.y || "")}">` },
      ], model.sources, "Add source line", 6);
    }

    function collect() {
      model.id = $("#f_id").value.trim();
      model.companyId = resolveCompany($("#f_company").value) || "";
      model.nameRecorded = $("#f_company").value.includes("—") ? $("#f_company").value.split("—").slice(1).join("—").trim() : "";
      model.category = $("#f_category").value.trim();
      model.type = $("#f_type").value.trim();
      model.location = $("#f_location").value.trim();
      model.applicationDate = $("#f_appdate").value || null;
      model.responseDate = $("#f_respdate").value || null;
      model.refCode = $("#f_refcode").value.trim();
      model.licenceNo = $("#f_licno").value.trim();
      model.dateIssued = $("#f_issdate").value || null;
      model.expiryDate = $("#f_expdate").value || null;
      model.remarks = $("#f_remarks").value.trim();
      model.billNo = $("#f_billno").value.trim() || null;
      $$(".eff").forEach((inp) => { model.effluent[0][inp.dataset.k] = inp.value; });
      return model;
    }
    function setFromRow(row, children) {
      const chems = children.chems.map((r) => ({ name: r[3] || "", epaRegNo: r[4] || "", type: r[5] || "", qty: r[6] ?? "", unit: r[7] || "", consignmentRef: r[8] || "" }));
      const vehs = children.vehicles.map((r) => ({ vehicleType: r[3] || "", regNo: r[4] || "", epaRegNo: r[5] || "" }));
      const eff = { receivingWater: "", maxVolume: "", dischargePoint: "" };
      const limits = [], coords = [], sources = [];
      children.eff.forEach((r) => {
        const sec = r[3], line = r[4];
        if (sec === "Setting") { if (line === 1) eff.receivingWater = r[6] || ""; if (line === 2) eff.maxVolume = r[6] || ""; if (line === 3) eff.dischargePoint = r[6] || ""; }
        else if (sec === "Limit") limits.push({ parameter: r[5] || "", unit: r[6] || "", limit: r[7] ?? "", sampleType: r[8] || "", testingSchedule: r[9] || "", stage: r[10] || "" });
        else if (sec === "Coordinate") coords.push({ table: r[5] || "", vertex: r[6] || "", easting: r[7] ?? "", northing: r[8] ?? "" });
        else if (sec === "Source") sources.push({ source: r[5] || "", receivingUnit: r[6] || "", x: r[7] ?? "", y: r[8] ?? "" });
      });
      model = {
        id: row[0], companyId: row[1], nameRecorded: row[3] || "", category: row[4] || "", type: row[5] || "", location: row[6] || "",
        applicationDate: row[7] || "", responseDate: row[8] || "", refCode: row[9] || "", licenceNo: row[10] || "",
        dateIssued: row[11] || "", expiryDate: row[12] || "", remarks: row[14] || "", billNo: row[16] || null,
        chemicals: chems.length ? chems : [{}], vehicles: vehs.length ? vehs : [{}],
        effluent: [eff], limits: limits.length ? limits : [{}], coordinates: coords.length ? coords : [{}], sources: sources.length ? sources : [{}],
      };
      $("#f_id").value = model.id;
      $("#f_company").value = model.companyId + " — " + (Store.state.data.sheets.companies.rows.find((c) => c[0] === model.companyId)?.[1] || row[2] || "");
      $("#f_category").value = model.category; $("#f_type").value = model.type; $("#f_location").value = model.location;
      $("#f_appdate").value = model.applicationDate || ""; $("#f_respdate").value = model.responseDate || "";
      $("#f_refcode").value = model.refCode; $("#f_licno").value = model.licenceNo;
      $("#f_issdate").value = model.dateIssued || ""; $("#f_expdate").value = model.expiryDate || "";
      $("#f_remarks").value = model.remarks; $("#f_billno").value = model.billNo || "";
      $$(".eff").forEach((inp) => { inp.value = model.effluent[0][inp.dataset.k] || ""; });
      renderLines(); status(); acct(); $(".act-print").disabled = false;
    }
    function status() {
      const m = collect();
      const missing = [];
      if (!m.companyId) missing.push("Company");
      if (!m.category) missing.push("Licence Category");
      if (!m.type) missing.push("Licence / Certificate Type");
      const el = $("#fstat");
      if (missing.length) { el.className = "formstatus bad"; el.innerHTML = "✖ Missing: " + missing.join("; "); }
      else {
        const st = CMU.licenceStatus(m.licenceNo, m.expiryDate);
        el.className = "formstatus ok";
        el.innerHTML = `✓ ${m.id ? "Editing " + esc(m.id) : "Ready to save as " + nid()} — status will be <b>${st}</b>`;
      }
    }
    function acct() {
      const m = collect();
      const box = $("#acct");
      if (!m.companyId) { box.innerHTML = `<b>Company account</b><br><span class="muted">Choose a company to see its totals.</span>`; return; }
      const st = CMU.companyStats(Store.state.data, m.companyId);
      box.innerHTML = `<b>${esc(m.companyId)}</b><br>Licences: <b>${st.licences}</b> · Clearances: <b>${st.clearances}</b><br>Billed: <b>${CMU.fmtMoney(st.billed)}</b> · Paid: <b>${CMU.fmtMoney(st.paid)}</b>`;
    }
    ["f_id", "f_company", "f_category", "f_type", "f_location", "f_refcode", "f_licno", "f_remarks", "f_billno"].forEach((id) => { $("#" + id).oninput = status; });
    ["f_appdate", "f_respdate", "f_issdate", "f_expdate"].forEach((id) => { $("#" + id).onchange = status; });
    $("#f_company").onchange = acct;

    function findLicence(id) {
      const row = d().sheets.licences.rows.find((r) => r[0] === id);
      if (!row) return null;
      const chems = d().sheets.licenceChemicals.rows.filter((r) => r[0] === id);
      const vehicles = d().sheets.licenceVehicles.rows.filter((r) => r[0] === id);
      const eff = d().sheets.licenceEffluent.rows.filter((r) => r[0] === id);
      return { row, chems, vehicles, eff };
    }

    $(".act-savenew").onclick = async () => {
      const m = collect();
      if (!m.companyId || !m.category || !m.type) return toast("Company, Licence Category and Licence / Certificate Type are required", "bad");
      try {
        const res = await Store.record("licence", { action: "new", record: m });
        toast(`Saved — licence ${res.id} added. ${(m.chemicals.filter((c) => c.name).length)} chemical line(s).`, "good");
        (res.warnings || []).forEach((w) => toast("⚠ " + esc(w), "warn", 7000));
        const found = findLicence(res.id); if (found) setFromRow(found.row, found);
      } catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-find").onclick = () => {
      const id = $("#f_id").value.trim();
      if (!id) return toast("Type a Licence Record ID (e.g. LIC-027) in the Record ID field first", "bad");
      const found = findLicence(id);
      if (!found) return toast("Licence " + esc(id) + " not found", "bad");
      setFromRow(found.row, found);
      toast("Loaded " + id, "good");
    };
    $(".act-update").onclick = async () => {
      const m = collect();
      if (!m.id) return toast("Find a licence first", "bad");
      if (!m.companyId || !m.category || !m.type) return toast("Company, Category and Type are required", "bad");
      try {
        const res = await Store.record("licence", { action: "update", record: m });
        toast("Updated " + m.id, "good");
        (res.warnings || []).forEach((w) => toast("⚠ " + esc(w), "warn", 7000));
      } catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-delete").onclick = async () => {
      const m = collect();
      if (!m.id) return toast("Find a licence first", "bad");
      if (!confirm(`Delete licence ${m.id}?\n\nIts chemical, vehicle and effluent lines are deleted with it.`)) return;
      try { await Store.record("licence", { action: "delete", record: m }); $(".act-clear").click(); toast("Licence deleted", "good"); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-clear").onclick = () => {
      model = emptyModel();
      ["f_id", "f_company", "f_category", "f_type", "f_location", "f_refcode", "f_licno", "f_remarks", "f_billno"].forEach((id) => $("#" + id).value = "");
      ["f_appdate", "f_respdate", "f_issdate", "f_expdate"].forEach((id) => $("#" + id).value = "");
      $$(".eff").forEach((inp) => inp.value = "");
      renderLines(); status(); acct(); $(".act-print").disabled = true;
    };
    $(".act-register").onclick = () => App.go("sheet/licences");
    $(".act-print").onclick = () => {
      const m = collect();
      const t = (m.type || "").toLowerCase();
      let page = "crl";
      if (t.includes("importation")) page = "cil";
      else if (t.includes("retention")) page = "edlrp";
      else if (t.includes("effluent") || t.includes("dewatering")) page = "edl";
      App.go("print/" + page, { id: m.id });
    };

    // extra datalists
    const dl = `<datalist id="dl_units">${d().lists.units.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
      <datalist id="dl_vtypes">${d().lists.vehicleTypes.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
      <datalist id="dl_params">${d().lists.parameters.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
      <datalist id="dl_eunits">${d().lists.effluentUnits.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
      <datalist id="dl_sched">${d().lists.testingSchedules.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>`;
    mount.insertAdjacentHTML("beforeend", dl);

    renderLines(); status(); acct();
    if (params && params.findId) {
      const found = findLicence(params.findId);
      if (found) setFromRow(found.row, found);
    }
  }

  /* ------------------------------------------------------------------ CLEARANCE */
  function clearanceForm(mount, params) {
    const d = () => Store.state.data;
    let model = { clearanceNo: "", companyId: "", clearanceDate: "", refNo: "", blNoDefault: "", remarks: "", eta: "", billNo: "", lines: [{}] };

    mount.innerHTML = `
      <div class="screen">
        <div class="page-head">
          <div><h1>📦 Chemical Clearance Form <span class="muted">(multi-chemical)</span></h1>
          <div class="sub">One clearance = one Clearance No. (automatic) with up to 20 chemicals. Fill the details once, list the chemicals, click Save New. To edit: type the Clearance No., EPA Ref. No. or a CLR- ID and click Find.</div></div>
        </div>
        <div class="formwrap">
          <div>
            <div class="formstatus" id="fstat"></div>
            <div class="card"><div class="card-b">
              ${frowHtml("Clearance No.", `<input class="fin" id="f_no" placeholder="AUTO for a new clearance">`, `AUTO — leave blank for a new clearance (next: <b>${d().nextIds.clearanceNo}</b>). To edit, type a Clearance No. / EPA Ref. / CLR- ID and click Find.`, false)}
              ${frowHtml("Company", `<input class="fin" id="f_company" list="dl_companies" placeholder="Type to search">`, "Choose the company", true)}
              <datalist id="dl_companies">${companyDatalist().map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
              ${frowHtml("Clearance Date", `<input class="fin" id="f_date" type="date">`, "dd-mmm-yyyy", true)}
              ${frowHtml("EPA Ref. No.", `<input class="fin" id="f_ref" placeholder="ED/EPA-01/388/26/RL (optional)">`, "EPA letter number (optional)", false)}
              ${frowHtml("B/L / Invoice / AWB No.", `<input class="fin" id="f_bl" placeholder="Default B/L for all lines">`, "Default B/L for all lines – type a different one on a line if needed", false)}
              ${frowHtml("ETA", `<input class="fin" id="f_eta" placeholder="Date or N/A">`, "Estimated arrival – printed on the clearance letter", false)}
              ${frowHtml("Bill No.", `<input class="fin" id="f_billno" list="dl_billnos" placeholder="BN-2026-… (optional)">`, false)}
              <datalist id="dl_billnos">${[...new Set(d().sheets.bills.rows.map((r) => r[1]))].map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
              ${frowHtml("Remarks", `<textarea class="fin" id="f_remarks" rows="2" placeholder="Applies to all lines"></textarea>`, false)}
            </div></div>

            <div class="fsec">CHEMICAL LINES <span class="small">(up to 20 — each line gets its own CLR- number)</span></div>
            <div id="lines"></div>
            <div class="totalbar" id="totals"></div>
            <p class="hint" style="margin-top:6px">Tip: if “Chemical as Recorded” is blank, the Standard name is saved in its place. To remove a saved chemical, Find it, clear that whole line, then click Update.</p>
          </div>
          <div class="recbtns">
            <button class="btn primary act-savenew">💾 Save New</button>
            <button class="btn act-find">🔎 Find Record</button>
            <button class="btn act-update">↺ Update Record</button>
            <button class="btn danger act-delete">🗑 Delete Record</button>
            <button class="btn act-clear">✕ Clear Form</button>
            <div class="outputbtns">
              <button class="btn small act-print" disabled>🖨 Print letter</button>
              <button class="btn small act-register">Open register</button>
            </div>
            <div class="acct-panel" id="acct"></div>
          </div>
        </div>
      </div>`;

    const $ = (s) => mount.querySelector(s);
    function renderLines() {
      const el = $("#lines");
      el.innerHTML = `<table class="lines-table"><thead><tr><th class="ln">#</th>
        <th>Chemical as Recorded</th><th>Chemical (Standard)</th><th>Quantity</th><th>Unit</th><th>B/L / Invoice No. (blank = default)</th><th class="rm"></th></tr></thead>
        <tbody>${model.lines.map((r, i) => `<tr><td class="ln">${i + 1}</td>
          <td><input data-i="${i}" data-k="chemicalRecorded" value="${esc(r.chemicalRecorded || "")}"></td>
          <td><input data-i="${i}" data-k="chemicalStandard" list="dl_chems" value="${esc(r.chemicalStandard || "")}"></td>
          <td><input data-i="${i}" data-k="qty" style="width:80px" value="${esc(r.qty ?? "")}"></td>
          <td><input data-i="${i}" data-k="unit" list="dl_units" style="width:70px" value="${esc(r.unit || "")}"></td>
          <td><input data-i="${i}" data-k="blNo" value="${esc(r.blNo || "")}"></td>
          <td class="rm"><button data-i="${i}">✕</button></td></tr>`).join("")}</tbody></table>
        <button class="btn small act-addline" ${model.lines.length >= 20 ? "disabled" : ""} style="margin-top:6px">＋ Add chemical line</button>`;
      el.querySelector(".act-addline").onclick = () => { model.lines.push({}); renderLines(); };
      el.querySelectorAll(".rm button").forEach((b) => b.onclick = () => { model.lines.splice(+b.dataset.i, 1); if (!model.lines.length) model.lines.push({}); renderLines(); status(); });
      el.querySelectorAll("input").forEach((inp) => inp.oninput = () => { model.lines[+inp.dataset.i][inp.dataset.k] = inp.value; status(); });
    }
    function collect() {
      model.clearanceNo = $("#f_no").value.trim();
      model.companyId = resolveCompany($("#f_company").value) || "";
      model.clearanceDate = $("#f_date").value || null;
      model.refNo = $("#f_ref").value.trim() || null;
      model.blNoDefault = $("#f_bl").value.trim() || null;
      model.eta = $("#f_eta").value.trim() || null;
      model.billNo = $("#f_billno").value.trim() || null;
      model.remarks = $("#f_remarks").value.trim() || null;
      return model;
    }
    function status() {
      const m = collect();
      const n = m.lines.filter((l) => l.chemicalStandard || l.chemicalRecorded || l.qty).length;
      const missing = [];
      if (!m.companyId) missing.push("Company");
      if (!m.clearanceDate) missing.push("Clearance Date");
      if (!n) missing.push("at least one chemical line");
      const el = $("#fstat");
      if (missing.length) { el.className = "formstatus bad"; el.innerHTML = "✖ Missing: " + missing.join("; "); }
      else el.className = "formstatus ok", el.innerHTML = `✓ ${m.clearanceNo ? "Editing " + esc(m.clearanceNo) : "Ready to save as " + d().nextIds.clearanceNo} — ${n} chemical line(s)`;
      let kg = 0, ok = true;
      m.lines.forEach((l) => { const k = CMU.qtyKg(l.qty, l.unit); if (l.qty != null && l.qty !== "" && k == null) ok = false; else if (k != null) kg += k; });
      $("#totals").innerHTML = `<span>TOTAL</span><span>${CMU.fmtNum(Math.round(kg))} kg</span><span>${(kg / 1000).toFixed(3)} MT</span>${ok ? "" : `<span style="color:var(--g-red)">⚠ some units cannot convert to kg</span>`}`;
      $(".act-print").disabled = !m.clearanceNo;
    }
    function acct() {
      const m = collect();
      if (!m.companyId) { $("#acct").innerHTML = `<b>Company account</b><br><span class="muted">Choose a company.</span>`; return; }
      const st = CMU.companyStats(Store.state.data, m.companyId);
      $("#acct").innerHTML = `<b>${esc(m.companyId)}</b><br>Clearances: <b>${st.clearances}</b> · Total cleared: <b>${CMU.fmtNum(Math.round(st.kg))} kg</b><br>Billed: <b>${CMU.fmtMoney(st.billed)}</b> · Paid: <b>${CMU.fmtMoney(st.paid)}</b>`;
    }
    ["f_no", "f_company", "f_ref", "f_bl", "f_eta", "f_billno", "f_remarks"].forEach((id) => $("#" + id).oninput = status);
    $("#f_company").onchange = acct;
    $("#f_date").onchange = status;

    function findClearance(key) {
      const rows = d().sheets.clearances.rows;
      let group = rows.filter((r) => r[1] === key);
      if (!group.length) group = rows.filter((r) => (r[11] || "") === key || r[0] === key);
      if (!group.length) {
        const one = rows.find((r) => r[0] === key || (r[11] || "") === key);
        if (one) group = rows.filter((r) => r[1] === one[1]);
      }
      return group;
    }
    function load(group) {
      const first = group[0];
      model = {
        clearanceNo: first[1], companyId: first[2], clearanceDate: first[12] || "", refNo: first[11] || "", blNoDefault: "", remarks: first[13] || "", eta: first[15] || "", billNo: first[16] || "",
        lines: group.map((r) => ({ chemicalRecorded: r[4] || "", chemicalStandard: r[5] || "", qty: r[6] ?? "", unit: r[7] || "", blNo: r[10] || "" })),
      };
      $("#f_no").value = model.clearanceNo;
      const co = Store.state.data.sheets.companies.rows.find((c) => c[0] === model.companyId);
      $("#f_company").value = model.companyId + " — " + (co ? co[1] : "");
      $("#f_date").value = model.clearanceDate || "";
      $("#f_ref").value = model.refNo || ""; $("#f_bl").value = ""; $("#f_eta").value = model.eta || "";
      $("#f_billno").value = model.billNo || ""; $("#f_remarks").value = model.remarks || "";
      renderLines(); status(); acct();
    }

    $(".act-savenew").onclick = async () => {
      const m = collect();
      const n = m.lines.filter((l) => l.chemicalStandard || l.chemicalRecorded || l.qty).length;
      if (!m.companyId || !m.clearanceDate || !n) return toast("Company, Clearance Date and at least one chemical line are required", "bad");
      try {
        const res = await Store.record("clearance", { action: "new", record: m });
        toast(`Saved — clearance ${res.clearanceNo} with ${n} line(s)`, "good");
        (res.warnings || []).forEach((w) => toast("⚠ " + esc(w), "warn", 7000));
        load(findClearance(res.clearanceNo));
      } catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-find").onclick = () => {
      const key = $("#f_no").value.trim();
      if (!key) return toast("Type a Clearance No. (CLN-###), EPA Ref. No. or CLR- ID first", "bad");
      const group = findClearance(key);
      if (!group.length) return toast("Clearance not found: " + esc(key), "bad");
      load(group); toast(`Loaded ${group[0][1]} — ${group.length} line(s)`, "good");
    };
    $(".act-update").onclick = async () => {
      const m = collect();
      if (!m.clearanceNo) return toast("Find a clearance first", "bad");
      try { const res = await Store.record("clearance", { action: "update", record: m }); toast("Updated " + m.clearanceNo, "good"); (res.warnings || []).forEach((w) => toast("⚠ " + esc(w), "warn", 7000)); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-delete").onclick = async () => {
      const m = collect();
      if (!m.clearanceNo) return toast("Find a clearance first", "bad");
      if (!confirm(`Delete clearance ${m.clearanceNo} and ALL of its chemical lines?`)) return;
      try { await Store.record("clearance", { action: "delete", record: m }); $(".act-clear").click(); toast("Clearance deleted", "good"); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-clear").onclick = () => {
      model = { clearanceNo: "", companyId: "", clearanceDate: "", refNo: "", blNoDefault: "", remarks: "", eta: "", billNo: "", lines: [{}] };
      ["f_no", "f_company", "f_ref", "f_bl", "f_eta", "f_billno", "f_remarks", "f_date"].forEach((id) => $("#" + id).value = "");
      renderLines(); status(); acct();
    };
    $(".act-register").onclick = () => App.go("sheet/clearances");
    $(".act-print").onclick = () => App.go("print/clearance", { id: model.clearanceNo });
    mount.insertAdjacentHTML("beforeend", `<datalist id="dl_chems">${d().lists.chemicals.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
      <datalist id="dl_units">${d().lists.units.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>`);
    renderLines(); status(); acct();
    if (params && params.findClearanceNo) { const g = findClearance(params.findClearanceNo); if (g.length) load(g); }
  }

  /* ------------------------------------------------------------------ BILL */
  function billForm(mount, params) {
    const d = () => Store.state.data;
    let model = { billNo: "", companyId: "", billDate: "", billType: "", billRefNo: "", contactPerson: "", contactTitle: "", location: "", activity: "", linkedRecord: "", lines: [{}] };
    const billTypes = () => d().fees.billTypes.map((b) => b.type);

    mount.innerHTML = `
      <div class="screen">
        <div class="page-head">
          <div><h1>🧾 Bill / Invoice Form <span class="muted">(multi-service)</span></h1>
          <div class="sub">One bill = one Bill No. (automatic) with up to 10 services. The Bill Type decides the allowed services and the exact letter wording printed on the bill letter.</div></div>
        </div>
        <div class="formwrap">
          <div>
            <div class="formstatus" id="fstat"></div>
            <div class="card"><div class="card-b">
              ${frowHtml("Bill No.", `<input class="fin" id="f_no" placeholder="AUTO for a new bill">`, `AUTO — leave blank for a new bill (next: <b>${d().nextIds.billNo}</b>). To edit, type a Bill No. / Bill Ref. No. / BIL- ID and click Find.`, false)}
              ${frowHtml("Company", `<input class="fin" id="f_company" list="dl_companies" placeholder="Type to search">`, "Choose the company", true)}
              <datalist id="dl_companies">${companyDatalist().map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
              ${frowHtml("Bill Date", `<input class="fin" id="f_date" type="date">`, "dd-mmm-yyyy", true)}
              ${frowHtml("Bill Type", `<select class="fin fsel" id="f_type"><option value="">(choose Bill Type first)</option>${billTypes().map((t) => `<option>${esc(t)}</option>`).join("")}</select>`, "The Bill Type decides the allowed services and the exact letter wording", true)}
              ${frowHtml("Bill Ref. No.", `<input class="fin" id="f_ref" placeholder="ED/EPA-01/03336/26/RL">`, "EPA letter reference", false)}
              ${frowHtml("Contact Person", `<input class="fin" id="f_contact" placeholder="e.g. Mr. Isaac Bestman">`, "Name as it should appear on the letter", false)}
              ${frowHtml("Position / Title", `<input class="fin" id="f_title" placeholder="e.g. General Manager">`, "Job title – or Mr./Mrs./Dr. if you typed only the name", false)}
              ${frowHtml("Location", `<input class="fin" id="f_location">`, false)}
              ${frowHtml("Activity", `<input class="fin" id="f_activity" list="dl_sectors">`, false)}
              <datalist id="dl_sectors">${d().lists.sectors.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
              ${frowHtml("Linked Record(s)", `<input class="fin" id="f_linked" placeholder="LIC-### / CLN-###">`, "Links this bill to the licence or clearance", false)}
            </div></div>
            <div class="fsec">BILL LINES <span class="small">(up to 10 services — suggested fees come from the Fee Schedule)</span></div>
            <div id="lines"></div>
            <div class="totalbar" id="totals"></div>
            <p class="hint" style="margin-top:6px">Tip: to remove a saved service from a bill, Find the bill, clear that line's Service and Amount, then click Update.</p>
          </div>
          <div class="recbtns">
            <button class="btn primary act-savenew">💾 Save New</button>
            <button class="btn act-find">🔎 Find Record</button>
            <button class="btn act-update">↺ Update Record</button>
            <button class="btn danger act-delete">🗑 Delete Record</button>
            <button class="btn act-clear">✕ Clear Form</button>
            <div class="outputbtns">
              <button class="btn small act-print" disabled>🖨 Print letter</button>
              <button class="btn small act-register">Open register</button>
            </div>
            <div class="acct-panel" id="acct"></div>
          </div>
        </div>
      </div>`;

    const $ = (s) => mount.querySelector(s);
    const allowedServices = () => {
      const t = $("#f_type").value;
      if (!t) return d().fees.services.map((s) => s.service);
      const bt = d().fees.billTypes.find((b) => b.type === t);
      if (!bt) return d().fees.services.map((s) => s.service);
      return d().fees.services.filter((s) => s.group === bt.group).map((s) => s.service).concat(d().fees.services.filter((s) => s.group === "Other").map((s) => s.service));
    };
    function renderLines() {
      const el = $("#lines");
      const svcs = allowedServices();
      el.innerHTML = `<table class="lines-table"><thead><tr><th class="ln">#</th><th>Service</th><th>Details / Chemical(s)</th><th>Amount (USD)</th><th>Suggested fee</th><th class="rm"></th></tr></thead>
        <tbody>${model.lines.map((r, i) => `<tr><td class="ln">${i + 1}</td>
          <td><input data-i="${i}" data-k="service" list="dl_services" value="${esc(r.service || "")}"></td>
          <td><input data-i="${i}" data-k="details" value="${esc(r.details || "")}"></td>
          <td><input data-i="${i}" data-k="amount" style="width:100px" value="${esc(r.amount ?? "")}"></td>
          <td class="muted" style="width:90px" id="sf_${i}">${feeFor(r.service) ? CMU.fmtMoney(feeFor(r.service)) : "—"}</td>
          <td class="rm"><button data-i="${i}">✕</button></td></tr>`).join("")}</tbody></table>
        <button class="btn small act-addline" ${model.lines.length >= 10 ? "disabled" : ""} style="margin-top:6px">＋ Add service</button>`;
      el.querySelector(".act-addline").onclick = () => { model.lines.push({}); renderLines(); };
      el.querySelectorAll(".rm button").forEach((b) => b.onclick = () => { model.lines.splice(+b.dataset.i, 1); if (!model.lines.length) model.lines.push({}); renderLines(); status(); });
      el.querySelectorAll("input").forEach((inp) => inp.oninput = () => {
        model.lines[+inp.dataset.i][inp.dataset.k] = inp.value;
        if (inp.dataset.k === "service") { const f = feeFor(inp.value); const cell = $("#sf_" + inp.dataset.i); if (cell) cell.textContent = f ? CMU.fmtMoney(f) : "—"; }
        status();
      });
    }
    const feeFor = (service) => { const s = d().fees.services.find((x) => x.service === service); return s ? s.fee : null; };
    function collect() {
      model.billNo = $("#f_no").value.trim();
      model.companyId = resolveCompany($("#f_company").value) || "";
      model.billDate = $("#f_date").value || null;
      model.billType = $("#f_type").value;
      model.billRefNo = $("#f_ref").value.trim() || null;
      model.contactPerson = $("#f_contact").value.trim() || null;
      model.contactTitle = $("#f_title").value.trim() || null;
      model.location = $("#f_location").value.trim() || null;
      model.activity = $("#f_activity").value.trim() || null;
      model.linkedRecord = $("#f_linked").value.trim() || null;
      return model;
    }
    function status() {
      const m = collect();
      const n = m.lines.filter((l) => l.service || l.amount != null).length;
      const missing = [];
      if (!m.companyId) missing.push("Company");
      if (!m.billDate) missing.push("Bill Date");
      if (!m.billType) missing.push("Bill Type");
      if (!n) missing.push("at least one service line");
      const el = $("#fstat");
      if (missing.length) { el.className = "formstatus bad"; el.innerHTML = "✖ Missing: " + missing.join("; "); }
      else {
        const tot = m.lines.reduce((s, l) => s + (+l.amount || 0), 0);
        el.className = "formstatus ok";
        el.innerHTML = `✓ ${m.billNo ? "Editing " + esc(m.billNo) : "Ready to save as " + d().nextIds.billNo} — total ${CMU.fmtMoney(tot)}`;
      }
      const tot = m.lines.reduce((s, l) => s + (+l.amount || 0), 0);
      $("#totals").innerHTML = `<span>TOTAL</span><span>${CMU.fmtMoney(tot)}</span><span class="muted" style="font-weight:400">${esc(CMU.amountWords(tot))}</span>`;
      $(".act-print").disabled = !m.billNo;
    }
    function acct() {
      const m = collect();
      if (!m.companyId) { $("#acct").innerHTML = `<b>Company account</b><br><span class="muted">Choose a company.</span>`; return; }
      const st = CMU.companyStats(Store.state.data, m.companyId);
      $("#acct").innerHTML = `<b>${esc(m.companyId)}</b><br>Billed: <b>${CMU.fmtMoney(st.billed)}</b><br>Paid: <b>${CMU.fmtMoney(st.paid)}</b><br>Balance: <b>${CMU.fmtMoney(Math.max(0, st.billed - st.paid))}</b>`;
    }
    ["f_no", "f_company", "f_ref", "f_contact", "f_title", "f_location", "f_activity", "f_linked"].forEach((id) => $("#" + id).oninput = status);
    $("#f_company").onchange = acct;
    $("#f_date").onchange = status;
    $("#f_type").onchange = () => { status(); renderLines(); };

    function findBill(key) {
      const rows = d().sheets.bills.rows;
      return rows.filter((r) => r[1] === key || (r[15] || "") === key || r[0] === key);
    }
    function load(group) {
      const f = group[0];
      model = {
        billNo: f[1], companyId: f[2], billDate: f[10] || "", billType: f[18] || "", billRefNo: f[15] || "", contactPerson: f[16] || "", contactTitle: f[17] || "",
        location: f[6] || "", activity: f[5] || "", linkedRecord: f[21] || "",
        lines: group.map((r) => ({ service: r[7] || "", details: r[8] || "", amount: r[9] ?? "" })),
      };
      $("#f_no").value = model.billNo;
      const co = Store.state.data.sheets.companies.rows.find((c) => c[0] === model.companyId);
      $("#f_company").value = model.companyId + " — " + (co ? co[1] : "");
      $("#f_date").value = model.billDate || ""; $("#f_type").value = model.billType; $("#f_ref").value = model.billRefNo || "";
      $("#f_contact").value = model.contactPerson || ""; $("#f_title").value = model.contactTitle || "";
      $("#f_location").value = model.location || ""; $("#f_activity").value = model.activity || ""; $("#f_linked").value = model.linkedRecord || "";
      renderLines(); status(); acct();
    }

    $(".act-savenew").onclick = async () => {
      const m = collect();
      const n = m.lines.filter((l) => l.service || l.amount != null).length;
      if (!m.companyId || !m.billDate || !m.billType || !n) return toast("Company, Bill Date, Bill Type and at least one service line are required", "bad");
      try {
        const res = await Store.record("bill", { action: "new", record: m });
        toast(`Saved — bill ${res.billNo}`, "good");
        load(findBill(res.billNo));
      } catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-find").onclick = () => {
      const key = $("#f_no").value.trim();
      if (!key) return toast("Type a Bill No. (BN-2026-###), Bill Ref. No. or BIL- ID first", "bad");
      const g = findBill(key);
      if (!g.length) return toast("Bill not found: " + esc(key), "bad");
      load(g); toast("Loaded " + g[0][1], "good");
    };
    $(".act-update").onclick = async () => {
      const m = collect();
      if (!m.billNo) return toast("Find a bill first", "bad");
      try { await Store.record("bill", { action: "update", record: m }); toast("Updated " + m.billNo, "good"); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-delete").onclick = async () => {
      const m = collect();
      if (!m.billNo) return toast("Find a bill first", "bad");
      if (!confirm(`Delete bill ${m.billNo} and ALL of its service lines?`)) return;
      try { await Store.record("bill", { action: "delete", record: m }); $(".act-clear").click(); toast("Bill deleted", "good"); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-clear").onclick = () => {
      model = { billNo: "", companyId: "", billDate: "", billType: "", billRefNo: "", contactPerson: "", contactTitle: "", location: "", activity: "", linkedRecord: "", lines: [{}] };
      ["f_no", "f_company", "f_ref", "f_contact", "f_title", "f_location", "f_activity", "f_linked", "f_date", "f_type"].forEach((id) => $("#" + id).value = "");
      renderLines(); status(); acct();
    };
    $(".act-register").onclick = () => App.go("sheet/bills");
    $(".act-print").onclick = () => App.go("print/bill", { id: model.billNo });
    mount.insertAdjacentHTML("beforeend", `<datalist id="dl_services">${d().fees.services.map((s) => `<option value="${esc(s.service)}">`).join("")}</datalist>`);
    renderLines(); status(); acct();
    if (params && params.findBillNo) { const g = findBill(params.findBillNo); if (g.length) load(g); }
  }

  /* ------------------------------------------------------------------ PAYMENT */
  function paymentForm(mount, params) {
    const d = () => Store.state.data;
    let model = { id: "", companyId: "", purpose: "", amount: "", paymentDate: "", receiptNo: "", recordGroup: "", remarks: "", billNo: "" };
    const billOptions = () => {
      const ru = CMU.billRollups(d());
      const seen = new Set();
      return d().sheets.bills.rows.filter((r) => { if (seen.has(r[1])) return false; seen.add(r[1]); return true; })
        .map((r) => {
          const bn = r[1], billed = ru.billLines[bn] ? ru.billLines[bn].total : 0;
          const paid = ru.byBillPaid[bn] || 0;
          return { bn, company: r[3], billed, paid, bal: Math.max(0, billed - paid) };
        });
    };
    mount.innerHTML = `
      <div class="screen screen-narrow">
        <div class="page-head">
          <div><h1>💵 Payment / Receipt Form</h1><div class="sub">Record every payment received. Link it to a bill so the bill's Paid / Part paid status updates automatically.</div></div>
        </div>
        <div class="formwrap">
          <div>
            <div class="formstatus" id="fstat"></div>
            <div class="card"><div class="card-b">
              ${frowHtml("Record ID", `<input class="fin" id="f_id" placeholder="Leave blank for a NEW record">`, `Leave blank for a NEW record (next ID: <b>${d().nextIds.payment}</b>). Type an existing ID and click Find to edit.`, false)}
              ${frowHtml("Company", `<input class="fin" id="f_company" list="dl_companies" placeholder="Type to search">`, "Choose the company", true)}
              <datalist id="dl_companies">${companyDatalist().map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
              ${frowHtml("Purpose / Services", `<input class="fin" id="f_purpose" list="dl_purpose" placeholder="What the payment is for">`, "What the payment is for", true)}
              <datalist id="dl_purpose">${d().lists.servicePurpose.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
              ${frowHtml("Amount (USD)", `<input class="fin" id="f_amount" type="number" step="0.01" min="0">`, "US dollars", true)}
              ${frowHtml("Payment Date", `<input class="fin" id="f_date" type="date">`, "dd-mmm-yyyy", true)}
              ${frowHtml("Receipt No.", `<input class="fin" id="f_receipt" placeholder="Receipt number from the payment slip">`, false)}
              ${frowHtml("Bill No. (paying for)", `<select class="fin fsel" id="f_billno"><option value="">(not linked)</option>${billOptions().map((b) => `<option value="${esc(b.bn)}">${esc(b.bn)} — ${esc(b.company)} — billed ${CMU.fmtMoney(b.billed)}, paid ${CMU.fmtMoney(b.paid)}, balance ${CMU.fmtMoney(b.bal)}</option>`).join("")}</select>`, "Link this payment to a bill so the bill shows Paid / Part paid", false)}
              ${frowHtml("Record Group", `<select class="fin fsel" id="f_group"><option value="">(none)</option>${d().lists.recordGroup.map((s) => `<option>${esc(s)}</option>`).join("")}</select>`, false)}
              ${frowHtml("Remarks", `<textarea class="fin" id="f_remarks" rows="2"></textarea>`, false)}
            </div></div>
          </div>
          <div class="recbtns">
            <button class="btn primary act-savenew">💾 Save New</button>
            <button class="btn act-find">🔎 Find Record</button>
            <button class="btn act-update">↺ Update Record</button>
            <button class="btn danger act-delete">🗑 Delete Record</button>
            <button class="btn act-clear">✕ Clear Form</button>
            <button class="btn act-payfull">💵 Pay full balance</button>
            <div class="acct-panel" id="acct"></div>
          </div>
        </div>
      </div>`;
    const $ = (s) => mount.querySelector(s);
    function collect() {
      model.id = $("#f_id").value.trim();
      model.companyId = resolveCompany($("#f_company").value) || "";
      model.purpose = $("#f_purpose").value.trim();
      model.amount = $("#f_amount").value;
      model.paymentDate = $("#f_date").value || null;
      model.receiptNo = $("#f_receipt").value.trim() || null;
      model.billNo = $("#f_billno").value || null;
      model.recordGroup = $("#f_group").value || null;
      model.remarks = $("#f_remarks").value.trim() || null;
      return model;
    }
    function status() {
      const m = collect();
      const missing = [];
      if (!m.companyId) missing.push("Company");
      if (!m.purpose) missing.push("Purpose / Services");
      if (m.amount === "" || isNaN(+m.amount)) missing.push("Amount (USD)");
      if (!m.paymentDate) missing.push("Payment Date");
      const el = $("#fstat");
      if (missing.length) { el.className = "formstatus bad"; el.innerHTML = "✖ Missing: " + missing.join("; "); }
      else el.className = "formstatus ok", el.innerHTML = `✓ ${m.id ? "Editing " + esc(m.id) : "Ready to save as " + d().nextIds.payment} — ${CMU.fmtMoney(+m.amount)}`;
      acct();
    }
    function acct() {
      const m = collect();
      const box = $("#acct");
      if (m.billNo) {
        const b = billOptions().find((x) => x.bn === m.billNo);
        if (b) { box.innerHTML = `<b>Bill ${esc(b.bn)} — ${esc(b.company)}</b><br>Billed: <b>${CMU.fmtMoney(b.billed)}</b><br>Paid before this: <b>${CMU.fmtMoney(b.paid)}</b><br>Balance: <b>${CMU.fmtMoney(b.bal)}</b>${m.amount !== "" && +m.amount > b.bal + 0.005 ? `<br><span style="color:var(--g-red)">⚠ more than the balance</span>` : ""}`; return; }
      }
      if (!m.companyId) { box.innerHTML = `<b>Company account</b><br><span class="muted">Choose a company or a bill.</span>`; return; }
      const st = CMU.companyStats(Store.state.data, m.companyId);
      box.innerHTML = `<b>${esc(m.companyId)}</b><br>Billed: <b>${CMU.fmtMoney(st.billed)}</b> · Paid: <b>${CMU.fmtMoney(st.paid)}</b>`;
    }
    ["f_id", "f_company", "f_purpose", "f_amount", "f_receipt", "f_remarks"].forEach((id) => $("#" + id).oninput = status);
    $("#f_date").onchange = status;
    $("#f_billno").onchange = status;
    $("#f_group").onchange = status;

    $(".act-savenew").onclick = async () => {
      const m = collect();
      if (!m.companyId || !m.purpose || m.amount === "" || !m.paymentDate) return toast("Company, Purpose, Amount and Payment Date are required", "bad");
      try {
        const res = await Store.record("payment", { action: "new", record: m });
        toast(`Saved — payment ${res.id} (${CMU.fmtMoney(+m.amount)})`, "good");
        (res.warnings || []).forEach((w) => toast("⚠ " + esc(w), "warn", 7000));
        $("#f_id").value = res.id;
      } catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-find").onclick = () => {
      const id = $("#f_id").value.trim();
      const row = d().sheets.payments.rows.find((r) => r[0] === id);
      if (!row) return toast("Payment not found — type a Record ID (e.g. PAY-001)", "bad");
      const co = Store.state.data.sheets.companies.rows.find((c) => c[0] === row[1]);
      model = { id: row[0], companyId: row[1], purpose: row[4] || "", amount: row[5] ?? "", paymentDate: row[6] || "", receiptNo: row[7] ?? "", recordGroup: row[8] || "", remarks: row[9] || "", billNo: row[11] || "" };
      $("#f_company").value = model.companyId + " — " + (co ? co[1] : "");
      $("#f_purpose").value = model.purpose; $("#f_amount").value = model.amount; $("#f_date").value = model.paymentDate;
      $("#f_receipt").value = model.receiptNo || ""; $("#f_billno").value = model.billNo || ""; $("#f_group").value = model.recordGroup || ""; $("#f_remarks").value = model.remarks || "";
      status(); toast("Loaded " + model.id, "good");
    };
    $(".act-update").onclick = async () => {
      const m = collect();
      if (!m.id) return toast("Find a payment first", "bad");
      try { const res = await Store.record("payment", { action: "update", record: m }); toast("Updated " + m.id, "good"); (res.warnings || []).forEach((w) => toast("⚠ " + esc(w), "warn", 7000)); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-delete").onclick = async () => {
      const m = collect();
      if (!m.id) return toast("Find a payment first", "bad");
      if (!confirm(`Delete payment ${m.id}?`)) return;
      try { await Store.record("payment", { action: "delete", record: m }); $(".act-clear").click(); toast("Payment deleted", "good"); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-clear").onclick = () => {
      ["f_id", "f_company", "f_purpose", "f_amount", "f_receipt", "f_remarks", "f_date", "f_billno", "f_group"].forEach((id) => $("#" + id).value = "");
      status();
    };
    $(".act-payfull").onclick = () => {
      const m = collect();
      if (!m.billNo) return toast("Choose a Bill No. first, then click Pay full balance", "bad");
      const b = billOptions().find((x) => x.bn === m.billNo);
      if (!b) return;
      $("#f_amount").value = b.bal.toFixed(2);
      if (!m.purpose) $("#f_purpose").value = "Payment on bill " + m.billNo;
      if (!$("#f_date").value) $("#f_date").value = new Date().toISOString().slice(0, 10);
      status();
      toast("Balance " + CMU.fmtMoney(b.bal) + " filled in", "good");
    };
    status();
    if (params && params.findId) {
      $("#f_id").value = params.findId;
      $(".act-find").click();
    }
  }

  /* ------------------------------------------------------------------ ISSUE & CORRESPONDENCE */
  function issueForm(mount, params) {
    simpleLogForm(mount, "issue", "🗒️ Data Issue Log", "Every merge, correction, conflict and exclusion. Update Follow-up Status as items are verified.",
      [
        { k: "id", label: "Issue #", hint: "Leave blank for a NEW record (next: " + Store.state.data.nextIds.issue + ")." },
        { k: "register", label: "Register", list: ["Licences & Certificates", "Licence Chemicals", "Licence Vehicles", "Chemical Clearances", "Bills & Invoices", "Payments & Receipts", "Companies"] },
        { k: "record", label: "Record" },
        { k: "source", label: "Source", hint: "e.g. Clearances.pdf p.44" },
        { k: "issueFound", label: "Issue Found", req: true, wide: true },
        { k: "actionTaken", label: "Action Taken", wide: true },
        { k: "followUpStatus", label: "Follow-up Status", list: ["Open", "Open – confirm", "Open – confirm company", "Open – confirm numbers", "Open – enter from original", "Open – verify against originals", "Closed"] },
      ], params);
  }
  function corrForm(mount, params) {
    simpleLogForm(mount, "correspondence", "✉️ Correspondence Log", "Reminder letters, violation notices, shutdown notices.",
      [
        { k: "id", label: "Record ID", hint: "Leave blank for a NEW record (next: " + Store.state.data.nextIds.correspondence + ")." },
        { k: "companyId", label: "Company", list: "companies", req: true },
        { k: "type", label: "Type", list: ["Violation Notice", "Reminder Letter", "Shutdown Notice", "Other"] },
        { k: "activity", label: "Activity" },
        { k: "description", label: "Description", wide: true },
        { k: "refNo", label: "EPA Reference No." },
        { k: "dateIssued", label: "Date Issued", type: "date" },
      ], params);
  }
  function simpleLogForm(mount, kind, title, subtitle, fields, params) {
    let model = {};
    mount.innerHTML = `
      <div class="screen screen-narrow">
        <div class="page-head"><div><h1>${title}</h1><div class="sub">${subtitle}</div></div></div>
        <div class="formwrap">
          <div>
            <div class="formstatus" id="fstat"></div>
            <div class="card"><div class="card-b" id="fields"></div></div>
          </div>
          <div class="recbtns">
            <button class="btn primary act-savenew">💾 Save New</button>
            <button class="btn act-find">🔎 Find Record</button>
            <button class="btn act-update">↺ Update Record</button>
            <button class="btn danger act-delete">🗑 Delete Record</button>
            <button class="btn act-clear">✕ Clear Form</button>
            <button class="btn small act-register">Open register</button>
          </div>
        </div>
      </div>`;
    const $ = (s) => mount.querySelector(s);
    const fieldHtml = (f) => {
      if (f.list === "companies") return frowHtml(f.label, `<input class="fin" data-k="companyId" list="dl_co" placeholder="Type to search">`, f.hint, f.req);
      if (f.list) return frowHtml(f.label, `<input class="fin" data-k="${f.k}" list="dl_${f.k}" placeholder="">`, f.hint, f.req);
      return frowHtml(f.label, `<input class="fin" data-k="${f.k}" ${f.type === "date" ? 'type="date"' : ""} placeholder="">`, f.hint, f.req);
    };
    $("#fields").innerHTML = fields.map(fieldHtml).join("") +
      `<datalist id="dl_co">${companyDatalist().map((s) => `<option value="${esc(s)}">`).join("")}</datalist>` +
      fields.filter((f) => Array.isArray(f.list)).map((f) => `<datalist id="dl_${f.k}">${f.list.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>`).join("");
    mount.querySelectorAll("#fields .fin").forEach((inp) => { inp.oninput = status; });
    function collect() {
      model = {};
      mount.querySelectorAll("#fields .fin").forEach((inp) => {
        const k = inp.dataset.k;
        if (k === "companyId") model.companyId = resolveCompany(inp.value) || "";
        else model[k] = inp.value.trim();
      });
      return model;
    }
    function status() {
      const m = collect();
      const missing = fields.filter((f) => f.req && !m[f.k]).map((f) => f.label);
      const el = $("#fstat");
      if (missing.length) { el.className = "formstatus bad"; el.innerHTML = "✖ Missing: " + missing.join("; "); }
      else el.className = "formstatus ok", el.innerHTML = `✓ ${m.id ? "Editing " + esc(m.id) : "Ready to save"}`;
    }
    const sheetKey = kind === "issue" ? "issues" : "correspondence";
    function findRec(id) { return Store.state.data.sheets[sheetKey].rows.find((r) => r[0] === id); }
    $(".act-savenew").onclick = async () => {
      const m = collect();
      if (fields.some((f) => f.req && !m[f.k])) return toast("Fill the required (*) fields", "bad");
      try { const res = await Store.record(kind, { action: "new", record: m }); toast("Saved — " + res.id, "good"); const first = mount.querySelector('[data-k="id"]'); if (first) first.value = res.id; }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-find").onclick = () => {
      const m = collect();
      const row = findRec(m.id);
      if (!row) return toast("Record not found — type its ID first", "bad");
      const setVal = (k, v) => { const inp = mount.querySelector(`[data-k="${k}"]`); if (inp) inp.value = v || ""; };
      fields.forEach((f) => {
        if (f.k === "companyId") { const co = Store.state.data.sheets.companies.rows.find((c) => c[0] === row[1]); setVal("companyId", row[1] + " — " + (co ? co[1] : "")); }
        else setVal(f.k, row[fields.indexOf(f)] ?? "");
      });
      status(); toast("Loaded " + row[0], "good");
    };
    $(".act-update").onclick = async () => {
      const m = collect();
      if (!m.id) return toast("Find a record first", "bad");
      try { await Store.record(kind, { action: "update", record: m }); toast("Updated " + m.id, "good"); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-delete").onclick = async () => {
      const m = collect();
      if (!m.id) return toast("Find a record first", "bad");
      if (!confirm(`Delete ${m.id}?`)) return;
      try { await Store.record(kind, { action: "delete", record: m }); $(".act-clear").click(); toast("Deleted", "good"); }
      catch (e) { toast(esc(e.message), "bad"); }
    };
    $(".act-clear").onclick = () => { mount.querySelectorAll("#fields .fin").forEach((inp) => (inp.value = "")); status(); };
    $(".act-register").onclick = () => App.go("sheet/" + sheetKey);
    status();
    if (params && params.findId) { const inp = mount.querySelector('[data-k="id"]'); if (inp) { inp.value = params.findId; $(".act-find").click(); } }
  }

  window.Forms = { company: companyForm, licence: licenceForm, clearance: clearanceForm, bill: billForm, payment: paymentForm, issue: issueForm, correspondence: corrForm };
})();
