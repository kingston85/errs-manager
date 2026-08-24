// SQL helpers shared by every place attachments are mounted (generic
// entities via src/routes/generic.js, case documents via
// src/routes/documents.js). Kept separate from the route files so both
// share one implementation rather than copying the same four queries.
const db = require('./db');

// Listing never selects `content` — that's the whole file's bytes, fine to
// fetch one-at-a-time on download but wasteful (and slow) to pull back for
// every row just to render a file list.
async function listAttachments(table, id) {
  const { rows } = await db.query(
    `SELECT a.id, a.filename, a.mime_type, a.size_bytes, a.created_at, u.name AS uploaded_by_name
     FROM attachments a LEFT JOIN users u ON u.id = a.uploaded_by_id
     WHERE a.entity_table = $1 AND a.entity_id = $2
     ORDER BY a.created_at DESC`,
    [table, id]
  );
  return rows;
}

async function getAttachment(attachmentId) {
  const { rows } = await db.query(`SELECT * FROM attachments WHERE id = $1`, [attachmentId]);
  return rows[0] || null;
}

async function saveAttachment({ table, id, filename, mimeType, buffer, uploadedById }) {
  const { rows } = await db.query(
    `INSERT INTO attachments (entity_table, entity_id, filename, mime_type, size_bytes, content, uploaded_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [table, id, filename, mimeType, buffer.length, buffer, uploadedById || null]
  );
  return rows[0].id;
}

async function deleteAttachment(attachmentId) {
  await db.query(`DELETE FROM attachments WHERE id = $1`, [attachmentId]);
}

module.exports = { listAttachments, getAttachment, saveAttachment, deleteAttachment };
