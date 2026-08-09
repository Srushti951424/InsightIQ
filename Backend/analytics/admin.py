from django.contrib import admin

from .models import Dataset, Report


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'rows', 'columns', 'quality_score')


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'dataset', 'created_at')
