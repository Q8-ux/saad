export type ProceduralPosition = {
  partyRole: string; originalRole: string; court: string;
  level: "first_instance" | "appeal" | "cassation" | "unknown";
  evidence: string[]; conflict: boolean; needsActor: boolean;
};
const normalize = (s: string) => s.normalize("NFKC").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ئ/g,"ي").replace(/ؤ/g,"و").replace(/[\u064b-\u065fـ]/g,"").toLowerCase();
const roles: Array<[RegExp,string]> = [
  [/^(?:ال)?مدعي? عليها/,"مدعى عليها"], [/^(?:ال)?مدعي? عليه/,"مدعى عليه"],
  [/^(?:ال)?مدعيه/,"مدعية"], [/^(?:ال)?مدعي?/,"مدعٍ"],
  [/^(?:ال)?مستانف ضدها/,"مستأنف ضدها"], [/^(?:ال)?مستانف ضده/,"مستأنف ضده"],
  [/^(?:ال)?مستانفه/,"مستأنفة"], [/^(?:ال)?مستانف/,"مستأنف"],
  [/^(?:ال)?مطعون ضدها/,"مطعون ضدها"], [/^(?:ال)?مطعون ضده/,"مطعون ضده"],
  [/^(?:ال)?طاعنه/,"طاعنة"], [/^(?:ال)?طاعن/,"طاعن"],
];
const roleOf = (s: string) => roles.find(([pattern])=>pattern.test(normalize(s)))?.[1] || "";
const isDefendant = (s: string) => /علي/.test(s);
const firstRole = (s: string) => /^(?:مدع|مدعي)/.test(s);
const negated = (s: string, index: number) => /(?:^|\s)(?:لم|لن|لا|ليس|لست|اذا|لو|ان|في حال)\s+[^،؛.!?\n]{0,22}$/.test(s.slice(0,index));
const courts = { first_instance:"المحكمة الكلية", appeal:"محكمة الاستئناف", cassation:"محكمة التمييز" };

