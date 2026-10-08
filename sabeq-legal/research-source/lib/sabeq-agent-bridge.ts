import { caseReasoningInstructions, type CasePlan } from "./case-reasoning";
import { legalSourceCoverage } from "./legal-source-coverage";
import { env } from "cloudflare:workers";
import { parsePleadingContent, type PleadingContent, type PleadingInput, type TemplateInfo } from "./pleading-document";
import { isCassationEvidence, type LegalEvidence } from "./legal-search";
import { RequestError } from "./request-security";

type AgentEnvironment = { SABEQ_AGENT_ENABLED?: string; SABEQ_AGENT_URL?: string; SABEQ_AGENT_BRIDGE_TOKEN?: string };
type AgentAudit = { steps: string[]; knowledgeStatus: string; modelRequests: number; sourceIds: string[]; missingSources: boolean };

export function agentPipelineEnabled() {
  return (env as unknown as AgentEnvironment).SABEQ_AGENT_ENABLED === "true";
}

export function evidenceSourceId(item: LegalEvidence, index=0) {
  return `legal:${item.documentId}:${item.chunkId || `excerpt-${index}`}`;
}

export async function generateAgentPleading(input: { caseData: PleadingInput; fields: Record<string,string>; documentKind: "claim" | "appeal" | "memorandum"; template: TemplateInfo; evidence: LegalEvidence[]; casePlan?: CasePlan }, transport: typeof fetch = fetch): Promise<{content:PleadingContent; audit:AgentAudit}> {
  const runtime = env as unknown as AgentEnvironment;
  let url: URL;
  try {
    url = new URL(runtime.SABEQ_AGENT_URL || "");
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/internal/sabeq-agents/memo") throw Error();
  } catch { throw new RequestError("لم يكتمل إعداد مسار الصياغة. يرجى مراجعة إدارة المجموعة.",503); }
  const token = runtime.SABEQ_AGENT_BRIDGE_TOKEN || "";
  if (token.length < 32) throw new RequestError("لم يكتمل إعداد مسار الصياغة. يرجى مراجعة إدارة المجموعة.",503);
  const requestId = crypto.randomUUID();
  const sources = input.evidence.map((item,index)=>({sourceId:evidenceSourceId(item,index),marker:`م${index+1}`,kind:isCassationEvidence(item)?"cassation":"legislation",title:item.title,text:item.text,reference:item.reference||"",sourceUrl:item.sourceUrl||""}));
  const payload = {caseReasoning:{revision:"case-grounded-memo-1",instructions:caseReasoningInstructions,plan:input.casePlan||null},sourceCoverage:legalSourceCoverage(input.evidence),requestId,language:"ar",documentKind:input.documentKind,template:{id:input.template.id,version:input.template.version,kind:input.template.kind,title:input.template.title,sourceSha256:input.template.sourceSha256},caseData:input.caseData,fields:input.fields,sources};
  let response: Response;
  try {
    response = await transport(url, {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(185_000),redirect:"error"});
  } catch { throw new RequestError("تعذر اتصال مسار الصياغة. احتفظ ببياناتك وأعد المحاولة.",503); }
  if (!response.ok) throw new RequestError("لم يكتمل مسار الصياغة والتحقق. احتفظ ببياناتك وأعد المحاولة.",503);
  try {
    const raw = await response.json() as {requestId?:string;content?:unknown;audit?:AgentAudit};
    const audit = raw.audit;
    const expected = new Set(sources.map(s=>s.sourceId));
    if (raw.requestId !== requestId || !audit || JSON.stringify(audit.steps) !== JSON.stringify(["validate","knowledge","draft","audit"]) || !Number.isInteger(audit.modelRequests) || audit.modelRequests < 0 || audit.modelRequests > 3 || audit.missingSources !== !sources.length || !Array.isArray(audit.sourceIds) || audit.sourceIds.length !== expected.size || new Set(audit.sourceIds).size !== expected.size || audit.sourceIds.some(id=>!expected.has(id))) throw Error();
    const content = parsePleadingContent(JSON.stringify(raw.content));
    const markers = new Set(sources.map(s=>s.marker));
    const body = `${content.facts}\n${content.grounds}\n${content.requests}`;
    for (const match of body.matchAll(/[【\[]\s*(م\d+)\s*[】\]]/g)) if (!markers.has(match[1])) throw Error();
    if (!sources.length && (content.grounds || content.facts !== input.caseData.facts || content.requests !== input.caseData.requests)) throw Error();
    for (const [key,value] of Object.entries(input.fields)) if (value) content.fields[key] = value;
    return {content,audit};
  } catch { throw new RequestError("لم تجتز الصياغة فحص البيانات والمصادر. احتفظ ببياناتك وأعد المحاولة.",503); }
}
