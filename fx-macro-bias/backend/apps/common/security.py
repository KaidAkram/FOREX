"""
ShiftFX Cybersecurity & Defensive Engineering Utilities
Implements SSRF defense, input sanitization, and production secret enforcement.
"""

import ipaddress
import re
from urllib.parse import urlparse
import html
from django.core.exceptions import ValidationError
from django.conf import settings

# Disallowed private and loopback networks to prevent SSRF
PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),  # AWS / Cloud Instance Metadata
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def validate_safe_webhook_url(url: str) -> str:
    """
    Validates that a webhook URL is safe from SSRF (Server-Side Request Forgery):
    1. Must use HTTPS scheme.
    2. Must not target private IPs, localhost, or cloud metadata services (169.254.169.254).
    3. Must have a valid DNS hostname.
    """
    if not url:
        return ""

    parsed = urlparse(url.strip())
    if parsed.scheme.lower() != "https":
        raise ValidationError("Les webhooks de notification doivent impérativement utiliser le protocole sécurisé HTTPS.")

    hostname = parsed.hostname
    if not hostname:
        raise ValidationError("URL de webhook invalide : nom d'hôte manquant.")

    # Block obvious localhost strings
    if hostname.lower() in ["localhost", "127.0.0.1", "0.0.0.0", "instance-data", "metadata"]:
        raise ValidationError("Les cibles locales et les services de métadonnées sont interdits.")

    # Check if hostname is an IP address
    try:
        ip = ipaddress.ip_address(hostname)
        for net in PRIVATE_NETWORKS:
            if ip in net:
                raise ValidationError("Les adresses IP privées et réseaux internes sont interdits (Défense SSRF).")
    except ValueError:
        # Hostname is a domain name (e.g. discord.com, hooks.slack.com), which is valid
        pass

    return url.strip()


def sanitize_input_text(value: str, max_length: int = 1000) -> str:
    """
    Sanitizes arbitrary text input to prevent Stored XSS and payload injections.
    Escapes HTML entities and clamps maximum length.
    """
    if not value:
        return ""
    # Strip null bytes and control characters
    cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", str(value))
    # Escape HTML tags (<script>, <iframe>, etc.)
    escaped = html.escape(cleaned.strip())
    return escaped[:max_length]


def is_production_mode() -> bool:
    """
    Returns True if running in strict production settings (DEBUG=False).
    """
    return getattr(settings, "DEBUG", True) is False
