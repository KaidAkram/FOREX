"""
Security Middleware for ShiftFX Backend
Injects production HTTP defense headers, strips server fingerprinting,
and enforces security best practices on all API responses.
"""

from django.utils.deprecation import MiddlewareMixin
from django.conf import settings


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Appends strict security headers to all HTTP responses:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY (clickjacking protection)
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: camera=(), microphone=(), geolocation=()
    - Cross-Origin-Opener-Policy: same-origin
    - Cross-Origin-Resource-Policy: same-site
    - Removes or masks server identification banners.
    """

    def process_response(self, request, response):
        # 1. MIME Sniffing Defense
        response["X-Content-Type-Options"] = "nosniff"

        # 2. Clickjacking Defense
        if "X-Frame-Options" not in response:
            response["X-Frame-Options"] = "DENY"

        # 3. Referrer Privacy
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 4. Hardware and Feature Lockdown
        response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"

        # 5. Cross-Origin Isolation
        response["Cross-Origin-Opener-Policy"] = "same-origin"
        response["Cross-Origin-Resource-Policy"] = "same-site"

        # 6. Conceal Backend Implementation Details
        response["Server"] = "ShiftFX-Shield/1.0"
        if "X-Powered-By" in response:
            del response["X-Powered-By"]

        # 7. In Production, enforce Cache-Control for authenticated and sensitive API endpoints
        if request.path.startswith("/api/"):
            if not response.has_header("Cache-Control"):
                response["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
                response["Pragma"] = "no-cache"

        return response
