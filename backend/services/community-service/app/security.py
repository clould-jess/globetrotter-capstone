import json
import os
from typing import Annotated
from urllib.error import HTTPError, URLError
from urllib.request import Request as URLRequest, urlopen
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel


class Identity(BaseModel):
    id: UUID
    display_name: str
    role: str


def authenticated(request: Request) -> Identity:
    # Never trust user-supplied identity headers, even on the internal network.
    cookie = request.headers.get("cookie", "")
    if not cookie or len(cookie) > 8192:
        raise HTTPException(401, "Authentication required")
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        if request.headers.get("sec-fetch-site") == "cross-site":
            raise HTTPException(403, "Cross-site request rejected")
    try:
        verification = URLRequest(
            os.getenv("USER_SERVICE_URL", "http://user-service:8000") + "/auth/session",
            headers={"Cookie": cookie},
        )
        with urlopen(verification, timeout=5) as response:
            return Identity.model_validate(json.load(response))
    except HTTPError as error:
        raise HTTPException(401 if error.code == 401 else 503, "Session verification failed") from error
    except (URLError, TimeoutError, ValueError) as error:
        raise HTTPException(503, "Session service unavailable") from error


User = Annotated[Identity, Depends(authenticated)]
