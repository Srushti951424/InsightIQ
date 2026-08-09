export function mockDatasetSummary(files) {
  return {
    datasetId: 'ds_demo_001',
    files: files.map((f) => ({ name: f.name, size: f.size, rows: 1240 + Math.floor(Math.random() * 900) })),
    columns: 14,
    rows: 2184,
    qualityScore: 88,
    issues: [
      { type: 'missing', label: '3.2% missing values in "discount_pct"', severity: 'low' },
      { type: 'duplicate', label: '17 duplicate order records removed', severity: 'low' },
      { type: 'format', label: 'Inconsistent date formats normalized to ISO-8601', severity: 'medium' },
    ],
  }
}

export const mockDashboard = {
  kpis: [
    { label: 'Revenue (90d)', value: '₹42.6L', delta: '+8.4%', trend: 'up' },
    { label: 'Orders', value: '3,412', delta: '+3.1%', trend: 'up' },
    { label: 'Avg Order Value', value: '₹1,249', delta: '-1.8%', trend: 'down' },
    { label: 'Return Rate', value: '4.7%', delta: '+0.6%', trend: 'down' },
  ],
  revenueTrend: [
    { month: 'Feb', revenue: 28.1 }, { month: 'Mar', revenue: 30.4 },
    { month: 'Apr', revenue: 29.8 }, { month: 'May', revenue: 33.2 },
    { month: 'Jun', revenue: 36.9 }, { month: 'Jul', revenue: 39.5 },
    { month: 'Aug', revenue: 42.6 },
  ],
  byCategory: [
    { name: 'Apparel', value: 34 }, { name: 'Home', value: 21 },
    { name: 'Electronics', value: 26 }, { name: 'Beauty', value: 12 },
    { name: 'Other', value: 7 },
  ],
  byRegion: [
    { region: 'West', revenue: 15.2 }, { region: 'North', revenue: 11.8 },
    { region: 'South', revenue: 9.4 }, { region: 'East', revenue: 6.2 },
  ],
  insights: [
    { type: 'trend', tone: 'current', text: 'Revenue has grown for 5 consecutive months, driven mainly by the Apparel category (+18% MoM in July).' },
    { type: 'anomaly', tone: 'alert', text: 'Return rate in the South region spiked to 9.1% in the last two weeks — 2.3x the account average.' },
    { type: 'correlation', tone: 'current', text: 'Discount depth correlates strongly (r = 0.71) with order volume, but weakly with margin — deeper discounts aren\'t proportionally lifting profit.' },
    { type: 'anomaly', tone: 'alert', text: '412 orders on July 22 were flagged as a volume outlier, consistent with a single bulk B2B purchase.' },
  ],
}

export function mockForecast(params = {}) {
  const metric = params.metric || 'Revenue'
  const history = [
    { period: 'Mar', actual: 30.4 }, { period: 'Apr', actual: 29.8 },
    { period: 'May', actual: 33.2 }, { period: 'Jun', actual: 36.9 },
    { period: 'Jul', actual: 39.5 }, { period: 'Aug', actual: 42.6 },
  ]
  const forecast = [
    { period: 'Sep', forecast: 45.1, low: 41.8, high: 48.3 },
    { period: 'Oct', forecast: 47.6, low: 43.1, high: 52.0 },
    { period: 'Nov', forecast: 52.3, low: 46.2, high: 58.5 },
    { period: 'Dec', forecast: 58.9, low: 50.7, high: 67.2 },
  ]
  return {
    metric,
    model: 'SARIMAX (auto-tuned)',
    accuracy: { mape: 6.4, rmse: 2.1 },
    history,
    forecast,
    combined: [...history.map(h => ({ period: h.period, actual: h.actual })), ...forecast],
    drivers: [
      'Seasonal uplift historically begins in Sep and peaks around year-end.',
      'Apparel category momentum is the largest positive contributor to the Q4 forecast.',
      'Elevated South-region returns are a downside risk not yet reflected in the base case.',
    ],
  }
}

export const mockReport = {
  reportId: 'rpt_demo_001',
  generatedAt: new Date().toISOString(),
  pages: [
    {
      title: 'Executive Summary',
      body: 'Revenue grew 8.4% over the trailing 90 days, extending a five-month upward trend led by the Apparel category. Order volume is up 3.1%, though average order value slipped 1.8% as promotional depth increased. A return-rate anomaly in the South region warrants investigation before the Q4 forecast is finalized.',
    },
    {
      title: 'Key Metrics',
      body: 'Revenue ₹42.6L (+8.4%) · Orders 3,412 (+3.1%) · AOV ₹1,249 (-1.8%) · Return rate 4.7% (+0.6pp). Apparel remains the leading category at 34% of revenue, followed by Electronics at 26%.',
    },
    {
      title: 'Forecast & Outlook',
      body: 'The SARIMAX model projects Q4 revenue reaching ₹58.9L by December, a 38% increase over August, driven by seasonal uplift and continued Apparel momentum. Model MAPE is 6.4%, indicating high confidence. The South-region return anomaly is treated as a downside risk not yet priced into the base case.',
    },
    {
      title: 'Recommendations',
      body: '1. Investigate the South-region return spike before scaling Q4 marketing spend there. 2. Re-evaluate discount depth — current promotions lift volume more than margin. 3. Prioritize Apparel inventory ahead of the projected November–December demand curve.',
    },
  ],
}
