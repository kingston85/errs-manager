// Generic KPI/deliverable tracker shared across all four units plus a
// cross-unit/department-wide bucket (unit_id null) — see db/schema.sql.
// Mounted at /app/kpi.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { logAudit, diffForAudit } = require('../lib/audit');
const { loadOwnedRecord } = require('../middleware/access');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// unit_id is nullable here (null = department-wide deliverable, visible to
// everyone) — loadOwnedRecord already treats a null unitColumn value as
// "accessible to all", matching this route's original behavior.
const ownedDeliverable = loadOwnedRecord('kpi_deliverables', { forbiddenMessage: 'That deliverable belongs to a different unit.' });

router.get('/', async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const unitId = req.user.role === 'DEPT_HEAD' ? null : req.user.unit_id;

  const params = [year];
  let unitClause = '';
  if (unitId) { params.push(unitId); unitClause = `AND (k.unit_id = $2)`; }

  const { rows: deliverables } = await db.query(
    `SELECT k.*, u.name AS unit_name FROM kpi_deliverables k LEFT JOIN units u ON u.id = k.unit_id
     WHERE k.year = $1 ${unitClause} ORDER BY u.name NULLS FIRST, k.label`,
    params
  );

  const { rows: entries } = await db.query(
    `SELECT * FROM kpi_monthly_entries WHERE year = $1 AND kpi_deliverable_id = ANY($2::int[])`,
    [year, deliverables.map((d) => d.id)]
  );
  const entryMap = {}; // deliverableId -> { month: value }
  for (const e of entries) {
    entryMap[e.kpi_deliverable_id] = entryMap[e.kpi_deliverable_id] || {};
    entryMap[e.kpi_deliverable_id][e.month] = e.value;
  }

  const withCumulative = deliverables.map((d) => {
    const monthly = entryMap[d.id] || {};
    const cumulative = Object.values(monthly).reduce((a, b) => a + Number(b), 0);
    const pct = d.annual_target ? Math.round((cumulative / d.annual_target) * 1000) / 10 : null;
    return { ...d, monthly, cumulative, pct };
  });

  const units = req.user.role === 'DEPT_HEAD' ? (await db.query('SELECT * FROM units ORDER BY name')).rows : null;

  res.render('kpi/list', { title: 'KPI & Deliverable Tracker', deliverables: withCumulative, year, MONTHS, units, isDeptHead: req.user.role === 'DEPT_HEAD' });
});

router.get('/new', async (req, res) => {
  const units = req.user.role === 'DEPT_HEAD' ? (await db.query('SELECT * FROM units ORDER BY name')).rows : null;
  res.render('kpi/form', { title: 'New KPI Deliverable', units, defaultYear: new Date().getFullYear() });
});

router.post('/', async (req, res) => {
  const b = req.body;
  const unitId = req.user.role === 'DEPT_HEAD' ? (b.unit_id ? Number(b.unit_id) : null) : req.user.unit_id;
  const { rows } = await db.query(
    `INSERT INTO kpi_deliverables (unit_id, label, year, annual_target, target_unit) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [unitId, b.label, Number(b.year), Number(b.annual_target), b.target_unit || null]
  );
  await logAudit(req.user.id, 'CREATE', 'kpi_deliverables', rows[0].id, null);
  req.flash('success', 'Deliverable created.');
  res.redirect(`/app/kpi?year=${b.year}`);
});

// Inline-edit the 12 monthly values for one deliverable in one page.
router.get('/:id/edit', ownedDeliverable, async (req, res) => {
  const { rows } = await db.query('SELECT u.name AS unit_name FROM units u WHERE u.id = $1', [req.record.unit_id]);
  const deliverable = { ...req.record, unit_name: rows[0] ? rows[0].unit_name : null };
  const { rows: entries } = await db.query('SELECT * FROM kpi_monthly_entries WHERE kpi_deliverable_id = $1', [req.params.id]);
  const monthly = Object.fromEntries(entries.map((e) => [e.month, e.value]));
  res.render('kpi/edit-monthly', { title: `Monthly values — ${deliverable.label}`, deliverable, monthly, MONTHS });
});

router.post('/:id/monthly', ownedDeliverable, async (req, res) => {
  const deliverable = req.record;
  const { rows: beforeEntries } = await db.query('SELECT month, value FROM kpi_monthly_entries WHERE kpi_deliverable_id = $1', [req.params.id]);
  const before = Object.fromEntries(beforeEntries.map((e) => [`m${e.month}`, e.value]));
  const after = {};
  for (let m = 1; m <= 12; m++) {
    const raw = req.body[`m${m}`];
    if (raw === undefined || raw === '') continue;
    after[`m${m}`] = Number(raw);
    await db.query(
      `INSERT INTO kpi_monthly_entries (kpi_deliverable_id, month, year, value) VALUES ($1,$2,$3,$4)
       ON CONFLICT (kpi_deliverable_id, month, year) DO UPDATE SET value = EXCLUDED.value`,
      [req.params.id, m, deliverable.year, Number(raw)]
    );
  }
  await logAudit(req.user.id, 'UPDATE', 'kpi_deliverables', deliverable.id, diffForAudit(before, after) || 'Updated monthly values');
  req.flash('success', 'Monthly values saved.');
  res.redirect(`/app/kpi?year=${deliverable.year}`);
});

router.post('/:id/delete', ownedDeliverable, async (req, res) => {
  if (req.user.role === 'INTERN') return res.status(403).render('error', { title: 'Not allowed', message: 'Interns cannot delete records.' });
  const deliverable = req.record;
  await db.query('DELETE FROM kpi_monthly_entries WHERE kpi_deliverable_id = $1', [req.params.id]);
  await db.query('DELETE FROM kpi_deliverables WHERE id = $1', [req.params.id]);
  await logAudit(req.user.id, 'DELETE', 'kpi_deliverables', Number(req.params.id), null);
  req.flash('success', 'Deliverable deleted.');
  res.redirect(`/app/kpi?year=${deliverable.year}`);
});

module.exports = router;
