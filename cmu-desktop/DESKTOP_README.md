# CMU Database Desktop

Desktop/PC edition of the EPA Liberia ERRS Chemical Management Unit app. It uses the same Google Apps Script `MobileAPI.gs` endpoint as the Android app, so desktop and mobile users work with the same registers, validation rules, PDFs, roles, audit trail, Claude tools, and offline queue.

## Run locally

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open the shown URL, enter the Apps Script `/exec` URL, and connect. **Try with sample data** works without a live database.

## Production build

```bash
npm ci
npm run build
```

Deploy the generated `dist/` folder to GitHub Pages, Netlify, Render, or any static web host. This is a client-side app; no separate server is required.

## API setup

Use the supplied `MobileAPI.gs` in the Apps Script project that already contains `Code.gs` and `Claude.gs`. Run `MOB_Setup`, deploy the script as a web app, and use the resulting `/exec` URL on the connection screen.

## Desktop design

At 1024px and wider the app switches to a PC workspace with:

- persistent left navigation;
- wide dashboard and four-column KPI layout;
- two-column cards and forms where appropriate;
- larger dialogs and side sheets;
- mouse hover/focus states;
- responsive fallback to the original touch-friendly mobile layout.
