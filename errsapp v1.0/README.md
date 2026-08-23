# ERRS Manager

A web app for managing the four units of the **Environmental Research and Radiation Safety Department (ERRS)** at Liberia's Environmental Protection Agency: the Chemical Unit, the Environmental Monitoring and Research Unit, the Radiation Safety Unit, and the Waste and Remediation Unit.

This is a **working prototype** — a real web app with a real database, meant to be shown around internally and refined based on feedback before it's relied on for actual licensing decisions.

## What's in it

- **Unified licensing engine** — every License, Clearance, Certificate and Bill across all four units goes through one screen type, with sequential document numbering per document type per year (mirroring the Chemical Unit's existing paper/Excel numbering convention).
- **Controlled master data** — one canonical list of companies and one of chemicals (with known alternate spellings tracked), instead of the same name spelled four different ways across scattered records.
- **Unit-specific tools** — Chemical Escorts and Inventory Audits (Chemical Unit); Site Inspections, Complaints, Lab Results and Reporting Quality tracking (Environmental Monitoring & Research); Radiation Source Inventory and Trainings (Radiation Safety); ESIA Participation (Waste & Remediation).
- **KPI / deliverable tracker** — annual targets with month-by-month entries and automatic cumulative/percent-of-target calculations, per unit or department-wide.
- **Shared tools** — reminders, an asset/equipment registry (with calibration due-date tracking), and an activity log for meetings/trainings.
- **Role-based access** — Department Head (sees everything), Unit Head / Staff (scoped to their own unit), and time-limited Intern accounts that automatically lose access after a set end date.
- **Audit log** — every create/update/delete/issue/login is recorded with who did it and when.

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

## Running it locally

Requirements: Node.js 18+, PostgreSQL 14+.

```bash
npm install

# Create the database and a role for the app (adjust names/password as you like)
sudo -u postgres psql -c "CREATE ROLE errs_app WITH LOGIN PASSWORD 'errs_dev_pw';"
sudo -u postgres psql -c "CREATE DATABASE errs_db OWNER errs_app;"

# Apply the schema
psql "postgresql://errs_app:errs_dev_pw@localhost:5432/errs_db" -f db/schema.sql

# Load the four units, document types, and demo accounts
node db/seed.js

# Copy .env and adjust if you changed any of the above
cp .env.example .env   # if starting fresh; otherwise .env is already set up

npm start
```

Then open `http://localhost:3000` and sign in with one of the demo accounts above.

To re-run the checks used to verify this build (Playwright, headless Chromium):

```bash
node test-e2e.js
```

## Deploying it for free (Render + Neon)

This pairing was chosen deliberately: Render's own free Postgres **auto-deletes your database 30 days after creation**, which is a bad surprise for a prototype people are actually entering data into. Neon's free tier has no such expiry — it's a genuinely persistent free database (0.5 GB), it just scales to zero after 5 minutes of inactivity and wakes up again in well under a second on the next query.

### 1. Create the database on Neon

1. Sign up at [neon.tech](https://neon.tech) (free, no card required) and create a new project.
2. Neon gives you a connection string that looks like `postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require`. Copy it.
3. From your own machine (or anywhere with `psql`), apply the schema and seed data against that connection string:
   ```bash
   psql "postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require" -f db/schema.sql
   DATABASE_URL="postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require" node db/seed.js
   ```

### 2. Deploy the app on Render

1. Push this project to a GitHub (or GitLab) repository.
2. In the [Render dashboard](https://dashboard.render.com), click **New → Web Service** and connect that repository.
3. Configure it as:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Instance Type:** Free
4. Under **Environment**, add:
   - `DATABASE_URL` — the Neon connection string from step 1 (must include `?sslmode=require` — the app uses that to decide whether to use an SSL connection).
   - `SESSION_SECRET` — any long random string (e.g. generate one with `openssl rand -hex 32`).
   - `NODE_ENV` — `production`
5. Deploy. Render's free web services sleep after 15 minutes of no traffic and take about a minute to wake back up on the next visit — expected on the free tier, and fine for an internal prototype.

### After deploying

- Sign in as `depthead`, go to **Administration → Staff Accounts**, and change passwords for the accounts you'll actually use (or deactivate the ones you won't).
- Add your unit heads and staff as real accounts with their own usernames.
- Start entering real companies, chemicals, and cases — the database starts empty on purpose.

## Notes on the data model

- `case_documents` is one table for every License, Clearance, Certificate, and Bill across all four units — `document_types` describes each *kind* (its owning unit, its numbering format, how long it's valid for), and each row in `case_documents` is one case for one company. This replaces what used to be the same shape scattered across many separate spreadsheet tabs.
- `companies` and `chemicals` are controlled lists rather than free text, specifically because the source records had the same company and chemical names spelled multiple different ways. `chemicals.aliases` keeps track of known alternate spellings so staff can still find the right entry no matter which spelling they type.
- Document numbers are allocated sequentially per document type per year (`number_allocators`), the same way the Chemical Unit's own numbering already worked — an annual block per license type, not generated arbitrarily.
