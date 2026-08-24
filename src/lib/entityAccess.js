// Shared per-entity access-control and search-filter helpers, used by both
// src/routes/generic.js (the entity CRUD list/form views) and
// src/routes/search.js (the global search bar). Kept in one place so
// unit-scoping rules can't drift between "browse this list" and "find this
// record from search" — a bug there would mean search either hides records
// a user should see, or worse, leaks a record from another unit.
const db = require('./db');

// A fixed-unit entity (e.g. chemical_escorts is always CHEMICAL) may only
// be touched by that unit's own staff, or the Department Head who can see
// everything. A flexible-unit entity (reminders, assets, activity_logs)
// is scoped to the viewer's own unit unless they're Department Head.
function canAccessEntity(user, entity) {
  if (user.role === 'DEPT_HEAD') return true;
  if (!entity.unitScoped) return true; // shared master data (companies, chemicals) — everyone can view/manage
  if (entity.unit) return user.unit_key === entity.unit;
  return true; // flexible-unit entity — access ok, scoping happens per-row below
}

async function unitIdForKey(key) {
  const { rows } = await db.query('SELECT id FROM units WHERE key = $1', [key]);
  return rows[0] ? rows[0].id : null;
}

// Builds the WHERE clause shared by the list page, the CSV export, and
// global search: unit scoping (see entity.unitScoped/entity.unit) plus a
// free-text search across the entity's own text/textarea fields. Search
// intentionally doesn't reach into fk-linked tables (e.g. searching a
// company name from the chemical_escorts list) — that's a reasonable v2,
// not a correctness issue today.
async function buildWhere(entity, req) {
  const params = [];
  const conditions = [];

  if (entity.unitScoped) {
    if (entity.unit) {
      const uid = await unitIdForKey(entity.unit);
      params.push(uid);
      conditions.push(`unit_id = $${params.length}`);
    } else if (req.user.role !== 'DEPT_HEAD') {
      params.push(req.user.unit_id);
      conditions.push(`unit_id = $${params.length}`);
    } else if (req.query.unit) {
      const uid = await unitIdForKey(req.query.unit);
      if (uid) { params.push(uid); conditions.push(`unit_id = $${params.length}`); }
    }
  }

  const q = (req.query.q || '').trim();
  if (q) {
    const searchable = entity.fields.filter((f) => f.type === 'text' || f.type === 'textarea');
    if (searchable.length) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(`(${searchable.map((f) => `${f.name} ILIKE $${idx}`).join(' OR ')})`);
    }
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

// Parses a comma-separated ids query param (as sent by the bulk-select
// "Export selected" link — see public/js/app.js's initBulkActions) into a
// clean array of integers, silently dropping anything that isn't one.
function parseIdsParam(raw) {
  if (!raw) return [];
  return String(raw).split(',').map(Number).filter((n) => Number.isInteger(n));
}

// Layers an `id = ANY(...)` condition on top of an existing where/params
// pair from buildWhere() — used by CSV exports to support "export just the
// rows I selected" without duplicating the unit-scoping/search logic above.
// `column` defaults to the bare 'id', but a joined query (documents.js's
// export, which joins several tables that each have their own id column)
// needs it qualified (e.g. 'cd.id') or Postgres rejects it as ambiguous.
function withIdsFilter(where, params, ids, column = 'id') {
  if (!ids.length) return { where, params };
  const next = [...params, ids];
  const clause = `${column} = ANY($${next.length}::int[])`;
  return { where: where ? `${where} AND ${clause}` : `WHERE ${clause}`, params: next };
}

module.exports = { canAccessEntity, unitIdForKey, buildWhere, parseIdsParam, withIdsFilter };
