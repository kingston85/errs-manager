const express = require('express');
const router = express.Router();
const db = require('../lib/db');

router.get('/', async (req, res) => {
  const isDeptHead = req.user.role === 'DEPT_HEAD';
  const unitFilter = isDeptHead ? null : req.user.unit_id;

  const units = (await db.query('SELECT * FROM units ORDER BY name')).rows;

  // Case documents: open (not yet ISSUED/EXPIRED/REJECTED) vs issued this year, per unit.
  const caseStatsQ = unitFilter
    ? db.query(
        `SELECT unit_id,
                COUNT(*) FILTER (WHERE status NOT IN ('ISSUED','EXPIRED','REJECTED')) AS open_count,
                COUNT(*) FILTER (WHERE status = 'ISSUED' AND date_issued >= date_trunc('year', now())) AS issued_this_year
         FROM case_documents WHERE unit_id = $1 GROUP BY unit_id`,
        [unitFilter]
      )
    : db.query(
        `SELECT unit_id,
                COUNT(*) FILTER (WHERE status NOT IN ('ISSUED','EXPIRED','REJECTED')) AS open_count,
                COUNT(*) FILTER (WHERE status = 'ISSUED' AND date_issued >= date_trunc('year', now())) AS issued_this_year
         FROM case_documents GROUP BY unit_id`
      );

  const complaintsOpenQ = unitFilter
    ? db.query(`SELECT unit_id, COUNT(*) AS open_count FROM complaints WHERE status != 'CLOSED' AND unit_id = $1 GROUP BY unit_id`, [unitFilter])
    : db.query(`SELECT unit_id, COUNT(*) AS open_count FROM complaints WHERE status != 'CLOSED' GROUP BY unit_id`);

  const remindersQ = unitFilter
    ? db.query(
        `SELECT r.*, c.name AS company_name, u.name AS unit_name FROM reminders r
         LEFT JOIN companies c ON c.id = r.company_id
         LEFT JOIN units u ON u.id = r.unit_id
         WHERE r.status = 'SCHEDULED' AND r.unit_id = $1
         ORDER BY r.due_date ASC LIMIT 8`,
        [unitFilter]
      )
    : db.query(
        `SELECT r.*, c.name AS company_name, u.name AS unit_name FROM reminders r
         LEFT JOIN companies c ON c.id = r.company_id
         LEFT JOIN units u ON u.id = r.unit_id
         WHERE r.status = 'SCHEDULED'
         ORDER BY r.due_date ASC LIMIT 8`
      );

  const assetsNeedingAttentionQ = unitFilter
    ? db.query(`SELECT * FROM assets WHERE status != 'OPERATIONAL' AND (unit_id = $1 OR unit_id IS NULL) ORDER BY calibration_due_date ASC NULLS LAST LIMIT 8`, [unitFilter])
    : db.query(`SELECT a.*, u.name AS unit_name FROM assets a LEFT JOIN units u ON u.id = a.unit_id WHERE status != 'OPERATIONAL' ORDER BY calibration_due_date ASC NULLS LAST LIMIT 8`);

  const year = new Date().getFullYear();
  const kpiQ = unitFilter
    ? db.query(
        `SELECT k.id, k.label, k.annual_target, k.target_unit, k.unit_id,
                COALESCE(SUM(m.value), 0) AS cumulative
         FROM kpi_deliverables k LEFT JOIN kpi_monthly_entries m ON m.kpi_deliverable_id = k.id AND m.year = $2
         WHERE k.year = $2 AND k.unit_id = $1
         GROUP BY k.id ORDER BY k.label`,
        [unitFilter, year]
      )
    : db.query(
        `SELECT k.id, k.label, k.annual_target, k.target_unit, k.unit_id,
                COALESCE(SUM(m.value), 0) AS cumulative
         FROM kpi_deliverables k LEFT JOIN kpi_monthly_entries m ON m.kpi_deliverable_id = k.id AND m.year = $1
         WHERE k.year = $1
         GROUP BY k.id ORDER BY k.label`,
        [year]
      );

  const recentActivityQ = db.query(
    `SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 10`
  );

  const [caseStats, complaintsOpen, reminders, assetsNeedingAttention, kpis, recentActivity] = await Promise.all([
    caseStatsQ, complaintsOpenQ, remindersQ, assetsNeedingAttentionQ, kpiQ, recentActivityQ,
  ]);

  const byUnitId = (arr) => Object.fromEntries(arr.rows.map((r) => [r.unit_id, r]));
  const caseStatsMap = byUnitId(caseStats);
  const complaintsMap = byUnitId(complaintsOpen);

  res.render('dashboard', {
    title: 'Dashboard',
    isDeptHead, units, caseStatsMap, complaintsMap,
    reminders: reminders.rows,
    assetsNeedingAttention: assetsNeedingAttention.rows,
    kpis: kpis.rows,
    recentActivity: recentActivity.rows,
    year,
  });
});

module.exports = router;
