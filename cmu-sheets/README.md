# CMU Database 2026 — Web Edition (CMU Sheets)

A full interactive, customizable **Google-Sheets-style web system** built from the workbook
**`CMU_DATABASE Original.xlsx`** (EPA Liberia · ERRS · Chemical Management Unit).

Everything in the workbook is here — the 31 sheets, the five data-entry forms, the six print
pages, the dashboard, the fee schedule, the dropdown lists, the user accounts — plus the things
the workbook could not do: live multi-user editing, automatic saving, an audit log, and a health
check.

**Zero dependencies** — plain Node.js (`http` only), plain HTML/CSS/JS. No database server, no
build step.

## Run it

**Option 1 — one file, no install (offline edition).**
Download **[`cmu-database-2026-offline.html`](cmu-database-2026-offline.html)** and double-click it —
the entire system (interface + data + backend-in-the-browser) opens in any modern browser, no
server, no Node, no internet. Changes are saved in that browser; a *Reset saved changes* button
restores the original workbook data. Rebuild it after data changes with
`node tools/build_offline.js` (tested by `node tools/test-offline.js`).

**Option 2 — the server (multi-user, shared data).**

```bash
cd cmu-sheets
npm start          # → http://localhost:3000   (set PORT / HOST to change)
```

- The app opens in **demo mode** (full access without signing in) — exactly like the workbook's
  *"No-login mode: full access enabled"*.
- To use accounts: **Sign in** (top-right) as `admin` / `Welcome@2026` (you must set your own
  password on first sign-in), then *Users & Passwords → Require sign-in for everyone*.
  Roles: **Admin** (everything), **Officer** (data entry + printing), **Viewer** (read-only).
  The workbook's own account (`hinneh45` — Leroy Hinneh, Officer) is pre-seeded the same way.

## What's inside

| Area | Details |
|---|---|
| **Main Menu** (`#/home`) | Home screen with live Quick Figures and buttons to everything, mirroring the workbook's Main Menu |
| **Registers** (12 grids) | Companies, Licences & Certificates, Licence Chemicals / Vehicles / Effluent, Chemical Clearances, Bills & Invoices, Payments & Receipts, Notes & Issues, Correspondence, plus the two read-only SRC source sheets |
| **Spreadsheet engine** | A1 addressing, formula bar, click/drag range selection, keyboard navigation, in-place editing with autocomplete, copy/cut/paste (TSV), column sort (click the letter), per-column value filters, quick filter, hide/resize columns, row insert/delete/duplicate, Ctrl+Z undo, status-bar sum/avg, calculated columns that cannot be typed over |
| **Calculated columns** | Licence status (Active / Expired / Pending…), kg/MT conversions, company roll-ups (licences, clearances, kg, billed, paid), bill roll-ups (company totals, payment status, paid-on-bill) — all live |
| **Five forms** | Company, Licence (chemicals + effluent + discharge limits + geo-reference + vehicles), multi-chemical Clearance, multi-service Bill, Payment (with bill balance and *Pay full balance*) — with ✓/✗ form status, auto IDs (CMU-071, LIC-071, CLN-148, BN-2026-021, PAY-055…), duplicate warnings, delete protection |
| **Print Centre** | CRL, CIL, EDL, EDL RP (retention pond with geo tables), Clearance letter, Bill letter — signatory choice, letterhead toggle, salutation & 72-hour line, live preview, **Print**, **Save as Word**, copy text. Bill wording comes straight from the Fee Schedule, amount in words included |
| **Dashboard** | Live key figures, monthly activity, licences by category, payment status, top chemicals, outstanding bills (click a row to open the bill), CSV export |
| **Customizable** | Dropdown Lists editor (categories, chemicals, sectors, parameters, signatories, offices…), Fee Schedule & letter-wording editor, print settings (letterhead, bank account) — every change applies everywhere immediately |
| **Users & security** | Salted SHA-256 passwords, forced first-login change, 5-attempt lockout, roles, demo/login mode toggle |
| **Audit log** | Every edit, record change, sign-in and settings change with who/when/what |
| **System Check** | Live health checks (unique IDs, orphan links, duplicate receipts, unconvertible units, open issues) + backup / restore / reset |
| **System Code** | The original workbook's 2,293-line VBA, kept for reference |
| **User Manual** | Full manual adapted to the web edition |

## Data flow

```
CMU_DATABASE Original.xlsx ──(tools/build_data.py)──▶ data/cmu-base.json   (committed)
                                                            │
                                                     server.js (in-memory)
                                                            │  first edit creates
                                                            ▼
                                                   data/cmu-live.json   (git-ignored)
```

- `npm run build:data` regenerates `data/cmu-base.json` from the workbook (needs Python 3 +
  `openpyxl`). The macro code is exported to `data/macro-code.txt`.
- `System Check → Reset` returns to the base upload at any time (user accounts are kept).
- Any register exports its current view **with computed columns** as CSV (`⬇ CSV` in the grid
  toolbar or `GET /api/export/<sheet>`).

## Tests

With the server running:

```bash
npm run check           # 41 API checks (ops, records, auth, export, audit, reset)
node tools/dom-test.js  # 67 DOM checks — boots the real UI and clicks through every screen
```

## API sketch

`GET /api/data` · `GET /api/next-ids` · `POST /api/ops` (setCell / insertRow / deleteRow) ·
`POST /api/record/{company|licence|clearance|bill|payment|issue|correspondence}` ·
`POST /api/settings/lists` · `POST /api/settings/fees` · `POST /api/login|logout|password` ·
`GET/POST /api/users(/save)` · `POST /api/settings/mode` · `GET /api/audit` ·
`GET /api/export/:sheet` · `GET /api/backup` · `POST /api/restore` · `POST /api/reset` ·
`GET /api/macro`

Auth header: `X-CMU-Token` (from `/api/login`). When login is required, mutating endpoints
demand a session; Viewers are read-only.

## Layout

```
cmu-sheets/
├─ server.js               zero-dependency HTTP server + JSON API
├─ public/
│  ├─ index.html           app shell
│  ├─ css/app.css          Google-Sheets-style interface + print documents
│  ├─ jslib/cmu.js         shared defs & computed columns (used by server AND browser)
│  └─ js/  store · grid · forms · print · panels · app
├─ data/cmu-base.json      generated from the workbook (committed)
├─ tools/build_data.py     workbook → JSON converter
├─ tools/smoke.js          API test suite
└─ tools/dom-test.js       UI test suite (JSDOM)
```
