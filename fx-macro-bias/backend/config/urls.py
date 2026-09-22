from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/admin/", include("apps.macro.urls")),
    # JWT auth endpoints
    path("api/auth/", include("apps.macro.auth_urls")),
]
