FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 REQUIRE_API_KEY=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api.py index.html ./
RUN useradd --create-home --uid 10001 translator && chown -R translator:translator /app
USER translator
EXPOSE 7860
CMD ["uvicorn","api:app","--host","0.0.0.0","--port","7860","--workers","1"]
