import { requireAdminPermission } from '@/lib/admin-auth';
import { callPublicService, forwardPublicResponse } from '@/lib/public-service';
export async function GET(request: Request) {
  const authorization=await requireAdminPermission('dashboard.view');
  if('response' in authorization)return authorization.response;
  const input=Number(new URL(request.url).searchParams.get('days')||30);
  const days=[1,7,30,90].includes(input)?input:30;
  return forwardPublicResponse(await callPublicService(`/api/admin/analytics?days=${days}`));
}
