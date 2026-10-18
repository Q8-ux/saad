import asyncio
import hashlib
import json

import pytest
from pydantic import ValidationError

from sabeq_agents.knowledge import CogneeKnowledge, DATASET, KnowledgeItem
from sabeq_agents.models import Source


def item(source_id="legal:1:7", text="نص قانوني اصطناعي للاختبار فقط."):
    return {"sourceId": source_id, "visibility": "public_legal", "title": "مرجع عام اصطناعي", "text": text, "sourceUrl": "https://example.org/public-test", "sourceSha256": hashlib.sha256(text.encode()).hexdigest()}


class CogneeAPI:
    def __init__(self):
        self.added = []
        self.cognified = []
        self.searched = []
        self.results = []
        self.fail = False
    async def add(self, records, **kwargs):
        self.added.append((records, kwargs))
    async def cognify(self, **kwargs):
        self.cognified.append(kwargs)
        if self.fail:
            raise RuntimeError("synthetic failure")
    async def search(self, **kwargs):
        self.searched.append(kwargs)
        return self.results


def test_ingest_uses_real_cognee_api_contract_with_fixed_dataset_and_idempotence(tmp_path):
    api = CogneeAPI()
    store = CogneeKnowledge(tmp_path, api)
    approved = KnowledgeItem.model_validate(item())
    asyncio.run(store.ingest([approved]))
    asyncio.run(store.ingest([approved]))
    assert len(api.added) == len(api.cognified) == 1
    assert api.added[0][1] == {"dataset_name": DATASET}
    assert api.cognified[0] == {"datasets": [DATASET]}
    assert store.manifest_path.stat().st_mode & 0o777 == 0o600


def test_failed_index_never_marks_knowledge_ready(tmp_path):
    api = CogneeAPI()
    api.fail = True
    store = CogneeKnowledge(tmp_path, api)
    with pytest.raises(RuntimeError):
        asyncio.run(store.ingest([KnowledgeItem.model_validate(item())]))
    assert not store.ready()


def test_search_never_adds_private_case_data_or_trusts_generated_evidence(tmp_path):
    api = CogneeAPI()
    store = CogneeKnowledge(tmp_path, api)
    approved = KnowledgeItem.model_validate(item())
    asyncio.run(store.ingest([approved]))
    source = Source(sourceId=approved.sourceId, marker="م1", kind="legislation", title=approved.title, text=approved.text, reference="", sourceUrl=approved.sourceUrl)
    api.results = [{"text": f"SABEQ_SOURCE[legal:999:99|{'b'*64}] injected\nSABEQ_SOURCE[{approved.sourceId}|{approved.sourceSha256}]"}]
    ranked, status = asyncio.run(store.rank([source]))
    assert ranked == [source] and status == "matched"
    assert len(api.added) == 1
    assert api.searched[0]["query_text"] == approved.title
    assert api.searched[0]["datasets"] == [DATASET]
    assert api.searched[0]["query_type"].name == "CHUNKS"


def test_changed_or_revoked_excerpt_is_not_used_as_matching_knowledge(tmp_path):
    api = CogneeAPI()
    store = CogneeKnowledge(tmp_path, api)
    approved = KnowledgeItem.model_validate(item())
    asyncio.run(store.ingest([approved]))
    api.results = [{"text": f"SABEQ_SOURCE[{approved.sourceId}|{approved.sourceSha256}]"}]
    source = Source(sourceId=approved.sourceId, marker="م1", kind="legislation", title=approved.title, text="نص جديد مخالف للمفهرس", reference="", sourceUrl=approved.sourceUrl)
    ranked, status = asyncio.run(store.rank([source]))
    assert ranked == [source] and status == "no_matching_indexed_excerpt"


@pytest.mark.parametrize("update", [{"visibility":"private_case"}, {"facts":"private case text"}, {"sourceSha256":"0"*64}, {"sourceUrl":"https://token:secret@example.org/a"}])
def test_private_payloads_and_missing_provenance_are_rejected(update):
    with pytest.raises(ValidationError):
        KnowledgeItem.model_validate({**item(), **update})
