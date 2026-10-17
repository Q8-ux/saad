import hashlib
import json
import os
import re
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import Field, model_validator

from .models import Source, StrictModel

DATASET = "sabeq_approved_public_v1"
TAG = re.compile(r"SABEQ_SOURCE\[([a-zA-Z0-9:_-]+)\|([a-f0-9]{64})\]")


class KnowledgeItem(StrictModel):
    sourceId: str = Field(pattern=r"^[a-zA-Z0-9:_-]+$", max_length=160)
    visibility: Literal["public_legal", "approved_blank_template"]
    title: str = Field(min_length=1, max_length=500)
    text: str = Field(min_length=1, max_length=60000)
    sourceUrl: str = Field(max_length=2000)
    sourceSha256: str = Field(pattern=r"^[a-f0-9]{64}$")

    @model_validator(mode="after")
    def approved_public_only(self):
        if hashlib.sha256(self.text.encode()).hexdigest() != self.sourceSha256:
            raise ValueError("knowledge_checksum_mismatch")
        if self.visibility == "public_legal":
            url = urlparse(self.sourceUrl)
            if url.scheme != "https" or not url.hostname or url.username or url.password:
                raise ValueError("public_original_url_required")
        elif not self.sourceId.startswith("template:") or self.sourceUrl:
            raise ValueError("invalid_blank_template")
        return self


class CogneeKnowledge:
    def __init__(self, root: str | Path, api=None):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.root.chmod(0o700)
        self.manifest_path = self.root / "approved-manifest.json"
        self.api = api

    def ready(self):
        return self.manifest_path.exists()

    def _api(self):
        if self.api is None:
            # Set before import. Case queries are never passed to Cognee search.
            os.environ["TELEMETRY_DISABLED"] = "true"
            os.environ["LLM_API_KEY"] = os.environ.get("OPENAI_API_KEY", "")
            os.environ["EMBEDDING_API_KEY"] = os.environ.get("OPENAI_API_KEY", "")
            os.environ["LLM_MODEL"] = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
            os.environ["LLM_PROVIDER"] = "openai"
            import cognee
            cognee.config.system_root_directory(str(self.root / "system"))
            cognee.config.data_root_directory(str(self.root / "data"))
            self.api = cognee
        return self.api

    async def ingest(self, items: list[KnowledgeItem]):
        """Offline/admin-only. Never called by a visitor's memo request."""
        if not items or len(items) > 500:
            raise ValueError("invalid_knowledge_batch")
        if len({item.sourceId for item in items}) != len(items):
            raise ValueError("duplicate_knowledge_ids")
        api = self._api()
        old = json.loads(self.manifest_path.read_text()) if self.ready() else {}
        changed = [item for item in items if old.get(item.sourceId, {}).get("checksum") != item.sourceSha256]
        if changed:
            records = [f"SABEQ_SOURCE[{item.sourceId}|{item.sourceSha256}]\n{item.title}\n{item.text}" for item in changed]
            await api.add(records, dataset_name=DATASET)
            await api.cognify(datasets=[DATASET])
            manifest = {**old, **{item.sourceId: {"checksum": item.sourceSha256, "text": item.text, "sourceUrl": item.sourceUrl} for item in changed}}
            temp = self.manifest_path.with_suffix(".tmp")
            temp.write_text(json.dumps(manifest, ensure_ascii=False))
            temp.chmod(0o600)
            temp.replace(self.manifest_path)
        return {"indexed": len(changed), "total": len(items)}

    async def rank(self, sources: list[Source]):
        if not sources:
            return [], "not_needed"
        if not self.ready():
            raise RuntimeError("knowledge_not_initialized")
        manifest = json.loads(self.manifest_path.read_text())
        # Native search sends a verbatim window of the approved chunk, not its entire text.
        current = {s.sourceId: manifest[s.sourceId]["checksum"] for s in sources if s.sourceId in manifest and s.text in manifest[s.sourceId]["text"] and s.sourceUrl == manifest[s.sourceId]["sourceUrl"]}
        if not current:
            return sources, "no_matching_indexed_excerpt"
        api = self._api()
        from cognee.api.v1.search import SearchType
        # Query public reference titles only. No names, facts, or conversation are stored.
        results = await api.search(query_text="\n".join(dict.fromkeys(s.title for s in sources if s.sourceId in current))[:4000], query_type=SearchType.CHUNKS, datasets=[DATASET], top_k=16, only_context=True)
        raw = json.dumps([r.model_dump(mode="json") if hasattr(r, "model_dump") else r for r in results], ensure_ascii=False, default=str)
        ranked = []
        for source_id, checksum in TAG.findall(raw):
            if source_id in current and checksum == current[source_id] and source_id not in ranked:
                ranked.append(source_id)
        by_id = {s.sourceId: s for s in sources}
        ordered = [by_id[key] for key in ranked] + [s for s in sources if s.sourceId not in ranked]
        return ordered, "matched" if ranked else "no_matching_indexed_excerpt"
