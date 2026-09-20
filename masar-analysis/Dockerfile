FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.lock pyproject.toml ./
RUN pip install --no-cache-dir -r requirements.lock
COPY masar ./masar
RUN pip install --no-cache-dir --no-deps . && useradd --uid 10001 --create-home masar
USER 10001
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8787/healthz', timeout=2)" || exit 1
CMD ["masar", "serve", "--host", "0.0.0.0", "--port", "8787"]
