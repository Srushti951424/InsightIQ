"""Detect the *role* of each column in an arbitrary uploaded dataset.

The rest of the analysis engine (dashboard KPIs, breakdowns, forecasting)
doesn't know anything about the user's domain up front - it could be sales
data, hospital admissions, website traffic, survey responses, anything with
rows and columns. This module inspects the data itself (dtype, cardinality,
name hints, parseability as a date) and decides:

- which column (if any) is the primary date/time axis
- which numeric columns are good candidates to treat as "metrics" (KPIs,
  trend lines, forecast targets) vs. which are really identifiers
- which categorical columns are good candidates for "breakdown by X" charts
- which single numeric column is the best default "primary metric"
"""
import re

import numpy as np
import pandas as pd

ID_NAME_RE = re.compile(r'(^id$|_id$|^id_|uuid|guid|^index$|^unnamed)', re.I)

# Whole-word tokens that mark a column as an identifier rather than a metric,
# even when the column name doesn't literally contain "id" (e.g. "InvoiceNo",
# "StockCode", "Postal Code"). Matched against tokenized words, not substrings,
# so this doesn't accidentally catch things like "Score" or "Encode".
ID_NAME_TOKENS = {'id', 'no', 'num', 'number', 'code', 'key', 'uuid', 'guid', 'index'}


def _tokenize_name(col_name):
    # Split CamelCase boundaries and any non-alphanumeric separator
    # ("InvoiceNo" -> ["Invoice", "No"], "postal_code" -> ["postal", "code"]).
    spaced = re.sub(r'(?<=[a-z0-9])(?=[A-Z])', ' ', str(col_name))
    return [t.lower() for t in re.split(r'[^0-9a-zA-Z]+', spaced) if t]


def _is_id_name(col_name):
    if ID_NAME_RE.search(col_name):
        return True
    tokens = _tokenize_name(col_name)
    return bool(tokens) and tokens[-1] in ID_NAME_TOKENS

METRIC_NAME_HINTS = [
    'revenue', 'sales', 'amount', 'total', 'price', 'value', 'income',
    'profit', 'cost', 'spend', 'qty', 'quantity', 'units', 'volume',
    'count', 'score', 'rate', 'balance', 'expense', 'margin', 'gmv',
]

DATE_NAME_HINTS = [
    'date', 'time', 'day', 'month', 'year', 'created', 'updated',
    'timestamp', 'period', 'order_date', 'signup', 'joined',
]

CATEGORY_NAME_HINTS = [
    'category', 'type', 'segment', 'group', 'product', 'department',
    'status', 'channel', 'platform', 'plan', 'tier',
]

REGION_NAME_HINTS = [
    'region', 'state', 'country', 'city', 'location', 'branch', 'store',
    'territory', 'zone', 'market',
]


def _name_score(col_name, hints):
    name = col_name.lower()
    return max((1.0 for h in hints if h in name), default=0.0)


def _try_parse_dates(series):
    """Return the fraction of non-null values that parse as dates."""
    non_null = series.dropna()
    if non_null.empty:
        return 0.0, None
    try:
        parsed = pd.to_datetime(non_null.astype(str), errors='coerce', format='mixed')
    except (ValueError, TypeError):
        try:
            parsed = pd.to_datetime(non_null.astype(str), errors='coerce')
        except Exception:
            return 0.0, None
    success_rate = parsed.notna().mean()
    return success_rate, parsed


