const db = require('./db');

async function logAudit(userId, action, entityType, entityId, details) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, action, entityType, entityId || null, details || null]
    );
  } catch (e) {
    // Auditing should never break the actual operation it's logging.
    console.error('Audit log write failed:', e.message);
  }
}

// Builds a compact "field: before -> after" summary for an UPDATE, so the
// audit log records *what* changed, not just that something did. Only
// fields present in `after` are compared (so callers can pass exactly the
// set of columns their form actually submits); unchanged fields, and
// fields where both sides are null/undefined/empty-string, are skipped.
// Returns null (log nothing extra) when nothing actually differs.
function diffForAudit(before, after) {
  if (!before) return null;
  const changes = [];
  for (const key of Object.keys(after)) {
    const beforeVal = before[key];
    const afterVal = after[key];
    const normalize = (v) => (v === undefined || v === null || v === '' ? null : v);
    const b = normalize(beforeVal);
    const a = normalize(afterVal);
    // Dates come back from pg as Date objects but go in as 'YYYY-MM-DD'
    // strings — compare their string form so an unchanged date doesn't
    // show up as a false-positive diff.
    const bStr = b instanceof Date ? b.toISOString().slice(0, 10) : b;
    const aStr = a instanceof Date ? a.toISOString().slice(0, 10) : a;
    if (String(bStr) !== String(aStr)) {
      changes.push(`${key}: ${JSON.stringify(bStr)} -> ${JSON.stringify(aStr)}`);
    }
  }
  return changes.length ? changes.join('; ') : null;
}

module.exports = { logAudit, diffForAudit };
