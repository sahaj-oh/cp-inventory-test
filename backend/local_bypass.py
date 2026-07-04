"""LOCAL DEV ONLY — gitignored, never deployed.

Enables phone-only login (no OTP) on a developer's machine, where the SMS
provider (Kaleyra) isn't reachable. The presence of this file turns the bypass
ON; in production the file is absent, the import in auth_routes.py fails softly,
and login stays strictly OTP-only.

Kept loopback-guarded as defense-in-depth, so even if this file ever leaked
onto a server it could only bypass for requests originating on that host.
"""

from flask import request


def phone_login_bypass_enabled() -> bool:
    """Return True to allow POST /auth/phone-login even when OTP_ENABLED=true.

    Restricted to genuinely local requests: a loopback remote_addr AND no
    X-Forwarded-For (real proxied traffic always carries that header).
    """
    if request.headers.get("X-Forwarded-For"):
        return False
    addr = (request.remote_addr or "").strip()
    return addr in ("127.0.0.1", "::1", "localhost")
