import asyncio
import copy
import json
from uuid import uuid4

import pytest
from pydantic import ValidationError
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel

from sabeq_agents.models import AuditError, Job, PleadingContent, audit_content
from sabeq_agents.pipeline import make_agent, make_graph


def job_data():
    return {"requestId": str(uuid4()), "language": "ar", "documentKind": "claim", "template": {"id": "test-claim", "version": 1, "kind": "claim", "title": "نموذج اختبار فارغ", "sourceSha256": "a" * 64}, "caseData": {"facts": "واقعة اصطناعية للاختبار فقط بشأن مبلغ لم يتم سداده.", "requests": "إلزام الخصم بسداد المبلغ المطلوب.", "clientName": "شخص افتراضي"}, "fields": {"judgmentNumber": ""}, "sources": [{"sourceId": "legal:1:7", "marker": "م1", "kind": "legislation", "title": "دليل اصطناعي للاختبار", "text": "المادة 12: نص اصطناعي لا يمثل قانوناً حقيقياً.", "reference": "المادة 12", "sourceUrl": "https://example.org/test"}]}


def content_data(job):
    return {"facts": job.caseData["facts"], "requests": job.caseData["requests"], "grounds": "تطبيق نص المادة 12 على الواقعة الاصطناعية 【م1】.", "fields": {}, "factualNotes": [], "legalResearchNotes": ""}


class Knowledge:
    async def rank(self, sources):
        return list(reversed(sources)), "fixture"


def model_returning(data, calls):
    def respond(messages, info):
        calls.append(messages)
        value = data[len(calls) - 1] if isinstance(data, list) else data
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, value)])
    return FunctionModel(respond)


def run(job, model):
    return asyncio.run(make_graph(make_agent(model), Knowledge()).ainvoke({"job": job}, config={"recursion_limit": 8}))


def test_real_graph_and_typed_agent_keep_markers_and_only_four_stages():
    job = Job.model_validate(job_data())
    calls = []
    state = run(job, model_returning(content_data(job), calls))
    assert state["steps"] == ["validate", "knowledge", "draft", "audit"]
    assert state["model_requests"] == 1
    assert isinstance(state["content"], PleadingContent)
    assert "【م1】" in state["content"].grounds


def test_unknown_citation_is_corrected_with_bounded_pydantic_retry():
    job = Job.model_validate(job_data())
    valid = content_data(job)
    invalid = {**valid, "grounds": "ادعاء اصطناعي 【م99】"}
    calls = []
    state = run(job, model_returning([invalid, valid], calls))
    assert state["model_requests"] == len(calls) == 2
    assert "م99" not in state["content"].grounds


def test_persistent_hallucination_stops_after_three_model_requests():
    job = Job.model_validate(job_data())
    calls = []
    with pytest.raises(Exception):
        run(job, model_returning({**content_data(job), "grounds": "المادة 999 【م1】"}, calls))
    assert len(calls) == 3


def test_no_sources_no_model_and_missing_sources_notice_outside_body():
    data = job_data()
    data["sources"] = []
    job = Job.model_validate(data)
    calls = []
    state = run(job, model_returning({}, calls))
    assert calls == []
    assert state["model_requests"] == 0
    assert state["content"].facts == job.caseData["facts"]
    assert state["content"].grounds == ""
    assert "لا توجد مصادر" in state["content"].legalResearchNotes
    assert "لا توجد مصادر" not in state["content"].facts


@pytest.mark.parametrize("update,code", [
    ({"grounds": "المادة 999 【م1】"}, "unsupported_legal_number"),
    ({"grounds": "المادة ٩٩٩ 【م1】"}, "unsupported_legal_number"),
    ({"grounds": "المواد 12، 999 【م1】"}, "unsupported_legal_number"),
    ({"grounds": "قضت محكمة التمييز بقبول طلب اصطناعي 【م1】"}, "unsupported_cassation"),
    ({"grounds": "قانون رقم 99 【م1】"}, "unsupported_legal_number"),
    ({"grounds": "هذه المذكرة مسودة 【م1】"}, "internal_notes_in_body"),
    ({"fields": {"civilId": "123456789012"}}, "invented_field"),
    ({"fields": {"phone": "00000000"}}, "unknown_field"),
    ({"facts": "English-only invented facts."}, "wrong_language"),
])
def test_audit_rejects_unverified_legal_claims_and_fields(update, code):
    job = Job.model_validate(job_data())
    with pytest.raises(AuditError, match=code):
        audit_content(PleadingContent.model_validate({**content_data(job), **update}), job)


def test_filled_identifier_cannot_be_replaced_by_model():
    data = job_data()
    data["fields"] = {"judgmentNumber": "0045/2026"}
    data["caseData"]["otherNumber"] = "9999/2026"
    job = Job.model_validate(data)
    with pytest.raises(AuditError, match="changed_field"):
        audit_content(PleadingContent.model_validate({**content_data(job), "fields": {"judgmentNumber": "9999/2026"}}), job)


def test_cross_request_state_and_prompts_do_not_mix():
    first, second = Job.model_validate(job_data()), Job.model_validate(job_data())
    second.caseData["facts"] = "واقعة اختبار ثانية مختلفة تماماً عن القضية الأولى."
    calls = []
    agent = make_agent(model_returning([content_data(first), content_data(second)], calls))
    graph = make_graph(agent, Knowledge())
    a = asyncio.run(graph.ainvoke({"job": first}))
    b = asyncio.run(graph.ainvoke({"job": second}))
    assert a["content"].facts != b["content"].facts
    assert first.caseData["facts"] not in str(calls[1])


def test_knowledge_cannot_append_or_modify_evidence():
    job = Job.model_validate(job_data())
    class UnsafeKnowledge:
        async def rank(self, sources):
            return [sources[0].model_copy(update={"text": "دليل مزيف"})], "fixture"
    graph = make_graph(make_agent(model_returning({}, [])), UnsafeKnowledge())
    with pytest.raises(AuditError, match="knowledge_changed"):
        asyncio.run(graph.ainvoke({"job": job}))


@pytest.mark.parametrize("update", [{"language":"en"}, {"unknown":"value"}, {"sources":job_data()["sources"] * 2}, {"requestId":"user-controlled-id"}, {"fields":{"unknown":"value"}}])
def test_input_schema_rejects_wrong_language_unknown_keys_and_scope(update):
    with pytest.raises(ValidationError):
        Job.model_validate({**job_data(), **update})
