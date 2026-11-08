# Lightweight authenticated gateway for the existing Railway plan.
# Full model inference is deliberately separate: see Dockerfile.engine.
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    STUDIO_ALLOWED_ORIGINS=https://q8-ux.github.io \
    STUDIO_MAX_UPLOAD_MB=100
RUN groupadd -r voicebox && useradd -r -g voicebox -m voicebox
WORKDIR /app
COPY requirements-gateway.txt ./
RUN pip install --no-cache-dir -r requirements-gateway.txt
COPY gateway.py upstream_proxy.py runtime.py media_service.py youtube_service.py ./
RUN mkdir -p /data && chown -R voicebox:voicebox /app /data
USER voicebox
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','8080')+'/healthz',timeout=4)"
CMD ["sh", "-c", "exec uvicorn runtime:app --host 0.0.0.0 --port ${PORT:-8080} --no-access-log"]
