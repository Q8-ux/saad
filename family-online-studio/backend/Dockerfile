FROM node:22-bookworm-slim AS search-build
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git cmake g++ make curl python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /search-src
RUN git init . && git remote add origin https://github.com/microsoft/BitNet.git && git fetch --depth 1 origin 0b341e582afbf9e1011f24744b554c96a3477eb5 && git checkout FETCH_HEAD && git submodule update --init --depth 1
COPY search/prepare-quantizer.py search/verify-model.py /tmp/search-build/
RUN python3 /tmp/search-build/prepare-quantizer.py /search-src
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DGGML_NATIVE=OFF -DGGML_AVX2=ON -DGGML_FMA=ON -DGGML_F16C=ON -DGGML_OPENMP=OFF -DLLAMA_OPENSSL=OFF -DLLAMA_BUILD_TOOLS=ON -DLLAMA_BUILD_COMMON=ON -DLLAMA_BUILD_SERVER=ON -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=ON && cmake --build build --target llama-server llama-quantize -j 2
RUN curl --fail --location --retry 3 https://huggingface.co/microsoft/bitnet-embedding-270m/resolve/5f1c2fd19f37ca653a3d719c8ee6cc1895f4b64f/bitnet-embeddings-270m-bf16-i2_s.gguf -o /search-src/original.gguf && echo '8ee5ae971b103cd55758934be54e5c9f7cc2b58b15890615acce8e649988c751  /search-src/original.gguf' | sha256sum -c - && build/bin/llama-quantize /search-src/original.gguf /search-src/search.gguf Q8_0 && python3 /tmp/search-build/verify-model.py /search-src/original.gguf /search-src/search.gguf && rm /search-src/original.gguf

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
    python3 \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node server.mjs credentials.mjs sms-auth.mjs document-import.mjs search-runtime.mjs ./
COPY --from=search-build /search-src/build/bin/llama-server /app/llama-server
COPY --from=search-build /search-src/search.gguf /app/search.gguf
COPY --chown=node:node search/server.py /app/search/server.py

ENV NODE_ENV=production
ENV LANG=C.UTF-8
ENV MAGICK_MEMORY_LIMIT=256MiB
ENV MAGICK_MAP_LIMIT=512MiB
ENV MAGICK_DISK_LIMIT=1GiB
ENV MAGICK_THREAD_LIMIT=2
EXPOSE 10000

USER node

CMD ["node", "server.mjs"]
