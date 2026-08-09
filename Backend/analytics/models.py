import uuid

from django.db import models


def dataset_upload_path(instance, filename):
    return f'datasets/{instance.dataset_id}/uploads/{filename}'


def dataset_cleaned_path(instance, filename):
    return f'datasets/{instance.id}/cleaned.csv'


def report_pdf_path(instance, filename):
    return f'datasets/{instance.dataset_id}/reports/{instance.id}.pdf'


class Dataset(models.Model):
    """A user-uploaded collection of one or more files, merged and cleaned
    into a single tabular dataset that everything downstream (dashboard,
    forecast, report) is computed from.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Cleaned, merged data stored on disk (CSV) so it can be re-loaded by
    # pandas on every request without re-parsing the original uploads.
    cleaned_file = models.FileField(upload_to=dataset_cleaned_path, blank=True, null=True)

    rows = models.IntegerField(default=0)
    columns = models.IntegerField(default=0)
    quality_score = models.IntegerField(default=100)

    # Column-detection results + cleaning issues, cached as JSON so the
    # dashboard/forecast/report endpoints don't have to re-detect column
    # roles (date column, metric columns, categorical columns) every call.
    profile = models.JSONField(default=dict, blank=True)
    issues = models.JSONField(default=list, blank=True)
    file_meta = models.JSONField(default=list, blank=True)  # [{name, size, rows}, ...]

    def __str__(self):
        return f'Dataset {self.id} ({self.rows} rows x {self.columns} cols)'


class Report(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(Dataset, related_name='reports', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    pages = models.JSONField(default=list)
    pdf_file = models.FileField(upload_to=report_pdf_path, blank=True, null=True)

    def __str__(self):
        return f'Report {self.id} for dataset {self.dataset_id}'
