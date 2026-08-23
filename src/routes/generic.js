// One list+form+CRUD implementation shared by every "flat table" entity in
// src/lib/entities.js. Mounted at /app/:entityKey/... See that file's header
// comment for the field-type vocabulary this reads.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { ENTITIES } = require('../lib/entities');
const { logAudit } = require('../lib/audit');

// ---- helpers ---------------------------------------------------------

function getEntity(req, res, next) {
  const entity = ENTITIES[req.params.entityKey];
  if (!entity) return res.status(404).render('error', { title: 'Not found', message: 'Unknown record type.' });
  req.entity = entity;
  req.entityKey = req.params.entityKey;
  next();
}

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

async function loadFkOptions(entity) {
  const opts = {};
  for (const f of entity.fields) {
    if (f.type === 'fk') {
      const { rows } = await db.query(`SELECT id, ${f.fkLabel} AS label FROM ${f.fkTable} ORDER BY ${f.fkLabel} ASC`);
      opts[f.name] = rows;
    }
  }
  return opts;
}

async function loadUnits() {
  const { rows } = await db.query('SELECT id, key, name FROM units ORDER BY name');
  return rows;
}

// Parses posted form values into the right JS type per field.type so the
// pg driver binds them correctly (numbers as numbers, arrays as arrays,
// blanks as SQL NULL rather than empty strings).
function coerceValue(field, raw) {
  if (raw === undefined || raw === '') return null;
  switch (field.type) {
    case 'number': return Number(raw);
    case 'taglist': return raw.split(',').map((s) => s.trim()).filter(Boolean);
    case 'fk': return Number(raw);
    default:
      if (field.type === 'enum' && (raw === 'true' || raw === 'false')) return raw === 'true';
      return raw;
  }
}

// ---- routes ------------------------------------------------------------

router.use('/:entityKey', getEntity);

router.get('/:entityKey', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });

  const params = [];
  let where = '';
  if (entity.unitScoped) {
    if (entity.unit) {
      const uid = await unitIdForKey(entity.unit);
      params.push(uid);
      where = `WHERE unit_id = $${params.length}`;
    } else if (req.user.role !== 'DEPT_HEAD') {
      params.push(req.user.unit_id);
      where = `WHERE unit_id = $${params.length}`;
    } else if (req.query.unit) {
      const uid = await unitIdForKey(req.query.unit);
      if (uid) { params.push(uid); where = `WHERE unit_id = $${params.length}`; }
    }
  }

  const selectFields = ['id', ...entity.fields.map((f) => f.name)];
  if (entity.unitScoped) selectFields.push('unit_id');
  const { rows } = await db.query(
    `SELECT ${selectFields.join(', ')} FROM ${entity.table} ${where} ORDER BY ${entity.orderBy || 'id DESC'}`,
    params
  );

  const fkOptions = await loadFkOptions(entity);
  const fkLabelMaps = {};
  for (const [name, opts] of Object.entries(fkOptions)) {
    fkLabelMaps[name] = Object.fromEntries(opts.map((o) => [o.id, o.label]));
  }
  const units = entity.unitScoped && !entity.unit && req.user.role === 'DEPT_HEAD' ? await loadUnits() : null;

  res.render('generic/list', {
    title: entity.label, entity, entityKey: req.entityKey, rows, fkLabelMaps, units,
    selectedUnit: req.query.unit || null,
  });
});

router.get('/:entityKey/new', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  const fkOptions = await loadFkOptions(entity);
  const units = entity.unitScoped && !entity.unit && req.user.role === 'DEPT_HEAD' ? await loadUnits() : null;
  res.render('generic/form', { title: `Add ${entity.labelSingular}`, entity, entityKey: req.entityKey, record: {}, fkOptions, units, isNew: true });
});

router.post('/:entityKey', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });

  const cols = [];
  const vals = [];
  for (const f of entity.fields) {
    cols.push(f.name);
    vals.push(coerceValue(f, req.body[f.name]));
  }
  if (entity.unitScoped) {
    cols.push('unit_id');
    if (entity.unit) {
      vals.push(await unitIdForKey(entity.unit));
    } else if (req.user.role === 'DEPT_HEAD' && req.body.unit_id) {
      vals.push(Number(req.body.unit_id));
    } else {
      vals.push(req.user.unit_id);
    }
  }
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const { rows } = await db.query(
    `INSERT INTO ${entity.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    vals
  );
  await logAudit(req.user.id, 'CREATE', entity.table, rows[0].id, null);
  res.redirect(`/app/${req.entityKey}`);
});

router.get('/:entityKey/:id/edit', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  const { rows } = await db.query(`SELECT * FROM ${entity.table} WHERE id = $1`, [req.params.id]);
  const record = rows[0];
  if (!record) return res.status(404).render('error', { title: 'Not found', message: 'Record not found.' });
  if (entity.unitScoped && !entity.unit && req.user.role !== 'DEPT_HEAD' && record.unit_id !== req.user.unit_id) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That record belongs to a different unit.' });
  }
  const fkOptions = await loadFkOptions(entity);
  const units = entity.unitScoped && !entity.unit && req.user.role === 'DEPT_HEAD' ? await loadUnits() : null;
  // taglist fields come back from pg as real JS arrays — the form input
  // wants a comma-joined string to edit.
  for (const f of entity.fields) if (f.type === 'taglist' && Array.isArray(record[f.name])) record[f.name] = record[f.name].join(', ');
  res.render('generic/form', { title: `Edit ${entity.labelSingular}`, entity, entityKey: req.entityKey, record, fkOptions, units, isNew: false });
});

router.post('/:entityKey/:id', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  const { rows: existingRows } = await db.query(`SELECT unit_id FROM ${entity.table} WHERE id = $1`, [req.params.id]);
  if (!existingRows[0]) return res.status(404).render('error', { title: 'Not found', message: 'Record not found.' });
  if (entity.unitScoped && !entity.unit && req.user.role !== 'DEPT_HEAD' && existingRows[0].unit_id !== req.user.unit_id) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That record belongs to a different unit.' });
  }

  const sets = [];
  const vals = [];
  for (const f of entity.fields) {
    vals.push(coerceValue(f, req.body[f.name]));
    sets.push(`${f.name} = $${vals.length}`);
  }
  if (entity.unitScoped && !entity.unit && req.user.role === 'DEPT_HEAD' && req.body.unit_id) {
    vals.push(Number(req.body.unit_id));
    sets.push(`unit_id = $${vals.length}`);
  }
  vals.push(req.params.id);
  await db.query(`UPDATE ${entity.table} SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
  await logAudit(req.user.id, 'UPDATE', entity.table, Number(req.params.id), null);
  res.redirect(`/app/${req.entityKey}`);
});

router.post('/:entityKey/:id/delete', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  if (req.user.role === 'INTERN') return res.status(403).render('error', { title: 'Not allowed', message: 'Interns cannot delete records.' });
  await db.query(`DELETE FROM ${entity.table} WHERE id = $1`, [req.params.id]);
  await logAudit(req.user.id, 'DELETE', entity.table, Number(req.params.id), null);
  res.redirect(`/app/${req.entityKey}`);
});

module.exports = router;
