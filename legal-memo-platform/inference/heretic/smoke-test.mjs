#!/usr/bin/env node
// Send synthetic data only. Never log secrets, client facts, or the model's response.
const endpointValue = process.env.HERETIC_CHAT_COMPLETIONS_URL;
const token = process.env.HERETIC_API_KEY;
const model = process.env.HERETIC_MODEL || "heretic-9b-q4";
if (!endpointValue || !token) {
  console.error("Missing HERETIC_CHAT_COMPLETIONS_URL or HERETIC_API_KEY");
  process.exitCode = 2;
} else {
  let endpoint;
  try {
    endpoint = new URL(endpointValue);
    if (endpoint.protocol !== "https:" || !endpoint.pathname.endsWith("/chat/completions") ||
        endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error("endpoint must be authenticated HTTPS /chat/completions");
    }
  } catch {
    console.error("Invalid HTTPS chat completions endpoint");
    process.exit(2);
  }
  try {
    const started = Date.now();
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "أجب باللغة العربية بإيجاز. لا تعتمد على أي معلومات قانونية أو بيانات واقعية." },
          { role: "user", content: "هذا اختبار تقني ببيانات مصطنعة فقط. اكتب جملة عربية قصيرة تؤكد أنك تعمل." },
        ],
        stream: false,
        temperature: 0.1,
        max_tokens: 96,
      }),
      signal: AbortSignal.timeout(75000),
    });
    if (!response.ok) throw new Error(`Inference HTTP ${response.status}`);
    const payload = await response.json();
    const choice = payload?.choices?.[0];
    if (choice?.finish_reason !== "stop" || !choice?.message?.content?.trim()) {
      throw new Error("Inference response incomplete");
    }
    console.log(JSON.stringify({ ready: true, model, latencyMs: Date.now() - started, syntheticDataOnly: true }));
  } catch (error) {
    console.error("Synthetic inference check failed:", error?.message || "unknown");
    process.exitCode = 1;
  }
}