def detect_columns(df: pd.DataFrame) -> dict:
    n = len(df)
    columns = []
    date_candidates = []
    numeric_candidates = []
    categorical_candidates = []

    for col in df.columns:
        series = df[col]
        unique_ratio = series.nunique(dropna=True) / n if n else 0
        null_pct = round(series.isna().mean() * 100, 2)
        is_id_name = _is_id_name(col)

        # --- numeric? ---
        numeric_series = pd.to_numeric(series, errors='coerce')
        numeric_ratio = numeric_series.notna().mean() if n else 0

        # --- date? only worth trying on non-purely-numeric-looking columns,
        # or when the name strongly hints at a date ---
        name_is_date_hint = _name_score(col, DATE_NAME_HINTS) > 0
        date_ratio, parsed_dates = 0.0, None
        if numeric_ratio < 0.9 or name_is_date_hint:
            date_ratio, parsed_dates = _try_parse_dates(series)

        # A high uniqueness ratio only signals "this is an identifier, not a
        # metric" for whole-number columns (order_id, row_number, ...).
        # Continuous metrics like revenue/price are *expected* to be nearly
        # all-unique and must not be excluded on that basis alone.
        is_integerish = False
        if numeric_ratio >= 0.9:
            non_null_numeric = numeric_series.dropna()
            if len(non_null_numeric):
                is_integerish = bool(np.isclose(non_null_numeric, non_null_numeric.round()).mean() > 0.99)
        looks_like_id = is_id_name or (is_integerish and unique_ratio >= 0.95)

        role = 'text'
        if date_ratio >= 0.7 and series.nunique(dropna=True) > 1:
            role = 'datetime'
            date_candidates.append({
                'name': col,
                'success_rate': float(date_ratio),
                'name_hint': name_is_date_hint,
                'span_days': int((parsed_dates.max() - parsed_dates.min()).days) if parsed_dates is not None and parsed_dates.notna().any() else 0,
            })
        elif numeric_ratio >= 0.9 and not looks_like_id:
            role = 'numeric'
            numeric_candidates.append({
                'name': col,
                'name_score': _name_score(col, METRIC_NAME_HINTS),
                'sum_abs': float(numeric_series.abs().sum()) if numeric_series.notna().any() else 0.0,
                'variance': float(numeric_series.var()) if numeric_series.notna().sum() > 1 else 0.0,
            })
        elif numeric_ratio >= 0.9 and looks_like_id:
            role = 'identifier'
        elif not is_id_name and 1 < series.nunique(dropna=True) <= max(30, int(n * 0.5)) and series.nunique(dropna=True) < n:
            role = 'categorical'
            categorical_candidates.append({
                'name': col,
                'cardinality': int(series.nunique(dropna=True)),
                'name_score_category': _name_score(col, CATEGORY_NAME_HINTS),
                'name_score_region': _name_score(col, REGION_NAME_HINTS),
            })

        columns.append({'name': col, 'role': role, 'null_pct': null_pct})

    # --- pick the primary date column: prefer name hints, then widest span, then best parse rate
    date_col = None
    if date_candidates:
        date_candidates.sort(key=lambda d: (d['name_hint'], d['span_days'], d['success_rate']), reverse=True)
        date_col = date_candidates[0]['name']

    # --- pick metric columns, ranked by name hint then by how much signal (variance) they carry
    numeric_candidates.sort(key=lambda m: (m['name_score'], m['variance']), reverse=True)
    metric_cols = [m['name'] for m in numeric_candidates]
    primary_metric = metric_cols[0] if metric_cols else None

    # --- pick category breakdown column(s)
    categorical_candidates.sort(key=lambda c: (c['name_score_category'], -c['cardinality']), reverse=True)
    category_col = categorical_candidates[0]['name'] if categorical_candidates else None

    # Only assign a region column when a candidate genuinely hints at
    # location (name match against REGION_NAME_HINTS). Previously this fell
    # back to "any other categorical column" when no hint matched, which
    # could label something like a product SKU column as a "region" -
    # better to omit the byRegion breakdown than fabricate one.
    region_ranked = sorted(categorical_candidates, key=lambda c: (c['name_score_region'], -c['cardinality']), reverse=True)
    region_col = None
    for c in region_ranked:
        if c['name'] != category_col and c['name_score_region'] > 0:
            region_col = c['name']
            break

    return {
        'columns': columns,
        'date_col': date_col,
        'metric_cols': metric_cols[:6],
        'primary_metric': primary_metric,
        'category_col': category_col,
        'region_col': region_col,
        'categorical_cols': [c['name'] for c in categorical_candidates],
    }
