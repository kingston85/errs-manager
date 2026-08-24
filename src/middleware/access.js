// Centralized per-row ownership check. Previously this same "does this
// record belong to a unit the current user is allowed to touch" logic was
// hand-copied into generic.js (edit + update), documents.js (edit, update,
// issue, delete) and kpi.js (edit, monthly update, delete) — each slightly
// differently, and once (generic.js's delete route) it was simply forgotten,
// letting Staff/Unit Head accounts delete another unit's reminders/assets/
// activity logs. Every one of those routes now goes through this one
// function instead, so that class of bug can't reopen quietly.
const db = require('../lib/db');

// Loads a row from `table` by :id (or a custom idParam) into req.record.
// - 404s if the row doesn't exist.
// - 403s if the row has a non-null `unitColumn` that doesn't match the
//   signed-in user's own unit, UNLESS they're DEPT_HEAD (who can always
//   reach everything) — a null unit_id (e.g. a department-wide KPI
//   deliverable) is accessible to everyone, matching the original per-route
//   behavior this replaces.
function loadOwnedRecord(table, opts = {}) {
  const {
    idParam = 'id',
    unitColumn = 'unit_id',
    select = '*',
    notFoundMessage = 'Record not found.',
    forbiddenMessage = 'That record belongs to a different unit.',
  } = opts;

  return async (req, res, next) => {
    const { rows } = await db.query(`SELECT ${select} FROM ${table} WHERE id = $1`, [req.params[idParam]]);
    const record = rows[0];
    if (!record) {
      return res.status(404).render('error', { title: 'Not found', message: notFoundMessage });
    }
    if (
      unitColumn &&
      req.user.role !== 'DEPT_HEAD' &&
      record[unitColumn] != null &&
      record[unitColumn] !== req.user.unit_id
    ) {
      return res.status(403).render('error', { title: 'Not allowed', message: forbiddenMessage });
    }
    req.record = record;
    next();
  };
}

module.exports = { loadOwnedRecord };
