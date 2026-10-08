import { ASSISTANT_REQUEST_BYTES, validateAssistantInput } from "@/lib/assistant-input";
import { legalSourceCoverage, formatSourceCoverage } from "@/lib/legal-source-coverage";
import { interfaceLabel, interfaceError } from "@/lib/interface-language";
import { conductLegalIntake, openAIErrorResponse, type LegalIntakeState } from "@/lib/openai";
import { searchIntakeLibrary, type LegalEvidence } from "@/lib/legal-search";
import { cleanIntakeContext, inferQuestionKey, intakeSearchQueries, readQuestionMemory, updateQuestionMemory } from "@/lib/intake-context";
import { formatIntakeEvidence, intakePassages, reviewIntakeAnalysis, type AnalysisStage } from "@/lib/intake-analysis";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { enforceUserServiceLimit, recordServiceActivity } from "@/lib/service-records";
import { requireServiceEnabled } from "@/lib/service-settings";
import { assertSameOrigin, cleanLanguage, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";

export const OPTIONS = corsPreflight;
function guessCaseType(text: string) {
  if (/عمل|عامل|راتب|أجر|اجر|فصل|مكافأة|مكافاه/u.test(text)) return "عمالي";
  if (/طلاق|نفقة|نفقه|حضانة|حضانه|زواج|أسرة|اسرة|ميراث/u.test(text)) return "أحوال شخصية";
  if (/إيجار|ايجار|مستأجر|مستاجر|مؤجر|إخلاء|اخلاء/u.test(text)) return "إيجارات";
  if (/بلاغ|نصب|احتيال|سرقة|سرقه|اعتداء|ضرب|جزائي|جنحة|جنحه|جناية|جنايه/u.test(text)) return "جزائي";
  if (/وزارة|وزاره|حكوم|قرار إداري|قرار اداري/u.test(text)) return "إداري";
  if (/شركة|شركه|تجاري|توريد|أسهم|اسهم/u.test(text)) return "تجاري";
  if (/دين|قرض|تعويض|مبلغ|مدني/u.test(text)) return "مدني";
  return "";
}

function buildLimitedIntakeState(input: { language: string; message: string; currentState: unknown; failure: string }): LegalIntakeState {
  const previous = cleanIntakeContext(input.currentState);
  const raw = input.currentState && typeof input.currentState === "object" && !Array.isArray(input.currentState) ? input.currentState as Record<string, unknown> : {};
  const memo = raw.memoPrefill && typeof raw.memoPrefill === "object" && !Array.isArray(raw.memoPrefill) ? raw.memoPrefill as Record<string, unknown> : {};
  const memoText = (key: string) => typeof memo[key] === "string" ? String(memo[key]).replace(/\u0000/g, " ").trim().slice(0, 3_000) : "";
  const rawWarnings = Array.isArray(raw.analysisWarnings) ? raw.analysisWarnings.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
  const memory = readQuestionMemory(input.currentState);
  const facts = [...(previous?.facts || [])];
  if (input.message.trim().length >= 8 && !facts.some(item => item === input.message.trim())) facts.push(input.message.trim());
  const joined = [...facts, input.message, previous?.caseType || ""].join(" ");
  const caseType = previous?.caseType || guessCaseType(joined);
  const questions = input.language === "en"
    ? ["What result do you want from the court?", "Who is the other party and what is your relationship with them?", "Has any judgment or case already been filed about this dispute?"]
    : input.language === "ur"
      ? ["آپ عدالت سے کیا نتیجہ چاہتے ہیں؟", "دوسرا فریق کون ہے اور آپ کا اس سے کیا تعلق ہے؟", "کیا اس معاملے میں پہلے کوئی مقدمہ یا فیصلہ موجود ہے؟"]
      : ["ما النتيجة التي تريدها من المحكمة؟", "من هو الطرف الآخر وما علاقتك به؟", "هل توجد قضية مرفوعة أو حكم سابق عن نفس الموضوع؟"];
  const question = questions.find(item => !memory.asked.some(row => row.key === inferQuestionKey(item))) || "";
  const assistantMessage = input.language === "en"
    ? `I saved your details and will continue with essential facts only.\n${question}`
    : input.language === "ur"
      ? `میں نے معلومات محفوظ کر لی ہیں اور ضروری حقائق مکمل کر رہا ہوں۔\n${question}`
      : `استقبلت كلامك وسأكمل جمع الوقائع الأساسية مؤقتاً.\n${question}`;
  const state: LegalIntakeState = {
    orientation: previous?.orientation || { categoryReason: "", track: "unknown", judgment: "unknown", judgmentQuote: "", nextAction: "" },
    precedentMatches: [],
    questionKey: question ? inferQuestionKey(question) : "",
    resolvedTopics: previous?.questionMemory?.resolved || [],
    unavailableTopics: previous?.questionMemory?.unavailable || [],
    phase: "gathering",
    assistantMessage,
    progress: facts.length ? 25 : 10,
    caseType,
    caseStage: previous?.caseStage || "قيد جمع الوقائع",
    court: previous?.court || "",
    courtCircuit: previous?.courtCircuit || "",
    jurisdictionReason: previous?.jurisdictionReason || interfaceLabel("تعذر إكمال التحليل الذكي الآن؛ التوجيه للمحكمة يبقى مؤجلاً حتى عودة الخدمة أو اكتمال المراجعة.", input.language),
    jurisdictionConfidence: "low",
    jurisdictionMissing: previous?.jurisdictionMissing || [interfaceLabel("استكمال التحليل الذكي والتحقق من الاختصاص عند توفر الخدمة.", input.language)],
    caseSummary: facts.join("\n"),
    legalBasis: [],
    analysisWarnings: [...new Set([...rawWarnings.map(warning => interfaceLabel(warning, input.language)), interfaceError(input.failure, input.language, interfaceLabel("الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.", input.language)), interfaceLabel("المقابلة مستمرة بجمع الوقائع فقط، دون اعتماد قانوني نهائي.", input.language)])],
    parties: previous?.parties || [],
    facts,
    requests: previous?.requests || [],
    legalIssues: previous?.legalIssues || [],
    importantDates: previous?.importantDates || [],
    documentsNeeded: previous?.documentsNeeded || [],
    missingInformation: previous?.missingInformation || [],
    contradictions: previous?.contradictions || [],
    nextQuestions: question ? [question] : [],
    readyForMemo: false,
    memoPrefill: {
      caseType,
      court: previous?.court || "",
      clientName: memoText("clientName"),
      partyRole: memoText("partyRole"),
      otherParty: memoText("otherParty"),
      allParties: memoText("allParties"),
      facts: facts.join("\n"),
      requests: memoText("requests") || previous?.requests.join("\n") || "",
      legalIssues: memoText("legalIssues") || previous?.legalIssues.join("\n") || "",
    },
  };
  state.questionMemory = updateQuestionMemory(memory, { questionKey: state.questionKey, nextQuestions: state.nextQuestions, resolvedTopics: state.resolvedTopics, unavailableTopics: state.unavailableTopics });
  return state;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const started = performance.now();
    const [user] = await Promise.all([requireMemoUserOrGuest(request), requireServiceEnabled("assistant")]);
    const data = await readJsonObject(request, ASSISTANT_REQUEST_BYTES);
    const language = cleanLanguage(data.language);
    let input;
    try { input = validateAssistantInput(data.message, data.messages, language); }
    catch (error) { throw new RequestError(error instanceof Error ? error.message : "الرسالة غير صالحة."); }
    const { message, messages } = input;
    await Promise.all([enforceRateLimit(request, "legal-assistant-intake", 30, "hour"), user ? enforceUserServiceLimit(user, "assistant") : Promise.resolve()]);
    const stages: AnalysisStage[] = [];
    const cancellation = new AbortController();
    const signal = AbortSignal.any([request.signal, cancellation.signal]);
    let searchMs = 0, generationMs = 0, firstTextMs: number | null = null;
    async function run(send: (event: unknown) => void = () => {}) {
      signal.throwIfAborted();
      const begin = (id: AnalysisStage["id"]) => {
        const stage: AnalysisStage = { id, status: "running", startedAt: new Date().toISOString(), finishedAt: null, durationMs: null };
        stages.push(stage); send({ type: "stage", stage: { ...stage } }); return { stage, clock: performance.now() };
      };
      const end = (step: ReturnType<typeof begin>, status: AnalysisStage["status"] = "completed") => {
        Object.assign(step.stage, { status, finishedAt: new Date().toISOString(), durationMs: Math.round(performance.now() - step.clock) });
        send({ type: "stage", stage: { ...step.stage } });
      };
      const search = begin("library");
      let evidence: LegalEvidence[] = [], lookupFailed = false;
      try {
        const queries = intakeSearchQueries(message, data.currentState, messages.filter(item => item.role === "user").map(item => item.content));
        evidence = await searchIntakeLibrary(queries);
      } catch { lookupFailed = true; }
      end(search, lookupFailed ? "failed" : evidence.length ? "completed" : "limited");
      signal.throwIfAborted();
      searchMs = search.stage.durationMs || 0;
      const analysis = begin("analysis");
      let state;
      try {
        state = await conductLegalIntake({ signal, language, messages, currentState: data.currentState, passageIds: intakePassages(evidence).map(p => p.id), evidence: lookupFailed ? "تعذر الاتصال بقاعدة المكتبة. لا توجد مصادر متاحة لهذا الدور ولا يجوز ادعاء نجاح البحث." : `${formatIntakeEvidence(evidence)}\n\n${formatSourceCoverage(evidence)}` });
        end(analysis);
      } catch (error) {
        const mapped = openAIErrorResponse(error, "تعذر إكمال التحليل الذكي. يستمر جمع الوقائع الأساسية.");
        if (!mapped) { end(analysis, "failed"); throw error; }
        state = buildLimitedIntakeState({ language, message, currentState: data.currentState, failure: mapped.message });
        if (firstTextMs === null) firstTextMs = performance.now() - started;
        send({ type: "text", text: state.assistantMessage.split("\n")[0] });
        end(analysis, "limited");
      }
      generationMs = analysis.stage.durationMs || 0;
      const review = begin("source_review");
      const reviewed = reviewIntakeAnalysis(state, evidence, lookupFailed, language);
      end(review, reviewed.legalBasis.length ? "completed" : "limited");
      stages.push({ id: "human_review", status: "pending", startedAt: null, finishedAt: null, durationMs: null });
      const sourceCoverage = legalSourceCoverage(evidence, lookupFailed);
      const finalState = { ...reviewed, research: { ...reviewed.research, catalogueSources: sourceCoverage.sources }, analysisStages: stages };
      if(firstTextMs === null) firstTextMs=performance.now()-started;
      send({type:"text",text:reviewed.assistantMessage});
      signal.throwIfAborted();
      if (user) await recordServiceActivity({ userId: user.id, serviceType: "assistant", title: state.caseType || "مقابلة قانونية", inputText: message, outputText: state.assistantMessage, metadata: { language, phase: state.phase, progress: state.progress, sourceCount: evidence.length, sourceIds: evidence.map(item => item.chunkId || item.documentId), readyForMemo: finalState.readyForMemo, searchMs, generationMs } });
      return { sourceCoverage: legalSourceCoverage(evidence, lookupFailed), state: finalState, engineRevision: "official-research-sources-1", sourceCount: evidence.length, timing: { searchMs, generationMs, firstTextMs, totalMs: performance.now() - started } };
    }
    if (data.stream === true) {
      const encoder = new TextEncoder();
      let cancelled = false;
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (data: unknown) => { if (!cancelled) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); };
          send({ type: "started" });
          try {
            send({ type: "done", ...await run(send) });
          } catch (error) {
            const mapped = openAIErrorResponse(error, "انقطع الرد قبل اكتماله. يرجى المحاولة مجدداً.");
            send({ type: "error", error: mapped?.message || "تعذر إكمال الرد. يرجى المحاولة مجدداً." });
          } finally { if (!cancelled) controller.close(); }
        }, cancel() { cancelled = true; cancellation.abort(); },
      });
      const headers = new Headers(privateJson({}).headers);
      headers.set("Content-Type", "text/event-stream; charset=utf-8");
      headers.set("Cache-Control", "private, no-store, no-transform");
      headers.set("X-Accel-Buffering", "no");
      return new Response(body, { headers });
    }
    const result = await run();
    const response = privateJson(result);
    response.headers.set("Server-Timing", `search;dur=${searchMs}, generation;dur=${generationMs}, total;dur=${(performance.now()-started).toFixed(1)}`);
    return response;
  } catch (error) {
    const openAIError = openAIErrorResponse(error, "تعذر تحليل القضية حالياً. يرجى المحاولة لاحقاً.");
    if (openAIError) return privateJson({ error: openAIError.message }, openAIError.status);
    if (error instanceof RequestError) return errorResponse(error);
    return privateJson({ error: "تعذر تحليل القضية حالياً. يرجى المحاولة لاحقاً." }, 503);
  }
}
