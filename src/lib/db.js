// Thin wrapper around a single pg Pool, shared app-wide. Using raw
// parameterized SQL rather than an ORM — see README.md "Why raw SQL, not
// an ORM" for why (Prisma's native binary engines couldn't be downloaded
// in the build sandbox; plain `pg` has zero native-binary dependency and
// is exactly as portable to Render/Neon).
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon (and most managed Postgres free tiers) require SSL; local dev
  // Postgres does not offer it at all. Only demand SSL when the connection
  // string itself asks for it (Neon's URLs include ?sslmode=require).
  ssl: /sslmode=require/.test(process.env.DATABASE_URL || '') ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

// query(text, params) -> Promise<QueryResult>. Every route/model function
// goes through this one place, so swapping pooling strategy or adding
// query logging later is a one-file change.
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
