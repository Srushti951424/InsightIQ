"""Predictive analysis: forecast a chosen metric forward from the dataset's
own history. Uses Holt-Winters exponential smoothing when there's enough
data for it to be meaningful, and falls back to a simple linear trend
projection for short series - always grounded in the uploaded data, never
canned numbers.
"""
import numpy as np
import pandas as pd

from .dashboard import _monthly_series


class ForecastUnavailableError(Exception):
    pass


def _resolve_metric(profile, requested):
    metric_cols = profile.get('metric_cols') or []
    if not metric_cols:
        return None
    if not requested:
        return profile.get('primary_metric') or metric_cols[0]
    if requested in metric_cols:
        return requested
    for col in metric_cols:
        if col.replace('_', ' ').strip().lower() == str(requested).strip().lower():
            return col
    return profile.get('primary_metric') or metric_cols[0]


def _linear_forecast(values, horizon):
    x = np.arange(len(values))
    coeffs = np.polyfit(x, values, deg=1)
    fitted = np.polyval(coeffs, x)
    resid_std = float(np.std(values - fitted)) if len(values) > 1 else 0.0
    future_x = np.arange(len(values), len(values) + horizon)
    forecast_vals = np.polyval(coeffs, future_x)
    return fitted, forecast_vals, resid_std


def _holt_winters_forecast(values, horizon):
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    seasonal = None
    seasonal_periods = None
    if len(values) >= 24:
        seasonal, seasonal_periods = 'add', 12
    model = ExponentialSmoothing(
        values, trend='add', damped_trend=True,
        seasonal=seasonal, seasonal_periods=seasonal_periods,
        initialization_method='estimated',
    )
    fit = model.fit(optimized=True)
    fitted = fit.fittedvalues
    forecast_vals = fit.forecast(horizon)
    resid_std = float(np.std(values - fitted)) if len(values) > 1 else 0.0
    return np.asarray(fitted), np.asarray(forecast_vals), resid_std


def _backtest_accuracy(values, model_fn, holdout=3):
    holdout = min(holdout, max(1, len(values) // 4))
    if len(values) < holdout + 3:
        return None
    train, test = values[:-holdout], values[-holdout:]
    try:
        _, preds, _ = model_fn(train, holdout)
    except Exception:
        return None
    preds = np.asarray(preds)[:len(test)]
    test = np.asarray(test)
    mask = test != 0
    if not mask.any():
        return None
    mape = float(np.mean(np.abs((test[mask] - preds[mask]) / test[mask])) * 100)
    rmse = float(np.sqrt(np.mean((test - preds) ** 2)))
    return {'mape': round(mape, 1), 'rmse': round(rmse, 2)}


def run_forecast(df, profile, metric=None, horizon=4):
    date_col = profile.get('date_col')
    metric_col = _resolve_metric(profile, metric)

    if not date_col or not metric_col:
        raise ForecastUnavailableError(
            'This dataset needs both a date/time column and a numeric metric column to forecast.'
        )

    monthly = _monthly_series(df, date_col, metric_col)
    monthly = monthly[monthly.notna()]
    if len(monthly) < 3:
        raise ForecastUnavailableError(
            f'Not enough time-series history for "{metric_col}" to forecast (found {len(monthly)} periods, need at least 3).'
        )

    values = monthly.values.astype(float)
    periods = list(monthly.index)

    model_name = 'Linear trend (limited history)'
    try:
        if len(values) >= 6:
            fitted, forecast_vals, resid_std = _holt_winters_forecast(values, horizon)
            model_name = 'Holt-Winters exponential smoothing'
            accuracy = _backtest_accuracy(values, _holt_winters_forecast) or _backtest_accuracy(values, lambda v, h: (None, *_linear_forecast(v, h)[1:]))
        else:
            fitted, forecast_vals, resid_std = _linear_forecast(values, horizon)
            accuracy = _backtest_accuracy(values, lambda v, h: _linear_forecast(v, h))
    except Exception:
        fitted, forecast_vals, resid_std = _linear_forecast(values, horizon)
        model_name = 'Linear trend (fallback)'
        accuracy = _backtest_accuracy(values, lambda v, h: _linear_forecast(v, h))

    if accuracy is None:
        # Not enough data to hold out a validation window - report in-sample
        # fit error instead, and say so via the model name.
        in_sample_resid = values[-len(fitted):] - fitted if len(fitted) else np.array([0])
        mask = values[-len(fitted):] != 0 if len(fitted) else np.array([True])
        mape = float(np.mean(np.abs(in_sample_resid[mask] / values[-len(fitted):][mask])) * 100) if mask.any() else 0.0
        accuracy = {'mape': round(mape, 1), 'rmse': round(float(np.sqrt(np.mean(in_sample_resid ** 2))), 2)}
        model_name += ' · in-sample fit (limited holdout data)'

    history = [{'period': p.strftime('%b'), 'actual': round(float(v), 2)} for p, v in zip(periods, values)]

    forecast = []
    last_period = periods[-1]
    for i, val in enumerate(forecast_vals, start=1):
        period_label = (last_period + pd.DateOffset(months=i)).strftime('%b')
        band = resid_std * 1.28 * np.sqrt(i)  # widen the confidence band with distance
        forecast.append({
            'period': period_label,
            'forecast': round(float(val), 2),
            'low': round(float(val - band), 2),
            'high': round(float(val + band), 2),
        })

    combined = [{'period': h['period'], 'actual': h['actual']} for h in history] + \
               [{'period': f['period'], 'forecast': f['forecast']} for f in forecast]

    drivers = _build_drivers(monthly, metric_col, profile, df)

    return {
        'metric': metric_col.replace('_', ' ').title(),
        'metricColumn': metric_col,
        'model': model_name,
        'accuracy': accuracy,
        'history': history,
        'forecast': forecast,
        'combined': combined,
        'drivers': drivers,
    }


def _build_drivers(monthly, metric_col, profile, df):
    drivers = []
    if len(monthly) >= 2:
        slope = float(monthly.iloc[-1] - monthly.iloc[0]) / max(len(monthly) - 1, 1)
        direction = 'upward' if slope > 0 else 'downward'
        drivers.append(
            f'The historical trend for {metric_col.replace("_", " ")} is {direction} '
            f'(average change of {abs(slope):.2f} per period).'
        )
    if len(monthly) >= 12:
        by_month_name = monthly.groupby(monthly.index.month).mean()
        peak_month = by_month_name.idxmax()
        import calendar
        drivers.append(
            f'Seasonality: {calendar.month_name[int(peak_month)]} has historically been the strongest period on average.'
        )
    category_col = profile.get('category_col')
    if category_col and metric_col in df.columns:
        grouped = df.groupby(category_col)[metric_col].sum(numeric_only=True).sort_values(ascending=False)
        if len(grouped) and grouped.iloc[0] > 0:
            drivers.append(
                f'"{grouped.index[0]}" is the largest contributor to {metric_col.replace("_", " ")} '
                f'and is the biggest lever on this forecast.'
            )
    if not drivers:
        drivers.append('Limited history means this forecast should be treated as directional, not exact.')
    return drivers[:3]
