export const appBuildId = process.env.NEXT_PUBLIC_APP_BUILD_ID || "development";

export function appUpdateAction(current: string, incoming: unknown, busy: boolean, hasDraft: boolean) {
  if (typeof incoming !== "string" || !incoming || incoming === current) return "none";
  return busy || hasDraft ? "defer" : "reload";
}
