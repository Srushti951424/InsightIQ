# InsightIQ — Backend analysis engine (new)

This adds the Django backend that the `Frontend/` app was already built to
talk to (see `Frontend/README.md` for the original API contract). The
frontend has been flipped off mock data (`USE_MOCKS = false` in
`Frontend/src/lib/api.js`) and now hits these endpoints for real.

## What was added

A new `analytics` Django app (`analytics/`) that:

1. **Ingests** uploaded `.csv` / `.xlsx` / `.xls` / `.docx` (tables) files —
   merges multiple files, drops duplicate rows, normalizes date formats,
   and computes a data-quality score (`analytics/services/ingestion.py`).
2. **Auto-detects column roles** on whatever data you upload — which
   column is the date axis, which numeric columns are real metrics vs.
   IDs, which categorical columns make good breakdowns — using name hints
   + statistical heuristics, not a hardcoded schema
   (`analytics/services/column_detection.py`). This is what lets the same
   engine work on sales data, hospital records, website analytics, etc.
3. **Builds the dashboard** — KPIs, a monthly trend series, category/region
   breakdowns, and rule-based insights (growth streaks, z-score anomalies,
   correlations) — all computed from the actual uploaded data
   (`analytics/services/dashboard.py`).
4. **Forecasts** a chosen metric with Holt-Winters exponential smoothing
   (falling back to a linear trend when there's too little history),
   backtested MAPE/RMSE, and a confidence band that widens with distance
   (`analytics/services/forecasting.py`).
5. **Generates an executive report** — templated narrative text grounded in
   the computed dashboard + forecast, rendered to a downloadable PDF with
   an embedded trend chart (`analytics/services/reporting.py`).

## Running it locally

**Backend:**
```bash
python -m venv .venv && source .venv/bin/activate   # or your preferred env tool
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Runs on `http://localhost:8000`.

**Frontend** (separate terminal):
```bash
cd Frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` and proxies `/api` and `/media` to the
Django server (see `Frontend/vite.config.js`).

Then open `http://localhost:5173`, drop in a CSV/Excel/Word file, and go
through Analyze → Dashboard → Predictive analysis → Generate report.

## API endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/api/datasets/upload/` | multipart, field name `files` (one or more) |
| GET | `/api/datasets/<uuid>/dashboard/` | KPIs, chart series, insights |
| POST | `/api/datasets/<uuid>/forecast/` | body `{"metric": "<column_name>", "horizon": 4}` |
| POST | `/api/datasets/<uuid>/report/` | returns page-by-page text + `pdfUrl` |

`GET /api/datasets/<uuid>/dashboard/` includes a `metrics` array — the list
of numeric columns detected in your data — which the frontend now uses to
populate the metric picker on the Predictive Analysis page, instead of a
hardcoded list.

## Known limitations / good next steps

- **No auth / multi-tenancy yet.** Any dataset ID is fetchable by anyone
  who has it — fine for local use, not for a public deployment.
- **Forecasting needs a date column + a numeric column.** If your data
  doesn't have both, `/forecast/` returns a 422 with an explanation, and
  the report's "Forecast & Outlook" page says so instead of guessing.
- **Column detection is heuristic**, not domain-aware. For genuinely
  ambiguous datasets it defaults to "the numeric column with the most
  variance" as the primary metric — reasonable, but you may want to let
  users override the detected primary metric/date column from the UI
  eventually (the profile is stored on the `Dataset` model, so this is an
  additive feature, not a rework).
- **Dev-server file storage.** Uploaded/cleaned data and generated PDFs are
  stored under `media/` on local disk via Django's default `FileField`
  storage — switch to S3/GCS (`django-storages`) before deploying.
- Large uploads: `DatasetUploadView` has no explicit file-size cap yet;
  add one (and a request timeout / async processing via Celery) before
  letting untrusted users upload big files in production.
