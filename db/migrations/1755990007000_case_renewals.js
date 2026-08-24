// Two additions supporting the renewal workflow (src/routes/documents.js):
// - renewed_from_id: lets a case record which earlier case it renews, so
//   the "Renew" button and its audit trail can link the two. ON DELETE SET
//   NULL rather than CASCADE — deleting the old expired case shouldn't take
//   its renewal down with it.
// - expiry_notified_at: sentinel so the daily reminder-email digest (see
//   src/routes/internal.js) sends an "expiring soon" notice about a given
//   case exactly once, instead of every day for the whole 60-day window.
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE case_documents
      ADD COLUMN renewed_from_id INTEGER REFERENCES case_documents(id) ON DELETE SET NULL,
      ADD COLUMN expiry_notified_at TIMESTAMPTZ;
  `);
  pgm.sql(`CREATE INDEX idx_case_documents_renewed_from ON case_documents(renewed_from_id);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_case_documents_renewed_from;`);
  pgm.sql(`ALTER TABLE case_documents DROP COLUMN IF EXISTS renewed_from_id, DROP COLUMN IF EXISTS expiry_notified_at;`);
};
