FROM node:22-bookworm-slim

LABEL org.opencontainers.image.source="https://github.com/Q8-ux/saad"
LABEL org.opencontainers.image.description="Arabic Writing Studio authentication and project gateway"

WORKDIR /app

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    antiword \
    catdoc \
    imagemagick \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-ara \
    tesseract-ocr-eng \
    unrtf \
    unzip \
 && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node server.mjs credentials.mjs sms-auth.mjs document-import.mjs ./

ENV NODE_ENV=production
ENV LANG=C.UTF-8
ENV MAGICK_MEMORY_LIMIT=256MiB
ENV MAGICK_MAP_LIMIT=512MiB
ENV MAGICK_DISK_LIMIT=1GiB
ENV MAGICK_THREAD_LIMIT=2
EXPOSE 10000

USER node

CMD ["node", "server.mjs"]
