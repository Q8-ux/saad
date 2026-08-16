FROM node:24-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-ara \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production PORT=3000 DATA_DIR=/var/data/db UPLOAD_DIR=/var/data/uploads MOJ_AUTO_SYNC=true
EXPOSE 3000
CMD ["npm","start"]
