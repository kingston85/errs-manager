// Global search — one box in the topbar (views/layout.ejs), reachable from
// every authenticated page, that finds a record by name/number across every
// entity in the app instead of making staff guess which of the dozen list
// pages a company, chemical, or case actually lives on. Mounted at
// /app/search, before src/routes/generic.js's /app/:entityKey catch-all.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { ENTITIES } = require('../lib/entities');
const { canAccessEntity, buildWhere } = require('../lib/entityAccess');

const RESULTS_PER_GROUP = 6;

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  const groups = [];

  if (q.length >= 2) {
    const like = `%${q}%`;

    const companies = (await db.query(
      `SELECT id, name, county FROM companies WHERE name ILIKE $1 OR county ILIKE $1 OR contact_name ILIKE $1 ORDER BY name LIMIT $2`,
      [like, RESULTS_PER_GROUP]
    )).rows;
    if (companies.length) {
      groups.push({
        key: 'companies', label: 'Companies', icon: '🏢',
        items: companies.map((c) => ({ title: c.name, sub: c.county || '', href: `/app/companies/${c.id}/edit` })),
      });
    }

    const chemicals = (await db.query(
      `SELECT id, name FROM chemicals WHERE name ILIKE $1 ORDER BY name LIMIT $2`,
      [like, RESULTS_PER_GROUP]
    )).rows;
    if (chemicals.length) {
      groups.push({
        key: 'chemicals', label: 'Chemicals & Substances', icon: '🧪',
        items: chemicals.map((c) => ({ title: c.name, sub: '', href: `/app/chemicals/${c.id}/edit` })),
      });
    }

    // Cases/documents — by document number, company name, or reference
    // code — scoped to the searcher's own unit unless they're Dept Head,
    // same rule the documents list itself uses.
    const caseParams = [like];
    let caseUnitClause = '';
    if (req.user.role !== 'DEPT_HEAD') {
      caseParams.push(req.user.unit_id);
      caseUnitClause = ' AND cd.unit_id = $2';
    }
    const cases = (await db.query(
      `SELECT cd.id, cd.document_number, c.name AS company_name, dt.label AS type_label
       FROM case_documents cd JOIN companies c ON c.id = cd.company_id JOIN document_types dt ON dt.id = cd.document_type_id
       WHERE (cd.document_number ILIKE $1 OR c.name ILIKE $1 OR cd.reference_code ILIKE $1)${caseUnitClause}
       ORDER BY cd.created_at DESC LIMIT ${RESULTS_PER_GROUP}`,
      caseParams
    )).rows;
    if (cases.length) {
      groups.push({
        key: 'documents', label: 'Licenses, Clearances, Certificates & Bills', icon: '📄',
        items: cases.map((c) => ({
          title: c.document_number || `${c.type_label} — ${c.company_name}`,
          sub: c.document_number ? c.company_name : 'Not yet issued',
          href: `/app/documents/${c.id}/edit`,
        })),
      });
    }

    // Every other flat-table entity (chemical escorts, site inspections,
    // reminders, assets, ...) — reuses the exact same unit-scoping and
    // text-search logic the entity's own list page uses (src/lib/
    // entityAccess.js), so search can never surface a row that page
    // wouldn't also show this user. companies/chemicals are also in
    // ENTITIES (generic.js serves /app/companies and /app/chemicals from
    // there) but already got their own richer block above — skip them
    // here so they don't show up twice.
    const searchReq = { user: req.user, query: { q } };
    for (const [key, entity] of Object.entries(ENTITIES)) {
      if (key === 'companies' || key === 'chemicals') continue;
      if (!canAccessEntity(req.user, entity)) continue;
      const searchable = entity.fields.filter((f) => f.type === 'text' || f.type === 'textarea');
      if (!searchable.length) continue;
      const titleField = entity.fields.find((f) => f.listShow && f.type === 'text') || entity.fields[0];
      const { where, params } = await buildWhere(entity, searchReq);
      const { rows } = await db.query(
        `SELECT id, ${titleField.name} FROM ${entity.table} ${where} ORDER BY ${entity.orderBy || 'id DESC'} LIMIT ${RESULTS_PER_GROUP}`,
        params
      );
      if (rows.length) {
        groups.push({
          key, label: entity.label, icon: entity.icon,
          items: rows.map((r) => ({ title: String(r[titleField.name] || `#${r.id}`), sub: '', href: `/app/${key}/${r.id}/edit` })),
        });
      }
    }
  }

  res.render('search', { title: 'Search', q, groups });
});

module.exports = router;
