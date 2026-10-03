"""Private NDJSON worker. Protocol stdout contains responses only, never library logs."""
import asyncio
import importlib.metadata
import json
import logging
import os
import sys

os.umask(0o077)
os.environ["TELEMETRY_DISABLED"] = "true"
# Cognee dependencies sometimes emit directly to stdout. Quarantine all library output.
protocol = os.fdopen(os.dup(sys.stdout.fileno()), "w", encoding="utf-8", buffering=1)
devnull = open(os.devnull, "w")
os.dup2(devnull.fileno(), sys.stdout.fileno())
os.dup2(devnull.fileno(), sys.stderr.fileno())
logging.disable(logging.CRITICAL)

from .knowledge import CogneeKnowledge
from .models import Job
from .pipeline import make_agent, make_graph


async def main():
    knowledge = CogneeKnowledge(os.environ.get("SABEQ_COGNEE_ROOT", "/var/data/sabeq-knowledge"))
    graph = None
    while line := await asyncio.to_thread(sys.stdin.readline):
        request_id = None
        try:
            envelope = json.loads(line)
            request_id = envelope["id"]
            if envelope.get("op") == "status":
                result = {"knowledgeReady": knowledge.ready(), "versions": {name: importlib.metadata.version(name) for name in ["langgraph", "pydantic-ai-slim", "cognee"]}}
            elif envelope.get("op") == "memo":
                job = Job.model_validate(envelope["payload"])
                if graph is None:
                    graph = make_graph(make_agent(), knowledge)
                state = await asyncio.wait_for(graph.ainvoke({"job": job}, config={"recursion_limit": 8}), timeout=170)
                result = {"requestId": job.requestId, "content": state["content"].model_dump(), "audit": {"steps": state["steps"], "knowledgeStatus": state["knowledge_status"], "modelRequests": state["model_requests"], "sourceIds": [s.sourceId for s in state["sources"]], "missingSources": not bool(job.sources)}}
            else:
                raise ValueError("unknown_operation")
            response = {"id": request_id, "ok": True, "result": result}
        except asyncio.TimeoutError:
            response = {"id": request_id, "ok": False, "error": "agent_timeout"}
        except Exception:
            # No prompt, client data, token, validation payload, or provider body escapes.
            response = {"id": request_id, "ok": False, "error": "agent_failed"}
        protocol.write(json.dumps(response, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    asyncio.run(main())
