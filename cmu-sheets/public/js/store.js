/* Store — client data layer: loads the dataset, applies edits optimistically,
 * talks to the API, keeps an undo stack and a tiny event bus. */
(function () {
  "use strict";

  const listeners = {};
  const state = {
    data: null,          // full dataset (sheets, lists, fees, printSettings, settings, nextIds)
    user: null,          // {username, fullName, role} or null (demo mode)
    token: localStorage.getItem("cmu-token") || "",
    undoStack: [],       // arrays of inverse ops
    redoStack: [],
    prefs: JSON.parse(localStorage.getItem("cmu-prefs") || "{}"),
  };

  function emit(ev, arg) { (listeners[ev] || []).forEach((cb) => { try { cb(arg); } catch (e) { console.error(e); } }); }
  function on(ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); }

  function savePrefs() { localStorage.setItem("cmu-prefs", JSON.stringify(state.prefs)); }

  async function api(method, url, body) {
    const headers = { "Content-Type": "application/json" };
    if (state.token) headers["X-CMU-Token"] = state.token;
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let json = null;
    try { json = await res.json(); } catch (e) { /* non-json */ }
    if (!res.ok) {
      const err = new Error((json && json.error) || res.statusText || "Request failed");
      err.status = res.status;
      throw err;
    }
    return json;
  }

  async function refresh() {
    state.data = await api("GET", "/api/data");
    emit("data", state.data);
    return state.data;
  }

  async function init() {
    if (state.token) {
      try {
        const me = await api("GET", "/api/me");
        state.user = me.user;
      } catch (e) { state.token = ""; state.user = null; localStorage.removeItem("cmu-token"); }
    }
    await refresh();
    return state.data;
  }

  /* ---------------- grid ops (optimistic) ---------------- */
  function applyOpsLocally(ops) {
    for (const op of ops) {
      const sheet = state.data.sheets[op.sheet];
      if (!sheet) continue;
      if (op.op === "setCell") {
        const row = sheet.rows[op.row];
        if (!row) continue;
        while (row.length < op.col + 1) row.push(null);
        row[op.col] = op.value;
      } else if (op.op === "insertRow") {
        sheet.rows.splice(op.at, 0, op.values || []);
      } else if (op.op === "deleteRow") {
        sheet.rows.splice(op.row, 1);
      }
    }
  }

  function invertOps(applied) {
    // applied ops come back from the server in inverse form already
    return applied.map((a) => {
      if (a.op === "setCell") return { op: "setCell", sheet: a.sheet, row: a.row, col: a.col, value: a.from };
      if (a.op === "insertRow") return { op: "insertRow", sheet: a.sheet, at: a.at, values: a.values };
      if (a.op === "deleteRow") return { op: "deleteRow", sheet: a.sheet, row: a.at };
      return a;
    });
  }

  async function submitOps(ops, { undoable = true } = {}) {
    if (!ops || !ops.length) return;
    // capture the inverse BEFORE applying, so undo restores previous values
    const inverse = [];
    for (const op of [...ops].reverse()) {
      const sheet = state.data.sheets[op.sheet];
      if (!sheet) continue;
      if (op.op === "setCell") {
        const row = sheet.rows[op.row];
        inverse.push({ op: "setCell", sheet: op.sheet, row: op.row, col: op.col, value: row ? row[op.col] : null });
      } else if (op.op === "insertRow") {
        inverse.push({ op: "deleteRow", sheet: op.sheet, row: op.at });
      } else if (op.op === "deleteRow") {
        inverse.push({ op: "insertRow", sheet: op.sheet, at: op.row, values: sheet.rows[op.row] || [] });
      }
    }
    // optimistic local apply (ops are forward ops)
    applyOpsLocally(ops);
    emit("data", state.data);
    emit("saving");
    try {
      const res = await api("POST", "/api/ops", { ops });
      if (res.nextIds) state.data.nextIds = res.nextIds;
      if (undoable) {
        state.undoStack.push({ forward: ops, inverse });
        if (state.undoStack.length > 100) state.undoStack.shift();
        state.redoStack = [];
      }
      emit("saved");
    } catch (e) {
      await refresh(); // roll back to server truth
      emit("saved");
      throw e;
    }
  }

  async function undo() {
    const entry = state.undoStack.pop();
    if (!entry) return;
    await submitOps(entry.inverse, { undoable: false });
    state.redoStack.push(entry);
  }

  async function redo() {
    const entry = state.redoStack.pop();
    if (!entry) return;
    await submitOps(entry.forward, { undoable: false });
    state.undoStack.push(entry);
  }

  /* ---------------- record forms / settings ---------------- */
  async function record(kind, body) {
    emit("saving");
    try {
      const res = await api("POST", "/api/record/" + kind, body);
      await refresh();
      emit("saved");
      return res; // {ok, id/billNo/clearanceNo, warnings, nextIds}
    } catch (e) { emit("saved"); throw e; }
  }

  async function saveLists(payload) {
    emit("saving");
    try { await api("POST", "/api/settings/lists", payload); await refresh(); emit("saved"); }
    catch (e) { emit("saved"); throw e; }
  }
  async function saveFees(payload) {
    emit("saving");
    try { await api("POST", "/api/settings/fees", payload); await refresh(); emit("saved"); }
    catch (e) { emit("saved"); throw e; }
  }

  /* ---------------- auth ---------------- */
  async function login(username, password) {
    const res = await api("POST", "/api/login", { username, password });
    state.token = res.token; state.user = res.user;
    localStorage.setItem("cmu-token", res.token);
    emit("user", res.user);
    return res;
  }
  async function logout() {
    try { await api("POST", "/api/logout", {}); } catch (e) {}
    state.token = ""; state.user = null;
    localStorage.removeItem("cmu-token");
    emit("user", null);
  }
  async function changePassword(oldPassword, newPassword) {
    return api("POST", "/api/password", { oldPassword, newPassword });
  }
  async function users() { return api("GET", "/api/users"); }
  async function saveUser(payload) { return api("POST", "/api/users/save", payload); }
  async function setLoginRequired(v) { return api("POST", "/api/settings/mode", { loginRequired: v }); }
  async function auditLog() { return api("GET", "/api/audit"); }
  async function resetData() { await api("POST", "/api/reset", {}); await refresh(); }

  window.Store = {
    state, on, init, refresh, api,
    submitOps, undo, redo,
    record, saveLists, saveFees,
    login, logout, changePassword, users, saveUser, setLoginRequired, auditLog, resetData,
    prefs: {
      get: (k, d) => (k in state.prefs ? state.prefs[k] : d),
      set: (k, v) => { state.prefs[k] = v; savePrefs(); },
    },
  };

  /* ---------------- tiny helpers used everywhere ---------------- */
  let toastRoot;
  function toast(msg, kind) {
    toastRoot = toastRoot || document.getElementById("toastRoot");
    if (!toastRoot) return;
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML = msg;
    toastRoot.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 320); }, kind === "bad" ? 6000 : 3200);
  }
  window.toast = toast;

  window.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  };
})();
