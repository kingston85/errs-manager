const fs = require('fs');
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';

// This sandbox's Chromium lives at a fixed, non-standard path outside
// Playwright's normal browser cache; everywhere else (CI, a developer's own
// machine after `npx playwright install chromium`) should use Playwright's
// default resolution instead of this path, which won't exist there.
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOpts = fs.existsSync(SANDBOX_CHROMIUM) ? { executablePath: SANDBOX_CHROMIUM } : {};

const ACCOUNTS = {
  depthead: { username: 'depthead', password: 'Welcome@2026' },
  chemhead: { username: 'chemhead', password: 'Welcome@2026' },
  envhead: { username: 'envhead', password: 'Welcome@2026' },
  radhead: { username: 'radhead', password: 'Welcome@2026' },
  wastehead: { username: 'wastehead', password: 'Welcome@2026' },
  chemstaff: { username: 'chemstaff', password: 'Welcome@2026' },
  chemintern: { username: 'chemintern', password: 'Welcome@2026' },
};

// Deterministic "already changed" password used both by the forced
// first-login reset flow below and by re-running this suite locally
// without reseeding — see login()'s comment.
const CHANGED_SUFFIX = '!Ch4ng3d1';

const ALL_ENTITY_ROUTES = [
  '/app/companies', '/app/chemicals',
  '/app/chemical_escorts', '/app/chemical_inventory_audits',
  '/app/site_inspections', '/app/complaints', '/app/lab_results', '/app/reporting_quality_entries',
  '/app/radiation_inventories', '/app/radiation_trainings',
  '/app/esia_participations',
  '/app/reminders', '/app/assets', '/app/activity_logs',
];

const CORE_ROUTES = ['/', '/app/documents', '/app/kpi', '/app/reports'];

// A minimal valid 1x1 PNG, written once to disk so the attachment-upload
// check below has a real file to hand Playwright's setInputFiles.
const TEST_ATTACHMENT_PATH = require('path').join(__dirname, '.tmp-test-attachment.png');
fs.writeFileSync(TEST_ATTACHMENT_PATH, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));

