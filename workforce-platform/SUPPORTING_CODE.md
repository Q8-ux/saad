# Supporting Code Layer

This layer supports the Work Scope Platform without granting autonomous authority over sensitive operations.

## Responsibilities
- Inspect application/runtime failures and produce diagnostic context.
- Validate UI routes, Supabase connectivity, and expected operational schemas.
- Assist maintainers with code review, regression analysis, and safe repair proposals.
- Keep operational AI recommendations separate from privileged database writes.
- Require authorized human approval for sensitive workflow decisions.

## Guardrails
- Never embed service-role or other privileged secrets in browser code.
- Never bypass RLS, workflow approvals, or separation-of-duties controls.
- Never treat an AI recommendation as an approval or completed action.
- Log privileged workflow decisions and security-relevant events.
- Fail closed for sensitive actions when identity, authorization, data freshness, or service health cannot be verified.

## Operational path
Request -> validation -> context retrieval -> risk analysis -> recommendation -> authorized review -> controlled execution -> audit.

## Engineering path
Issue -> reproduce -> isolate -> minimal patch -> tests/build -> review -> deployment verification -> audit trail.
