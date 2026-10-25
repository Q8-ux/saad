import { publicSiteSettings } from "@/lib/site-controls";
import { privateJson, corsPreflight, errorResponse } from "@/lib/request-security";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;
export async function GET() { try { return privateJson(await publicSiteSettings()); } catch (error) { return errorResponse(error); } }
