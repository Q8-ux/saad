// Object identity is server-owned. Headers and visitor JSON cannot grant this authority.
export type ManagementGenerationContext = { parentRequestId?: string; onStarted: (id: string) => Promise<void> };
const contexts = new WeakMap<Request, ManagementGenerationContext>();
export const managementGenerationContext = (request: Request) => contexts.get(request);
export async function withManagementGeneration<T>(request: Request, context: ManagementGenerationContext, run: (request: Request) => Promise<T>) {
  contexts.set(request, context);
  try { return await run(request); }
  finally { contexts.delete(request); }
}
