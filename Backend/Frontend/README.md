# InsightIQ — Frontend

React + Tailwind UI for InsightIQ, built to sit in front of your Django REST API
backend (per the project's tech-stack doc: React + Tailwind frontend, Django +
DRF backend).

## Flow implemented

1. **Landing (`/`)** — welcome copy + an upload tray. Accepts multiple `.csv`,
   `.xls/.xlsx`, and `.doc/.docx` files via drag-and-drop or click-to-browse.
   Clicking **Analyze my data** uploads the files, shows a progress state
   ("Reading files… → Profiling & cleaning… → Building your dashboard…"),
   then routes to the dashboard.
2. **Dashboard (`/dashboard`)** — KPI cards, revenue trend / category / region
   charts, and an AI insight feed (trends, anomalies, correlations), generated
   from the uploaded data. Two actions at the bottom: **Predictive analysis**
   and **Generate report**.
3. **Predictive Analysis (`/predictive`)** — metric selector, a forecast chart
   (historical actuals + forecast + confidence band), model accuracy (MAPE /
   RMSE), and a plain-language list of what's driving the forecast.
4. **Report Generation (`/report`)** — generates a report, shows a scrollable
   **PDF-style preview** (page by page), and gives **Download PDF** /
   **Regenerate report** actions.

## Getting started

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. Vite is already configured to proxy `/api/*`
to `http://localhost:8000` (see `vite.config.js`), so once your Django server
is running, frontend requests to `/api/...` reach it directly with no CORS
setup needed in dev.

## Wiring up your Django backend

All backend calls live in **`src/lib/api.js`**. Right now `USE_MOCKS = true`,
so every page works end-to-end against realistic mock data
(`src/lib/mockData.js`) without a backend running — useful for building out
Django endpoints independently.

Each function already has the real `fetch` call written and commented in.
Once an endpoint exists in Django, uncomment it:

| Function | Suggested Django route | Notes |
|---|---|---|
| `uploadDatasets(files, onProgress)` | `POST /api/datasets/upload/` | multipart form, field name `files` (multiple) |
| `fetchDashboard(datasetId)` | `GET /api/datasets/:id/dashboard/` | KPIs, chart series, insights |
| `runForecast(datasetId, {metric})` | `POST /api/datasets/:id/forecast/` | returns history + forecast + confidence band |
| `generateReport(datasetId)` | `POST /api/datasets/:id/report/` | returns PDF url + page-by-page preview content |

Flip `USE_MOCKS` to `false` in `src/lib/api.js` once you're ready to test
against the real backend — no other file needs to change, since every page
consumes data through this one module.

## Design notes

Palette, type (Fraunces / IBM Plex Sans / IBM Plex Mono), and the "stamp"
status badge are defined as design tokens in `tailwind.config.js` and
`src/index.css`, so they stay consistent if you add more pages later.

## Project structure

```
src/
  pages/            Landing, Dashboard, PredictiveAnalysis, ReportGeneration
  components/        Navbar, Button, FileDropzone, KpiCard, Stamp
  lib/
    api.js           All Django REST calls (mocked until you wire up USE_MOCKS = false)
    mockData.js       Mock responses used during frontend-only development
    AnalysisContext.jsx  Shares dataset/dashboard/forecast/report state across pages
```
