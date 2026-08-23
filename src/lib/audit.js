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

module.exports = { logAudit };
