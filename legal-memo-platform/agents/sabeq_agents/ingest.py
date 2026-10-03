"""Admin CLI: accept ONLY an approved public knowledge export, never case files."""
import asyncio
import json
import os
import sys

from .knowledge import CogneeKnowledge, KnowledgeItem


async def main():
    os.umask(0o077)
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m sabeq_agents.ingest approved-public-export.json")
    items = [KnowledgeItem.model_validate(item) for item in json.loads(open(sys.argv[1], encoding="utf-8").read())]
    store = CogneeKnowledge(os.environ.get("SABEQ_COGNEE_ROOT", "/var/data/sabeq-knowledge"))
    result = await store.ingest(items)
    print(json.dumps(result))


if __name__ == "__main__":
    asyncio.run(main())
