"use strict";
(function (root) {
  const normalize = value => String(value || "").normalize("NFKC").toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const stem = word => word.startsWith("ال") && word.length > 4 ? word.slice(2) : word;
  const stop = new Set(normalize("كيف ماذا ما من عن في على إلى الى هل لماذا متى اريد أريد أن ان هو هي هذا هذه لي مع او أو ثم التي الذي شرح طريقة اكتب أكتب كتابة أبني ابني أتعلم اتعلم يمكن عند بما وما وماهي ايش شلون شنو لدي").split(" ").map(stem));
  const tokens = text => normalize(text).split(" ").map(stem).filter(w => w.length > 1 && !stop.has(w));
  const topics = [
    ["idea", "الفكرة", ["premise", "فرضية", "فكرة", "افكار", "بداية الحكاية"]],
    ["logline", "الجملة التعريفية", ["logline", "log line", "لوجلاين", "لوج لاين", "لوغلاين", "الجملة التعريفية"]],
    ["theme", "الثيمة", ["theme", "ثيمة", "رسالة الفيلم"]],
    ["research", "البحث", ["research", "بحث", "توثيق", "مصادر"]],
    ["character", "الشخصية", ["character", "protagonist", "الشخصية", "شخصيات", "بطل", "بطلة"]],
    ["arc", "قوس الشخصية", ["character arc", "قوس الشخصية", "تحول الشخصية", "تطور الشخصية"]],
    ["antagonist", "القوة المضادة", ["antagonist", "القوة المضادة", "خصم", "صراع", "conflict"]],
    ["stakes", "الرهان", ["stakes", "رهان", "ثمن الفشل"]],
    ["structure", "البناء الدرامي", ["structure", "البناء الدرامي", "بنية القصة", "الحبكة", "ثلاثة فصول", "inciting incident", "الحدث المحفز"]],
    ["causality", "السببية", ["causality", "سببية", "السبب والنتيجة"]],
    ["pov", "وجهة النظر", ["pov", "point of view", "وجهة النظر", "منظور"]],
    ["time", "الزمن", ["flashback", "فلاش باك", "استرجاع", "زمن", "التكرار الزمني"]],
    ["scene", "بناء المشهد", ["scene", "beat", "مشهد", "مشاهد", "نقطة التحول"]],
    ["dialogue", "الحوار", ["dialogue", "dialog", "حوار", "الحوار"]],
    ["subtext", "المعنى المضمر", ["subtext", "ساب تكست", "المعنى المضمر", "ما تحت النص", "المسكوت عنه"]],
    ["visual", "السرد البصري", ["visual storytelling", "show dont tell", "show don't tell", "اظهر ولا تخبر", "سرد بصري", "بدون حوار", "دون حوار", "مشهد صامت", "حوار بدون كلام"]],
    ["format", "تنسيق السيناريو", ["format", "slugline", "تنسيق", "عنوان المشهد"]],
    ["synopsis", "الملخص والمعالجة", ["synopsis", "treatment", "ملخص", "معالجة", "تريتمنت"]],
    ["short", "الفيلم القصير", ["short film", "فيلم قصير", "الافلام القصيرة"]],
    ["series", "المسلسل", ["series", "مسلسل", "حلقات", "محرك الحلقات"]],
    ["bible", "ملف المسلسل", ["series bible", "بايبل", "ملف المسلسل"]],
    ["rewrite", "إعادة الكتابة", ["rewrite", "revision", "اعادة الكتابة", "مراجعة", "أراجع", "راجع المسودة", "تحرير المسودة", "تعديل المسودة"]],
    ["pitch", "تقديم المشروع", ["pitch", "بيتش", "عرض المشروع", "تقديم المشروع"]]
  ].map(([id, label, aliases]) => ({id, label, aliases: aliases.map(normalize)}));
  function editDistanceOne(a, b) {
    if (Math.abs(a.length - b.length) > 1 || a === b) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return edits + (i < a.length || j < b.length ? 1 : 0) === 1;
  }
  function createSearch(data, entries) {
    const fields = e => [
      [e.title, 6], [e.original || e.en, 5], [(e.tags || []).join(" "), 4],
      [e.summary || e.focus || e.text, 2],
      [[e.body, e.example, e.analysis, e.fact, e.group, e.region, e.place, ...(e.steps || []), ...(e.watch || [])].filter(Boolean).join(" "), 1]
    ];
    const documents = entries.map(entry => {
      const freq = new Map(); let length = 0;
      for (const [text, weight] of fields(entry)) for (const token of tokens(text)) { freq.set(token, (freq.get(token) || 0) + weight); length++; }
      return {entry, freq, length: Math.max(1, length), title: normalize(entry.title + " " + (entry.original || entry.en || ""))};
    });
    const frequencies = new Map();
    for (const doc of documents) for (const word of doc.freq.keys()) frequencies.set(word, (frequencies.get(word) || 0) + 1);
    const average = documents.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, documents.length);
    const dictionary = [...frequencies.keys()].filter(w => w.length >= 5);
    function concepts(query) {
      const simplify = value => normalize(value).split(" ").map(stem).join(" ");
      const text = " " + simplify(query) + " ";
      return topics.map(t => ({...t, match: t.aliases.filter(a => text.includes(" " + simplify(a) + " ")).sort((a, b) => b.length - a.length)[0]}))
        .filter(t => t.match && data.guides.some(g => g.id === t.id)).sort((a, b) => b.match.length - a.match.length)
        .filter((topic,index,all) => !all.slice(0,index).some(other => (" " + simplify(other.match) + " ").includes(" " + simplify(topic.match) + " ")));
    }
    function linked(entry, topic) {
      return entry.kind === "guide" ? entry.id === topic.id : entry.guide === topic.id || (entry.guides || []).includes(topic.id);
    }
    function search(query = "", filters = {}, saved = []) {
      const words = [...new Set(tokens(String(query).slice(0, 240)))].slice(0, 20), matched = concepts(query), corrections = new Map();
      for (const word of words) if (word.length >= 5 && !frequencies.has(word)) {
        const candidates = dictionary.filter(term => editDistanceOne(term, word)).sort((a, b) => frequencies.get(b) - frequencies.get(a));
        if (candidates.length) corrections.set(word, candidates.slice(0, 2));
      }
      return documents.filter(({entry: e}) => (!filters.type || e.kind === filters.type) && (!filters.region || e.region === filters.region) &&
        (!filters.level || e.level === filters.level) && (!filters.group || e.group === filters.group) && (!filters.saved || saved.includes(e.key)))
        .map(doc => {
          let score = 0, count = 0; const reasons = [], fixes = [];
          for (const word of words) {
            const corrected = !doc.freq.has(word) && (corrections.get(word) || []).find(w => doc.freq.has(w));
            const actual = doc.freq.has(word) ? word : corrected;
            if (!actual) continue;
            count++;
            const tf = doc.freq.get(actual), df = frequencies.get(actual), idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5));
            score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * doc.length / average)) * (corrected ? 0.45 : 1);
            if (corrected) fixes.push(actual);
          }
          const topic = matched.find(t => linked(doc.entry, t));
          if (topic) { score += doc.entry.kind === "guide" ? 14 + topic.match.length / 4 : 6; reasons.push("مرتبط بمفهوم «" + topic.label + "»"); }
          const phrase = normalize(query);
          if (phrase && doc.title.includes(phrase)) { score += 24; reasons.push("تطابق في العنوان"); }
          if (count) { score += 7 * count / Math.max(1, words.length); if (!reasons.length) reasons.push("تطابق في العنوان أو محتوى المادة"); }
          if (fixes.length) reasons.push("تطابق إملائي تقريبي: " + [...new Set(fixes)].join("، "));
          const active = words.length || matched.length || phrase;
          if (active && !count && !topic && !doc.title.includes(phrase)) return null;
          return {...doc.entry, _score: score, _reasons: reasons, _partial: words.length > 1 && count < words.length && !topic};
        }).filter(Boolean).sort((a, b) => b._score - a._score);
    }
    function related(key) {
      const entry = entries.find(e => e.key === key); if (!entry) return {guides: [], works: [], templates: []};
      const ids = entry.kind === "guide" ? [entry.id] : entry.guide ? [entry.guide] : entry.guides || [];
      const guides = data.guides.filter(g => ids.includes(g.id));
      const works = data.works.filter(w => ids.some(id => (w.guides || []).includes(id)) || guides.some(g => g.works.includes(w.id)));
      return {guides, works, templates: data.templates.filter(t => ids.includes(t.guide))};
    }
    return {search, related, concepts};
  }
  const units = [
    {id:"idea", title:"حدّد حكايتك", skill:"idea", guide:"idea", works:["wadjda"], template:"logline", before:[], task:"اكتب موقفًا يضع شخصية أمام هدف وعائق وثمن للفشل."},
    {id:"character", title:"اختبر شخصيتك بقرار", skill:"character", guide:"character", works:["groundhog","theeb"], template:"character", before:["idea"], task:"اكتب قرارًا تتخذه الشخصية، وما تخسره بسببه. بيّن الفرق بين رغبتها وحاجتها."},
    {id:"scene", title:"ابنِ مشهدًا يتغيّر", skill:"scene", guide:"scene", works:["jury","falafel"], template:"scene", before:["character"], task:"اكتب بداية مشهد ونقطة تحوّله ونهايته؛ ما الذي صار مختلفًا؟"},
    {id:"dialogue", title:"جرّب المعنى المضمر", skill:"scene", guide:"subtext", works:["jury"], template:"scene", before:["scene"], task:"اكتب حوارًا يطلب فيه شخص شيئًا وهو يخفي غرضًا آخر، ودوّن دليلًا على الغرض الخفي."},
    {id:"local", title:"اكتب من بيئتك", skill:"research", guide:"research", works:["sea","falafel"], template:"watch", before:[], task:"دوّن تفصيلًا محليًا ومصدره، ثم اشرح كيف يحوّل هذا التفصيل قرارًا داخل الحكاية."},
    {id:"analysis", title:"افصل الملاحظة عن التفسير", skill:"research", guide:"pov", works:["parasite","theeb"], template:"watch", before:["local"], task:"صف ما تراه في مشهد، ثم اقترح تفسيرين واذكر ما يدعم كلًا منهما."},
    {id:"short", title:"صمّم فيلمك القصير", skill:"idea", guide:"short", works:["falafel"], template:"scene", before:["scene"], task:"حدّد التغيير الرئيسي في فيلمك، ثم ضع ثلاث بطاقات مشاهد تخدمه."},
    {id:"series", title:"اكتشف محرك المسلسل", skill:"idea", guide:"series", works:["alleys"], template:"series", before:["character"], task:"اكتب ثلاث أفكار لحلقات تولّدها العلاقات نفسها. مثال الحارة هنا لتشابك الشخصيات في فيلم، وليس نموذج مسلسل."},
    {id:"rewrite", title:"راجع بالدليل", skill:"scene", guide:"rewrite", works:["jury","alleys"], template:"rewrite", before:["scene"], task:"حدّد موضعين لمشكلة واحدة، وعدّل أحدهما، ثم قارن الأثر قبل التعديل وبعده."}
  ];
  const goalOrder = {short:["idea","character","scene","dialogue","local","short","rewrite"], series:["idea","character","series","scene","dialogue","local","rewrite"], criticism:["local","analysis","character","scene","dialogue","rewrite"]};
  function recommend(profile = {}, completed = {}) {
    const order = goalOrder[profile.goal] || goalOrder.short;
    return order.map((id, index) => {
      const unit = units.find(u => u.id === id), missing = unit.before.filter(k => order.includes(k) && !(completed[k] && completed[k].done !== false));
      const rating = Number(profile.skills?.[unit.skill]) || 0;
      const done = Boolean(completed[id] && completed[id].done !== false);
      return {...unit, done, missing, priority:(done ? -100 : 50) - missing.length * 20 + (2 - rating) * 4 - index,
        reason:done ? "سجّلت تطبيقًا لهذه المهارة" : missing.length ? "يمهّد له: " + missing.map(k => units.find(u => u.id === k).title).join("، ") : rating === 0 ? "بداية مناسبة حسب تقييمك الذاتي؛ متطلباتها السابقة متاحة" : "خطوة مناسبة لهدفك وتطبيقاتك المكتملة"};
    }).sort((a, b) => b.priority - a.priority);
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => root.crypto?.randomUUID?.() || "scene-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  function createStore(storage) {
    const key = "noura-learning-v1", empty = () => ({version:1, profile:{goal:"short",title:"مشروعي الأول",skills:{idea:0,character:0,scene:0,research:0}}, completed:{}, scenes:[]});
    let state = empty(), loadError = false;
    const text = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
    function clean(input) {
      if (!input || input.version !== 1 || !input.profile || !Array.isArray(input.scenes) || !input.completed || typeof input.completed !== "object") throw Error("هذه ليست نسخة صالحة من مشروع التعلّم.");
      if (input.scenes.length > 80) throw Error("الحد المتاح 80 مشهدًا للمشروع.");
      const next = empty(), p = input.profile;
      next.profile.goal = goalOrder[p.goal] ? p.goal : "short";
      next.profile.title = text(p.title, 120) || "مشروعي الأول";
      for (const k of Object.keys(next.profile.skills)) next.profile.skills[k] = [0,1,2].includes(Number(p.skills?.[k])) ? Number(p.skills[k]) : 0;
      for (const unit of units) { const c = input.completed[unit.id]; if (c && typeof c.evidence === "string" && c.evidence.trim().length >= 20) next.completed[unit.id] = {evidence:text(c.evidence, 6000),date:text(c.date, 40),done:c.done !== false}; }
      const ids = new Set();
      next.scenes = input.scenes.map(scene => {
        if (!scene || typeof scene.heading !== "string") throw Error("إحدى بطاقات المشاهد غير صالحة.");
        let id = text(scene.id, 100); if (!id || ids.has(id)) id = uid(); ids.add(id);
        return {id,heading:text(scene.heading,160),intent:text(scene.intent,2000),obstacle:text(scene.obstacle,2000),turn:text(scene.turn,2000),text:text(scene.text,12000)};
      });
      return next;
    }
    try { const raw = storage.getItem(key); if (raw) state = clean(JSON.parse(raw)); } catch { loadError = true; }
    const commit = update => { const next = clone(state); update(next); const valid = clean(next); storage.setItem(key, JSON.stringify(valid)); state = valid; };
    return {
      get state() { return clone(state); }, loadError,
      profile(value) { commit(s => { s.profile = value; }); },
      complete(id, evidence) { if (!units.some(u => u.id === id)) throw Error("المهارة غير موجودة."); if (typeof evidence !== "string" || evidence.trim().length < 20) throw Error("أضف تطبيقًا أو خلاصة من 20 حرفًا على الأقل قبل تسجيل الإنجاز."); commit(s => { s.completed[id] = {evidence:evidence.trim(),date:new Date().toISOString(),done:true}; }); },
      reopen(id) { commit(s => { if(s.completed[id]) s.completed[id].done=false; }); },
      scene(value) { let id; commit(s => { if (!String(value.heading || "").trim()) throw Error("أضف عنوانًا للمشهد."); const old = s.scenes.find(x => x.id === value.id); if (old) Object.assign(old,value); else { if (s.scenes.length >= 80) throw Error("بلغت الحد المتاح: 80 مشهدًا."); id = uid(); s.scenes.push({...value,id}); } }); return id || value.id; },
      move(id, delta) { commit(s => { const i = s.scenes.findIndex(x => x.id === id), j = i + delta; if (![-1,1].includes(delta) || i < 0 || j < 0 || j >= s.scenes.length) return; [s.scenes[i],s.scenes[j]] = [s.scenes[j],s.scenes[i]]; }); },
      remove(id) { commit(s => { s.scenes = s.scenes.filter(x => x.id !== id); }); },
      import(input) { const incoming = clean(input); commit(s => { s.completed = {...s.completed,...incoming.completed}; const known = new Set(s.scenes.map(x => JSON.stringify([x.heading,x.intent,x.obstacle,x.turn,x.text]))); for (const scene of incoming.scenes) { const signature = JSON.stringify([scene.heading,scene.intent,scene.obstacle,scene.turn,scene.text]); if (!known.has(signature)) { s.scenes.push({...scene,id:uid()}); known.add(signature); } } }); }
    };
  }
  const countWords = text => (String(text).match(/[\p{L}\p{N}]+/gu) || []).length;
  function analyze(text) {
    text = String(text || "");
    const lines = String(text || "").slice(0,200000).replace(/\r\n?/g,"\n").split("\n"), scenes = [], warnings = [];
    const sceneStart = line => /^\s*(?:[0-9٠-٩]+\s*[.\-–:)]?\s*)?(?:داخلي|خارجي|داخل|خارج|د\/خ|د\.|خ\.|INT\.?|EXT\.?|INT\/EXT\.?)\s*(?:[-–—./:]|\s)/iu.test(line);
    let current = null;
    lines.forEach((line, index) => {
      if (sceneStart(line)) { current = {heading:line.trim(),line:index+1,words:0}; scenes.push(current); }
      else if (current) current.words += countWords(line);
    });
    if (text.trim() && !scenes.length) warnings.push({title:"لم أتعرف على عناوين مشاهد",text:"إذا كان هذا سيناريو، جرّب عنوانًا مثل: داخلي — غرفة — ليل. قد يكون نصك مكتوبًا بتنسيق آخر.",guide:"format",line:null});
    for (const scene of scenes) {
      if (!/(ليل|نهار|صباح|مساء|فجر|ظهر|عصر|غروب|مستمر|لحظات|DAY|NIGHT|MORNING|EVENING|CONTINUOUS)/iu.test(scene.heading)) warnings.push({title:"راجع زمن المشهد",text:"لم أتعرف على وقت في العنوان. أضفه إن كان ضروريًا لفهم المشهد.",guide:"format",line:scene.line});
      if (!scene.words) warnings.push({title:"عنوان دون متن",text:"هذا المشهد لا يحتوي نصًا بعد العنوان.",guide:"scene",line:scene.line});
    }
    lines.forEach((line, index) => { if (countWords(line) > 90) warnings.push({title:"كتلة نصية طويلة",text:"أكثر من 90 كلمة في سطر واحد. تحقّق إن كانت فواصل الفقرات تسهّل القراءة؛ طول السطر لا يحكم على جودة المشهد.",guide:"visual",line:index+1}); });
    return {words:countWords(text),lines:lines.filter(l=>l.trim()).length,scenes,warnings:warnings.slice(0,20)};
  }
  function compareVersions(before, after) {
    const a = String(before).replace(/\r\n?/g,"\n").split("\n"), b = String(after).replace(/\r\n?/g,"\n").split("\n");
    if (a.length * b.length > 250000 || a.length + b.length > 4000) return {limited:true,beforeWords:countWords(before),afterWords:countWords(after),rows:[]};
    const table = Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
    for (let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--) table[i][j]=a[i]===b[j]?table[i+1][j+1]+1:Math.max(table[i+1][j],table[i][j+1]);
    let i=0,j=0; const rows=[];
    while(i<a.length || j<b.length) {
      if(i<a.length && j<b.length && a[i]===b[j]) {rows.push({type:"same",text:a[i++]});j++;}
      else if(j<b.length && (i===a.length || table[i][j+1]>=table[i+1][j])) rows.push({type:"added",text:b[j++]});
      else rows.push({type:"removed",text:a[i++]});
    }
    return {limited:false,beforeWords:countWords(before),afterWords:countWords(after),rows};
  }
  const api = {normalize,tokens,topics,units,goalOrder,createSearch,recommend,createStore,analyze,compareVersions,countWords};
  if(typeof module!=="undefined" && module.exports) module.exports=api; else root.NOURA_LEARNING_CORE=api;
})(typeof window!=="undefined"?window:globalThis);