/** Extracts stated procedure only; it does not establish jurisdiction or appeal eligibility. */
export function inferProceduralPosition(text: string, clientName = "", otherParty = ""): ProceduralPosition {
  const clauses = text.split(/[\n،؛.!?]+/).map(raw=>({raw:raw.trim(),s:normalize(raw.trim())})).filter(x=>x.s);
  const evidence: string[] = [], originals = new Set<string>(), explicit = new Set<string>();
  const addEvidence = (raw: string) => { if (!evidence.includes(raw)) evidence.push(raw.slice(0,400)); };
  for (const {raw,s} of clauses) {
    const self = /(?:^|\s)(?:انا|انني|بصفتي|صفتي|موكلي|موكلتي|الطرف الذي امثله)\s+(?:(?:هو|هي|في الدعوي|بصفه)\s+)?((?:ال)?(?:مدعي?|مدعيه|مستانف|مستانفه|طاعن|طاعنه|مطعون)[^،؛.!?\n]{0,18})/.exec(s);
    const role = self && !negated(s,self.index) ? roleOf(self[1]) : "";
    if (role) { (firstRole(role) ? originals : explicit).add(role); addEvidence(raw); }
    const filedBySelf = /(?:اقمت|رفعت|قدمت)\s+(?:انا\s+)?دعوي\s+(?:علي|ضد)\s+(?!من\s)\S+/.test(s) && !/(?:لم|لن|اذا|لو)\s+(?:اقمت|رفعت|قدمت)/.test(s);
    if (filedBySelf) { originals.add("مدعٍ"); addEvidence(raw); }
    if (!filedBySelf && /(?:رفعت|اقيمت|اقامت|اقام|رفع)\s+[^،؛.!?\n]{0,50}(?:دعوي\s+(?:علي|ضدي)(?:\s|$)|(?:علي|ضدي)\s+دعوي)/.test(s) && !/(?:لم|لن|اذا|لو)\s+(?:ترفع|يرفع|تق[يم]|يق[يم]|رفع|اقام)/.test(s)) { originals.add("مدعى عليه"); addEvidence(raw); }
    if (/\bi am (?:the )?defendant\b/.test(s)) { originals.add("مدعى عليه"); addEvidence(raw); }
    if (/\bi am (?:the )?(?:plaintiff|claimant)\b/.test(s)) { originals.add("مدعٍ"); addEvidence(raw); }
  }
  const originalRole = originals.size===1 ? [...originals][0] : "";
  const explicitRole = explicit.size===1 ? [...explicit][0] : "";
  type Level = keyof typeof courts;
  const actions: Array<{level:Level;side:"self"|"opponent";raw:string}> = [];
  let statedLevel: Level | undefined;
  const actorSide = (actor: string) => {
    if (/الخصم|خصمي|الطرف الاخر/.test(actor)) return "opponent" as const;
    if (clientName && actor===normalize(clientName)) return "self" as const;
    if (otherParty && actor===normalize(otherParty)) return "opponent" as const;
    const role=roleOf(actor);
    if (firstRole(role) && originalRole) return isDefendant(role)===isDefendant(originalRole) ? "self" as const : "opponent" as const;
    return null;
  };
  for (const {raw,s} of clauses) {
    const forum=/(?:امام|منظوره (?:لدي|في)|الجلسه (?:امام|في))\s+(?:المحكمه|محكمه)?\s*(التمييز|الاستيناف|الكليه)/.exec(s);
    if (forum && !negated(s,forum.index)) { statedLevel=forum[1]==="التمييز"?"cassation":forum[1]==="الاستيناف"?"appeal":"first_instance"; addEvidence(raw); }
    for (const [level,action] of [["cassation",/(?:طعن|طعنت|طعننا|قدم طعنا|قدمت طعنا|تقدم بطعن)\s+(?:[^،؛.!?\n]{0,18}\s+)?بالتمييز/g],["appeal",/(?:استانف(?:ت|نا)?|استيناف|استينافا)/g]] as const) {
      if (/(?:قضيه اخري|دعوي اخري|للاستشهاد|استشهد|استند الي حكم)/.test(s)) continue;
      for (const match of s.matchAll(action)) {
        if (negated(s,match.index!)) continue;
        const before=s.slice(0,match.index).trim(),after=s.slice(match.index!+match[0].length).trim();
        let side: "self"|"opponent"|null = null;
        if (/استانفت|استانفنا|طعنت|طعننا|قدمت طعنا/.test(match[0]) || /(?:قدمت|رفعت|اقمت|اريد|ارغب في|سوف اقدم)(?:\s+صحيفه)?$/.test(before)) side="self";
        const actors=["المدعي عليها","المدعي عليه","المدعيه","المدعي","الخصم","خصمي","الطرف الاخر",normalize(clientName),normalize(otherParty)].filter(Boolean).sort((a,b)=>b.length-a.length);
        const named=actors.find(actor=>before.endsWith(actor)||after.startsWith(actor+" ")||after===actor||match[0].includes(" "+actor+" "));
        if (named) side=actorSide(named);
        if (side) { actions.push({level,side,raw}); addEvidence(raw); }
      }
    }
  }
  if (explicitRole.includes("مستأنف")) statedLevel="appeal";
  const level = actions.some(a=>a.level==="cassation") ? "cassation" : actions.some(a=>a.level==="appeal") ? "appeal" : statedLevel || "unknown";
  const current=actions.filter(a=>a.level===level),sides=new Set(current.map(a=>a.side));
  let partyRole = explicitRole;
  const female = /(?:عليها|مدعية)$/.test(originalRole) || /^(?:مستأنفة|طاعنة)|ضدها$/.test(explicitRole);
  if (sides.size===1) partyRole=level==="cassation" ? (current[0].side==="self"?(female?"طاعنة":"طاعن"):(female?"مطعون ضدها":"مطعون ضده")) : current[0].side==="self"?(female?"مستأنفة":"مستأنف"):(female?"مستأنف ضدها":"مستأنف ضده");
  if (!partyRole && (level==="unknown"||level==="first_instance")) partyRole=originalRole;
  const conflict = originals.size>1 || explicit.size>1 || sides.size>1 || (!!explicitRole && !!partyRole && normalize(explicitRole)!==normalize(partyRole));
  return { partyRole:conflict?"":partyRole,originalRole,court:level==="unknown"||conflict?"":courts[level],level,evidence:evidence.slice(-4),conflict,needsActor:!conflict&&(level==="appeal"||level==="cassation")&&!partyRole };
}

export const proceduralPositionInstructions = `استنتج صفة الطرف الذي تمثله الصحيفة من أفعال الزائر والأطراف: من أقام الدعوى وعلى من؟ ثم من رفع الاستئناف أو الطعن؟ لا تفترض أن أول اسم هو الموكل. افصل الصفة الأصلية عن الحالية؛ المدعى عليه الذي يستأنف يصبح مستأنفاً، ومن يرد على استئناف خصمه يكون مستأنفاً ضده، وفي التمييز طاعن أو مطعون ضده. ذكر حكم تمييز للاستشهاد أو المحكمة التي أصدرت حكماً سابقاً لا يحدد المحكمة الحالية. اجمع من الوقائع من تقدم بالإجراء والمحكمة المنظور أمامها دون مطالبة الزائر باختيار مصطلح قانوني. لا تختلق حكماً أو ميعاداً أو جواز طعن.`;

export function applyProceduralPosition<T extends { court:string; courtCircuit:string; readyForMemo:boolean; phase:string; parties:Array<{name:string;role:string}>; memoPrefill:{clientName:string;otherParty:string;partyRole:string;court:string} }>(state:T,text:string) {
  const position=inferProceduralPosition(text,state.memoPrefill.clientName,state.memoPrefill.otherParty);
  const unresolved=position.conflict||position.needsActor;
  const role=unresolved?"":position.partyRole||state.memoPrefill.partyRole;
  const court=position.conflict?"":position.court||state.court;
  return {...state,proceduralPosition:position,court,courtCircuit:court!==state.court?"":state.courtCircuit,
    readyForMemo:unresolved?false:state.readyForMemo,phase:unresolved&&state.phase==="ready"?"review":state.phase,
    parties:state.parties.map(p=>p.name&&p.name===state.memoPrefill.clientName?{...p,role}:p),
    memoPrefill:{...state.memoPrefill,partyRole:role,court}};
}
