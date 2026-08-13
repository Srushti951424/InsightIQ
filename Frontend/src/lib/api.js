// Thin API client for the Django REST backend.
//
// In dev, Vite proxies "/api" to http://localhost:8000 (see vite.config.js),
// so these calls can hit your Django REST Framework endpoints directly once
// they exist. Every function below currently falls back to a mocked response
// (see lib/mockData.js) so the UI is fully clickable before the backend
// endpoints are wired up. Replace the mock branch with the real fetch once
// each endpoint exists — the fetch call is already written and commented in.

import {
  mockDatasetSummary,
  mockDashboard,
  mockForecast,
  mockReport,
} from './mockData'

const USE_MOCKS = false // flip to false once your Django endpoints are live
const BASE_URL = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`Request to ${path} failed: ${res.status}`)
  return res.json()
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// POST /api/datasets/upload/  — multipart form of one or more files
export async function uploadDatasets(files, onProgress) {
  if (USE_MOCKS) {
    for (let i = 0; i <= 100; i += 10) {
      await delay(90)
      onProgress?.(i)
    }
    return mockDatasetSummary(files)
  }
   const form = new FormData()
   files.forEach((f) => form.append('files', f))
   return request('/datasets/upload/', { method: 'POST', body: form, headers: {} })
}

// GET /api/datasets/:id/dashboard/
export async function fetchDashboard(datasetId) {
  if (USE_MOCKS) {
    await delay(600)
    return mockDashboard
  }
   return request(`/datasets/${datasetId}/dashboard/`)
}

// POST /api/datasets/:id/forecast/  { metric, horizon }
export async function runForecast(datasetId, params) {
  if (USE_MOCKS) {
    await delay(900)
    return mockForecast(params)
  }
   return request(`/datasets/${datasetId}/forecast/`, {
     method: 'POST',
     body: JSON.stringify(params),
   })
}

// POST /api/datasets/:id/report/  — generates and returns a report record
// (PDF file url + preview pages)
export async function generateReport(datasetId) {
  if (USE_MOCKS) {
    await delay(1100)
    return mockReport
  }
   return request(`/datasets/${datasetId}/report/`, { method: 'POST' })
}
