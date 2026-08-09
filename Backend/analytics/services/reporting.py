"""Build an executive report grounded in the computed dashboard + forecast
for a dataset: a page-by-page text structure for the frontend preview, and a
matching PDF file.
"""
import io

from django.core.files.base import ContentFile


def _label(col):
    return col.replace('_', ' ').title() if col else 'the primary metric'


def build_report_pages(dataset, dashboard_data, forecast_data):
    metric_label = _label(dashboard_data.get('primaryMetric'))
    kpis = dashboard_data.get('kpis', [])
    insights = dashboard_data.get('insights', [])
    category = dashboard_data.get('byCategory', [])

    kpi_summary = ' · '.join(f"{k['label']} {k['value']} ({k['delta']})" for k in kpis) or 'No KPIs available.'
    top_category = category[0]['name'] if category else None

    # --- Executive Summary ---
    trend_texts = [i['text'] for i in insights if i.get('type') == 'trend']
    alert_texts = [i['text'] for i in insights if i.get('tone') == 'alert']
    summary_bits = []
    if trend_texts:
        summary_bits.append(trend_texts[0])
    if top_category:
        summary_bits.append(f'{top_category} is the leading contributor by {metric_label.lower()}.')
    if alert_texts:
        summary_bits.append(alert_texts[0])
    if forecast_data:
        last_fc = forecast_data['forecast'][-1]
        summary_bits.append(
            f"The forecast projects {forecast_data['metric']} reaching {last_fc['forecast']} by "
            f"{last_fc['period']}."
        )
    exec_summary = ' '.join(summary_bits) or f'Analysis of {dataset.rows} rows across {dataset.columns} columns.'

    # --- Key Metrics ---
    key_metrics_body = (
        f"{kpi_summary}. " + (f"{top_category} leads at {category[0]['value']}% of {metric_label.lower()}."
                               if top_category else '')
    )

    # --- Forecast & Outlook ---
    if forecast_data:
        acc = forecast_data['accuracy']
        forecast_body = (
            f"The {forecast_data['model']} model projects {forecast_data['metric']} reaching "
            f"{forecast_data['forecast'][-1]['forecast']} by {forecast_data['forecast'][-1]['period']}, "
            f"starting from {forecast_data['history'][-1]['actual']} most recently. "
            f"Model error: MAPE {acc['mape']}%, RMSE {acc['rmse']}. "
            + ' '.join(forecast_data['drivers'])
        )
    else:
        forecast_body = (
            'Not enough date/time and numeric metric history in this dataset to generate a reliable forecast. '
            'Upload data with a consistent date column and numeric values over multiple periods for predictive analysis.'
        )

    # --- Recommendations (rule-based, derived from what was actually found) ---
    recs = []
    for i, ins in enumerate(insights, start=1):
        if ins.get('tone') == 'alert':
            recs.append(f'Investigate: {ins["text"]}')
    if top_category:
        recs.append(f'Prioritize resources around "{top_category}", the current leading segment.')
    if dataset.quality_score < 90:
        recs.append(
            f'Data quality score is {dataset.quality_score}/100 — resolving the flagged issues '
            f'will improve the reliability of future analysis.'
        )
    if not recs:
        recs.append('No specific risks were flagged; continue monitoring the metrics above for changes.')
    recommendations_body = ' '.join(f'{i}. {r}' for i, r in enumerate(recs[:4], start=1))

    return [
        {'title': 'Executive Summary', 'body': exec_summary},
        {'title': 'Key Metrics', 'body': key_metrics_body},
        {'title': 'Forecast & Outlook', 'body': forecast_body},
        {'title': 'Recommendations', 'body': recommendations_body},
    ]


def render_pdf(dataset, pages, dashboard_data):
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER, topMargin=0.9 * inch, bottomMargin=0.9 * inch)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('ReportTitle', parent=styles['Heading1'], spaceAfter=18)
    heading_style = ParagraphStyle('SectionHeading', parent=styles['Heading2'], spaceBefore=14, spaceAfter=8)
    body_style = ParagraphStyle('Body', parent=styles['BodyText'], leading=16)

    flow = [
        Paragraph('InsightIQ &mdash; Executive Report', title_style),
        Paragraph(
            f'Generated from {dataset.rows:,} rows &middot; {dataset.columns} columns &middot; '
            f'quality score {dataset.quality_score}/100',
            styles['Normal'],
        ),
        Spacer(1, 0.15 * inch),
    ]

    chart_img = _trend_chart_image(dashboard_data)
    if chart_img:
        flow.append(chart_img)
        flow.append(Spacer(1, 0.1 * inch))

    for page in pages:
        flow.append(Paragraph(page['title'], heading_style))
        flow.append(Paragraph(page['body'], body_style))

    doc.build(flow)
    buf.seek(0)
    return buf.read()


def _trend_chart_image(dashboard_data):
    trend = dashboard_data.get('revenueTrend') or []
    if len(trend) < 2:
        return None
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from reportlab.platypus import Image
        from reportlab.lib.units import inch

        months = [t['month'] for t in trend]
        values = [t['revenue'] for t in trend]

        fig, ax = plt.subplots(figsize=(6, 2.4), dpi=150)
        ax.plot(months, values, marker='o', color='#101C29', linewidth=2)
        ax.set_ylabel(dashboard_data.get('primaryMetric') or 'value')
        ax.spines[['top', 'right']].set_visible(False)
        ax.grid(axis='y', linestyle='--', alpha=0.3)
        fig.tight_layout()

        img_buf = io.BytesIO()
        fig.savefig(img_buf, format='png')
        plt.close(fig)
        img_buf.seek(0)
        return Image(img_buf, width=6 * inch, height=2.4 * inch)
    except Exception:
        return None
