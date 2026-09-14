<!-- Copyright NVIDIA Corporation and contributors. Apache-2.0.
Selected prose cells from RAG/notebooks/langchain/langchain_basic_RAG.ipynb.
Extracted by Madar on 2026-09-14; code, outputs and other sections omitted.
This excerpt is not the complete notebook or an NVIDIA DLI course. -->

# RAG Example Using NVIDIA API Catalog and LangChain

This notebook introduces how to use LangChain to interact with NVIDIA hosted NIM microservices like chat, embedding, and reranking models to build a simple retrieval-augmented generation (RAG) application.

## Installation and Requirements

Create a Python environment (preferably with Conda) using Python version 3.10.14. 
To install Jupyter Lab, refer to the [installation](https://jupyter.org/install) page.

To get started you need an `NVIDIA_API_KEY` to use the NVIDIA API Catalog:

1) Create a free account with [NVIDIA](https://build.nvidia.com/explore/discover).
2) Click on your model of choice.
3) Under Input select the Python tab, and click **Get API Key** and then click **Generate Key**.
4) Copy and save the generated key as NVIDIA_API_KEY. From there, you should have access to the endpoints.

### 3) Obtain some toy text dataset
Here we are loading a toy data from a text documents and in real-time data can be loaded from various sources. 
Read [here](https://python.langchain.com/v0.2/docs/tutorials/rag/#go-deeper) for loading data from different sources

### 4) Process the documents into vectorstore and save it to disk

Real world documents can be very long, this makes it hard to fit in the context window of many models. Even for those models that could fit the full post in their context window, models can struggle to find information in very long inputs.

To handle this we’ll split the Document into chunks for embedding and vector storage. More on text splitting [here](https://python.langchain.com/v0.2/docs/concepts/#text-splitters)

To enable runtime search, we index text chunks by embedding each document split and storing these embeddings in a vector database. Later to search, we embed the query and perform a similarity search to find the stored splits with embeddings most similar to the query.

### 5) Read the previously processed & saved vectore store back

### 6) Wrap the restored vectorsore into a retriever and ask our question 

## RAG Example with LLM, Embedding & Reranking

### Enhancing accuracy for single data sources

This example demonstrates how a re-ranking model can be used to combine retrieval results and improve accuracy during retrieval of documents.

Typically, reranking is a critical piece of high-accuracy, efficient retrieval pipelines. Generally, there are two important use cases:

- Combining results from multiple data sources
- Enhancing accuracy for single data sources

Here, we focus on demonstrating only the second use case. If you want to know more, check [here](https://github.com/langchain-ai/langchain-nvidia/blob/main/libs/ai-endpoints/docs/retrievers/nvidia_rerank.ipynb)

#### Note:
- In this notebook, we have used NVIDIA NIM microservices from the NVIDIA API Catalog.
- The above APIs, ChatNVIDIA, NVIDIAEmbedding, and NVIDIARerank, also support self-hosted NIM microservices.
- Change the `base_url` to your deployed NIM URL.
- Example: `llm = ChatNVIDIA(base_url="http://localhost:8000/v1", model="meta/llama3-8b-instruct")`
- NIM can be hosted locally using Docker, following the [NVIDIA NIM for LLMs](https://docs.nvidia.com/nim/large-language-models/latest/getting-started.html) documentation.
