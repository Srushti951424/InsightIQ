import io

import pandas as pd
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .models import Dataset, Report
from .services.ingestion import load_and_merge, clean_dataframe, UnreadableFileError
from .services.column_detection import detect_columns
from .services import dashboard as dashboard_service
from .services.forecasting import run_forecast, ForecastUnavailableError
from .services import reporting


def _load_dataset_df(dataset: Dataset) -> pd.DataFrame:
    dataset.cleaned_file.open('rb')
    try:
        df = pd.read_csv(dataset.cleaned_file)
    finally:
        dataset.cleaned_file.close()
    date_col = (dataset.profile or {}).get('date_col')
    if date_col and date_col in df.columns:
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    return df


class DatasetUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        files = request.FILES.getlist('files')
        if not files:
            return Response({'detail': 'No files uploaded. Attach one or more files under the "files" field.'},
                             status=status.HTTP_400_BAD_REQUEST)

        try:
            merged_df, file_meta = load_and_merge(files)
        except UnreadableFileError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'detail': f'Could not read the uploaded file(s): {exc}'},
                             status=status.HTTP_400_BAD_REQUEST)

        if merged_df.empty:
            return Response({'detail': 'The uploaded file(s) contained no rows.'},
                             status=status.HTTP_400_BAD_REQUEST)

        cleaned_df, issues, quality_score = clean_dataframe(merged_df)
        profile = detect_columns(cleaned_df)

        dataset = Dataset.objects.create(
            rows=len(cleaned_df),
            columns=len(cleaned_df.columns),
            quality_score=quality_score,
            profile=profile,
            issues=issues,
            file_meta=file_meta,
        )

        csv_buf = io.StringIO()
        cleaned_df.to_csv(csv_buf, index=False)
        dataset.cleaned_file.save('cleaned.csv', ContentFile(csv_buf.getvalue().encode('utf-8')), save=True)

        return Response({
            'datasetId': str(dataset.id),
            'files': file_meta,
            'columns': dataset.columns,
            'rows': dataset.rows,
            'qualityScore': dataset.quality_score,
            'issues': issues,
        }, status=status.HTTP_201_CREATED)


class DashboardView(APIView):
    def get(self, request, dataset_id):
        dataset = get_object_or_404(Dataset, id=dataset_id)
        df = _load_dataset_df(dataset)
        data = dashboard_service.build_dashboard(df, dataset.profile or {})
        return Response(data)


class ForecastView(APIView):
    def post(self, request, dataset_id):
        dataset = get_object_or_404(Dataset, id=dataset_id)
        df = _load_dataset_df(dataset)
        metric = request.data.get('metric')
        horizon = int(request.data.get('horizon', 4))
        try:
            result = run_forecast(df, dataset.profile or {}, metric=metric, horizon=horizon)
        except ForecastUnavailableError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        return Response(result)


class ReportView(APIView):
    def post(self, request, dataset_id):
        dataset = get_object_or_404(Dataset, id=dataset_id)
        df = _load_dataset_df(dataset)
        profile = dataset.profile or {}
        dashboard_data = dashboard_service.build_dashboard(df, profile)

        forecast_data = None
        try:
            forecast_data = run_forecast(df, profile)
        except ForecastUnavailableError:
            forecast_data = None

        pages = reporting.build_report_pages(dataset, dashboard_data, forecast_data)

        report = Report.objects.create(dataset=dataset, pages=pages)
        pdf_bytes = reporting.render_pdf(dataset, pages, dashboard_data)
        report.pdf_file.save(f'{report.id}.pdf', ContentFile(pdf_bytes), save=True)

        return Response({
            'reportId': str(report.id),
            'generatedAt': report.created_at.isoformat(),
            'pages': pages,
            'pdfUrl': report.pdf_file.url,
        }, status=status.HTTP_201_CREATED)
