const SERVICE_ORIGIN = "https://sabeq-legal-public.centrino.chatgpt.site";
const GITHUB_HOST = "q8-ux.github.io";

function usesGitHubFrontend() {
  return typeof window !== "undefined" && window.location.hostname === GITHUB_HOST;
}

export function apiUrl(path: string) {
  return usesGitHubFrontend() ? `${SERVICE_ORIGIN}${path}` : path;
}

export function assetUrl(path: string) {
  if (usesGitHubFrontend() && (path.startsWith("/images/team/") || path === "/images/sabeq-assistant-avatar.jpg")) return `/saad/sabeq-legal${path}`;
  return usesGitHubFrontend() ? `${SERVICE_ORIGIN}${path}` : path;
}
