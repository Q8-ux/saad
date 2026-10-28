import { inferProceduralPosition } from "./procedural-position";

export function recogniseMemoProcedure(fields: Record<string, string>, previous: Record<string, string> = {}) {
  const position = inferProceduralPosition(`${fields.facts || ""}\n${fields.requests || ""}`, fields.clientName, fields.otherParty);
  const next = { ...fields };
  const automatic: Record<string, string> = {};
  for (const key of ["partyRole", "court"] as const) {
    const inferred = position.conflict || position.needsActor ? "" : position[key];
    // A confirmed manual correction survives later recognition. Replace only
    // empty values or a value this journey itself previously supplied.
    if (!next[key] || next[key] === previous[key]) {
      next[key] = inferred;
      automatic[key] = inferred;
    }
  }
  if (next.court !== fields.court) next.courtCircuit = "";
  return { fields: next, automatic, position };
}

export function initialMemoStep(fromAssistant: boolean) { return fromAssistant ? 1 : 0; }
export function nextMemoStep(step: number, fromAssistant: boolean): number | null {
  if (step === 0) return 1;
  return step === 1 && !fromAssistant ? 2 : null;
}
