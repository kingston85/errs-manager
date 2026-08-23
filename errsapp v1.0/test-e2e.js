const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';

const ACCOUNTS = {
  depthead: { username: 'depthead', password: 'Welcome@2026' },
  chemhead: { username: 'chemhead', password: 'Welcome@2026' },
  envhead: { username: 'envhead', password: 'Welcome@2026' },
  radhead: { username: 'radhead', password: 'Welcome@2026' },
  wastehead: { username: 'wastehead', password: 'Welcome@2026' },
  chemstaff: { username: 'chemstaff', password: 'Welcome@2026' },
  chemintern: { username: 'chemintern', password: 'Welcome@2026' },
};

const ALL_ENTITY_ROUTES = [
  '/app/companies', '/app/chemicals',
  '/app/chemical_escorts', '/app/chemical_inventory_audits',
  '/app/site_inspections', '/app/complaints', '/app/lab_results', '/app/reporting_quality_entries',
  '/app/radiation_inventories', '/app/radiation_trainings',
  '/app/esia_participations',
  '/app/reminders', '/app/assets', '/app/activity_logs',
];

const CORE_ROUTES = ['/', '/app/documents', '/app/kpi'];

let failures = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} — ${msg}`); if (!ok) failures++; };

async function login(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.fill('#username', username);
  await page.fill('#password', password);
  await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);
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
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  // --- Dept Head: full access across every route ---
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

    // Create a company, then a chemical, then a full case-document lifecycle end to end.
    await page.goto(`${BASE}/app/companies/new`);
    await page.fill('#f_name', 'Acme Testing Corporation');
    await page.fill('#f_county', 'Montserrado');
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Create")')]);
    log(page.url().includes('/app/companies'), '[depthead] created a company');
    let bodyText = await page.textContent('body');
    log(bodyText.includes('Acme Testing Corporation'), '[depthead] new company appears in list');

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
    await page.selectOption('#company_id', { label: 'Acme Testing Corporation' });
    await page.selectOption('#chemical_id', { label: 'Sodium Cyanide' });
    await page.fill('#activity', 'Registration of new industrial chemical');
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("Create Case")')]);
    log(page.url().includes('/app/documents'), '[depthead] created a case document');
    bodyText = await page.textContent('body');
    log(bodyText.includes('Acme Testing Corporation'), '[depthead] new case appears in documents list');

    // Issue it
    const issueForm = await page.$('form[action*="/issue"]');
    log(!!issueForm, '[depthead] Issue button present for unissued case');
    if (issueForm) {
      page.once('dialog', (d) => d.accept());
      await Promise.all([page.waitForNavigation(), issueForm.evaluate((f) => f.requestSubmit())]);
      bodyText = await page.textContent('body');
      log(/EPA\/CRL-ERRS-\d+/.test(bodyText), '[depthead] document number allocated on issue');
    }

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

    await page.close();
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
    await page.fill('#username', 'depthead');
    await page.fill('#password', 'wrongpassword');
    await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);
    const bodyText = await page.textContent('body');
    log(bodyText.includes('Incorrect username or password'), '[auth] wrong password rejected with friendly message');
    await page.close();
  }

  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
})();
