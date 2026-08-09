from django.urls import path

from .views import DatasetUploadView, DashboardView, ForecastView, ReportView

urlpatterns = [
    path('datasets/upload/', DatasetUploadView.as_view(), name='dataset-upload'),
    path('datasets/<uuid:dataset_id>/dashboard/', DashboardView.as_view(), name='dataset-dashboard'),
    path('datasets/<uuid:dataset_id>/forecast/', ForecastView.as_view(), name='dataset-forecast'),
    path('datasets/<uuid:dataset_id>/report/', ReportView.as_view(), name='dataset-report'),
]
