"""Turn a cleaned DataFrame + its column profile into the dashboard payload
the frontend expects (see Frontend/src/lib/mockData.js::mockDashboard for the
shape this mirrors).
"""
import numpy as np
import pandas as pd


def _fmt_number(x):
    """Compact, locale-agnostic number formatting (1.2K / 3.4M etc.)."""
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return '—'
    ax = abs(x)
    if ax >= 1_000_000:
        return f'{x / 1_000_000:.1f}M'
    if ax >= 1_000:
        return f'{x / 1_000:.1f}K'
    if float(x).is_integer():
        return f'{int(x)}'
    return f'{x:.2f}'


def _delta_pct(prev, curr):
    if prev in (0, None) or (isinstance(prev, float) and np.isnan(prev)):
        return None
    return round(((curr - prev) / abs(prev)) * 100, 1)


def _split_halves(series):
    n = len(series)
    if n < 2:
        return series, series
    mid = n // 2
    return series.iloc[:mid], series.iloc[mid:]


def _monthly_series(df, date_col, metric_col):
    s = df[[date_col, metric_col]].dropna()
    if s.empty:
        return pd.Series(dtype=float)
    s = s.set_index(date_col).sort_index()
    grouped = s[metric_col].resample('MS').sum()
    return grouped[grouped.index.notna()] if len(grouped) else grouped


def build_kpis(df, profile):
    kpis = []
    date_col = profile.get('date_col')
    metric_cols = profile.get('metric_cols') or []

    # Always include a record-count KPI - it works for any dataset.
    n = len(df)
    if date_col and df[date_col].notna().any():
        early, late = _split_halves(df.sort_values(date_col))
    else:
        early, late = _split_halves(df)
    delta = _delta_pct(len(early), len(late))
    kpis.append({
        'label': 'Total records',
        'value': f'{n:,}',
        'delta': f'{delta:+.1f}%' if delta is not None else '—',
        'trend': 'up' if (delta or 0) >= 0 else 'down',
    })

    for col in metric_cols[:3]:
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        if series.empty:
            continue
        early, late = _split_halves(series)
        early_sum, late_sum = early.sum(), late.sum()
        delta = _delta_pct(early_sum, late_sum)
        kpis.append({
            'label': col.replace('_', ' ').title(),
            'value': _fmt_number(series.sum()),
            'delta': f'{delta:+.1f}%' if delta is not None else '—',
            'trend': 'up' if (delta or 0) >= 0 else 'down',
        })

    return kpis[:4]


def build_trend(df, profile):
    date_col = profile.get('date_col')
    metric_col = profile.get('primary_metric')
    if not date_col or not metric_col:
        return []
    monthly = _monthly_series(df, date_col, metric_col)
    if monthly.empty:
        return []
    return [
        {'month': idx.strftime('%b'), 'revenue': round(float(v), 2)}
        for idx, v in monthly.items()
    ]


def _breakdown_by(df, category_col, metric_col, top_n=5):
    if not category_col:
        return []
    if metric_col and metric_col in df.columns:
        grouped = df.groupby(category_col)[metric_col].sum(numeric_only=True)
    else:
        grouped = df.groupby(category_col).size()
    grouped = grouped.sort_values(ascending=False)
    total = grouped.sum()
    if total == 0:
        return []
    top = grouped.head(top_n)
    rest = grouped.iloc[top_n:].sum()
    items = [{'name': str(k), 'value': round(float(v) / float(total) * 100, 1)} for k, v in top.items()]
    if rest > 0:
        items.append({'name': 'Other', 'value': round(float(rest) / float(total) * 100, 1)})
    return items


def build_category_breakdown(df, profile):
    return _breakdown_by(df, profile.get('category_col'), profile.get('primary_metric'))


def build_region_breakdown(df, profile):
    region_col = profile.get('region_col')
    metric_col = profile.get('primary_metric')
    if not region_col:
        return []
    if metric_col and metric_col in df.columns:
        grouped = df.groupby(region_col)[metric_col].sum(numeric_only=True)
    else:
        grouped = df.groupby(region_col).size()
    grouped = grouped.sort_values(ascending=False).head(8)
    return [{'region': str(k), 'revenue': round(float(v), 2)} for k, v in grouped.items()]


