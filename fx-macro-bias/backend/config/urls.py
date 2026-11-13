from django.contrib import admin
from django.urls import path, include

from apps.macro.views import live

urlpatterns = [
    path("api/live/snapshot", live.snapshot),
    path("api/health", live.health),
    path("api/ready", live.readiness),
    path("django-admin/", admin.site.urls),
    path("api/admin/", include("apps.macro.urls")),
    # JWT auth endpoints
    path("api/auth/", include("apps.macro.auth_urls")),
]
