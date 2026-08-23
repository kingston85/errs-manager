// The unified License / Clearance / Certificate / Bill engine — one screen
// type shared by every document_type across all four units (see
// db/schema.sql's header comment for why). Mounted at /app/documents.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { allocateNumber, usageThisYear } = require('../lib/numbering');
const { logAudit } = require('../lib/audit');

function unitFilterFor(user) {
  return user.role === 'DEPT_HEAD' ? null : user.unit_id;
}

router.get('/', async (req, res) => {
  const unitId = unitFilterFor(req.user) || (req.query.unit ? Number(req.query.unit) : null);
  const statusFilter = req.query.status || null;
  const typeFilter = req.query.type ? Number(req.query.type) : null;

  const conditions = [];
  const params = [];
  if (unitId) { params.push(unitId); conditions.push(`cd.unit_id = $${params.length}`); }
  if (statusFilter) { params.push(statusFilter); conditions.push(`cd.status = $${params.length}`); }
  if (typeFilter) { params.push(typeFilter); conditions.push(`cd.document_type_id = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT cd.*, c.name AS company_name, dt.label AS type_label, dt.kind AS type_kind, un.name AS unit_name, ch.name AS chemical_name
     FROM case_documents cd
     JOIN companies c ON c.id = cd.company_id
     JOIN document_types dt ON dt.id = cd.document_type_id
     JOIN units un ON un.id = cd.unit_id
     LEFT JOIN chemicals ch ON ch.id = cd.chemical_id
     ${where}
     ORDER BY cd.created_at DESC LIMIT 300`,
    params
  );

  const units = (await db.query('SELECT * FROM units ORDER BY name')).rows;
  const types = (await db.query('SELECT * FROM document_types ORDER BY label')).rows;

  res.render('documents/list', {
    title: 'Licenses, Clearances, Certificates & Bills',
    rows, units, types, unitFilter: unitId, statusFilter, typeFilter,
    isDeptHead: req.user.role === 'DEPT_HEAD',
  });
});

router.get('/new', async (req, res) => {
  const unitId = unitFilterFor(req.user);
  const types = unitId
    ? (await db.query('SELECT * FROM document_types WHERE unit_id = $1 ORDER BY label', [unitId])).rows
    : (await db.query('SELECT dt.*, u.name AS unit_name FROM document_types dt JOIN units u ON u.id = dt.unit_id ORDER BY u.name, dt.label')).rows;
  const companies = (await db.query('SELECT id, name FROM companies ORDER BY name')).rows;
  const chemicals = (await db.query('SELECT id, name FROM chemicals ORDER BY name')).rows;
  const units = req.user.role === 'DEPT_HEAD' ? (await db.query('SELECT * FROM units ORDER BY name')).rows : null;
  res.render('documents/form', { title: 'New Case', record: {}, types, companies, chemicals, units, isNew: true });
});

router.post('/', async (req, res) => {
  const b = req.body;
  const unitId = unitFilterFor(req.user) || Number(b.unit_id);
  const { rows } = await db.query(
    `INSERT INTO case_documents
      (document_type_id, unit_id, company_id, chemical_id, activity, quantity, quantity_unit,
       application_date, response_date, reference_code, amount_paid, receipt_number, notes, status, created_by_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [
      Number(b.document_type_id), unitId, Number(b.company_id), b.chemical_id ? Number(b.chemical_id) : null,
      b.activity || null, b.quantity ? Number(b.quantity) : null, b.quantity_unit || null,
      b.application_date || null, b.response_date || null, b.reference_code || null,
      b.amount_paid ? Number(b.amount_paid) : null, b.receipt_number || null, b.notes || null,
      b.status || 'APPLICATION_RECEIVED', req.user.id,
    ]
  );
  await logAudit(req.user.id, 'CREATE', 'case_documents', rows[0].id, null);
  res.redirect('/app/documents');
});

router.get('/:id/edit', async (req, res) => {
  const { rows } = await db.query(
    `SELECT cd.*, dt.label AS type_label, dt.kind AS type_kind, dt.validity, dt.block_size
     FROM case_documents cd JOIN document_types dt ON dt.id = cd.document_type_id
     WHERE cd.id = $1`,
    [req.params.id]
  );
  const record = rows[0];
  if (!record) return res.status(404).render('error', { title: 'Not found', message: 'Case not found.' });
  if (req.user.role !== 'DEPT_HEAD' && record.unit_id !== req.user.unit_id) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That case belongs to a different unit.' });
  }
  const companies = (await db.query('SELECT id, name FROM companies ORDER BY name')).rows;
  const chemicals = (await db.query('SELECT id, name FROM chemicals ORDER BY name')).rows;
  const usedThisYear = await usageThisYear(record.document_type_id, new Date().getFullYear());
  res.render('documents/form', { title: `Edit — ${record.type_label}`, record, types: null, companies, chemicals, units: null, isNew: false, usedThisYear });
});

router.post('/:id', async (req, res) => {
  const b = req.body;
  const { rows: existing } = await db.query('SELECT unit_id FROM case_documents WHERE id = $1', [req.params.id]);
  if (!existing[0]) return res.status(404).render('error', { title: 'Not found', message: 'Case not found.' });
  if (req.user.role !== 'DEPT_HEAD' && existing[0].unit_id !== req.user.unit_id) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That case belongs to a different unit.' });
  }
  await db.query(
    `UPDATE case_documents SET company_id=$1, chemical_id=$2, activity=$3, quantity=$4, quantity_unit=$5,
       application_date=$6, response_date=$7, reference_code=$8, amount_paid=$9, receipt_number=$10, notes=$11,
       status=$12, updated_at=now()
     WHERE id = $13`,
    [
      Number(b.company_id), b.chemical_id ? Number(b.chemical_id) : null, b.activity || null,
      b.quantity ? Number(b.quantity) : null, b.quantity_unit || null,
      b.application_date || null, b.response_date || null, b.reference_code || null,
      b.amount_paid ? Number(b.amount_paid) : null, b.receipt_number || null, b.notes || null,
      b.status, req.params.id,
    ]
  );
  await logAudit(req.user.id, 'UPDATE', 'case_documents', Number(req.params.id), null);
  res.redirect('/app/documents');
});

// Issues the document: allocates the next sequential number for its type
// (see src/lib/numbering.js), sets status=ISSUED, date_issued=today, and
// computes expiry_date from the document type's validity rule
// (CALENDAR_YEAR => Dec 31 of the issue year, matching the Chemical
// Management Unit's actual observed convention; ONE_YEAR_FROM_ISSUE =>
// exactly 12 months out; NONE => no expiry).
router.post('/:id/issue', async (req, res) => {
  const { rows } = await db.query(
    `SELECT cd.*, dt.validity FROM case_documents cd JOIN document_types dt ON dt.id = cd.document_type_id WHERE cd.id = $1`,
    [req.params.id]
  );
  const record = rows[0];
  if (!record) return res.status(404).render('error', { title: 'Not found', message: 'Case not found.' });
  if (req.user.role !== 'DEPT_HEAD' && record.unit_id !== req.user.unit_id) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That case belongs to a different unit.' });
  }
  if (record.document_number) {
    return res.status(400).render('error', { title: 'Already issued', message: 'This case already has a document number.' });
  }

  const today = new Date();
  const year = today.getFullYear();
  const { number } = await allocateNumber(record.document_type_id, year);

  let expiry = null;
  if (record.validity === 'CALENDAR_YEAR') expiry = `${year}-12-31`;
  else if (record.validity === 'ONE_YEAR_FROM_ISSUE') {
    const d = new Date(today); d.setFullYear(d.getFullYear() + 1);
    expiry = d.toISOString().slice(0, 10);
  }

  await db.query(
    `UPDATE case_documents SET document_number=$1, date_issued=$2, expiry_date=$3, status='ISSUED', updated_at=now() WHERE id=$4`,
    [number, today.toISOString().slice(0, 10), expiry, req.params.id]
  );
  await logAudit(req.user.id, 'ISSUE', 'case_documents', Number(req.params.id), `Issued ${number}`);
  res.redirect('/app/documents');
});

router.post('/:id/delete', async (req, res) => {
  if (req.user.role === 'INTERN') return res.status(403).render('error', { title: 'Not allowed', message: 'Interns cannot delete records.' });
  const { rows: existing } = await db.query('SELECT unit_id FROM case_documents WHERE id = $1', [req.params.id]);
  if (!existing[0]) return res.status(404).render('error', { title: 'Not found', message: 'Case not found.' });
  if (req.user.role !== 'DEPT_HEAD' && existing[0].unit_id !== req.user.unit_id) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That case belongs to a different unit.' });
  }
  await db.query('DELETE FROM case_documents WHERE id = $1', [req.params.id]);
  await logAudit(req.user.id, 'DELETE', 'case_documents', Number(req.params.id), null);
  res.redirect('/app/documents');
});

module.exports = router;