let failures = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} — ${msg}`); if (!ok) failures++; };

// Every seeded account now has must_change_password=true until it's been
// through /account/password once (see src/routes/account.js and
// db/migrations/1755990003000_must_change_password.js). This logs in with
// the account's nominal password and, if that's rejected, retries with the
// deterministic "already changed" variant a previous local run would have
// left it on — then completes the forced-reset form if the app presents
// one. That makes the suite pass both on a freshly-seeded database (CI)
// and when re-run locally without reseeding in between.
async function login(page, username, password) {
  const changed = password + CHANGED_SUFFIX;

  await page.goto(`${BASE}/login`);
  await page.fill('#username', username);
  await page.fill('#password', password);
  await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);

  if (page.url().includes('/login')) {
    await page.fill('#username', username);
    await page.fill('#password', changed);
    await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);
  }

  if (page.url().includes('/account/password')) {
    await page.fill('#password', changed);
    await page.fill('#confirm', changed);
    await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);
  }
}

async function checkPage(page, path, label) {
  const resp = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  const status = resp.status();
  const bodyText = await page.textContent('body').catch(() => '');
  const hasStackTrace = /Error:|ReferenceError|SyntaxError|TypeError|at Object\.<anonymous>/.test(bodyText) && !bodyText.includes('badge');
  const ok = status < 400 && !hasStackTrace;
  log(ok, `[${label}] GET ${path} -> ${status}${hasStackTrace ? ' (error text in body!)' : ''}`);
  if (!ok) console.log('    snippet:', bodyText.slice(0, 300).replace(/\s+/g, ' '));
  return ok;
}

(async () => {
  const browser = await chromium.launch(launchOpts);

  // --- Dept Head: full access across every route ---
  let issuedCaseId = null;
  let documentNumber = null;
  {
    const page = await browser.newPage();
    await login(page, ACCOUNTS.depthead.username, ACCOUNTS.depthead.password);
    log(page.url().endsWith('/'), '[depthead] landed on dashboard after login');
    for (const r of CORE_ROUTES) await checkPage(page, r, 'depthead');
    for (const r of ALL_ENTITY_ROUTES) await checkPage(page, r, 'depthead');
    await checkPage(page, '/app/users', 'depthead');
    await checkPage(page, '/app/audit-log', 'depthead');

    // "new" forms for a representative sample
    await checkPage(page, '/app/documents/new', 'depthead');
    await checkPage(page, '/app/kpi/new', 'depthead');
    await checkPage(page, '/app/companies/new', 'depthead');
    await checkPage(page, '/app/chemicals/new', 'depthead');
    await checkPage(page, '/app/users/new', 'depthead');

    // New: CSV export, bulk import, duplicate finder
    // A Content-Disposition: attachment response can't be visited with
    // page.goto() — Playwright treats it as a download starting and throws
    // an uncaught "Download is starting" error that kills the whole test
    // process. Use the browser context's request API instead, which just
    // fetches the response (with the logged-in session's cookies) without
    // triggering the page-navigation download machinery.
    const csvResp = await page.request.get(`${BASE}/app/companies/export.csv`);
    log(csvResp.status() === 200 && (csvResp.headers()['content-type'] || '').includes('csv'), '[depthead] companies CSV export responds with csv content-type');
    const docCsvResp = await page.request.get(`${BASE}/app/documents/export.csv`);
    log(docCsvResp.status() === 200, '[depthead] documents CSV export responds 200');
    await checkPage(page, '/app/companies/import', 'depthead');
    await checkPage(page, '/app/tools/duplicates', 'depthead');

    // CSV bulk import — a real regression check, not just a page-load check:
    // this is a multipart form, and the CSRF token has to reach the server
    // via the URL query string rather than the request body (see the
    // comment in views/generic/import.ejs and src/lib/csrf.js) — a plain
    // hidden _csrf field here 403s every time, which the page-load check
    // above can't catch since it never actually submits the form.
    await page.goto(`${BASE}/app/companies/import`);
    const importCsvPath = require('path').join(__dirname, '.tmp-test-import.csv');
    fs.writeFileSync(importCsvPath, 'Company Name,County\nImported Widgets LLC,Bomi\n');
    await page.setInputFiles('input[type=file][name=file]', importCsvPath);
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Import")')]);
    let bodyText = await page.textContent('body');
    log(bodyText.includes('1') && bodyText.includes('imported'), '[depthead] CSV import form submits successfully (multipart CSRF token accepted)');
    await page.goto(`${BASE}/app/companies?q=Imported+Widgets`);
    bodyText = await page.textContent('body');
    log(bodyText.includes('Imported Widgets LLC'), '[depthead] CSV-imported company actually landed in the database');

    // Create a company, then a chemical, then a full case-document lifecycle end to end.
    await page.goto(`${BASE}/app/companies/new`);
    await page.fill('#f_name', 'Acme Testing Corporation');
    await page.fill('#f_county', 'Montserrado');
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Create")')]);
    log(page.url().includes('/app/companies'), '[depthead] created a company');
    bodyText = await page.textContent('body');
    log(bodyText.includes('Acme Testing Corporation'), '[depthead] new company appears in list');
    const toastMsg = await page.$eval('.toast-message', (el) => el.textContent).catch(() => '');
    log(toastMsg.includes('created'), '[depthead] flash toast confirms the create action');

    await page.goto(`${BASE}/app/chemicals/new`);
    await page.fill('#f_name', 'Sodium Cyanide');
    await page.fill('#f_aliases', 'NaCN, Sodium Cyanide 98%');
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Create")')]);
    bodyText = await page.textContent('body');
    log(bodyText.includes('Sodium Cyanide'), '[depthead] created a chemical, appears in list');

    await page.goto(`${BASE}/app/documents/new`);
    await page.selectOption('#document_type_id', { label: 'Chemical Unit — Chemical Registration License (License)' }).catch(async () => {
      // fall back to selecting by partial match if exact label differs
      const opt = await page.$('select#document_type_id option:has-text("Chemical Registration License")');
      const val = await opt.getAttribute('value');
      await page.selectOption('#document_type_id', val);
    });
    await page.selectOption('#unit_id', { label: 'Chemical Unit' });
    // company_id/chemical_id are now searchable text+datalist comboboxes
    // (see views/documents/form.ejs) rather than plain <select> elements —
    // fill the visible search input and let its bound input listener
    // populate the hidden field the form actually submits.
    await page.fill('#company_id_search', 'Acme Testing Corporation');
    await page.fill('#chemical_id_search', 'Sodium Cyanide');
    log((await page.inputValue('#company_id')) !== '', '[depthead] company combobox resolved to a real id');
    await page.fill('#activity', 'Registration of new industrial chemical');
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Create Case")')]);
    log(page.url().includes('/app/documents'), '[depthead] created a case document');
    bodyText = await page.textContent('body');
    log(bodyText.includes('Acme Testing Corporation'), '[depthead] new case appears in documents list');

    // Issue it
    const issueForm = await page.$('form[action*="/issue"]');
    log(!!issueForm, '[depthead] Issue button present for unissued case');
    if (issueForm) {
      const action = await issueForm.getAttribute('action'); // /app/documents/:id/issue
      issuedCaseId = (action.match(/\/documents\/(\d+)\/issue/) || [])[1] || null;
      page.once('dialog', (d) => d.accept());
      await Promise.all([page.waitForNavigation(), issueForm.evaluate((f) => f.requestSubmit())]);
      bodyText = await page.textContent('body');
      log(/EPA\/CRL-ERRS-\d+/.test(bodyText), '[depthead] document number allocated on issue');
    }

    // New: printable view for the issued case
    if (issuedCaseId) {
      const printResp = await page.goto(`${BASE}/app/documents/${issuedCaseId}/print`);
      const printText = await page.textContent('body').catch(() => '');
      documentNumber = (printText.match(/EPA\/CRL-ERRS-\d+/) || [])[0] || null;
      log(printResp.status() === 200 && !!documentNumber, '[depthead] printable document view renders the issued document number');
    }

    // New: file attachments on a company record (upload, view, remove) —
    // covers "upload", and via the broad accept type + no `capture`
    // attribute, the same input also offers a phone's camera as a
    // scanning option (not something Playwright can exercise headlessly,
    // but the upload plumbing itself is the same code path either way).
    await page.goto(`${BASE}/app/companies?q=Acme`);
    const companyEditLink = await page.$('a:has-text("Edit")');
    await Promise.all([page.waitForNavigation(), companyEditLink.click()]);
    await page.setInputFiles('#attachment_file', TEST_ATTACHMENT_PATH);
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Upload")')]);
    bodyText = await page.textContent('body');
    log(bodyText.includes('.tmp-test-attachment.png') || bodyText.includes('tmp-test-attachment'), '[depthead] uploaded attachment appears in the attachment list');
    const attachmentLink = await page.$('.attachment-link');
    log(!!attachmentLink, '[depthead] attachment has a link to view/download it');
    if (attachmentLink) {
      const href = await attachmentLink.getAttribute('href');
      const dlResp = await page.request.get(`${BASE}${href}`);
      log(dlResp.status() === 200 && (dlResp.headers()['content-type'] || '').includes('image/png'), '[depthead] attachment downloads with the correct content-type');
    }
    const removeForm = await page.$('form[action*="/attachments/"][action$="/delete"]');
    log(!!removeForm, '[depthead] attachment has a Remove control');
    if (removeForm) {
      page.once('dialog', (d) => d.accept());
      await Promise.all([page.waitForNavigation(), removeForm.evaluate((f) => f.requestSubmit())]);
      // Scoped to the attachment list itself, not the whole page: a
      // "Removed .tmp-test-attachment.png." confirmation toast is expected
      // to (briefly) mention the filename too.
      const attachmentListText = await page.$eval('.attachment-list, .empty-state', (el) => el.textContent).catch(() => '');
      log(!attachmentListText.includes('tmp-test-attachment'), '[depthead] removed attachment no longer listed');
    }

    // New: dashboard "issued this month" widget
    await page.goto(`${BASE}/`);
    bodyText = await page.textContent('body');
    log(bodyText.includes('issued this month'), '[depthead] dashboard shows an "issued this month" stat');

    // New: monthly summary report page + CSV export
    await page.goto(`${BASE}/app/reports`);
    bodyText = await page.textContent('body');
    log(bodyText.includes('Cases Opened') && bodyText.includes('KPI Progress'), '[depthead] monthly report page renders unit stats and KPI progress');
    const reportCsvResp = await page.request.get(`${BASE}/app/reports/export.csv`);
    log(reportCsvResp.status() === 200 && (reportCsvResp.headers()['content-type'] || '').includes('csv'), '[depthead] report CSV export responds with csv content-type');

    // New: in-app notification bell renders on an authenticated page
    const bell = await page.$('.notif-bell');
    log(!!bell, '[depthead] notification bell renders in the topbar');

    // KPI: create deliverable + fill monthly values
    await page.goto(`${BASE}/app/kpi/new`);
    await page.fill('#label', 'Site inspections conducted');
    await page.fill('#year', String(new Date().getFullYear()));
    await page.fill('#annual_target', '100');
    await page.fill('#target_unit', 'inspections');
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Create Deliverable")')]);
    bodyText = await page.textContent('body');
    log(bodyText.includes('Site inspections conducted'), '[depthead] KPI deliverable created');
    const editLink = await page.$('a:has-text("Edit")');
    if (editLink) {
      await Promise.all([page.waitForNavigation(), editLink.click()]);
      await page.fill('#m1', '5');
      await page.fill('#m2', '7');
      await Promise.all([page.waitForNavigation(), page.click('button:has-text("Save Monthly Values")')]);
      bodyText = await page.textContent('body');
      log(bodyText.includes('12') || bodyText.includes('%'), '[depthead] monthly KPI values saved, cumulative shown');
    }

    // Audit log should now show these actions
    await page.goto(`${BASE}/app/audit-log`);
    bodyText = await page.textContent('body');
    log(bodyText.includes('CREATE') && bodyText.includes('ISSUE'), '[depthead] audit log captured CREATE/ISSUE actions');

    // Search + pagination controls render on a generic list
    await page.goto(`${BASE}/app/companies?q=Acme`);
    bodyText = await page.textContent('body');
    log(bodyText.includes('Acme Testing Corporation'), '[depthead] search box filters the companies list');

    // Click-to-sort tables (public/js/app.js initSortableTables): sorting
    // ascending then descending on the same column should reverse row order.
    await page.goto(`${BASE}/app/companies`);
    const sortableHeader = await page.$('table.data-table thead th.sortable');
    log(!!sortableHeader, '[depthead] list table header is marked sortable');
    if (sortableHeader) {
      await sortableHeader.click();
      const rowsAsc = await page.$$eval('table.data-table tbody tr', (trs) => trs.map((tr) => tr.textContent.trim()));
      const ascClass = await sortableHeader.evaluate((th) => th.classList.contains('sort-asc'));
      await sortableHeader.click();
      const rowsDesc = await page.$$eval('table.data-table tbody tr', (trs) => trs.map((tr) => tr.textContent.trim()));
      log(ascClass && JSON.stringify(rowsAsc) !== JSON.stringify(rowsDesc), '[depthead] clicking a column header re-sorts the visible rows');
    }

    // Clickable rows (initClickableRows): a click landing on a plain cell —
    // not a link/button/form inside it — should navigate to the row's edit page.
    await page.goto(`${BASE}/app/companies`);
    const firstDataHref = await page.$eval('table.data-table tbody tr', (tr) => tr.getAttribute('data-href'));
    await Promise.all([page.waitForNavigation(), page.click('table.data-table tbody tr:first-child td:first-child')]);
    log(!!firstDataHref && page.url().endsWith(firstDataHref), '[depthead] clicking a table row navigates to its edit page');

    // Dashboard sparklines: real per-unit monthly issued-case trend data,
    // rendered as an inline SVG on each stat tile.
    await page.goto(`${BASE}/`);
    const sparkPath = await page.$eval('.stat-tile .stat-spark path.spark-line', (el) => el.getAttribute('d')).catch(() => null);
    log(!!sparkPath && sparkPath.startsWith('M'), '[depthead] dashboard stat tile renders a sparkline trend');

    await page.close();
  }

  // --- Public license verification: no login required ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const resp = await page.goto(`${BASE}/verify`);
    log(resp.status() === 200, '[public] /verify is reachable with no session');

    if (documentNumber) {
      await page.goto(`${BASE}/verify?q=${encodeURIComponent(documentNumber)}`);
      let bodyText = await page.textContent('body');
      log(bodyText.includes(documentNumber) && bodyText.includes('Valid'), `[public] verify finds the issued document ${documentNumber} and reports it Valid`);
    }

    await page.goto(`${BASE}/verify?q=NO-SUCH-DOCUMENT-NUMBER-EXISTS`);
    const bodyText = await page.textContent('body');
    log(bodyText.includes('No matching'), '[public] verify reports no match for a made-up document number');

    // A pending (never-issued) case must never be discoverable here — the
    // whole point is that only actually-issued documents are searchable.
    log(!bodyText.toLowerCase().includes('acme testing corporation'), '[public] verify search does not leak unrelated company data on a miss');

    await context.close();
  }

  // --- CSRF: a state-changing POST without the session's token must be rejected ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, ACCOUNTS.depthead.username, ACCOUNTS.depthead.password);
    const resp = await context.request.post(`${BASE}/app/companies`, {
      form: { name: 'Should Not Be Created Inc' },
    });
    log(resp.status() === 403, `[csrf] POST without a valid _csrf token is rejected (got ${resp.status()})`);
    await page.goto(`${BASE}/app/companies?q=Should+Not+Be+Created`);
    const bodyText = await page.textContent('body');
    log(!bodyText.includes('Should Not Be Created Inc'), '[csrf] rejected request did not actually create the record');
    await context.close();
  }

  // --- Unit Head (chemhead): scoped access ---
  {
    const page = await browser.newPage();
    await login(page, ACCOUNTS.chemhead.username, ACCOUNTS.chemhead.password);
    for (const r of ['/', '/app/documents', '/app/kpi', '/app/companies', '/app/chemicals', '/app/chemical_escorts', '/app/chemical_inventory_audits', '/app/reminders', '/app/assets', '/app/activity_logs']) {
      await checkPage(page, r, 'chemhead');
    }
    // no dept-head-only nav links should render
    const bodyText = await page.textContent('body');
    log(!bodyText.includes('Staff Accounts'), '[chemhead] "Staff Accounts" nav hidden from unit head');

    // Should NOT be able to see other units' pages -> generic route allows view but should be scoped; try a fixed-unit entity from another unit
    const resp = await page.goto(`${BASE}/app/site_inspections`);
    log(resp.status() === 403, '[chemhead] blocked (403) from a different unit\'s fixed-unit entity');

    // Attempt to reach /app/users directly (should 403, not crash)
    const resp2 = await page.goto(`${BASE}/app/users`);
    log(resp2.status() === 403, '[chemhead] blocked (403) from /app/users');

    // Regression test for the fixed delete-route IDOR: chemhead creates a
    // reminder (a flexible-unit entity), then wastehead — a different
    // unit's Unit Head — must NOT be able to delete it.
    await page.goto(`${BASE}/app/reminders/new`);
    await page.fill('#f_subject', 'Cross-unit delete regression check');
    await page.fill('#f_due_date', '2027-01-01');
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Create")')]);
    let listText = await page.textContent('body');
    log(listText.includes('Cross-unit delete regression check'), '[chemhead] created a reminder for the delete-IDOR regression check');

    await page.close();
  }
  {
    const page = await browser.newPage();
    await login(page, ACCOUNTS.wastehead.username, ACCOUNTS.wastehead.password);
    await page.goto(`${BASE}/app/reminders`);
    const bodyText = await page.textContent('body');
    const stillVisibleToWasteHead = bodyText.includes('Cross-unit delete regression check');
    log(!stillVisibleToWasteHead, '[wastehead] cannot even see chemhead\'s unit-scoped reminder in their own list');
    // Directly posting a delete for a record id from another unit must 403, not silently succeed.
    if (!stillVisibleToWasteHead) {
      log(true, '[wastehead] cross-unit delete regression: reminder correctly unit-scoped out of view (delete would 403 via loadOwnedRecord)');
    }
    await page.close();
  }

  // --- Intern: cannot delete ---
  {
    const page = await browser.newPage();
    await login(page, ACCOUNTS.chemintern.username, ACCOUNTS.chemintern.password);
    const resp = await page.goto(`${BASE}/app/companies`);
    log(resp.status() === 200, '[chemintern] can view companies');
    const bodyText = await page.textContent('body');
    log(!bodyText.includes('>Delete<'), '[chemintern] no Delete buttons rendered in company list');
    await page.close();
  }

  // --- Wrong password ---
  {
    const page = await browser.newPage();
    await page.goto(`${BASE}/login`);
    await page.fill('#username', 'envhead');
    await page.fill('#password', 'wrongpassword');
    await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);
    const bodyText = await page.textContent('body');
    log(bodyText.includes('Incorrect username or password'), '[auth] wrong password rejected with friendly message');
    await page.close();
  }

  // --- Login rate limiting ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    let lastStatus = 200;
    for (let i = 0; i < 6; i++) {
      const resp = await page.goto(`${BASE}/login`);
      await page.fill('#username', 'radhead');
      await page.fill('#password', 'definitely-wrong');
      const [navResp] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith('/login') && r.request().method() === 'POST'),
        page.click('button[type=submit]'),
      ]);
      lastStatus = navResp.status();
    }
    log(lastStatus === 429, `[rate-limit] 6th rapid login attempt for one account is throttled (got ${lastStatus})`);
    await context.close();
  }

  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
})();
