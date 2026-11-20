FROM ubuntu:24.04 AS build
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git cmake clang-18 make python3 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN git init . && git remote add origin https://github.com/microsoft/BitNet.git && git fetch --depth 1 origin 0b341e582afbf9e1011f24744b554c96a3477eb5 && git checkout FETCH_HEAD && git submodule update --init --depth 1
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=clang-18 -DCMAKE_CXX_COMPILER=clang++-18 -DBUILD_SHARED_LIBS=OFF -DGGML_NATIVE=OFF -DGGML_AVX2=ON -DGGML_FMA=ON -DGGML_F16C=ON -DGGML_OPENMP=OFF -DLLAMA_CURL=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=ON && cmake --build build --target llama-server -j 2
RUN curl --fail --location --retry 3 https://huggingface.co/microsoft/bitnet-embedding-270m/resolve/5f1c2fd19f37ca653a3d719c8ee6cc1895f4b64f/bitnet-embeddings-270m-bf16-i2_s.gguf -o /src/search.gguf && echo '8ee5ae971b103cd55758934be54e5c9f7cc2b58b15890615acce8e649988c751  /src/search.gguf' | sha256sum -c -

FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates libstdc++6 && rm -rf /var/lib/apt/lists/* && useradd --create-home studio
COPY --from=build /src/build/bin/llama-server /app/llama-server
COPY --from=build /src/search.gguf /app/search.gguf
COPY server.py /app/server.py
USER studio
ENV PORT=10000 PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
EXPOSE 10000
CMD ["python3", "/app/server.py"]
