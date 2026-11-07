export type RuntimeBindings = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SESSION_SECRET?: string;
  USER_AUTH_SECRET?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_API_KEY?: string;
  TWILIO_API_SECRET?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
  AUTH_TEST_MODE?: string;
  GUEST_ACCESS_ENABLED?: string;
  OPENAI_API_KEY?: string;
  OPENAI_ANALYSIS_MODEL?: string;
  OPENAI_DRAFT_MODEL?: string;
  OPENAI_POETRY_MODEL?: string;
  OPENAI_SAFETY_MODEL?: string;
  OPENAI_TRANSCRIBE_MODEL?: string;
  MASAR_API_URL?: string;
  MASAR_ANT_ALSHAER_TOKEN?: string;
  POETRY_AI_PROVIDER?: string;
  POETRY_AI_FALLBACK_PROVIDER?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  NVIDIA_MODEL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  NVIDIA_API_KEY?: string;
  NVIDIA_ANALYSIS_MODEL?: string;
  NVIDIA_DRAFT_MODEL?: string;
  NVIDIA_AUDIT_MODEL?: string;
  VOICESTUDIO_API_URL?: string;
  VOICESTUDIO_API_TOKEN?: string;
  OPENSHORTS_API_URL?: string;
  OPENSHORTS_API_TOKEN?: string;
  MARKITDOWN_API_URL?: string;
  MARKITDOWN_API_TOKEN?: string;
};

const BINDINGS_KEY = "__ant_alshaer_runtime_bindings__";

type RuntimeGlobal = typeof globalThis & {
  [BINDINGS_KEY]?: RuntimeBindings;
};

export function setRuntimeBindings(bindings: RuntimeBindings) {
  (globalThis as RuntimeGlobal)[BINDINGS_KEY] = bindings;
}

export function getRuntimeBindings(): RuntimeBindings {
  const bindings = (globalThis as RuntimeGlobal)[BINDINGS_KEY];
  if (!bindings) {
    throw new Error("Runtime bindings are unavailable outside a Worker request.");
  }
  return bindings;
}

export function getRuntimeStringBinding(
  key: Exclude<keyof RuntimeBindings, "DB" | "BUCKET">,
) {
  const value = getRuntimeBindings()[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}
