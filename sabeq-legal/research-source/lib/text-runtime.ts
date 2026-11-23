import { textProviderConfig, TextProviderError, type TextProviderEnvironment } from "./text-providers";

export type ManagedMetaProvider = { enabled: boolean; apiKey: string; model: string; testedAt?: string; revision: string; allowPaidModel?: boolean };
async function loadSavedProvider(): Promise<ManagedMetaProvider | null> {
  const { savedMetaProvider } = await import("./text-provider-settings");
  return savedMetaProvider();
}

// Opt-in and server-only. An absent setting preserves the existing provider exactly.
export async function resolveTextEnvironment(runtime: TextProviderEnvironment, read = loadSavedProvider): Promise<TextProviderEnvironment> {
  if (runtime.LEGAL_AI_MANAGED_SETTINGS !== "enabled") return runtime;
  const saved = await read();
  if (!saved?.enabled) return runtime;
  if (!saved.testedAt || !/^meta-llama\/llama-[a-zA-Z0-9._-]+(?::free)?$/.test(saved.model) || !saved.model.endsWith(":free") && saved.allowPaidModel !== true) throw new TextProviderError("configuration");
  const selected = { ...runtime, LEGAL_AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: saved.apiKey, OPENROUTER_MODEL: saved.model, OPENROUTER_ALLOW_PAID_META: saved.allowPaidModel === true ? "approved" : "" };
  textProviderConfig(selected);
  // Preserve the configured alternate. No additional or paid fallback is introduced.
  return selected;
}
