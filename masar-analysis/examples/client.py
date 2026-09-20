"""Call from a project's backend, with its own key stored in the environment."""
import os
import httpx


def analyze(query, urls, *, use_llm=False):
    base = os.environ["MASAR_API_URL"].rstrip("/")
    response = httpx.post(base + "/v1/analyze", timeout=300,
                          headers={"Authorization": "Bearer " + os.environ["MASAR_API_KEY"]},
                          json={"query": query, "urls": urls, "use_llm": use_llm})
    response.raise_for_status()
    return response.json()
