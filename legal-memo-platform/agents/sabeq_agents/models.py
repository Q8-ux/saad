import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


FIELDS = frozenset({
    "civilId", "clientAddress", "otherAddress", "judgmentNumber", "judgmentDate",
    "judgmentCircuit", "judgmentCourt", "judgmentOperative", "originalRequests",
    "originalGrounds", "originalPlaintiff", "originalDefendant", "notificationDate",
    "appealGrounds", "announcementDate", "hearingDate", "hearingTime",
})


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Source(StrictModel):
    sourceId: str = Field(min_length=1, max_length=160, pattern=r"^[a-zA-Z0-9:_-]+$")
    marker: str = Field(pattern=r"^م[1-9][0-9]?$", max_length=3)
    kind: Literal["legislation", "cassation"]
    title: str = Field(min_length=1, max_length=500)
    text: str = Field(min_length=1, max_length=12000)
    reference: str = Field(max_length=500)
    sourceUrl: str = Field(max_length=2000)


class Template(StrictModel):
    id: str = Field(min_length=1, max_length=160)
    version: int = Field(ge=1)
    kind: Literal["claim", "appeal"]
    title: str = Field(min_length=1, max_length=500)
    sourceSha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class Job(StrictModel):
    requestId: str
    language: Literal["ar"]
    documentKind: Literal["claim", "appeal", "memorandum"]
    template: Template
    caseData: dict[str, str] = Field(max_length=40)
    fields: dict[str, str] = Field(max_length=17)
    sources: list[Source] = Field(max_length=16)

    @field_validator("requestId")
    @classmethod
    def valid_request_id(cls, value: str) -> str:
        UUID(value)
        return value

    @model_validator(mode="after")
    def validate_case(self):
        if len(self.caseData.get("facts", "").strip()) < 20:
            raise ValueError("facts_required")
        if len(self.caseData.get("requests", "").strip()) < 5:
            raise ValueError("requests_required")
        if sum(len(v) for v in self.caseData.values()) > 150000:
            raise ValueError("case_too_large")
        if set(self.fields) - FIELDS or any(len(v) > 5000 for v in self.fields.values()):
            raise ValueError("invalid_fields")
        if len({s.marker for s in self.sources}) != len(self.sources):
            raise ValueError("duplicate_markers")
        if len({s.sourceId for s in self.sources}) != len(self.sources):
            raise ValueError("duplicate_sources")
        if self.documentKind == "appeal" and self.template.kind != "appeal":
            raise ValueError("wrong_template")
        if self.documentKind != "appeal" and self.template.kind != "claim":
            raise ValueError("wrong_template")
        return self


class PleadingContent(StrictModel):
    facts: str = Field(min_length=1, max_length=60000)
    grounds: str = Field(max_length=100000)
    requests: str = Field(min_length=1, max_length=30000)
    legalResearchNotes: str = Field(max_length=6000)
    factualNotes: list[str] = Field(max_length=30)
    fields: dict[str, str] = Field(max_length=17)


class AuditError(ValueError):
    pass


_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
_MARKERS = re.compile(r"[【\[]\s*(م\d+)\s*[】\]]")
_CLAIM_NUMBER = re.compile(r"(المادة|المواد|المادتين|المادتان|قانون\s+رقم|(?:ال)?طعن\s+رقم)\s*[(:：]?\s*([0-9]+(?:\s*(?:[/.,،-]|و)\s*[0-9]+)*)")
_INTERNAL = re.compile(r"الذكاء الاصطناعي|ملاحظات المراجعة|مراجعة المسودة|نتيجة التحليل|هذه المذكرة مسودة|\bAI assistant\b", re.I)


def audit_content(content: PleadingContent, job: Job) -> PleadingContent:
    """Conservative provenance checks, not a substitute for legal review."""
    if set(content.fields) - FIELDS:
        raise AuditError("unknown_field")
    approved_data = "\n".join([*job.caseData.values(), *job.fields.values()])
    for key, value in content.fields.items():
        if len(value) > 5000 or (value.strip() and value.strip() not in approved_data):
            raise AuditError("invented_field")
        if job.fields.get(key) and value != job.fields[key]:
            raise AuditError("changed_field")
    sources = {s.marker: s for s in job.sources}
    body = "\n".join([content.facts, content.grounds, content.requests])
    if _INTERNAL.search(body):
        raise AuditError("internal_notes_in_body")
    if set(_MARKERS.findall(body)) - sources.keys():
        raise AuditError("unknown_citation")
    if job.language == "ar" and any(not re.search(r"[\u0600-\u06ff]", text) for text in [content.facts, content.requests]):
        raise AuditError("wrong_language")
    for paragraph in re.split(r"\n+", body):
        normalized = paragraph.translate(_DIGITS)
        claims = _CLAIM_NUMBER.findall(normalized)
        if claims:
            cited = [sources[m] for m in _MARKERS.findall(paragraph) if m in sources]
            corpus = "\n".join(s.text + "\n" + s.reference + "\n" + s.title for s in cited).translate(_DIGITS)
            def family(label):
                return "article" if label.startswith("الماد") or label == "المواد" else "law" if label.startswith("قانون") else "appeal"
            supported = {}
            for label, numbers in _CLAIM_NUMBER.findall(corpus):
                supported.setdefault(family(label), set()).update(re.findall(r"\d+", numbers))
            for label, numbers in claims:
                if not set(re.findall(r"\d+", numbers)) <= supported.get(family(label), set()):
                    raise AuditError("unsupported_legal_number")
        if ("محكمة التمييز" in paragraph or "قضت التمييز" in paragraph) and not any(sources[m].kind == "cassation" for m in _MARKERS.findall(paragraph) if m in sources):
            raise AuditError("unsupported_cassation")
    for paragraph in content.grounds.splitlines():
        if len(paragraph.strip()) > 60 and not _MARKERS.search(paragraph):
            raise AuditError("uncited_ground")
    return content
