require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const path = require('path');

const db = require('./lib/db');
const { attachUser, requireAuth, requireRole, requirePasswordSet } = require('./lib/auth');
const { csrfSynchronisedProtection, invalidCsrfTokenError } = require('./lib/csrf');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const dashboardRoutes = require('./routes/dashboard');
const genericRoutes = require('./routes/generic');
const documentsRoutes = require('./routes/documents');
const kpiRoutes = require('./routes/kpi');
const usersRoutes = require('./routes/users');
const auditlogRoutes = require('./routes/auditlog');
const importRoutes = require('./routes/import');
const toolsRoutes = require('./routes/tools');
const internalRoutes = require('./routes/internal');

// A production deploy with no real SESSION_SECRET set silently falls back
// to signing every session with a hardcoded string baked into the source —
// meaning anyone who's ever read this repo could forge a session cookie.
// Fail loudly at boot instead of quietly running insecurely.
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET is not set. Refusing to start in production without it.');
  process.exit(1);
}

const app = express();

// Render (and most PaaS hosts) terminate HTTPS at their edge and forward
// plain HTTP to the app, so Express sees every request as insecure unless
// told to trust the proxy's X-Forwarded-Proto header. Without this, the
// session cookie below (cookie.secure=true in production) is silently
// never set by express-session, and login appears to just not work — you
// get redirected to the dashboard but immediately bounce back to /login
// because no session cookie stuck.
app.set('trust proxy', 1);

// Baseline security headers (CSP, X-Frame-Options, X-Content-Type-Options,
// etc.). The CSP is intentionally tight — this app ships zero third-party
// scripts/styles and no inline event handlers, so default-src 'self' plus
// the couple of exceptions below is enough to run cleanly while meaningfully
// limiting what a stored-XSS payload (see the escaped-output fix in
// views/generic/list.ejs) could still do if one ever slipped through again.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // A handful of views legitimately use onsubmit="return confirm(...)"
        // for delete/issue confirmations rather than pulling in a JS file
        // for one line — 'unsafe-inline' on scriptSrc is the trade-off for
        // that, scoped to script only (style/img/etc. stay locked to 'self').
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  })
);

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
      httpOnly: true,
      // 'lax' still lets a normal top-level link into the app carry the
      // session (so signing in from an emailed link works), but blocks the
      // cookie being sent on a cross-site POST — the scenario CSRF exploits.
      // It's a second, independent layer under the CSRF tokens below, not a
      // replacement for them.
      sameSite: 'lax',
    },
  })
);

app.use(attachUser(db));
app.use((req, res, next) => { res.locals.currentPath = req.path; next(); });

// CSRF protection (Synchronizer Token Pattern — see src/lib/csrf.js) is
// mounted globally, after sessions, before any route. GET/HEAD/OPTIONS are
// exempt by default; every POST form in views/ carries a hidden `_csrf`
// field populated from res.locals.csrfToken below.
app.use(csrfSynchronisedProtection);
app.use((req, res, next) => { res.locals.csrfToken = req.csrfToken(); next(); });

// Auth routes are unauthenticated by definition.
app.use('/', authRoutes);

// A shared-secret endpoint for an external scheduler to poke (see
// src/routes/internal.js / the reminder-digest scaffold) — deliberately
// mounted before requireAuth since it authenticates itself differently.
app.use('/internal', internalRoutes);

// Everything below requires a signed-in user.
app.use(requireAuth);

// Reachable as soon as a user is signed in, even one flagged
// must_change_password — otherwise they'd have nowhere to go.
app.use('/account', accountRoutes);
app.use(requirePasswordSet);

app.get('/', dashboardRoutes);
app.use('/app/documents', documentsRoutes);
app.use('/app/kpi', kpiRoutes);
app.use('/app/users', requireRole('DEPT_HEAD'), usersRoutes);
app.use('/app/audit-log', requireRole('DEPT_HEAD'), auditlogRoutes);
app.use('/app/tools', toolsRoutes);
app.use('/app', importRoutes);
app.use('/app', genericRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Not found', message: 'That page does not exist.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err === invalidCsrfTokenError || err.code === 'EBADCSRFTOKEN') {
    console.warn('Rejected request with invalid/missing CSRF token:', req.method, req.originalUrl);
    return res.status(403).render('error', {
      title: 'Form expired',
      message: 'This page was open a while, or was submitted from somewhere unexpected. Please go back, refresh, and try again.',
    });
  }

  // Common, expected Postgres constraint violations get a plain-language
  // message instead of the raw driver error — e.g. deleting a company that
  // still has licensing cases against it, previously surfaced as a bare
  // "unexpected error occurred" with no clue what actually went wrong.
  const PG_FRIENDLY = {
    23503: 'This can\'t be deleted because other records still reference it. Remove or reassign those first.',
    23505: 'That value is already in use — please use a different one.',
    23502: 'A required field was left blank.',
    23514: 'One of the values entered doesn\'t meet the field\'s requirements.',
  };
  if (err && PG_FRIENDLY[err.code]) {
    console.error(err);
    return res.status(400).render('error', { title: 'Could not save', message: PG_FRIENDLY[err.code] });
  }

  console.error(err);
  res.status(500).render('error', { title: 'Something went wrong', message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`ERRS app listening on http://localhost:${PORT}`));
}

module.exports = app;
