require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const db = require('./lib/db');
const { attachUser, requireAuth, requireRole } = require('./lib/auth');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const genericRoutes = require('./routes/generic');
const documentsRoutes = require('./routes/documents');
const kpiRoutes = require('./routes/kpi');
const usersRoutes = require('./routes/users');
const auditlogRoutes = require('./routes/auditlog');

const app = express();

app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  session({
    store: new pgSession({ pool: db.pool, tableName: 'session' }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 12, // 12 hours
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.use(attachUser(db));
app.use((req, res, next) => { res.locals.currentPath = req.path; next(); });

// Auth routes are unauthenticated by definition.
app.use('/', authRoutes);

// Everything below requires a signed-in user.
app.use(requireAuth);

app.get('/', dashboardRoutes);
app.use('/app/documents', documentsRoutes);
app.use('/app/kpi', kpiRoutes);
app.use('/app/users', requireRole('DEPT_HEAD'), usersRoutes);
app.use('/app/audit-log', requireRole('DEPT_HEAD'), auditlogRoutes);
app.use('/app', genericRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Not found', message: 'That page does not exist.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Something went wrong', message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ERRS app listening on http://localhost:${PORT}`));
