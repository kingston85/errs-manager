const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// Turns a series of counts into an SVG path pair (fill area + line) for a
// tiny inline sparkline, scaled to a fixed viewBox. Baseline sits at 0 (not
// the series' own min) so a flat run of zeros reads as "nothing happened",
// not as a misleadingly dramatic line.
function buildSparkline(values, width = 100, height = 28, pad = 3) {
  const n = values.length;
  if (n < 2) return null;
  const max = Math.max(...values, 1);
  const stepX = (width - pad * 2) / (n - 1);
  const scaleY = (v) => height - pad - (v / max) * (height - pad * 2);
  const points = values.map((v, i) => [pad + i * stepX, scaleY(v)]);
  const fmt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + fmt(p)).join(' ');
  const last = points[n - 1];
  const fillPath = `${linePath} L${points[n - 1][0].toFixed(1)} ${(height - pad).toFixed(1)} L${points[0][0].toFixed(1)} ${(height - pad).toFixed(1)} Z`;
  return { linePath, fillPath, lastX: last[0].toFixed(1), lastY: last[1].toFixed(1) };
}

router.get('/', async (req, res) => {
  const isDeptHead = req.user.role === 'DEPT_HEAD';
  const unitFilter = isDeptHead ? null : req.user.unit_id;

  const units = (await db.query('SELECT * FROM units ORDER BY name')).rows;

  // Case documents: open (not yet ISSUED/EXPIRED/REJECTED) vs issued this year, per unit.
  const caseStatsQ = unitFilter
    ? db.query(
        `SELECT unit_id,
                COUNT(*) FILTER (WHERE status NOT IN ('ISSUED','EXPIRED','REJECTED')) AS open_count,
                COUNT(*) FILTER (WHERE status = 'ISSUED' AND date_issued >= date_trunc('year', now())) AS issued_this_year,
                COUNT(*) FILTER (WHERE status = 'ISSUED' AND date_issued >= date_trunc('month', now())) AS issued_this_month
         FROM case_documents WHERE unit_id = $1 GROUP BY unit_id`,
        [unitFilter]
      )
    : db.query(
        `SELECT unit_id,
                COUNT(*) FILTER (WHERE status NOT IN ('ISSUED','EXPIRED','REJECTED')) AS open_count,
                COUNT(*) FILTER (WHERE status = 'ISSUED' AND date_issued >= date_trunc('year', now())) AS issued_this_year,
                COUNT(*) FILTER (WHERE status = 'ISSUED' AND date_issued >= date_trunc('month', now())) AS issued_this_month
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

  // Last 6 months of issued-case counts per unit, for the dashboard tile
  // sparklines — real trend data, not decoration.
  const trendMonthsQ = unitFilter
    ? db.query(
        `SELECT unit_id, date_trunc('month', date_issued) AS month, COUNT(*) AS cnt
         FROM case_documents
         WHERE status = 'ISSUED' AND unit_id = $1 AND date_issued >= date_trunc('month', now()) - interval '5 months'
         GROUP BY unit_id, month`,
        [unitFilter]
      )
    : db.query(
        `SELECT unit_id, date_trunc('month', date_issued) AS month, COUNT(*) AS cnt
         FROM case_documents
         WHERE status = 'ISSUED' AND date_issued >= date_trunc('month', now()) - interval '5 months'
         GROUP BY unit_id, month`
      );

  const [caseStats, complaintsOpen, reminders, assetsNeedingAttention, kpis, recentActivity, trendMonths] = await Promise.all([
    caseStatsQ, complaintsOpenQ, remindersQ, assetsNeedingAttentionQ, kpiQ, recentActivityQ, trendMonthsQ,
  ]);

  const byUnitId = (arr) => Object.fromEntries(arr.rows.map((r) => [r.unit_id, r]));
  const caseStatsMap = byUnitId(caseStats);
  const complaintsMap = byUnitId(complaintsOpen);

  const now = new Date();
  const monthKeys = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const trendByUnit = {};
  trendMonths.rows.forEach((r) => {
    const d = new Date(r.month);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!trendByUnit[r.unit_id]) trendByUnit[r.unit_id] = {};
    trendByUnit[r.unit_id][key] = Number(r.cnt);
  });
  const sparklines = {};
  units.forEach((u) => {
    const series = monthKeys.map((k) => (trendByUnit[u.id] && trendByUnit[u.id][k]) || 0);
    sparklines[u.id] = buildSparkline(series);
  });

  res.render('dashboard', {
    title: 'Dashboard',
    isDeptHead, units, caseStatsMap, complaintsMap,
    reminders: reminders.rows,
    assetsNeedingAttention: assetsNeedingAttention.rows,
    kpis: kpis.rows,
    recentActivity: recentActivity.rows,
    sparklines,
    year,
  });
});

module.exports = router;
