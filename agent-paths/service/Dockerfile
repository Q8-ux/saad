FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY agent-paths/integration-plan.json /app/agent-paths/integration-plan.json
COPY agent-paths/service/secure_gateway.py /app/agent-paths/service/secure_gateway.py
USER 65532:65532
EXPOSE 8787
CMD ["python", "agent-paths/service/secure_gateway.py"]
