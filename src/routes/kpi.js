// Generic KPI/deliverable tracker shared across all four units plus a
// cross-unit/department-wide bucket (unit_id null) — see db/schema.sql.
// Mounted at /app/kpi.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { logAudit } = require('../lib/audit');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  res.redirect(`/app/kpi?year=${b.year}`);
});

// Inline-edit the 12 monthly values for one deliverable in one page.
router.get('/:id/edit', async (req, res) => {
  const { rows } = await db.query('SELECT k.*, u.name AS unit_name FROM kpi_deliverables k LEFT JOIN units u ON u.id = k.unit_id WHERE k.id = $1', [req.params.id]);
  const deliverable = rows[0];
  if (!deliverable) return res.status(404).render('error', { title: 'Not found', message: 'Deliverable not found.' });
  if (req.user.role !== 'DEPT_HEAD' && deliverable.unit_id && deliverable.unit_id !== req.user.unit_id) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That deliverable belongs to a different unit.' });
  }
  const { rows: entries } = await db.query('SELECT * FROM kpi_monthly_entries WHERE kpi_deliverable_id = $1', [req.params.id]);
  const monthly = Object.fromEntries(entries.map((e) => [e.month, e.value]));
  res.render('kpi/edit-monthly', { title: `Monthly values — ${deliverable.label}`, deliverable, monthly, MONTHS });
});

router.post('/:id/monthly', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM kpi_deliverables WHERE id = $1', [req.params.id]);
  const deliverable = rows[0];
  if (!deliverable) return res.status(404).render('error', { title: 'Not found', message: 'Deliverable not found.' });
  if (req.user.role !== 'DEPT_HEAD' && deliverable.unit_id && deliverable.unit_id !== req.user.unit_id) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That deliverable belongs to a different unit.' });
  }
  for (let m = 1; m <= 12; m++) {
    const raw = req.body[`m${m}`];
    if (raw === undefined || raw === '') continue;
    await db.query(
      `INSERT INTO kpi_monthly_entries (kpi_deliverable_id, month, year, value) VALUES ($1,$2,$3,$4)
       ON CONFLICT (kpi_deliverable_id, month, year) DO UPDATE SET value = EXCLUDED.value`,
      [req.params.id, m, deliverable.year, Number(raw)]
    );
  }
  await logAudit(req.user.id, 'UPDATE', 'kpi_deliverables', deliverable.id, 'Updated monthly values');
  res.redirect(`/app/kpi?year=${deliverable.year}`);
});

router.post('/:id/delete', async (req, res) => {
  if (req.user.role === 'INTERN') return res.status(403).render('error', { title: 'Not allowed', message: 'Interns cannot delete records.' });
  const { rows } = await db.query('SELECT * FROM kpi_deliverables WHERE id = $1', [req.params.id]);
  const deliverable = rows[0];
  if (!deliverable) return res.status(404).render('error', { title: 'Not found', message: 'Deliverable not found.' });
  if (req.user.role !== 'DEPT_HEAD' && deliverable.unit_id && deliverable.unit_id !== req.user.unit_id) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That deliverable belongs to a different unit.' });
  }
  await db.query('DELETE FROM kpi_monthly_entries WHERE kpi_deliverable_id = $1', [req.params.id]);
  await db.query('DELETE FROM kpi_deliverables WHERE id = $1', [req.params.id]);
  await logAudit(req.user.id, 'DELETE', 'kpi_deliverables', Number(req.params.id), null);
  res.redirect(`/app/kpi?year=${deliverable.year}`);
});

module.exports = router;
