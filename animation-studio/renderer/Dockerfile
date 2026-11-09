FROM node:22-bookworm
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends blender ffmpeg libnss3 libatk-bridge2.0-0 libgbm1 libasound2 libx11-xcb1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxkbcommon0 libgtk-3-0 fonts-noto-core fonts-noto-extra fonts-noto-color-emoji ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
ENV PORT=10000
EXPOSE 10000
USER node
CMD ["node","server.mjs"]
