from django.http import HttpResponseForbidden
from django.conf import settings


class RestrictAdminMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/admin/"):
            # Get client IP safely behind Render/other proxies
            x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded_for:
                # Sometimes multiple IPs are listed, take the first one
                ip = x_forwarded_for.split(",")[0].strip()
            else:
                ip = request.META.get("REMOTE_ADDR")

            allowed_ips = getattr(settings, "ALLOWED_ADMIN_IPS", [])
            if ip not in allowed_ips:
                return HttpResponseForbidden("Access denied.")

        return self.get_response(request)
