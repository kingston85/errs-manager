// Backs the forced-password-reset flow (src/routes/account.js): every new
// account and every Dept-Head-initiated reset now sets this true so the
// recipient must choose their own password before reaching anything else.
// The `up` also flips it on for every account that exists at migration
// time — in practice, on the very first run, that's the seven originally
// seeded demo accounts sharing the one password published in README.md.
exports.up = (pgm) => {
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;`);
  pgm.sql(`UPDATE users SET must_change_password = true;`);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;`);
};
