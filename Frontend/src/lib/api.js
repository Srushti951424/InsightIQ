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

const USE_MOCKS = false // set to true to preview the UI with fake data, without a backend running
const BASE_URL = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    let detail = `Request to ${path} failed: ${res.status}`
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {
      // response wasn't JSON, keep the generic message
    }
    throw new Error(detail)
  }
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
  onProgress?.(15)
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  const result = await request('/datasets/upload/', { method: 'POST', body: form })
  onProgress?.(100)
  return result
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

// POST /api/datasets/:id/report/  — generates and returns a report record
// (PDF file url + preview pages). params: { metric?, horizon? }
export async function generateReport(datasetId, params = {}) {
  if (USE_MOCKS) {
    await delay(1100)
    return mockReport
  }
  return request(`/datasets/${datasetId}/report/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}
