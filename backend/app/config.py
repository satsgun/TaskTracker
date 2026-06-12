import os
from datetime import timedelta

SESSION_COOKIE_NAME = "session_id"
IDLE_TIMEOUT = timedelta(minutes=30)
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() != "false"
