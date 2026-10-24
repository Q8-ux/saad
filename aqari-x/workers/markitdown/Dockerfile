FROM python:3.12-slim
RUN useradd --uid 10001 --create-home extractor
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
USER extractor
EXPOSE 8080
CMD ["python", "server.py"]
