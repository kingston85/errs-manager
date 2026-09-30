/* SheetGrid — the Google-Sheets-style spreadsheet engine.
 * Renders a register as an editable grid: A1 addressing, formula bar, selection
 * ranges, keyboard navigation, copy/cut/paste, column sort/filter/hide/resize,
 * context menus, computed columns, undo. Vanilla DOM, no dependencies. */
(function () {
  "use strict";
  const CMU = window.CMU;
  const LETTERS = (() => { const a = []; for (let i = 0; i < 702; i++) { let s = "", n = i; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); a.push(s); } return a; })();

  class SheetGrid {
    constructor(mount, sheetKey, opts = {}) {
      this.mount = mount;
      this.sheetKey = sheetKey;
      this.opts = opts;
      this.def = CMU.SHEETS[sheetKey];
      this.sheet = () => Store.state.data.sheets[sheetKey];
      this.columns = this.def.columns;
      this.colWidths = this.loadWidths();
      this.hidden = new Set(Store.prefs.get("hidden-" + sheetKey, []));
      this.view = { order: [], sort: null, colFilters: {}, quick: "" };
      this.sel = null;   // {r1,c1,r2,c2} view coords
      this.editing = null;
      this.buildView();
      this.render();
      this.bindEvents();
    }

    /* ------------------------------------------------ view model */
    visibleCols() { return this.columns.map((c, i) => i).filter((i) => !this.hidden.has(i)); }
    loadWidths() {
      const saved = Store.prefs.get("widths-" + this.sheetKey, null);
      const w = this.columns.map((c) => c.w || 130);
      if (saved) saved.forEach((v, i) => { if (v && w[i]) w[i] = v; });
      return w;
    }
    buildView() {
      const rows = this.sheet().rows;
      let order = rows.map((_, i) => i);
      // quick search filter
      const q = this.view.quick.trim().toLowerCase();
      const colFilters = this.view.colFilters;
      const hasFilters = Object.keys(colFilters).length > 0 || q;
      if (hasFilters) {
        order = order.filter((ri) => {
          if (q) {
            let hit = false;
            for (let c = 0; c < this.columns.length; c++) {
              const v = CMU.displayValue(Store.state.data, this.sheetKey, ri, c);
              if (v != null && String(v).toLowerCase().includes(q)) { hit = true; break; }
            }
            if (!hit) return false;
          }
          for (const [col, set] of Object.entries(colFilters)) {
            const v = CMU.displayValue(Store.state.data, this.sheetKey, ri, +col);
            if (!set.has(v == null ? "" : String(v))) return false;
          }
          return true;
        });
      }
      // sort
      if (this.view.sort) {
        const { col, dir } = this.view.sort;
        const vals = (ri) => {
          const v = CMU.displayValue(Store.state.data, this.sheetKey, ri, col);
          if (v == null || v === "") return dir > 0 ? "\uffff\uffff" : "";
          return typeof v === "number" ? v : String(v).toLowerCase();
        };
        order.sort((a, b) => {
          const va = vals(a), vb = vals(b);
          if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
          return String(va) < String(vb) ? -dir : String(va) > String(vb) ? dir : 0;
        });
      }
      this.view.order = order;
      if (this.opts.onCount) this.opts.onCount(order.length, rows.length);
    }

    /* ------------------------------------------------ rendering */
    render() {
      const d = Store.state.data;
      const sh = this.sheet();
      const vis = this.visibleCols();
      const totalW = vis.reduce((s, i) => s + this.colWidths[i], 0);
      const mount = this.mount;
      mount.innerHTML = "";

      const wrap = document.createElement("div");
      wrap.className = "sheetwrap";
      wrap.innerHTML = `
        <div class="sheet-title">
          <div>
            <h1>${this.def.icon || ""} ${esc(sh.name)}</h1>
            <div class="sub">${esc(sh.subtitle || sh.title)}</div>
          </div>
          <div class="grow"></div>
          <div class="grid-toolbar">
            <input class="grid-quick" placeholder="Filter rows…" style="padding:5px 10px;border:1px solid var(--line);border-radius:6px;width:150px" value="${esc(this.view.quick)}">
            <button class="btn small act-clearfilters" ${Object.keys(this.view.colFilters).length || this.view.quick ? "" : "disabled"}>✕ Filters</button>
            <button class="btn small act-cols">Columns</button>
            <button class="btn small act-export">⬇ CSV</button>
            <button class="btn small act-addrow">+ Row</button>
          </div>
        </div>
        ${this.def.readonlyHint ? `<div class="src-banner">📚 <b>Source data</b> — the original log this database was built from. Kept for checking and audit; corrections belong in the registers through the forms.</div>` : ""}
        <div class="fx-bar">
          <div class="fx-name" id="fxName">—</div>
          <input class="fx-input" id="fxInput" placeholder="Select a cell, then type or edit its value here" ${this.def.readonlyHint ? 'readonly title="Source sheets are read-only"' : ""}>
        </div>
        <div class="grid-scroll" tabindex="0"><table class="sheet"><colgroup></colgroup><thead></thead><tbody></tbody></table></div>`;
      mount.appendChild(wrap);

      this.el = {
        wrap, quick: wrap.querySelector(".grid-quick"),
        fxName: wrap.querySelector("#fxName"), fxInput: wrap.querySelector("#fxInput"),
        scroll: wrap.querySelector(".grid-scroll"),
        table: wrap.querySelector("table"), colgroup: wrap.querySelector("colgroup"),
        thead: wrap.querySelector("thead"), tbody: wrap.querySelector("tbody"),
      };

      // column groups
      this.el.colgroup.appendChild(this.colEl(46));
      vis.forEach((ci) => this.el.colgroup.appendChild(this.colEl(this.colWidths[ci])));

      // header: letters row + labels row
      const trL = document.createElement("tr");
      const corner = document.createElement("th");
      corner.className = "corner"; corner.textContent = "";
      corner.onclick = () => this.selectAll();
      trL.appendChild(corner);
      const trH = document.createElement("tr");
      const corner2 = document.createElement("th");
      corner2.className = "corner"; corner2.style.top = "22px"; corner2.textContent = "#";
      trH.appendChild(corner2);
      vis.forEach((ci) => {
        const th = document.createElement("th");
        th.className = "letter";
        th.textContent = LETTERS[ci];
        th.dataset.ci = ci;
        if (this.view.sort && this.view.sort.col === ci) th.classList.add("sorted");
        if (this.view.colFilters[ci]) th.classList.add("filtered");
        th.onclick = (e) => { if (!th.dragging) this.cycleSort(ci); };
        th.oncontextmenu = (e) => { e.preventDefault(); this.columnMenu(ci, e); };
        const rz = document.createElement("div");
        rz.className = "resizer";
        rz.onmousedown = (e) => this.startResize(e, ci);
        th.appendChild(rz);
        trL.appendChild(th);

        const th2 = document.createElement("th");
        th2.className = "colhead";
        th2.dataset.ci = ci;
        th2.innerHTML = `<span class="chead-in"><span class="${this.columns[ci].required ? "req" : ""}">${esc(this.columns[ci].label)}</span></span>`;
        th2.onclick = (e) => { if (!th2.dragging) this.cycleSort(ci); };
        th2.oncontextmenu = (e) => { e.preventDefault(); this.columnMenu(ci, e); };
        trH.appendChild(th2);
      });
      this.el.thead.appendChild(trL);
      this.el.thead.appendChild(trH);

      // body
      const frag = document.createDocumentFragment();
      this.view.order.forEach((ri, vi) => {
        frag.appendChild(this.rowEl(ri, vi, vis));
      });
      this.el.tbody.appendChild(frag);

      // add-row affordance
      if (!this.def.readonlyHint) {
        const add = document.createElement("button");
        add.className = "addrow-btn";
        add.innerHTML = "＋ Add row to <b>" + esc(sh.name) + "</b>";
        add.onclick = () => this.addRowAtEnd();
        wrap.appendChild(add);
      } else {
        const sp = document.createElement("div");
        sp.style.height = "30px";
        wrap.appendChild(sp);
      }

      // toolbar wiring
      this.el.quick.oninput = () => { this.view.quick = this.el.quick.value; this.buildView(); this.rerenderBody(); this.updateStatus(); };
      wrap.querySelector(".act-clearfilters").onclick = () => { this.view.colFilters = {}; this.view.quick = ""; this.el.quick.value = ""; this.buildView(); this.render(); };
      const colsBtn = wrap.querySelector(".act-cols");
      colsBtn.onclick = (e) => this.columnsMenu(e);
      this.colsBtn = colsBtn;
      wrap.querySelector(".act-export").onclick = () => { window.open("/api/export/" + this.sheetKey, "_blank"); toast("CSV export started", "good"); };
      wrap.querySelector(".act-addrow").onclick = () => this.addRowAtEnd();

      // formula bar
      this.el.fxInput.onkeydown = (e) => {
        if (e.key === "Enter") {
          this.commitFx();
          this.el.scroll.focus();
          e.preventDefault();
        }
      };
      this.el.fxInput.onfocus = () => { this.fxEditing = true; };

      if (this.sel) this.paintSelection();
      this.updateStatus();
    }

    colEl(w) { const c = document.createElement("col"); c.style.width = w + "px"; return c; }

    rowEl(ri, vi, vis) {
      const d = Store.state.data;
      const tr = document.createElement("tr");
      tr.dataset.ri = ri;
      tr.dataset.vi = vi;
      const th = document.createElement("th");
      th.className = "rownum";
      th.textContent = vi + 1;
      th.onclick = () => this.selectRow(vi);
      th.oncontextmenu = (e) => { e.preventDefault(); this.selectRow(vi); this.rowMenu(e, ri); };
      tr.appendChild(th);
      vis.forEach((ci) => {
        const td = document.createElement("td");
        this.paintCell(td, ri, ci);
        td.dataset.ri = ri; td.dataset.ci = ci; td.dataset.vi = vi;
        tr.appendChild(td);
      });
      return tr;
    }

    paintCell(td, ri, ci) {
      const d = Store.state.data;
      const col = this.columns[ci];
      const v = CMU.displayValue(d, this.sheetKey, ri, ci);
      td.className = "";
      td.textContent = "";
      if (col.calc || col.calcJoin) td.classList.add("calc");
      if (col.type === "num" || col.type === "money") td.classList.add(col.type === "money" ? "money" : "num");
      if (col.type === "date") td.classList.add("date");
      if (col.type === "status") { td.classList.add("status"); }
      if (col.link && v != null && String(v)) td.classList.add("linkcell");
      if (col.type === "id") td.style.fontWeight = "500";
      if (col.calc) td.title = "Calculated automatically from the registers — edit the source record instead";
      if (col.type === "status") {
        const cls = CMU.statusClass(v);
        td.innerHTML = `<span class="pill ${cls}">${esc(v == null ? "" : v)}</span>`;
      } else if (col.type === "money") {
        td.textContent = v == null || v === "" ? "" : CMU.fmtMoney(v);
      } else if (col.type === "num") {
        td.textContent = v == null || v === "" ? "" : CMU.fmtNum(v);
      } else if (col.type === "date") {
        td.textContent = v ? CMU.fmtDate(v) : "";
      } else {
        td.textContent = v == null ? "" : String(v);
      }
    }

    rerenderRow(ri) {
      const tr = this.el.tbody.querySelector(`tr[data-ri="${ri}"]`);
      if (!tr) return;
      const vis = this.visibleCols();
      tr.querySelectorAll("td").forEach((td) => this.paintCell(td, ri, +td.dataset.ci));
    }
    rerenderBody() {
      const vis = this.visibleCols();
      this.el.tbody.innerHTML = "";
      const frag = document.createDocumentFragment();
      this.view.order.forEach((ri, vi) => frag.appendChild(this.rowEl(ri, vi, vis)));
      this.el.tbody.appendChild(frag);
      if (this.sel) this.paintSelection();
      this.updateStatus();
    }

    /* ------------------------------------------------ selection */
    cellAtEvent(e) {
      const td = e.target.closest("td[data-ri]");
      if (!td) return null;
      return { vi: +td.dataset.vi, ci: +td.dataset.ci, ri: +td.dataset.ri };
    }
    selectCell(vi, ci, extend) {
      if (!extend) this.sel = { r1: vi, c1: ci, r2: vi, c2: ci };
      else if (this.sel) { this.sel.r2 = vi; this.sel.c2 = ci; }
      else this.sel = { r1: vi, c1: ci, r2: vi, c2: ci };
      this.paintSelection();
      this.updateStatus();
    }
    selectRow(vi) { this.sel = { r1: vi, c1: 0, r2: vi, c2: Math.max(0, this.visibleCols().length - 1) }; this.paintSelection(); this.updateStatus(); }
    selectAll() { const n = this.view.order.length; if (!n) return; this.sel = { r1: 0, c1: 0, r2: n - 1, c2: Math.max(0, this.visibleCols().length - 1) }; this.paintSelection(); this.updateStatus(); }
    normSel() {
      if (!this.sel) return null;
      const r1 = Math.min(this.sel.r1, this.sel.r2), r2 = Math.max(this.sel.r1, this.sel.r2);
      const c1 = Math.min(this.sel.c1, this.sel.c2), c2 = Math.max(this.sel.c1, this.sel.c2);
      return { r1, r2, c1, c2 };
    }
    paintSelection() {
      const s = this.normSel();
      this.el.tbody.querySelectorAll("td.rowsel").forEach((td) => td.classList.remove("rowsel"));
      this.el.tbody.querySelectorAll("td.focuscell").forEach((td) => td.classList.remove("focuscell"));
      this.el.tbody.querySelectorAll("th.rownum.rowsel").forEach((th) => th.classList.remove("rowsel"));
      this.el.thead.querySelectorAll(".colsel").forEach((th) => th.classList.remove("colsel"));
      if (!s) return;
      const vis = this.visibleCols();
      for (let vi = s.r1; vi <= s.r2; vi++) {
        const tr = this.el.tbody.querySelector(`tr[data-vi="${vi}"]`);
        if (!tr) continue;
        tr.querySelectorAll("td").forEach((td) => {
          const ci = +td.dataset.ci;
          const vIdx = vis.indexOf(ci);
          if (vIdx >= s.c1 && vIdx <= s.c2) td.classList.add("rowsel");
        });
        if (s.c1 === 0 && s.c2 === vis.length - 1) tr.querySelector("th.rownum")?.classList.add("rowsel");
      }
      // focus cell = where selection started (r1/c1)
      const fTr = this.el.tbody.querySelector(`tr[data-vi="${this.sel.r1}"]`);
      if (fTr) {
        const visCi = vis[this.sel.c1];
        const fTd = fTr.querySelector(`td[data-ci="${visCi}"]`);
        if (fTd) fTd.classList.add("focuscell");
      }
      vis.slice(s.c1, s.c2 + 1).forEach((ci) => {
        this.el.thead.querySelectorAll(`th[data-ci="${ci}"]`).forEach((th) => th.classList.add("colsel"));
      });
      this.scrollCellIntoView(this.sel.r1, this.sel.c1);
      this.updateFx();
    }
    scrollCellIntoView(vi, cIdx) {
      const vis = this.visibleCols();
      const tr = this.el.tbody.querySelector(`tr[data-vi="${vi}"]`);
      if (!tr) return;
      const td = tr.querySelector(`td[data-ci="${vis[cIdx]}"]`) || tr;
      const sc = this.el.scroll;
      const tdr = td.getBoundingClientRect(), scr = sc.getBoundingClientRect();
      if (tdr.top < scr.top + 56) sc.scrollTop -= (scr.top + 56 - tdr.top);
      if (tdr.bottom > scr.bottom) sc.scrollTop += (tdr.bottom - scr.bottom);
      if (tdr.left < scr.left + 48) sc.scrollLeft -= (scr.left + 48 - tdr.left);
      if (tdr.right > scr.right) sc.scrollLeft += (tdr.right - scr.right);
    }
    updateFx() {
      const s = this.normSel();
      if (!s) { this.el.fxName.textContent = "—"; return; }
      const vis = this.visibleCols();
      const single = s.r1 === s.r2 && s.c1 === s.c2;
      this.el.fxName.textContent = single ? `${LETTERS[vis[s.c1]]}${s.r1 + 1}` : `${LETTERS[vis[s.c1]]}${s.r1 + 1}:${LETTERS[vis[s.c2]]}${s.r2 + 1}`;
      if (single && !this.fxEditing) {
        const ri = this.view.order[s.r1];
        const col = this.columns[vis[s.c1]];
        const raw = col.calc || col.calcJoin ? (CMU.displayValue(Store.state.data, this.sheetKey, ri, vis[s.c1]) ?? "") : (this.sheet().rows[ri] ? (this.sheet().rows[ri][vis[s.c1]] ?? "") : "");
        this.el.fxInput.value = raw == null ? "" : String(raw);
      }
      if (!single) this.el.fxInput.value = "";
    }
    commitFx() {
      const s = this.normSel();
      if (!s || s.r1 !== s.r2 || s.c1 !== s.c2) return;
      const vis = this.visibleCols();
      const ci = vis[s.c1];
      const ri = this.view.order[s.r1];
      this.setCellValue(ri, ci, this.el.fxInput.value);
      this.fxEditing = false;
    }

    updateStatus() {
      if (this.opts.onStatus) {
        const s = this.normSel();
        let txt = "";
        if (s) {
          const vis = this.visibleCols();
          const count = (s.r2 - s.r1 + 1) * (s.c2 - s.c1 + 1);
          let sum = 0, nsum = 0;
          for (let vi = s.r1; vi <= s.r2; vi++) {
            for (let c = s.c1; c <= s.c2; c++) {
              const v = CMU.displayValue(Store.state.data, this.sheetKey, this.view.order[vi], vis[c]);
              if (typeof v === "number" && isFinite(v)) { sum += v; nsum++; }
            }
          }
          const bits = [`${s.r2 - s.r1 + 1} row${s.r2 - s.r1 ? "s" : ""} selected`];
          if (nsum) bits.push(`Sum ${CMU.fmtNum(Math.round(sum * 100) / 100)}`, `Avg ${CMU.fmtNum(Math.round((sum / nsum) * 100) / 100)}`);
          txt = bits.join(" · ");
        }
        const filtered = this.view.order.length !== this.sheet().rows.length;
        this.opts.onStatus(txt, {
          rows: this.view.order.length, total: this.sheet().rows.length,
          filtered, sort: this.view.sort ? `${this.columns[this.view.sort.col].label} ${this.view.sort.dir > 0 ? "▲" : "▼"}` : null,
        });
      }
    }

    /* ------------------------------------------------ editing */
    isEditable(ri, ci) {
      const col = this.columns[ci];
      if (col.calc) return false;
      if (this.def.readonlyHint && !this.opts.allowSourceEdits) return false;
      return true;
    }
    startEdit(vi, ci, initial) {
      const s = this.normSel();
      if (!s) return;
      const vis = this.visibleCols();
      const ri = this.view.order[vi];
      const col = this.columns[ci];
      if (col.calc) { toast("That column is calculated automatically — edit the source record instead", "warn"); return; }
      if (this.def.readonlyHint && !this.opts.allowSourceEdits) { toast("Source-data sheets are kept for reference — corrections belong in the registers", "warn"); return; }
      this.stopEdit(true);
      const tr = this.el.tbody.querySelector(`tr[data-vi="${vi}"]`);
      const td = tr && tr.querySelector(`td[data-ci="${ci}"]`);
      if (!td) return;
      const raw = this.sheet().rows[ri] ? this.sheet().rows[ri][ci] : null;
      td.classList.add("editing");
      const sc = this.el.scroll.getBoundingClientRect();
      const tdr = td.getBoundingClientRect();
      const inp = document.createElement("input");
      inp.className = "cell-editor";
      inp.style.left = (tdr.left - sc.left + this.el.scroll.scrollLeft) + "px";
      inp.style.top = (tdr.top - sc.top + this.el.scroll.scrollTop) + "px";
      inp.style.width = Math.max(90, tdr.width + 10) + "px";
      inp.value = initial != null ? initial : (raw == null ? "" : String(raw));
      if (col.type === "date") inp.placeholder = "yyyy-mm-dd";
      // datalist for option columns
      if (col.opts) {
        const opts = this.optList(col.opts);
        if (opts.length) {
          const dl = document.createElement("datalist");
          dl.id = "dl" + ci;
          opts.forEach((o) => { const op = document.createElement("option"); op.value = o; dl.appendChild(op); });
          this.el.wrap.appendChild(dl);
          inp.setAttribute("list", dl.id);
        }
      }
      this.el.scroll.appendChild(inp);
      this.editing = { vi, ci, ri, inp, td };
      inp.focus();
      if (initial == null) inp.select();
      inp.onkeydown = (e) => {
        if (e.key === "Enter") { this.stopEdit(true); this.moveSel(1, 0); e.preventDefault(); }
        else if (e.key === "Tab") { this.stopEdit(true); this.moveSel(0, e.shiftKey ? -1 : 1); e.preventDefault(); }
        else if (e.key === "Escape") { this.stopEdit(false); this.el.scroll.focus(); e.preventDefault(); }
        e.stopPropagation();
      };
      inp.onblur = () => { if (this.editing && this.editing.inp === inp) this.stopEdit(true); };
    }
    stopEdit(commit) {
      if (!this.editing) return;
      const { vi, ci, ri, inp, td } = this.editing;
      const val = inp.value;
      const datalist = inp.getAttribute("list");
      this.editing = null;
      inp.remove();
      if (datalist) { const dl = this.el.wrap.querySelector("#" + datalist); if (dl) dl.remove(); }
      td.classList.remove("editing");
      if (commit) this.setCellValue(ri, ci, val);
      this.updateFx();
    }
    setCellValue(ri, ci, value) {
      const col = this.columns[ci];
      let v = value == null ? null : String(value).trim();
      if (v === "") v = null;
      else if (col.type === "num" || col.type === "money") { const n = +String(v).replace(/,/g, ""); if (!isNaN(n)) v = n; }
      else if (col.type === "date") {
        const parsed = this.parseDate(v);
        if (parsed) v = parsed;
      }
      const cur = this.sheet().rows[ri] ? this.sheet().rows[ri][ci] : null;
      if (String(cur ?? "") === String(v ?? "")) return;
      Store.submitOps([{ op: "setCell", sheet: this.sheetKey, row: ri, col: ci, value: v }])
        .then(() => {
          this.rerenderRow(ri);
          this.updateStatus();
          this.opts.onEdit && this.opts.onEdit();
        })
        .catch((e) => { toast("Not saved: " + esc(e.message), "bad"); });
    }
    parseDate(v) {
      const s = String(v).trim();
      let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
      if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
      if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return null;
    }
    optList(key) {
      if (Array.isArray(key)) return key;
      const d = Store.state.data;
      if (key === "companies") return d.sheets.companies.rows.map((r) => r[0]);
      if (key === "licenceIds") return d.sheets.licences.rows.map((r) => r[0]);
      if (key === "billNos") return [...new Set(d.sheets.bills.rows.map((r) => r[1]).filter(Boolean))];
      if (key === "clearanceNos") return [...new Set(d.sheets.clearances.rows.map((r) => r[1]).filter(Boolean))];
      if (key === "services") return d.fees.services.map((s) => s.service);
      if (key === "billTypes") return d.fees.billTypes.map((s) => s.type);
      if (key === "chemicals") return d.lists.chemicals;
      return d.lists[key] || [];
    }

    /* ------------------------------------------------ movement */
    moveSel(dr, dc, extend) {
      const nRows = this.view.order.length;
      const vis = this.visibleCols();
      if (!nRows || !vis.length) return;
      if (!this.sel) { this.selectCell(0, 0, false); return; }
      let vi = extend ? this.sel.r2 : this.sel.r1;
      let c = extend ? this.sel.c2 : this.sel.c1;
      vi = Math.max(0, Math.min(nRows - 1, vi + dr));
      c = Math.max(0, Math.min(vis.length - 1, c + dc));
      if (extend) { this.sel.r2 = vi; this.sel.c2 = c; this.paintSelection(); this.updateStatus(); }
      else this.selectCell(vi, c, false);
    }

    /* ------------------------------------------------ events */
    bindEvents() {
      const sc = this.el.scroll;
      sc.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        const cell = this.cellAtEvent(e);
        if (!cell) return;
        this.el.scroll.focus();
        this.selectCell(cell.vi, cell.ci, e.shiftKey);
        this.dragging = true;
        e.preventDefault();
      });
      sc.addEventListener("mousemove", (e) => {
        if (!this.dragging) return;
        const cell = this.cellAtEvent(e);
        if (cell && this.sel) { this.sel.r2 = cell.vi; this.sel.c2 = cell.ci; this.paintSelection(); this.updateStatus(); }
      });
      window.addEventListener("mouseup", () => { this.dragging = false; });
      sc.addEventListener("dblclick", (e) => {
        const cell = this.cellAtEvent(e);
        if (!cell) return;
        const ci = cell.ci;
        const col = this.columns[ci];
        const val = CMU.displayValue(Store.state.data, this.sheetKey, cell.ri, ci);
        if (col.link && val) { this.openLink(col.link, val); return; }
        this.startEdit(cell.vi, cell.ci);
      });
      sc.addEventListener("contextmenu", (e) => {
        const cell = this.cellAtEvent(e);
        if (!cell) return;
        e.preventDefault();
        this.selectCell(cell.vi, cell.ci, false);
        this.cellMenu(e, cell);
      });
      sc.addEventListener("keydown", (e) => this.onKey(e));
      // clipboard
      document.addEventListener("copy", (e) => { if (this.isCurrentScreen()) { this.copy(e, "copy"); } });
      document.addEventListener("cut", (e) => { if (this.isCurrentScreen()) { this.copy(e, "cut"); } });
      document.addEventListener("paste", (e) => { if (this.isCurrentScreen()) this.paste(e); });
    }
    isCurrentScreen() {
      return App.currentGrid === this && !this.editing && !modalOpen();
    }
    onKey(e) {
      const k = e.key;
      if (this.editing) return; // input handles its own keys
      const s = this.normSel();
      if (!s) return;
      if (k === "ArrowDown") { this.moveSel(1, 0, e.shiftKey); e.preventDefault(); }
      else if (k === "ArrowUp") { this.moveSel(-1, 0, e.shiftKey); e.preventDefault(); }
      else if (k === "ArrowRight") { this.moveSel(0, 1, e.shiftKey); e.preventDefault(); }
      else if (k === "ArrowLeft") { this.moveSel(0, -1, e.shiftKey); e.preventDefault(); }
      else if (k === "PageDown") { this.moveSel(20, 0, e.shiftKey); e.preventDefault(); }
      else if (k === "PageUp") { this.moveSel(-20, 0, e.shiftKey); e.preventDefault(); }
      else if (k === "Home") { this.moveSel(0, -999, e.shiftKey); e.preventDefault(); }
      else if (k === "End") { this.moveSel(0, 999, e.shiftKey); e.preventDefault(); }
      else if (k === "Enter" || k === "F2") { this.startEdit(this.sel.r1, this.sel.c1); e.preventDefault(); }
      else if (k === "Tab") { this.moveSel(0, e.shiftKey ? -1 : 1); e.preventDefault(); }
      else if (k === "Delete" || k === "Backspace") { this.clearSelection(); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "a") { this.selectAll(); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "z") { Store.undo().then(() => toast("Undone (Ctrl+Z)")).catch((er) => toast(esc(er.message), "bad")); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "y") { Store.redo().then(() => toast("Redone")).catch(() => {}); e.preventDefault(); }
      else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.startEdit(this.sel.r1, this.sel.c1, k);
        e.preventDefault();
      }
    }
    copy(e, kind) {
      const s = this.normSel();
      if (!s) return;
      const vis = this.visibleCols();
      const lines = [];
      for (let vi = s.r1; vi <= s.r2; vi++) {
        const ri = this.view.order[vi];
        const cells = [];
        for (let c = s.c1; c <= s.c2; c++) {
          const ci = vis[c];
          const col = this.columns[ci];
          cells.push(col.calc || col.calcJoin ? (CMU.displayValue(Store.state.data, this.sheetKey, ri, ci) ?? "") : (this.sheet().rows[ri][ci] ?? ""));
        }
        lines.push(cells.join("\t"));
      }
      const text = lines.join("\n");
      e.clipboardData.setData("text/plain", text);
      e.preventDefault();
      if (kind === "cut") this.clearSelection();
      toast("Copied " + (s.r2 - s.r1 + 1) + " row(s)", "good");
    }
    paste(e) {
      const s = this.normSel();
      if (!s) return;
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      e.preventDefault();
      if (this.def.readonlyHint) { toast("Source-data sheets are read-only", "warn"); return; }
      const vis = this.visibleCols();
      const grid = text.replace(/\r/g, "").split("\n").map((l) => l.split("\t"));
      const ops = [];
      const r0 = this.view.order[s.r1];
      for (let i = 0; i < grid.length; i++) {
        const vi = s.r1 + i;
        if (vi >= this.view.order.length) break; // no inserting rows on paste for safety
        const ri = this.view.order[vi];
        for (let j = 0; j < grid[i].length; j++) {
          const c = s.c1 + j;
          if (c >= vis.length) break;
          const ci = vis[c];
          if (this.columns[ci].calc) continue;
          let v = grid[i][j].trim();
          if (v === "") v = null;
          else if (this.columns[ci].type === "num" || this.columns[ci].type === "money") { const n = +v.replace(/,/g, ""); if (!isNaN(n)) v = n; }
          ops.push({ op: "setCell", sheet: this.sheetKey, row: ri, col: ci, value: v });
        }
      }
      if (!ops.length) return;
      Store.submitOps(ops).then(() => {
        this.buildView();
        this.rerenderBody();
        toast(`Pasted into ${ops.length} cell(s)`, "good");
      }).catch((er) => toast("Paste failed: " + esc(er.message), "bad"));
    }
    clearSelection() {
      const s = this.normSel();
      if (!s) return;
      if (this.def.readonlyHint) { toast("Source-data sheets are read-only", "warn"); return; }
      const vis = this.visibleCols();
      const ops = [];
      for (let vi = s.r1; vi <= s.r2; vi++) {
        const ri = this.view.order[vi];
        for (let c = s.c1; c <= s.c2; c++) {
          const ci = vis[c];
          if (this.columns[ci].calc) continue;
          if (this.sheet().rows[ri][ci] != null) ops.push({ op: "setCell", sheet: this.sheetKey, row: ri, col: ci, value: null });
        }
      }
      if (!ops.length) return;
      Store.submitOps(ops).then(() => this.rerenderBody()).catch((er) => toast(esc(er.message), "bad"));
    }
    addRowAtEnd() {
      const idCol = this.def.idCol;
      const vals = this.columns.map(() => null);
      if (idCol != null && this.def.idPrefix) {
        vals[idCol] = Store.state.data.nextIds ? Store.state.data.nextIds[this.idKey()] : null;
      }
      Store.submitOps([{ op: "insertRow", sheet: this.sheetKey, at: this.sheet().rows.length, values: vals }])
        .then(() => {
          this.buildView();
          this.rerenderBody();
          toast("Row added" + (vals[idCol] ? ` — ${vals[idCol]} (next number issued automatically)` : ""), "good");
        })
        .catch((er) => toast(esc(er.message), "bad"));
    }
    idKey() {
      return { companies: "company", licences: "licence", clearances: "clearanceLine", bills: "billLine", payments: "payment", issues: "issue", correspondence: "correspondence" }[this.sheetKey] || null;
    }

    /* ------------------------------------------------ menus */
    cycleSort(ci) {
      if (!this.view.sort || this.view.sort.col !== ci) this.view.sort = { col: ci, dir: 1 };
      else if (this.view.sort.dir === 1) this.view.sort.dir = -1;
      else this.view.sort = null;
      this.buildView();
      this.render();
    }
    startResize(e, ci) {
      e.preventDefault(); e.stopPropagation();
      const th = e.target.parentElement;
      th.dragging = true;
      const startX = e.clientX, startW = this.colWidths[ci];
      const move = (ev) => { const w = Math.max(50, startW + ev.clientX - startX); this.colWidths[ci] = w; const cg = this.el.colgroup.children[this.visibleCols().indexOf(ci) + 1]; if (cg) cg.style.width = w + "px"; };
      const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); th.dragging = false; Store.prefs.set("widths-" + this.sheetKey, this.colWidths); };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    }
    popover(x, y, html) {
      closeMenus();
      const pop = document.createElement("div");
      pop.className = "menu-pop";
      pop.innerHTML = html;
      document.getElementById("ctxRoot").appendChild(pop);
      const r = pop.getBoundingClientRect();
      pop.style.left = Math.min(x, window.innerWidth - r.width - 8) + "px";
      pop.style.top = Math.min(y, window.innerHeight - r.height - 8) + "px";
      setTimeout(() => {
        const closer = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener("mousedown", closer); } };
        document.addEventListener("mousedown", closer);
      }, 0);
      return pop;
    }
    columnMenu(ci, e) {
      const col = this.columns[ci];
      const filtered = !!this.view.colFilters[ci];
      const pop = this.popover(e.clientX, e.clientY, `
        <div class="mhead">${esc(col.label)}</div>
        <div class="mi act-sa">Sort ascending A→Z / 1→9</div>
        <div class="mi act-sd">Sort descending Z→A / 9→1</div>
        ${this.view.sort ? `<div class="mi act-so">Clear sort</div>` : ""}
        <div class="msep"></div>
        <div class="mi act-fv">${filtered ? "✓ " : ""}Filter by values…</div>
        <div class="mi act-txt">Filter contains text…</div>
        ${filtered ? `<div class="mi act-cf">Clear this filter</div>` : ""}
        <div class="msep"></div>
        <div class="mi act-hide">Hide this column</div>
        <div class="mi act-fit">Resize to fit</div>`);
      pop.querySelector(".act-sa").onclick = () => { this.view.sort = { col: ci, dir: 1 }; this.buildView(); this.render(); pop.remove(); };
      pop.querySelector(".act-sd").onclick = () => { this.view.sort = { col: ci, dir: -1 }; this.buildView(); this.render(); pop.remove(); };
      const so = pop.querySelector(".act-so"); if (so) so.onclick = () => { this.view.sort = null; this.buildView(); this.render(); pop.remove(); };
      pop.querySelector(".act-fv").onclick = () => { pop.remove(); this.valuesFilterMenu(ci, e); };
      pop.querySelector(".act-txt").onclick = () => { pop.remove(); this.textFilterMenu(ci, e); };
      const cf = pop.querySelector(".act-cf"); if (cf) cf.onclick = () => { delete this.view.colFilters[ci]; this.buildView(); this.render(); pop.remove(); };
      pop.querySelector(".act-hide").onclick = () => { this.hidden.add(ci); Store.prefs.set("hidden-" + this.sheetKey, [...this.hidden]); this.buildView(); this.render(); pop.remove(); };
      pop.querySelector(".act-fit").onclick = () => { this.colWidths[ci] = Math.min(420, Math.max(70, (col.label.length + 2) * 7)); Store.prefs.set("widths-" + this.sheetKey, this.colWidths); this.render(); pop.remove(); };
    }
    valuesFilterMenu(ci, e) {
      const d = Store.state.data;
      const counts = new Map();
      this.sheet().rows.forEach((r, ri) => {
        const v = CMU.displayValue(d, this.sheetKey, ri, ci);
        const k = v == null ? "(blank)" : String(v);
        counts.set(k, (counts.get(k) || 0) + 1);
      });
      const entries = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const existing = this.view.colFilters[ci];
      const sel = existing ? new Set(existing) : new Set(entries.map((x) => x[0]));
      const pop = this.popover(e.clientX, e.clientY, `
        <div class="mhead">Filter “${esc(this.columns[ci].label)}” — ${entries.length} value(s)</div>
        <input type="text" class="fq" placeholder="Search values…">
        <div class="opts" style="max-height:260px;overflow:auto">
          ${entries.map(([v, n]) => `<label class="opt"><input type="checkbox" data-v="${esc(v)}" ${sel.has(v) ? "checked" : ""}> <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${esc(v)}</span> <span class="muted">(${n})</span></label>`).join("")}
        </div>
        <div class="msep"></div>
        <div style="display:flex;gap:8px;padding:6px 12px">
          <button class="btn small act-all">Select all</button>
          <button class="btn small act-none">None</button>
          <span style="flex:1"></span>
          <button class="btn small primary act-ok">Apply</button>
        </div>`);
      const boxes = () => [...pop.querySelectorAll("input[type=checkbox]")];
      pop.querySelector(".fq").oninput = (ev) => {
        const q = ev.target.value.toLowerCase();
        pop.querySelectorAll("label.opt").forEach((l) => { l.style.display = l.textContent.toLowerCase().includes(q) ? "" : "none"; });
      };
      pop.querySelector(".act-all").onclick = () => boxes().forEach((b) => (b.checked = true));
      pop.querySelector(".act-none").onclick = () => boxes().forEach((b) => (b.checked = false));
      pop.querySelector(".act-ok").onclick = () => {
        const keep = new Set(boxes().filter((b) => b.checked).map((b) => b.dataset.v));
        if (keep.size === entries.length) delete this.view.colFilters[ci];
        else this.view.colFilters[ci] = keep;
        this.buildView(); this.render(); pop.remove();
      };
    }
    textFilterMenu(ci, e) {
      const pop = this.popover(e.clientX, e.clientY, `
        <div class="mhead">Show rows where “${esc(this.columns[ci].label)}” contains</div>
        <input type="text" class="tq" placeholder="Text to match (case-insensitive)">
        <div style="display:flex;justify-content:flex-end;padding:6px 12px"><button class="btn small primary act-ok">Apply</button></div>`);
      const inp = pop.querySelector(".tq");
      inp.focus();
      const apply = () => {
        const q = inp.value.trim().toLowerCase();
        if (!q) delete this.view.colFilters[ci];
        else {
          const keep = new Set();
          this.sheet().rows.forEach((r, ri) => {
            const v = CMU.displayValue(Store.state.data, this.sheetKey, ri, ci);
            if (v != null && String(v).toLowerCase().includes(q)) keep.add(String(v));
          });
          this.view.colFilters[ci] = keep;
        }
        this.buildView(); this.render(); pop.remove();
      };
      inp.onkeydown = (ev) => { if (ev.key === "Enter") apply(); };
      pop.querySelector(".act-ok").onclick = apply;
    }
    columnsMenu(e) {
      if (e.clientX) this.lastColsX = e.clientX;
      const items = this.columns.map((c, i) => `
        <label class="opt"><input type="checkbox" data-ci="${i}" ${this.hidden.has(i) ? "" : "checked"}> ${esc(c.label)}${c.calc ? ' <span class="muted">(calc)</span>' : ""}</label>`).join("");
      const anchor = (e.currentTarget && e.currentTarget.getBoundingClientRect) ? e.currentTarget : (this.colsBtn || document.body);
      const rect = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 300, bottom: 200 };
      const pop = this.popover(Math.max(10, (this.lastColsX || rect.left) - 200), rect.bottom + 6, `
        <div class="mhead">Columns — tick to show</div>
        <div style="max-height:330px;overflow:auto">${items}</div>
        <div class="msep"></div>
        <div style="padding:6px 12px"><button class="btn small act-all">Show all</button></div>`);
      pop.querySelectorAll("input[type=checkbox]").forEach((b) => {
        b.onchange = () => {
          if (b.checked) this.hidden.delete(+b.dataset.ci); else this.hidden.add(+b.dataset.ci);
          Store.prefs.set("hidden-" + this.sheetKey, [...this.hidden]);
          this.buildView(); this.render(); pop.remove(); this.columnsMenu({ clientX: this.lastColsX || 300, currentTarget: this.colsBtn });
        };
      });
      pop.querySelector(".act-all").onclick = () => { this.hidden.clear(); Store.prefs.set("hidden-" + this.sheetKey, []); this.buildView(); this.render(); pop.remove(); };
    }
    cellMenu(e, cell) {
      const col = this.columns[cell.ci];
      const val = CMU.displayValue(Store.state.data, this.sheetKey, cell.ri, cell.ci);
      const canEdit = this.isEditable(cell.ri, cell.ci) && !col.calc;
      let html = `
        <div class="mi act-open ${col.link && val ? "" : "dis"}">🔗 Open linked record…</div>
        <div class="msep"></div>
        <div class="mi act-edit ${canEdit ? "" : "dis"}">✏️ Edit cell (Enter)</div>
        <div class="mi act-clear ${canEdit ? "" : "dis"}">⌫ Clear cell</div>
        <div class="msep"></div>
        <div class="mi act-copy">📋 Copy</div>
        <div class="mi act-rowdel">🗑️ Delete this row…</div>
        <div class="mi act-rowdup ${canEdit ? "" : "dis"}">⧉ Duplicate row</div>
        <div class="msep"></div>
        <div class="mi act-rowform">🪟 Open record in its form</div>`;
      const pop = this.popover(e.clientX, e.clientY, html);
      const open = pop.querySelector(".act-open");
      if (!(col.link && val)) open.classList.add("dis");
      else open.onclick = () => { pop.remove(); this.openLink(col.link, val); };
      const edit = pop.querySelector(".act-edit");
      if (canEdit) edit.onclick = () => { pop.remove(); this.startEdit(cell.vi, cell.ci); };
      const clear = pop.querySelector(".act-clear");
      if (canEdit) clear.onclick = () => { pop.remove(); this.setCellValue(cell.ri, cell.ci, ""); this.rerenderRow(cell.ri); };
      pop.querySelector(".act-copy").onclick = () => {
        pop.remove();
        const s = this.normSel();
        const t = s && (s.r1 !== s.r2 || s.c1 !== s.c2)
          ? this.selText(s)
          : String(val ?? "");
        navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast("Copied", "good"));
      };
      pop.querySelector(".act-rowdel").onclick = () => {
        pop.remove();
        const idv = this.sheet().rows[cell.ri][this.def.idCol != null ? this.def.idCol : 0] || "(no id)";
        if (!confirm(`Delete this row (${esc(String(idv))}) from ${esc(this.sheet().name)}?\n\nThis cannot be undone (Ctrl+Z works until you leave the page).`)) return;
        Store.submitOps([{ op: "deleteRow", sheet: this.sheetKey, row: cell.ri }])
          .then(() => { this.sel = null; this.buildView(); this.rerenderBody(); toast("Row deleted", "good"); })
          .catch((er) => toast(esc(er.message), "bad"));
      };
      const dup = pop.querySelector(".act-rowdup");
      if (canEdit) dup.onclick = () => {
        pop.remove();
        const vals = [...(this.sheet().rows[cell.ri] || [])].map((v) => (typeof v === "string" && /^(CMU|LIC|CLN|CLR|BN|BIL|PAY|ISS|COR)-/.test(v) ? null : v));
        if (this.def.idCol != null && this.def.idPrefix) vals[this.def.idCol] = this.sheet().rows.length ? Store.state.data.nextIds[this.idKey()] : null;
        Store.submitOps([{ op: "insertRow", sheet: this.sheetKey, at: cell.ri + 1, values: vals }])
          .then(() => { this.buildView(); this.rerenderBody(); toast("Row duplicated", "good"); })
          .catch((er) => toast(esc(er.message), "bad"));
      };
      pop.querySelector(".act-rowform").onclick = () => { pop.remove(); this.openRecordForm(cell.ri); };
    }
    rowMenu(e, ri) {
      const pop = this.popover(e.clientX, e.clientY, `
        <div class="mi act-rowdel">🗑️ Delete this row…</div>
        <div class="mi act-rowform">🪟 Open record in its form</div>`);
      pop.querySelector(".act-rowdel").onclick = () => {
        pop.remove();
        const idv = this.sheet().rows[ri][this.def.idCol != null ? this.def.idCol : 0] || "(no id)";
        if (!confirm(`Delete this row (${esc(String(idv))}) from ${esc(this.sheet().name)}?`)) return;
        Store.submitOps([{ op: "deleteRow", sheet: this.sheetKey, row: ri }])
          .then(() => { this.sel = null; this.buildView(); this.rerenderBody(); toast("Row deleted", "good"); })
          .catch((er) => toast(esc(er.message), "bad"));
      };
      pop.querySelector(".act-rowform").onclick = () => { pop.remove(); this.openRecordForm(ri); };
    }
    selText(s) {
      const vis = this.visibleCols();
      const lines = [];
      for (let vi = s.r1; vi <= s.r2; vi++) {
        const ri = this.view.order[vi];
        const cells = [];
        for (let c = s.c1; c <= s.c2; c++) cells.push(CMU.displayValue(Store.state.data, this.sheetKey, ri, vis[c]) ?? "");
        lines.push(cells.join("\t"));
      }
      return lines.join("\n");
    }
    openLink(link, val) {
      // val may be "CMU-001 — Name" style from datalists; take the id part
      const id = String(val).split(" — ")[0].trim();
      if (link.screen === "company") App.openForm("company", { findId: id });
      else if (link.screen === "licence") App.openForm("licence", { findId: id });
      else if (link.screen === "bill") App.openForm("bill", { findBillNo: id });
      else if (link.screen === "clearance") App.openForm("clearance", { findClearanceNo: id });
    }
    openRecordForm(ri) {
      const map = { companies: ["company", (r) => ({ findId: r[0] })], licences: ["licence", (r) => ({ findId: r[0] })], clearances: ["clearance", (r) => ({ findClearanceNo: r[1] })], bills: ["bill", (r) => ({ findBillNo: r[1] })], payments: ["payment", (r) => ({ findId: r[0] })], issues: ["issue", (r) => ({ findId: r[0] })], correspondence: ["correspondence", (r) => ({ findId: r[0] })] };
      const m = map[this.sheetKey];
      if (!m) { toast("This register is edited directly in the grid or from the Licence Form", "warn"); return; }
      const row = this.sheet().rows[ri];
      if (!row) return;
      App.openForm(m[0], m[1](row));
    }
  }

  function closeMenus() { document.getElementById("ctxRoot").innerHTML = ""; }
  function modalOpen() { return document.querySelector(".modal-back") != null; }

  window.SheetGrid = SheetGrid;
  window.closeMenus = closeMenus;
})();
