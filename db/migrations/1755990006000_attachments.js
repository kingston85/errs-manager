// Generic file attachments — lets staff attach a scanned application, a
// site photo, a lab report PDF, etc. to almost any record (a company, a
// case document, an inspection...) instead of tracking those files outside
// the app entirely.
//
// Files are stored as BYTEA directly in Postgres rather than on local disk.
// This is deliberate, not a shortcut: Render's free web service plan has no
// persistent disk — anything written to the local filesystem is wiped on
// every restart/redeploy, which happens often on the free tier (spin-down
// after 15 min idle). Neon's free tier (0.5 GB) has plenty of headroom for
// the modest volume of scanned documents/photos this department generates,
// and it means attachments survive deploys/restarts with zero extra
// infrastructure (no S3 bucket, no credentials to manage).
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE attachments (
      id             SERIAL PRIMARY KEY,
      entity_table   TEXT NOT NULL,
      entity_id      INTEGER NOT NULL,
      filename       TEXT NOT NULL,
      mime_type      TEXT NOT NULL,
      size_bytes     INTEGER NOT NULL,
      content        BYTEA NOT NULL,
      uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX idx_attachments_entity ON attachments(entity_table, entity_id);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS attachments;`);
};
