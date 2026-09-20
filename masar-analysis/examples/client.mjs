// Node.js backend only. Never expose the project token in frontend JavaScript.
export async function analyze(query, urls, {useLlm = false} = {}) {
  const base = process.env.MASAR_API_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/v1/analyze`, {
    method: 'POST',
    signal: AbortSignal.timeout(300000),
    headers: {'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MASAR_API_KEY}`},
    body: JSON.stringify({query, urls, use_llm: useLlm})
  });
  if (!response.ok) throw new Error(`Masar HTTP ${response.status}`);
  return response.json();
}
