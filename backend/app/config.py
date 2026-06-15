import os
from datetime import timedelta

SESSION_COOKIE_NAME = "session_id"
IDLE_TIMEOUT = timedelta(minutes=30)
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() != "false"

DEMO_USER_EMAIL = os.environ.get("DEMO_USER_EMAIL", "demo@example.com")
DEMO_USER_PASSWORD = os.environ.get("DEMO_USER_PASSWORD", "demotest123")
