// Duplicate-candidate finder for companies and chemicals — the exact
// problem this session's own quarterly-report data entry spent the most
// manual effort catching by hand (the source data had the same company or
// chemical spelled several different ways). Surfaces likely duplicates for
// a person to review; it does not auto-merge — reassigning every table
// that references a company/chemical id safely is a bigger, riskier
// operation than a similarity search should trigger on its own. Mounted at
// /app/tools.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');

const THRESHOLD = 0.35; // trigram similarity, 0..1 — tuned to surface near-misses ("AKSHOT" vs "ASKSHOT") without drowning in unrelated short names

async function findCandidates(table) {
  const { rows } = await db.query(
    `SELECT a.id AS id_a, a.name AS name_a, b.id AS id_b, b.name AS name_b,
            similarity(a.name, b.name) AS score
     FROM ${table} a JOIN ${table} b ON a.id < b.id
     WHERE similarity(a.name, b.name) > $1
     ORDER BY score DESC
     LIMIT 50`,
    [THRESHOLD]
  );
  return rows;
}

router.get('/duplicates', async (req, res) => {
  const [companies, chemicals] = await Promise.all([
    findCandidates('companies'),
    findCandidates('chemicals'),
  ]);
  res.render('tools/duplicates', { title: 'Possible Duplicate Names', companies, chemicals, threshold: THRESHOLD });
});

module.exports = router;
