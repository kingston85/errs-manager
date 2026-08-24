// A department-wide (or, for a Unit Head, their own unit's) monthly summary
// report — the "exportable report" half of the dashboard improvements. The
// live dashboard (src/routes/dashboard.js) shows current snapshots; this
// answers "what happened in a given month" and can be handed to someone
// outside the app as a CSV. Mounted at /app/reports.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { sendCsv } = require('../lib/csv');

function periodFromQuery(req) {
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = parseInt(req.query.month, 10) || (now.getMonth() + 1); // 1-12
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 1); // first day of the following month
  const end = endDate.toISOString().slice(0, 10);
  return { year, month, start, end };
}

async function buildReport(req) {
  const { year, month, start, end } = periodFromQuery(req);
  const isDeptHead = req.user.role === 'DEPT_HEAD';
  const unitFilter = isDeptHead ? null : req.user.unit_id;

  const unitCond = unitFilter ? 'AND unit_id = $3' : '';
  const params = [start, end, ...(unitFilter ? [unitFilter] : [])];

  const casesQ = db.query(
    `SELECT un.id AS unit_id, un.name AS unit_name,
            COUNT(*) FILTER (WHERE cd.application_date >= $1 AND cd.application_date < $2) AS opened,
            COUNT(*) FILTER (WHERE cd.status = 'ISSUED' AND cd.date_issued >= $1 AND cd.date_issued < $2) AS issued
     FROM units un LEFT JOIN case_documents cd ON cd.unit_id = un.id
     WHERE 1=1 ${unitFilter ? 'AND un.id = $3' : ''}
     GROUP BY un.id, un.name ORDER BY un.name`,
    params
  );

  const complaintsQ = db.query(
    `SELECT unit_id,
            COUNT(*) FILTER (WHERE date_received >= $1 AND date_received < $2) AS received,
            COUNT(*) FILTER (WHERE closed_at >= $1 AND closed_at < $2) AS closed
     FROM complaints WHERE 1=1 ${unitCond} GROUP BY unit_id`,
    params
  );

  const remindersQ = db.query(
    `SELECT unit_id,
            COUNT(*) FILTER (WHERE due_date >= $1 AND due_date < $2) AS due,
            COUNT(*) FILTER (WHERE due_date >= $1 AND due_date < $2 AND status = 'SCHEDULED') AS still_scheduled
     FROM reminders WHERE 1=1 ${unitCond} GROUP BY unit_id`,
    params
  );

  const kpiParams = unitFilter ? [year, month, unitFilter] : [year, month];
  const kpiQ = db.query(
    `SELECT k.id, k.label, k.unit_id, un.name AS unit_name, k.annual_target, k.target_unit,
            COALESCE(SUM(m.value) FILTER (WHERE m.month <= $2), 0) AS cumulative
     FROM kpi_deliverables k
     LEFT JOIN kpi_monthly_entries m ON m.kpi_deliverable_id = k.id AND m.year = $1
     LEFT JOIN units un ON un.id = k.unit_id
     WHERE k.year = $1 ${unitFilter ? 'AND (k.unit_id = $3 OR k.unit_id IS NULL)' : ''}
     GROUP BY k.id, k.label, k.unit_id, un.name, k.annual_target, k.target_unit
     ORDER BY un.name NULLS FIRST, k.label`,
    kpiParams
  );

  const [cases, complaints, reminders, kpis] = await Promise.all([casesQ, complaintsQ, remindersQ, kpiQ]);
  const byUnit = (arr) => Object.fromEntries(arr.rows.map((r) => [r.unit_id, r]));
  const complaintsMap = byUnit(complaints);
  const remindersMap = byUnit(reminders);

  const units = cases.rows.map((u) => ({
    unit_id: u.unit_id,
    unit_name: u.unit_name,
    cases_opened: Number(u.opened),
    cases_issued: Number(u.issued),
    complaints_received: Number((complaintsMap[u.unit_id] || {}).received || 0),
    complaints_closed: Number((complaintsMap[u.unit_id] || {}).closed || 0),
    reminders_due: Number((remindersMap[u.unit_id] || {}).due || 0),
    reminders_still_scheduled: Number((remindersMap[u.unit_id] || {}).still_scheduled || 0),
  }));

  return { year, month, units, kpis: kpis.rows, isDeptHead };
}

router.get('/', async (req, res) => {
  const report = await buildReport(req);
  res.render('reports', { title: 'Monthly Summary Report', ...report });
});

router.get('/export.csv', async (req, res) => {
  const report = await buildReport(req);
  const flat = report.units.map((u) => ({
    Unit: u.unit_name,
    'Cases Opened': u.cases_opened,
    'Cases Issued': u.cases_issued,
    'Complaints Received': u.complaints_received,
    'Complaints Closed': u.complaints_closed,
    'Reminders Due': u.reminders_due,
    'Reminders Still Scheduled': u.reminders_still_scheduled,
  }));
  sendCsv(res, `report-${report.year}-${String(report.month).padStart(2, '0')}.csv`, flat,
    ['Unit', 'Cases Opened', 'Cases Issued', 'Complaints Received', 'Complaints Closed', 'Reminders Due', 'Reminders Still Scheduled']);
});

module.exports = router;
