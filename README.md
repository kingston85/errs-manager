# ERRS Manager

A web app for managing the four units of the **Environmental Research and Radiation Safety Department (ERRS)** at Liberia's Environmental Protection Agency: the Chemical Unit, the Environmental Monitoring and Research Unit, the Radiation Safety Unit, and the Waste and Remediation Unit.

This is a **working prototype** — a real web app with a real database, meant to be shown around internally and refined based on feedback before it's relied on for actual licensing decisions.

## What's in it

- **Unified licensing engine** — every License, Clearance, Certificate and Bill across all four units goes through one screen type, with sequential document numbering per document type per year (mirroring the Chemical Unit's existing paper/Excel numbering convention).
- **Controlled master data** — one canonical list of companies and one of chemicals (with known alternate spellings tracked), instead of the same name spelled four different ways across scattered records.
- **Unit-specific tools** — Chemical Escorts and Inventory Audits (Chemical Unit); Site Inspections, Complaints, Lab Results and Reporting Quality tracking (Environmental Monitoring & Research); Radiation Source Inventory and Trainings (Radiation Safety); ESIA Participation (Waste & Remediation).
- **KPI / deliverable tracker** — annual targets with month-by-month entries and automatic cumulative/percent-of-target calculations, per unit or department-wide.
- **Shared tools** — reminders, an asset/equipment registry (with calibration due-date tracking), and an activity log for meetings/trainings.
- **Role-based access** — Department Head (sees everything), Unit Head / Staff (scoped to their own unit), and time-limited Intern accounts that automatically lose access after a set end date. Ownership checks are centralized in one `loadOwnedRecord` middleware and applied uniformly to every edit/update/delete route, rather than re-implemented per route.
- **Audit log** — every create/update/delete/issue/login is recorded with who did it and when, including a field-by-field before/after diff on updates.
- **Search, pagination, CSV export/import** — every list page supports free-text search and pages through results 25 at a time instead of dumping the whole table; companies and chemicals also support bulk CSV import, and every list exports its current (filtered) view as CSV.
- **Searchable pickers** — company/chemical fields are a type-to-filter combobox instead of a giant unsearchable dropdown.
- **Printable documents** — an issued License/Clearance/Certificate/Bill has a dedicated print-friendly view (`/app/documents/:id/print`) for handing someone a physical copy.
- **Duplicate finder** — `/app/tools/duplicates` surfaces likely-duplicate company and chemical names (via Postgres trigram similarity) for manual review — it flags candidates, it never auto-merges.
- **File attachments** — a scanned application, a site photo, a lab report — attach a file to almost any record. Files are stored in Postgres itself (not the filesystem — see "Notes on the data model"), so they survive redeploys on Render's free tier.
- **Dashboard & monthly report** — the home dashboard shows live open-case counts and licenses issued this month/year per unit; *Monthly Summary Report* (`/app/reports`) is a point-in-time, exportable-as-CSV breakdown by unit and month of cases, complaints, reminders, and KPI progress.
- **In-app notifications** — a bell in the top bar shows reminders due within 7 days, scoped to your own unit (or every unit, for the Department Head).
- **Public license verification** — `/verify` (no login required) lets anyone confirm a License, Clearance, Certificate, or Bill this department issued is genuine and see its current status by document number or company name. Only ever-issued documents are searchable — a pending or rejected application is never exposed.

## Tech stack

Node.js + Express, PostgreSQL (accessed via plain SQL through the `pg` driver — no ORM), server-rendered pages with EJS, `express-session` with sessions stored in Postgres. No build step, no frontend framework — deliberately simple so it's easy for another developer to pick up and modify.

## Demo accounts

The database comes seeded with the four units, a starter set of document types, and one account per role so you can see the access differences immediately. Every account uses the same password:

| Username | Role | Unit | Password |
|---|---|---|---|
| `depthead` | Department Head | — (all units) | `Welcome@2026` |
| `chemhead` | Unit Head | Chemical Unit | `Welcome@2026` |
| `envhead` | Unit Head | Environmental Monitoring & Research | `Welcome@2026` |
| `radhead` | Unit Head | Radiation Safety | `Welcome@2026` |
| `wastehead` | Unit Head | Waste & Remediation | `Welcome@2026` |
| `chemstaff` | Staff | Chemical Unit | `Welcome@2026` |
| `chemintern` | Intern (expires in 6 months) | Chemical Unit | `Welcome@2026` |

**Change these passwords (or deactivate the extra accounts) before showing this to anyone outside the immediate team** — a Department Head account can add/edit/deactivate accounts and set new passwords from *Administration → Staff Accounts* once logged in.

No companies, licenses, complaints, or other case data is pre-loaded — the department enters real data themselves.

**Every seeded demo account is forced to set its own password on first login** — the shared `Welcome@2026` password only gets you as far as a mandatory password-change screen, which then requires 10+ characters and a mix of character types (no dictionary passwords, no reuse of the demo password itself). This is deliberate: a shared, published demo password with no forced rotation was a real weakness in the original prototype.

## Running it locally

Requirements: Node.js 18+, PostgreSQL 14+.

```bash
npm install

# Create the database and a role for the app (adjust names/password as you like)
sudo -u postgres psql -c "CREATE ROLE errs_app WITH LOGIN PASSWORD 'errs_dev_pw';"
sudo -u postgres psql -c "CREATE DATABASE errs_db OWNER errs_app;"

# Copy .env and adjust if you changed any of the above
cp .env.example .env   # if starting fresh; otherwise .env is already set up

# Apply the schema via migrations (see "Database migrations" below —
# this replaces the old "psql -f db/schema.sql" step)
npm run migrate

# Load the four units, document types, and demo accounts
npm run seed

npm start
```

Then open `http://localhost:3000` and sign in with one of the demo accounts above (you'll be asked to set a new password on first login).

To re-run the checks used to verify this build (Playwright, headless Chromium — installs its own browser the first time):

```bash
npx playwright install chromium   # one-time
npm test
```

## Database migrations

Schema changes now go through [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate) instead of hand-editing `db/schema.sql` and re-running it. Migration files live in `db/migrations/`, run in filename order, and are tracked in a `pgmigrations` table so `npm run migrate` is always safe to re-run — already-applied migrations are skipped.

- `npm run migrate` — apply any migrations that haven't run yet. This also runs automatically before the app starts (`npm start` = `npm run migrate && node src/server.js`), so a normal deploy picks up new migrations with no separate manual step.
- `npm run migrate:create -- some_description` — scaffold a new, timestamped migration file.

The first migration (`1755990001000_baseline.js`) replays `db/schema.sql` verbatim, so `db/schema.sql` is still the source of truth for a brand-new database — it's just applied through the migration runner now instead of by hand, and every change after the baseline is its own tracked migration file.

If you're pointing this at a database that already had `db/schema.sql` applied by hand (i.e. any database that existed before migrations were introduced), you need to tell `node-pg-migrate` the baseline is already done before running the rest, or it will try to recreate tables that already exist:

```bash
psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS pgmigrations (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, run_on TIMESTAMP NOT NULL);"
psql "$DATABASE_URL" -c "INSERT INTO pgmigrations (name, run_on) VALUES ('1755990001000_baseline', NOW());"
npm run migrate   # now only runs the migrations after the baseline
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push/PR to `main`: it spins up a throwaway Postgres service container, runs the migrations and seed against it, boots the app, and runs the full `test-e2e.js` Playwright suite headless. A red check on a PR means something in the app actually broke, not just a style nit.

## Deploying it for free (Render + Neon)

This pairing was chosen deliberately: Render's own free Postgres **auto-deletes your database 30 days after creation**, which is a bad surprise for a prototype people are actually entering data into. Neon's free tier has no such expiry — it's a genuinely persistent free database (0.5 GB), it just scales to zero after 5 minutes of inactivity and wakes up again in well under a second on the next query.

### 1. Create the database on Neon

1. Sign up at [neon.tech](https://neon.tech) (free, no card required) and create a new project.
2. Neon gives you a connection string that looks like `postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require`. Copy it.
3. From your own machine (or anywhere with `npm`/`node`), apply the schema and seed data against that connection string:
   ```bash
   DATABASE_URL="postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require" npm run migrate
   DATABASE_URL="postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require" npm run seed
   ```
   (A database that already had `db/schema.sql` applied by hand before migrations existed needs the one-time baseline step in "Database migrations" above first.)

### 2. Deploy the app on Render

1. Push this project to a GitHub (or GitLab) repository.
2. In the [Render dashboard](https://dashboard.render.com), click **New → Web Service** and connect that repository.
3. Configure it as:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (this now runs `npm run migrate` first automatically, so every deploy picks up new migrations with no separate manual step)
   - **Instance Type:** Free
4. Under **Environment**, add:
   - `DATABASE_URL` — the Neon connection string from step 1 (must include `?sslmode=require` — the app uses that to decide whether to use an SSL connection).
   - `SESSION_SECRET` — any long random string (e.g. generate one with `openssl rand -hex 32`). The app refuses to start without this set.
   - `NODE_ENV` — `production`
   - Optional, for the email reminder digest (see below): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `INTERNAL_TASK_TOKEN`.
5. Deploy. Render's free web services sleep after 15 minutes of no traffic and take about a minute to wake back up on the next visit — expected on the free tier, and fine for an internal prototype.

### After deploying

- Sign in as `depthead` — you'll be forced to set a real password immediately, since the seeded `Welcome@2026` password only unlocks the password-change screen.
- Go to **Administration → Staff Accounts** to add your real unit heads and staff (each new account is likewise forced to set its own password on first login) and deactivate any demo accounts you won't use.
- Start entering real companies, chemicals, and cases — the database starts empty on purpose.

### Optional: email reminders

`GET /internal/send-due-reminders` emails each Unit Head / Department Head a digest of their unit's reminders due within 7 days, then marks them sent. It's inert (returns what it *would* send, sends nothing) unless `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` are all set, and it always requires a matching `?token=<INTERNAL_TASK_TOKEN>` query parameter — without `INTERNAL_TASK_TOKEN` set, the route refuses every request.

Render's free tier has no built-in cron, so trigger it from outside: a free [cron-job.org](https://cron-job.org) schedule hitting `https://<your-app>.onrender.com/internal/send-due-reminders?token=<INTERNAL_TASK_TOKEN>` once a day works well, as would a scheduled GitHub Actions workflow using `curl`.

## Notes on the data model

- `case_documents` is one table for every License, Clearance, Certificate, and Bill across all four units — `document_types` describes each *kind* (its owning unit, its numbering format, how long it's valid for), and each row in `case_documents` is one case for one company. This replaces what used to be the same shape scattered across many separate spreadsheet tabs.
- `companies` and `chemicals` are controlled lists rather than free text, specifically because the source records had the same company and chemical names spelled multiple different ways. `chemicals.aliases` keeps track of known alternate spellings so staff can still find the right entry no matter which spelling they type. Both have a `pg_trgm` trigram index so similarity search (the duplicate finder, and general fuzziness) doesn't do a full table scan.
- Document numbers are allocated sequentially per document type per year (`number_allocators`), the same way the Chemical Unit's own numbering already worked — an annual block per license type, not generated arbitrarily.
- Nullable foreign keys that exist mainly for cross-referencing (e.g. a reminder's linked company, a record's `created_by_id`) use `ON DELETE SET NULL` — deleting the company doesn't fail with an opaque database error, the reference just clears. Required foreign keys keep Postgres's default `RESTRICT` behavior, and the app now shows a plain-language error ("That record is still referenced by other data and can't be deleted") instead of a raw constraint-violation stack trace when a delete is blocked.
- Every editable table has an `updated_at` column maintained by a database trigger, not application code — so it stays correct even for a row touched from `psql` directly, and every future feature that reads "last modified" doesn't have to remember to set it.
- `attachments` stores uploaded file content as `BYTEA` directly in Postgres rather than on the local filesystem. This is deliberate: Render's free web service plan has no persistent disk, so anything written to disk is gone on the next restart or redeploy (which happens often on the free tier — a spin-down after 15 minutes idle). Neon's free 0.5 GB tier has plenty of room for the modest volume of scanned documents/photos this department generates, and it means attachments need zero extra infrastructure (no S3 bucket, no separate credentials). If usage ever grows past what that comfortably holds, moving `attachments.content` out to object storage is a contained change — the table already models "one row per file with metadata," `src/lib/attachmentsDb.js` is the only place that reads/writes it.

## Security

Changes made specifically to close gaps found in an internal security review of the original prototype:

- **Stored XSS** — the list-page renderer used to build HTML strings from database values and print them unescaped; any text field (a company name, a note, a complaint description) could inject a `<script>` that ran for every other viewer of that list. Every data value is now printed through EJS's escaping output tag.
- **Broken access control (IDOR)** — the delete route for flexible-unit entities (reminders, assets, activity logs) was missing the same unit-ownership check the edit/update routes had, letting a Unit Head or Staff account delete another unit's records by guessing/incrementing an id in the request. All three routes now share one `loadOwnedRecord` middleware.
- **CSRF** — every state-changing form now carries a per-session token (synchronizer token pattern via `csrf-sync`); a POST without a valid token is rejected with 403.
- **Security headers** — `helmet` sets a locked-down `Content-Security-Policy` and the other standard hardening headers.
- **Brute-force login** — `express-rate-limit` throttles repeated login attempts per IP+username (5 per 15 minutes).
- **Session cookies** — `sameSite: 'lax'`, and the app refuses to boot without a real `SESSION_SECRET` set (no silent fallback to a default secret).
- **Password policy** — every account, seeded or newly created, is forced through a password-change screen before it can do anything else; the new password must be 10+ characters, mix character classes, and isn't allowed to be a known-weak or previously-used value.
- **CSRF + file uploads** — the CSRF check runs globally, before any route, which is before `multer` parses a multipart body — so a plain hidden `_csrf` field is always empty (and every upload would 403) on a multipart form. CSV import and file attachments carry the token in the form's `action` URL (`?_csrf=...`) instead, and `src/lib/csrf.js`'s `getTokenFromRequest` checks both the body and the query string. If you add another file-upload form, follow the same pattern — a hidden field alone will silently fail.
