// A minimal one-shot flash message — "Company created", "Case issued",
// "Attachment removed" — shown once as a toast (views/layout.ejs) after a
// redirect, then gone. Previously every create/update/delete/issue action
// just silently redirected back to a list with no confirmation that
// anything actually happened; this is the plumbing for that feedback.
//
// Stored in the session (one message at a time — this app has no
// concurrent-tab-conflict concerns worth a queue) rather than a signed
// cookie or query param, so it survives the redirect without polluting the
// URL or needing extra middleware.
function attachFlash() {
  return (req, res, next) => {
    req.flash = (type, message) => {
      if (req.session) req.session.flash = { type, message };
    };
    res.locals.flash = (req.session && req.session.flash) || null;
    if (req.session && req.session.flash) delete req.session.flash;
    next();
  };
}

module.exports = { attachFlash };
