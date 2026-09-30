import logging
from django.http import JsonResponse

logger = logging.getLogger("apps")

class DemoProtectMiddleware:
    """
    Prevents demo accounts from performing DELETE operations to protect the DB.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.demo_emails = {
            "customer@example.com",
            "admin@example.com",
            "gadget-gear@example.com",
        }

    def __call__(self, request):
        if request.method == "DELETE":
            user = getattr(request, "user", None)
            
            # DRF SimpleJWT authentication for API requests
            if not user or not user.is_authenticated:
                try:
                    from rest_framework_simplejwt.authentication import JWTAuthentication
                    auth_tuple = JWTAuthentication().authenticate(request)
                    if auth_tuple is not None:
                        user = auth_tuple[0]
                except Exception:
                    pass
            
            if user and user.is_authenticated and getattr(user, "email", "") in self.demo_emails:
                logger.warning(f"Blocked demo user {user.email} from deleting.")
                return JsonResponse({
                    "error": {
                        "code": "PERMISSION_DENIED",
                        "message": "Delete operation is disabled for demo accounts.",
                        "details": None
                    }
                }, status=403)
                
        return self.get_response(request)
