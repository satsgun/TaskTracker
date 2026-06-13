from datetime import datetime

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.config import IDLE_TIMEOUT, SESSION_COOKIE_NAME
from app.database import get_db
from app.models import User


def get_current_user(
    session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
    not_authenticated = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if session_id is None:
        raise not_authenticated

    result = crud.get_session_with_user(db, session_id)
    if result is None:
        raise not_authenticated

    session, user = result

    if datetime.utcnow() - session.last_seen_at >= IDLE_TIMEOUT:
        crud.delete_session(db, session_id)
        raise not_authenticated

    crud.touch_session(db, session)
    return user