def build_insights(df, profile):
    insights = []
    date_col = profile.get('date_col')
    metric_col = profile.get('primary_metric')
    metric_cols = profile.get('metric_cols') or []

    # --- trend: consecutive growth streak in the monthly series
    if date_col and metric_col:
        monthly = _monthly_series(df, date_col, metric_col)
        if len(monthly) >= 3:
            diffs = monthly.diff().dropna()
            streak = 0
            for v in diffs.iloc[::-1]:
                if v > 0:
                    streak += 1
                else:
                    break
            if streak >= 2:
                last_mo_pct = _delta_pct(monthly.iloc[-2], monthly.iloc[-1])
                insights.append({
                    'type': 'trend',
                    'tone': 'current',
                    'text': (
                        f'{metric_col.replace("_", " ").title()} has grown for {streak} consecutive '
                        f'periods' + (f', up {last_mo_pct:+.1f}% in the most recent one.' if last_mo_pct is not None else '.')
                    ),
                })
            elif streak == 0 and len(diffs) and (diffs.iloc[::-1].head(2) < 0).all():
                insights.append({
                    'type': 'trend',
                    'tone': 'alert',
                    'text': f'{metric_col.replace("_", " ").title()} has declined over the most recent periods — worth a closer look.',
                })

        # --- anomaly: z-score outlier in the monthly series
        if len(monthly) >= 4:
            mean, std = monthly.mean(), monthly.std()
            if std and std > 0:
                z = (monthly - mean) / std
                outlier_idx = z.abs().idxmax()
                if abs(z.loc[outlier_idx]) > 2:
                    insights.append({
                        'type': 'anomaly',
                        'tone': 'alert',
                        'text': (
                            f'{outlier_idx.strftime("%b %Y")} was a statistical outlier for '
                            f'{metric_col.replace("_", " ")} ({abs(z.loc[outlier_idx]):.1f}\u00d7 the typical deviation from average).'
                        ),
                    })

        # --- volume spike: day with unusually many records
        daily_counts = df[date_col].dropna().dt.date.value_counts()
        if len(daily_counts) >= 5:
            mean, std = daily_counts.mean(), daily_counts.std()
            if std and std > 0:
                z = (daily_counts - mean) / std
                spike_day = z.idxmax()
                if z.loc[spike_day] > 2.5:
                    insights.append({
                        'type': 'anomaly',
                        'tone': 'alert',
                        'text': f'{int(daily_counts.loc[spike_day])} records on {spike_day.isoformat()} is a volume outlier ({z.loc[spike_day]:.1f}\u00d7 the daily average).',
                    })

    # --- correlation between numeric metrics
    if len(metric_cols) >= 2:
        numeric_df = df[metric_cols].apply(pd.to_numeric, errors='coerce')
        corr = numeric_df.corr(numeric_only=True)
        best_pair, best_r = None, 0
        for i, a in enumerate(metric_cols):
            for b in metric_cols[i + 1:]:
                if a in corr.index and b in corr.columns:
                    r = corr.loc[a, b]
                    if pd.notna(r) and abs(r) > abs(best_r):
                        best_pair, best_r = (a, b), r
        if best_pair and abs(best_r) >= 0.5:
            strength = 'strongly' if abs(best_r) >= 0.7 else 'moderately'
            direction = 'positively' if best_r > 0 else 'negatively'
            insights.append({
                'type': 'correlation',
                'tone': 'current',
                'text': (
                    f'{best_pair[0].replace("_", " ").title()} and {best_pair[1].replace("_", " ").title()} '
                    f'are {strength} {direction} correlated (r = {best_r:.2f}).'
                ),
            })

    if not insights:
        insights.append({
            'type': 'trend',
            'tone': 'current',
            'text': 'No strong trends, anomalies, or correlations were detected in this dataset — the data looks stable.',
        })

    return insights[:5]


def build_dashboard(df, profile):
    return {
        'kpis': build_kpis(df, profile),
        'revenueTrend': build_trend(df, profile),
        'byCategory': build_category_breakdown(df, profile),
        'byRegion': build_region_breakdown(df, profile),
        'insights': build_insights(df, profile),
        'metrics': profile.get('metric_cols') or [],
        'primaryMetric': profile.get('primary_metric'),
        'dateCol': profile.get('date_col'),
    }
