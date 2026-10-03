FROM node:24-bookworm-slim AS node-runtime
FROM python:3.12-slim-bookworm
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-ara libgomp1 libstdc++6 \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev
COPY agents/requirements.txt ./agents/requirements.txt
RUN python3 -m venv /opt/sabeq-agents \
  && /opt/sabeq-agents/bin/pip install --no-cache-dir -r agents/requirements.txt
COPY . .
ENV NODE_ENV=production PORT=3000 DATA_DIR=/var/data/db UPLOAD_DIR=/var/data/uploads MOJ_AUTO_SYNC=true SABEQ_COGNEE_ROOT=/var/data/sabeq-knowledge
EXPOSE 3000
CMD ["npm","start"]
