export const sections = ["home", "about", "team", "services", "library", "contact", "assistant", "memo"] as const;
export function sanitizeEvent(value: Record<string, unknown>) {
  const uuid = (s: unknown) => typeof s === "string" && /^[a-f0-9-]{36}$/i.test(s);
  if (!uuid(value.id) || !uuid(value.session) || !uuid(value.visitor)) throw new Error("invalid_ids");
  if (!['page_view', 'heartbeat'].includes(String(value.event))) throw new Error('invalid_event');
  return {
    id: String(value.id), session: String(value.session), visitor: String(value.visitor),
    event: String(value.event), page: (sections as readonly unknown[]).includes(value.page) ? String(value.page) : 'home',
    seconds: value.event === 'heartbeat' ? Math.min(35, Math.max(0, Math.floor(Number(value.seconds) || 0))) : 0,
    device: ['mobile', 'tablet', 'desktop'].includes(String(value.device)) ? String(value.device) : 'unknown',
    source: ['direct', 'search', 'social', 'github', 'internal', 'other'].includes(String(value.source)) ? String(value.source) : 'other',
    test: value.test === true ? 1 : 0,
  };
}
export function analyticsBot(ua: string) { return /bot|spider|crawl|headless|curl|wget|python|monitor/i.test(ua); }
