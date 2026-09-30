/* App — bootstrap, hash router, sheet tab bar, top bar, find-record modal,
 * sign-in modal, status bar, keyboard shortcuts. */
(function () {
  "use strict";
  const CMU = window.CMU;

  /* workbook order — exactly the tabs of the original file */
  const TABS = [
    { key: "home", label: "Main Menu", group: "menu", color: "#0d652d", route: "#/home" },
    { key: "check", label: "CMU System Doctor", group: "settings", color: "#9334e6", route: "#/check" },
    { key: "check2", label: "Setup Check", group: "settings", color: "#9334e6", route: "#/check" },
    { key: "manual", label: "User Manual", group: "settings", color: "#9334e6", route: "#/manual" },
    { key: "dashboard", label: "Dashboard", group: "settings", color: "#9334e6", route: "#/dashboard" },
    { key: "form/company", label: "Company Form", group: "form", color: "#f9ab00", route: "#/form/company" },
    { key: "form/licence", label: "Licence Form", group: "form", color: "#f9ab00", route: "#/form/licence" },
    { key: "form/clearance", label: "Clearance Form", group: "form", color: "#f9ab00", route: "#/form/clearance" },
    { key: "form/bill", label: "Bill Form", group: "form", color: "#f9ab00", route: "#/form/bill" },
    { key: "form/payment", label: "Payment Form", group: "form", color: "#f9ab00", route: "#/form/payment" },
    { key: "print/crl", label: "Print CRL", group: "print", color: "#34a853", route: "#/print/crl" },
    { key: "print/cil", label: "Print CIL", group: "print", color: "#34a853", route: "#/print/cil" },
    { key: "print/edl", label: "Print EDL", group: "print", color: "#34a853", route: "#/print/edl" },
    { key: "print/edlrp", label: "Print EDL RP", group: "print", color: "#34a853", route: "#/print/edlrp" },
    { key: "print/clearance", label: "Print Clearance", group: "print", color: "#34a853", route: "#/print/clearance" },
    { key: "print/bill", label: "Print Bill", group: "print", color: "#34a853", route: "#/print/bill" },
    { key: "sheet/companies", label: "Companies", group: "register", color: "#1a73e8", route: "#/sheet/companies" },
    { key: "sheet/licences", label: "Licences & Certificates", group: "register", color: "#1a73e8", route: "#/sheet/licences" },
    { key: "sheet/licenceChemicals", label: "Licence Chemicals", group: "register", color: "#1a73e8", route: "#/sheet/licenceChemicals" },
    { key: "sheet/licenceVehicles", label: "Licence Vehicles", group: "register", color: "#1a73e8", route: "#/sheet/licenceVehicles" },
    { key: "sheet/licenceEffluent", label: "Licence Effluent", group: "register", color: "#1a73e8", route: "#/sheet/licenceEffluent" },
    { key: "sheet/clearances", label: "Chemical Clearances", group: "register", color: "#1a73e8", route: "#/sheet/clearances" },
    { key: "sheet/bills", label: "Bills & Invoices", group: "register", color: "#1a73e8", route: "#/sheet/bills" },
    { key: "sheet/payments", label: "Payments & Receipts", group: "register", color: "#1a73e8", route: "#/sheet/payments" },
    { key: "sheet/issues", label: "Notes & Issues", group: "register", color: "#1a73e8", route: "#/sheet/issues" },
    { key: "sheet/correspondence", label: "Correspondence", group: "register", color: "#1a73e8", route: "#/sheet/correspondence" },
    { key: "fees", label: "Fee Schedule", group: "settings", color: "#9334e6", route: "#/fees" },
    { key: "lists", label: "Lists", group: "settings", color: "#9334e6", route: "#/lists" },
    { key: "code", label: "Macro Setup", group: "settings", color: "#9334e6", route: "#/code" },
    { key: "users", label: "Users", group: "settings", color: "#9334e6", route: "#/users" },
    { key: "sheet/srcBmmc", label: "SRC BMMC Log", group: "source", color: "#5f6368", route: "#/sheet/srcBmmc" },
    { key: "sheet/srcReceipts", label: "SRC CMU Receipts", group: "source", color: "#5f6368", route: "#/sheet/srcReceipts" },
  ];

  const App = {
    currentGrid: null,
    route: "",
    params: null,

    go(route, params) {
      if (params) this.pendingParams = params;
      location.hash = "#" + route;
    },
    openForm(kind, params) { this.go("form/" + kind, params); },

    /* ------------------------------------------------ router */
    async render() {
      const raw = location.hash.replace(/^#\/?/, "") || "home";
      const [route, ...rest] = raw.split("/");
      this.route = raw;
      const params = this.pendingParams || null;
      this.pendingParams = null;
      const main = document.getElementById("main");
      closeMenus();
      document.getElementById("modalRoot").innerHTML = "";
      this.currentGrid = null;
      document.getElementById("statusbar").innerHTML = `<span class="muted">${esc(Store.state.user ? "Signed in: " + Store.state.user.fullName : "Demo mode — full access")}</span><span class="spacer"></span><span class="muted">Ctrl+K — find a record · Ctrl+Z — undo grid edits</span>`;

      if (route === "sheet") {
        const key = rest[0];
        if (!Store.state.data.sheets[key] || !CMU.SHEETS[key]) { main.innerHTML = `<div class="boot">Unknown sheet.</div>`; return; }
        this.renderSheet(main, key);
      } else if (route === "form") {
        const kind = rest[0] || "company";
        const fn = window.Forms[kind] || window.Forms.company;
        fn(main, params);
      } else if (route === "print") {
        window.PrintCenter.render(main, rest[0] || "crl", params);
      } else if (route === "dashboard") {
        window.Panels.dashboard(main);
      } else if (route === "lists") {
        window.Panels.lists(main);
      } else if (route === "fees") {
        window.Panels.fees(main);
      } else if (route === "users") {
        window.Panels.users(main);
      } else if (route === "audit") {
        window.Panels.audit(main);
      } else if (route === "check") {
        window.Panels.check(main);
      } else if (route === "manual") {
        window.Panels.manual(main);
      } else if (route === "code") {
        window.Panels.code(main);
      } else {
        window.Panels.home(main);
      }
      this.paintTabs();
    },

    renderSheet(main, key) {
      main.innerHTML = "";
      const host = document.createElement("div");
      host.style.cssText = "flex:1 1 auto;display:flex;flex-direction:column;min-height:0";
      main.appendChild(host);
      const grid = new SheetGrid(host, key, {
        onStatus: (selTxt, info) => {
          const sb = document.getElementById("statusbar");
          sb.innerHTML = `
            <span><b>${esc(CMU.SHEETS[key].name)}</b> · ${info.rows} of ${info.total} rows${info.filtered ? ' <span style="color:#a14200">(filtered)</span>' : ""}</span>
            ${info.sort ? `<span>Sorted by ${esc(info.sort)}</span>` : ""}
            <span>${esc(selTxt)}</span>
            <span class="spacer"></span>
            <span class="muted">Click a column letter to sort · right-click for menus · double-click a blue ID to open its record</span>`;
        },
      });
      grid.el.scroll.focus();
      this.currentGrid = grid;
    },

    paintTabs() {
      const bar = document.getElementById("tabbar");
      const current = "#/" + this.route;
      bar.innerHTML = TABS.map((t) => `
        <button class="tab ${t.route === current ? "active" : ""}" data-route="${t.route}" title="${esc(t.label)}${t.group === "form" ? " — data-entry form" : t.group === "print" ? " — Print Centre" : ""}">
          <span class="dot" style="background:${t.color}"></span>${esc(t.label)}</button>`).join("");
      bar.querySelectorAll(".tab").forEach((b) => {
        b.onclick = () => { location.hash = b.dataset.route; };
      });
      const active = bar.querySelector(".tab.active");
      if (active) active.scrollIntoView({ inline: "center", block: "nearest" });
    },

    /* ------------------------------------------------ find modal */
    findModal(seed) {
      const d = Store.state.data;
      const modal = document.createElement("div");
      modal.className = "modal-back";
      modal.innerHTML = `
        <div class="modal wide">
          <div class="modal-h"><h3>🔎 Find / Print a Record</h3><button class="x">✕</button></div>
          <div class="modal-b">
            <input id="findIn" placeholder="Type any part of a company name, ID, B/L, reference, licence no., bill no. or receipt…" style="width:100%;padding:10px 14px;font-size:14px;border:1px solid var(--line);border-radius:8px" value="${esc(seed || "")}" autofocus>
            <div class="fr-tabs" id="findTabs" style="margin-top:12px"></div>
            <div id="findRes" style="margin-top:8px;max-height:52vh;overflow:auto"></div>
          </div>
        </div>`;
      document.getElementById("modalRoot").appendChild(modal);
      modal.querySelector(".x").onclick = () => modal.remove();
      modal.addEventListener("mousedown", (e) => { if (e.target === modal) modal.remove(); });
      const input = modal.querySelector("#findIn");
      let tab = "all";
      const tabs = [["all", "All"], ["company", "Companies"], ["licence", "Licences"], ["clearance", "Clearances"], ["bill", "Bills"], ["payment", "Payments"], ["issue", "Issues"]];
      function drawTabs() {
        modal.querySelector("#findTabs").innerHTML = tabs.map(([k, l]) => `<button class="fr-tab ${tab === k ? "on" : ""}" data-t="${k}">${l}</button>`).join("");
        modal.querySelectorAll(".fr-tab").forEach((b) => b.onclick = () => { tab = b.dataset.t; search(); });
      }
      function results(q) {
        q = q.trim().toLowerCase();
        const out = [];
        const push = (kind, tag, title, sub, open, print) => out.push({ kind, tag, title, sub, open, print });
        if (q.length >= 1) {
          d.sheets.companies.rows.forEach((r) => {
            if ((r[0] + " " + (r[1] || "") + " " + (r[2] || "") + " " + (r[3] || "") + " " + (r[4] || "")).toLowerCase().includes(q))
              push("company", "Company", `${r[0]} — ${r[1] || ""}`, [r[2], r[3]].filter(Boolean).join(" · "), () => App.openForm("company", { findId: r[0] }), null);
          });
          d.sheets.licences.rows.forEach((r) => {
            if ([r[0], r[1], r[2], r[3], r[4], r[5], r[9], r[10]].join(" ").toLowerCase().includes(q))
              push("licence", r[4] || "Licence", `${r[0]} — ${r[2] || ""}`, [r[10], CMU.licenceStatus(r[10], r[12])].filter(Boolean).join(" · "), () => App.openForm("licence", { findId: r[0] }), () => App.go("print/" + printPageForLicence(r), { id: r[0] }));
          });
          const seenC = new Set();
          d.sheets.clearances.rows.forEach((r) => {
            if ([r[0], r[1], r[2], r[3], r[4], r[5], r[10], r[11]].join(" ").toLowerCase().includes(q)) {
              if (seenC.has(r[1])) return; seenC.add(r[1]);
              push("clearance", "Clearance", `${r[1]} — ${r[3] || ""}`, `${CMU.fmtDate(r[12])}${r[11] ? " · " + r[11] : ""}`, () => App.openForm("clearance", { findClearanceNo: r[1] }), () => App.go("print/clearance", { id: r[1] }));
            }
          });
          const seenB = new Set();
          d.sheets.bills.rows.forEach((r) => {
            if ([r[0], r[1], r[2], r[3], r[7], r[15], r[18]].join(" ").toLowerCase().includes(q)) {
              if (seenB.has(r[1])) return; seenB.add(r[1]);
              push("bill", "Bill", `${r[1]} — ${r[3] || ""}`, `${CMU.fmtMoney(r[9])} · ${r[18] || ""} · ${CMU.fmtDate(r[10])}`, () => App.openForm("bill", { findBillNo: r[1] }), () => App.go("print/bill", { id: r[1] }));
            }
          });
          d.sheets.payments.rows.forEach((r) => {
            if ([r[0], r[1], r[2], r[4], r[7], r[11]].join(" ").toLowerCase().includes(q))
              push("payment", "Payment", `${r[0]} — ${r[2] || ""}`, `${CMU.fmtMoney(r[5])} · ${CMU.fmtDate(r[6])} · receipt ${r[7] ?? "—"}`, () => App.openForm("payment", { findId: r[0] }), null);
          });
          d.sheets.issues.rows.forEach((r) => {
            if ([r[0], r[1], r[2], r[3], r[4], r[5], r[6]].join(" ").toLowerCase().includes(q))
              push("issue", "Issue", `${r[0]} — ${r[2] || ""} (${r[1] || ""})`, r[6] || "", () => App.go("form/issue", { findId: r[0] }), null);
          });
        }
        return out;
      }
      function search() {
        drawTabs();
        const res = results(input.value).filter((r) => tab === "all" || r.kind === tab);
        const box = modal.querySelector("#findRes");
        if (!input.value.trim()) { box.innerHTML = `<p class="muted" style="text-align:center;padding:22px">Type to search every register at once — results appear as you type.</p>`; return; }
        if (!res.length) { box.innerHTML = `<p class="muted" style="text-align:center;padding:22px">No records match “${esc(input.value)}”.</p>`; return; }
        box.innerHTML = res.slice(0, 60).map((r, i) => `
          <div class="fr-item" data-i="${i}">
            <span class="tag">${esc(r.tag)}</span>
            <div class="t"><div><b>${esc(r.title)}</b></div><div class="muted small">${esc(r.sub)}</div></div>
            <button class="btn small act-open" data-i="${i}">Open</button>
            ${r.print ? `<button class="btn small act-print" data-i="${i}">🖨 Print</button>` : ""}
          </div>`).join("") + (res.length > 60 ? `<p class="muted small" style="text-align:center">…and ${res.length - 60} more — keep typing to narrow down</p>` : "");
        box.querySelectorAll(".act-open").forEach((b) => b.onclick = () => { modal.remove(); res[+b.dataset.i].open(); });
        box.querySelectorAll(".act-print").forEach((b) => b.onclick = () => { modal.remove(); res[+b.dataset.i].print(); });
      }
      input.oninput = search;
      input.onkeydown = (e) => { if (e.key === "Escape") modal.remove(); if (e.key === "Enter") { const first = modal.querySelector(".act-open"); if (first) first.click(); } };
      setTimeout(() => input.focus(), 30);
      search();
    },

    /* ------------------------------------------------ sign-in modal */
    authModal() {
      const modal = document.createElement("div");
      modal.className = "modal-back";
      modal.innerHTML = `
        <div class="modal" style="width:420px">
          <div class="modal-h"><h3>🔐 Sign in</h3><button class="x">✕</button></div>
          <div class="modal-b">
            <div class="frow" style="grid-template-columns:100px 1fr"><label>Username</label><input class="fin" id="li_user" autofocus></div>
            <div class="frow" style="grid-template-columns:100px 1fr"><label>Password</label><input class="fin" id="li_pass" type="password"></div>
            <div id="li_msg" class="small" style="color:var(--g-red);min-height:18px;margin-top:4px"></div>
            <p class="hint">Demo accounts: <b>admin</b> · <b>hinneh45</b> — initial password <b>Welcome@2026</b> (you must set your own on first sign-in).</p>
          </div>
          <div class="modal-f">
            <button class="btn act-demo">Continue in demo mode</button>
            <button class="btn primary act-go">Sign in</button>
          </div>
        </div>`;
      document.getElementById("modalRoot").appendChild(modal);
      const q = (s) => modal.querySelector(s);
      q(".x").onclick = () => modal.remove();
      const doLogin = async () => {
        try {
          const res = await Store.login(q("#li_user").value.trim(), q("#li_pass").value);
          modal.remove();
          toast(`Signed in — welcome, ${esc(res.user.fullName)}`, "good");
          if (res.mustChange) passwordModal(true);
          this.paintUser(); this.render();
        } catch (e) { q("#li_msg").textContent = e.message; }
      };
      q(".act-go").onclick = doLogin;
      q(".act-demo").onclick = () => { modal.remove(); toast("Demo mode — full access without signing in", "warn"); };
      q("#li_pass").onkeydown = (e) => { if (e.key === "Enter") doLogin(); };
      q("#li_user").onkeydown = (e) => { if (e.key === "Enter") q("#li_pass").focus(); };
      setTimeout(() => q("#li_user").focus(), 30);
    },

    paintUser() {
      const chip = document.getElementById("userChip");
      const u = Store.state.user;
      if (u) {
        chip.innerHTML = `
          <div class="avatar">${esc(u.fullName.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase())}</div>
          <div class="uinfo"><b>${esc(u.fullName)}</b><span>${esc(u.role)}</span></div>
          <button class="act-out">Log out</button>`;
        chip.querySelector(".act-out").onclick = async () => { await Store.logout(); this.paintUser(); this.render(); toast("Signed out", "good"); };
      } else {
        chip.innerHTML = `<button class="act-in">🔐 Sign in</button>`;
        chip.querySelector(".act-in").onclick = () => this.authModal();
      }
    },
  };
  window.App = App;

  function passwordModal(force) {
    const modal = document.createElement("div");
    modal.className = "modal-back";
    modal.innerHTML = `
      <div class="modal" style="width:420px">
        <div class="modal-h"><h3>🔑 ${force ? "Set your own password" : "Change my password"}</h3><button class="x">✕</button></div>
        <div class="modal-b">
          ${force ? `<p class="small">You signed in with a shared/initial password. Choose your own (at least 6 characters) before continuing.</p>` : ""}
          <div class="frow" style="grid-template-columns:140px 1fr"><label>Current password</label><input class="fin" id="pw_o" type="password"></div>
          <div class="frow" style="grid-template-columns:140px 1fr"><label>New password</label><input class="fin" id="pw_n" type="password"></div>
          <div id="pw_msg" class="small" style="color:var(--g-red);min-height:18px"></div>
        </div>
        <div class="modal-f"><button class="btn primary act-ok">Save password</button></div>
      </div>`;
    document.getElementById("modalRoot").appendChild(modal);
    const q = (s) => modal.querySelector(s);
    q(".x").onclick = () => modal.remove();
    q(".act-ok").onclick = async () => {
      try { await Store.changePassword(q("#pw_o").value, q("#pw_n").value); modal.remove(); toast("Password saved", "good"); }
      catch (e) { q("#pw_msg").textContent = e.message; }
    };
  }
  window.passwordModal = passwordModal;

  function printPageForLicence(r) {
    const t = (r[5] || "").toLowerCase();
    if (t.includes("importation")) return "cil";
    if (t.includes("retention")) return "edlrp";
    if (t.includes("effluent") || t.includes("dewatering")) return "edl";
    return "crl";
  }

  /* ------------------------------------------------ boot */
  async function boot() {
    try { await Store.init(); } catch (e) {
      document.getElementById("main").innerHTML = `<div class="boot">Could not load the database: ${esc(e.message)}</div>`;
      return;
    }
    App.paintUser();

    document.getElementById("btnHome").onclick = () => App.go("home");
    document.getElementById("btnDashboard").onclick = () => App.go("dashboard");
    document.getElementById("btnManual").onclick = () => App.go("manual");
    const searchBox = document.getElementById("globalSearch");
    searchBox.onfocus = () => { searchBox.blur(); App.findModal(searchBox.value); };
    document.getElementById("btnNew").onclick = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const pop = document.createElement("div");
      pop.className = "menu-pop";
      pop.innerHTML = `<div class="mhead">Create a new…</div>
        <div class="mi" data-go="form/company">🏢 Company</div>
        <div class="mi" data-go="form/licence">📜 Licence / Certificate</div>
        <div class="mi" data-go="form/clearance">📦 Chemical Clearance</div>
        <div class="mi" data-go="form/bill">🧾 Bill / Invoice</div>
        <div class="mi" data-go="form/payment">💵 Payment / Receipt</div>
        <div class="mi" data-go="form/issue">🗒️ Data Issue</div>`;
      document.getElementById("ctxRoot").appendChild(pop);
      pop.style.left = Math.min(r.left, window.innerWidth - 240) + "px";
      pop.style.top = (r.bottom + 6) + "px";
      pop.querySelectorAll(".mi").forEach((mi) => mi.onclick = () => { pop.remove(); App.go(mi.dataset.go); });
      setTimeout(() => {
        const closer = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener("mousedown", closer); } };
        document.addEventListener("mousedown", closer);
      }, 0);
    };

    Store.on("saving", () => {
      const b = document.getElementById("syncBadge");
      b.className = "sync pending"; b.textContent = "Saving…";
    });
    Store.on("saved", () => {
      const b = document.getElementById("syncBadge");
      b.className = "sync saved"; b.textContent = "✓ All changes saved";
    });
    Store.on("user", () => App.paintUser());

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); App.findModal(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); toast("Everything is already saved automatically ✓", "good"); }
    });

    window.addEventListener("hashchange", () => App.render());
    if (!location.hash) location.hash = "#/home";
    App.render();
  }
  boot();
})();
