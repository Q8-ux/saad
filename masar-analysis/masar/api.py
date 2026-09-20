import collections
import hmac
import os
import threading
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .config import load_projects
from .engine import analyze
from .models import AnalysisRequest
from .providers import capabilities


def create_app(projects=None):
    @asynccontextmanager
    async def lifespan(app):
        app.state.projects = projects or load_projects()
        if len(app.state.projects) > 1 and any(p.social for p in app.state.projects.values()):
            raise ValueError("Private social sessions require one isolated deployment per project")
        yield

    app = FastAPI(title="مسار التحليل", version="1.0.0", lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)
    auth = HTTPBearer(auto_error=False)
    limiter, lock, slots = collections.defaultdict(collections.deque), threading.Lock(), threading.BoundedSemaphore(2)

    def project_auth(credentials: HTTPAuthorizationCredentials | None = Depends(auth)):
        token = credentials.credentials if credentials else ""
        if not token:
            raise HTTPException(401, "Project token required")
        for name, project in app.state.projects.items():
            expected = os.environ.get(project.token_env, "")
            if len(expected) >= 32 and hmac.compare_digest(token, expected):
                return name, project
        raise HTTPException(401, "Invalid project token")

    @app.get("/healthz")
    def health():
        return {"status": "ok", "service": "masar-analysis", "version": "1.0.0"}

    @app.get("/v1/capabilities")
    def caps(identity=Depends(project_auth)):
        return {"project": identity[0], **capabilities(identity[1])}

    @app.get("/v1/openapi.json")
    def schema(identity=Depends(project_auth)):
        return app.openapi()

    @app.post("/v1/analyze")
    def run(request: AnalysisRequest, identity=Depends(project_auth)):
        name, project = identity
        if not request.urls and not request.discover:
            raise HTTPException(422, "Supply URLs or set discover=true")
        now = time.monotonic()
        with lock:
            queue = limiter[name]
            while queue and queue[0] < now - 60:
                queue.popleft()
            if len(queue) >= project.requests_per_minute:
                raise HTTPException(429, "Project request limit reached", headers={"Retry-After": "60"})
            queue.append(now)
        if not slots.acquire(blocking=False):
            raise HTTPException(429, "Collection capacity is busy", headers={"Retry-After": "10"})
        try:
            return {"project": name, **analyze(request, project)}
        finally:
            slots.release()
    return app


app = create_app()
