// Seeds structural/reference data only: the four units, the department's
// document types (with their real numbering conventions), and a starter
// set of staff accounts covering every role so the prototype can actually
// be logged into and demonstrate role-based access. Deliberately does NOT
// seed any transactional data (companies, licenses, complaints, etc.) —
// the department will enter that themselves. Safe to re-run: every insert
// is an upsert.
require('dotenv').config();
const { pool, query } = require('../src/lib/db');
const { hashPassword } = require('../src/lib/auth');

const DEMO_PASSWORD = 'Welcome@2026';

async function main() {
  console.log('Seeding units...');
  const units = [
    { key: 'CHEMICAL', name: 'Chemical Unit', aliases: [] },
    { key: 'ENV_MONITORING', name: 'Environmental Monitoring and Research Unit', aliases: ['Environmental Monitoring Unit'] },
    { key: 'RADIATION', name: 'Radiation Safety Unit', aliases: [] },
    { key: 'WASTE', name: 'Waste and Remediation Unit', aliases: ['Waste Management and Remediation Unit', 'Waste Management Unit'] },
  ];
  const unitIds = {};
  for (const u of units) {
    const { rows } = await query(
      `INSERT INTO units (key, name, alias_names) VALUES ($1,$2,$3)
       ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, alias_names = EXCLUDED.alias_names
       RETURNING id`,
      [u.key, u.name, u.aliases]
    );
    unitIds[u.key] = rows[0].id;
  }

  console.log('Seeding document types...');
  const docTypes = [
    // Chemical Unit — mirrors the real "License_Numbers" convention observed
    // in the Chemical Management Unit's own Excel workbook (annual blocks of
    // pre-numbered slots per license type).
    { unit: 'CHEMICAL', key: 'CHEM_REG_LICENSE', label: 'Chemical Registration License', kind: 'LICENSE', prefix: 'EPA/CRL-ERRS-', suffix: '/R{year}', padding: 3, block: 180, validity: 'CALENDAR_YEAR' },
    { unit: 'CHEMICAL', key: 'CHEM_IMPORT_LICENSE', label: 'Chemical Importation License', kind: 'LICENSE', prefix: 'EPA/CIL-ERRS-', suffix: '/R{year}', padding: 3, block: 180, validity: 'ONE_YEAR_FROM_ISSUE' },
    { unit: 'CHEMICAL', key: 'EFFLUENT_CLEARANCE', label: 'Effluent Discharge Clearance', kind: 'CLEARANCE', prefix: 'EPA/EDC-ERRS-', suffix: '/R{year}', padding: 3, block: 180, validity: 'CALENDAR_YEAR' },
    { unit: 'CHEMICAL', key: 'CHEM_DISPOSAL_CLEARANCE', label: 'Chemical Waste Disposal Clearance', kind: 'CLEARANCE', prefix: 'EPA/WDC-ERRS-', suffix: '/R{year}', padding: 3, block: 180, validity: 'ONE_YEAR_FROM_ISSUE' },
    { unit: 'CHEMICAL', key: 'CHEM_FUMIGATION_CERT', label: 'Fumigation Certificate', kind: 'CERTIFICATE', prefix: 'EPA/FUM-ERRS-', suffix: '/R{year}', padding: 3, block: 180, validity: 'ONE_YEAR_FROM_ISSUE' },
    { unit: 'CHEMICAL', key: 'CHEM_TRANSPORT_PERMIT', label: 'Chemical Transport Permit', kind: 'LICENSE', prefix: 'EPA/CTP-ERRS-', suffix: '/R{year}', padding: 3, block: 180, validity: 'ONE_YEAR_FROM_ISSUE' },

    // Environmental Monitoring and Research Unit
    { unit: 'ENV_MONITORING', key: 'ECC', label: 'Environmental Compliance Certificate', kind: 'CERTIFICATE', prefix: 'EPA/ECC-ERRS-', suffix: '/R{year}', padding: 3, block: 120, validity: 'CALENDAR_YEAR' },
    { unit: 'ENV_MONITORING', key: 'ENV_MONITORING_BILL', label: 'Environmental Monitoring Bill', kind: 'BILL', prefix: 'EPA/EMB-ERRS-', suffix: '/R{year}', padding: 3, block: 120, validity: 'NONE' },

    // Radiation Safety Unit
    { unit: 'RADIATION', key: 'RAD_USE_LICENSE', label: 'Radiation Use License', kind: 'LICENSE', prefix: 'EPA/RUL-ERRS-', suffix: '/R{year}', padding: 3, block: 60, validity: 'CALENDAR_YEAR' },
    { unit: 'RADIATION', key: 'RAD_SAFETY_CERT', label: 'Radiation Safety Certificate', kind: 'CERTIFICATE', prefix: 'EPA/RSC-ERRS-', suffix: '/R{year}', padding: 3, block: 60, validity: 'ONE_YEAR_FROM_ISSUE' },

    // Waste and Remediation Unit
    { unit: 'WASTE', key: 'WASTE_MGMT_PERMIT', label: 'Waste Management Permit', kind: 'LICENSE', prefix: 'EPA/WMP-ERRS-', suffix: '/R{year}', padding: 3, block: 120, validity: 'CALENDAR_YEAR' },
    { unit: 'WASTE', key: 'ESIA_CLEARANCE', label: 'Environmental & Social Impact Clearance', kind: 'CLEARANCE', prefix: 'EPA/ESIA-ERRS-', suffix: '/R{year}', padding: 3, block: 120, validity: 'ONE_YEAR_FROM_ISSUE' },
  ];
  for (const dt of docTypes) {
    await query(
      `INSERT INTO document_types (unit_id, key, label, kind, number_prefix, number_suffix, number_padding, block_size, validity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, kind = EXCLUDED.kind,
         number_prefix = EXCLUDED.number_prefix, number_suffix = EXCLUDED.number_suffix,
         number_padding = EXCLUDED.number_padding, block_size = EXCLUDED.block_size, validity = EXCLUDED.validity`,
      [unitIds[dt.unit], dt.key, dt.label, dt.kind, dt.prefix, dt.suffix, dt.padding, dt.block, dt.validity]
    );
  }

  console.log('Seeding staff accounts (one per role, for demo purposes)...');
  const internEndsAt = new Date();
  internEndsAt.setMonth(internEndsAt.getMonth() + 6);

  const accounts = [
    { name: 'Department Head', username: 'depthead', role: 'DEPT_HEAD', unit: null },
    { name: 'Chemical Unit Head', username: 'chemhead', role: 'UNIT_HEAD', unit: 'CHEMICAL' },
    { name: 'Environmental Monitoring Unit Head', username: 'envhead', role: 'UNIT_HEAD', unit: 'ENV_MONITORING' },
    { name: 'Radiation Safety Unit Head', username: 'radhead', role: 'UNIT_HEAD', unit: 'RADIATION' },
    { name: 'Waste & Remediation Unit Head', username: 'wastehead', role: 'UNIT_HEAD', unit: 'WASTE' },
    { name: 'Chemical Unit Staff', username: 'chemstaff', role: 'STAFF', unit: 'CHEMICAL' },
    { name: 'Chemical Unit Intern', username: 'chemintern', role: 'INTERN', unit: 'CHEMICAL', internEndsAt },
  ];

  const passwordHash = hashPassword(DEMO_PASSWORD);
  for (const a of accounts) {
    await query(
      // must_change_password=true only applies on first INSERT — an
      // ON CONFLICT re-run must NOT reset it back to true for an account
      // whose owner has already been through the forced-reset flow and
      // picked their own password (see src/routes/account.js).
      `INSERT INTO users (name, username, password_hash, role, unit_id, intern_ends_at, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, unit_id = EXCLUDED.unit_id`,
      [a.name, a.username, passwordHash, a.role, a.unit ? unitIds[a.unit] : null, a.internEndsAt || null]
    );
  }

  console.log('\nDone. Demo accounts (all use the same password):');
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
  accounts.forEach((a) => console.log(`  ${a.username.padEnd(12)} ${a.role.padEnd(10)} ${a.name}`));

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
