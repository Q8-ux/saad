"use strict";
(() => {
  const core = window.NouraVideoCore, catalog = window.NouraVideoCatalog;
  const section = document.getElementById("videos");
  if (!section || !core || !catalog) return;
  const $ = id => document.getElementById(id);
  const E = core.escape;
  const topics = {all:"الكل",noura:"د. نورة",story:"السرد والقصة",screenplay:"السيناريو",characters:"الشخصيات والحوار"};
  const chosen = core.uniqueVideos(catalog.videos);
  const KEY = "noura-video-library-v1";
  let saved = [];
  try { saved = core.uniqueVideos(JSON.parse(localStorage.getItem(KEY) || "[]")).slice(0, 80); } catch { /* Storage may be unavailable. */ }
  let mode = "catalog", topic = new URLSearchParams(location.search).get("video-topic") || "all", query = "", remote = [], searchRun = 0, searchController, currentVideo, provider = "invidious", start = 0, captionRun = 0, captionsController, cues = [], tracks = [];
  if (!topics[topic]) topic = "all";
  const icon = name => `<svg class="video-icon" viewBox="0 0 24 24" aria-hidden="true">${({play:'<path d="m9 5 11 7-11 7Z"/>',bookmark:'<path d="M6 4h12v17l-6-4-6 4Z"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',captions:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10a2 2 0 1 0 0 4m7-4a2 2 0 1 0 0 4"/>'})[name] || ""}</svg>`;
  $("video-search-button").innerHTML = icon("search") + " بحث";
  function status(message, error = false) {
    $("video-status").textContent = message;
    $("video-status").dataset.error = String(error);
  }
  function setModes() {
    section.querySelectorAll("[data-video-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.videoMode === mode)));
    $("video-topics").innerHTML = Object.entries(topics).map(([key, label]) => `<button type="button" data-video-topic="${key}" aria-pressed="${key === topic}">${label}</button>`).join("");
    $("video-source-note").textContent = mode === "search" ? "نتائج البحث من يوتيوب؛ اسم القناة يحدد الناشر، ولا تعني النتائج أنها مقررات معتمدة أو مواد من إعداد الدكتورة." : "مراجع خارجية للمشاهدة والتعلّم. مقطع ورشة د. نورة تعريفي قصير؛ المحاضرات الأخرى من جهاتها الناشرة.";
    $("video-search-input").placeholder = mode === "search" ? "ابحث في يوتيوب عن موضوع أو متحدث" : "ابحث في العنوان أو اسم الناشر";
  }
  function activeVideos() {
    const source = mode === "saved" ? saved : mode === "search" ? remote : chosen;
    return source.filter(v => (mode === "search" || topic === "all" || v.topic === topic) && (mode === "search" || core.matches(v, query)));
  }
  function card(v) {
    const isSaved = saved.some(s => s.videoId === v.videoId);
    return `<article class="video-card" data-video-id="${v.videoId}"><div class="video-poster"><img src="${E(catalog.apiBase)}/vi/${v.videoId}/maxres.jpg" alt="${E(v.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span class="video-time">${core.duration(v.lengthSeconds)}</span><button class="video-play-overlay" type="button" data-video-play="${v.videoId}" aria-label="شاهد: ${E(v.title)}"><span class="video-play-circle">${icon("play")}</span></button></div><div class="video-card-body"><span class="video-topic-label">${E(topics[v.topic] || "نتيجة من يوتيوب")}</span><h3>${E(v.title)}</h3><p class="video-author" dir="auto">${E(v.author)}</p>${v.note ? `<p class="video-note">${E(v.note)}</p>` : ""}<div class="video-card-actions"><button class="video-button primary" type="button" data-video-play="${v.videoId}">${icon("play")} شاهد</button><button class="video-button bookmark" type="button" data-video-save="${v.videoId}" aria-pressed="${isSaved}" aria-label="${isSaved ? "إزالة من" : "إضافة إلى"} المحفوظة: ${E(v.title)}">${icon("bookmark")}</button></div></div></article>`;
  }
  function render() {
    const list = activeVideos();
    $("video-grid").innerHTML = list.length ? list.map(card).join("") : `<div class="video-empty"><p>${mode === "saved" ? "لم تحفظ مقاطع بعد." : mode === "search" ? "اكتب موضوعًا واضغط بحث لعرض الفيديوهات." : "لا توجد نتائج مطابقة."}</p><p>${mode === "saved" ? "اضغط رمز الحفظ بجانب الفيديو للعودة إليه لاحقًا على هذا الجهاز." : mode === "search" ? "يمكنك أيضًا مشاهدة المراجع المختارة من المكتبة." : "جرّب كلمة أخرى أو اختر جميع الموضوعات."}</p></div>`;
    const count = list.length, number = count.toLocaleString("ar-KW");
    $("video-count").textContent = !count ? "" : count === 1 ? "مقطع واحد" : count === 2 ? "مقطعان" : `${number} ${count <= 10 ? "مقاطع" : "مقطعًا"}`;
  }
  function findVideo(id) { return [...chosen, ...remote, ...saved].find(v => v.videoId === id); }
  function save(id) {
    const v = findVideo(id);
    if (!v) return;
    if (saved.some(s => s.videoId === id)) saved = saved.filter(s => s.videoId !== id);
    else if (saved.length < 80) saved.push(v);
    else { status("يمكنك حفظ 80 فيديو. أزل مقطعًا قبل إضافة آخر."); return; }
    try { localStorage.setItem(KEY, JSON.stringify(saved)); status(saved.some(s => s.videoId === id) ? "حُفظ الفيديو على هذا الجهاز." : "أُزيل الفيديو من المحفوظة."); }
    catch { status("تعذّر الحفظ الدائم على هذا المتصفح. تبقى المحفوظة متاحة أثناء الجلسة.", true); }
    render();
  }
  function cancelSearch() {
    searchRun++;
    searchController?.abort();
    $("video-search-button").disabled = false;
    $("video-grid").removeAttribute("aria-busy");
  }
  function setMode(next) {
    cancelSearch(); mode = next; topic = "all"; query = $("video-search-input").value.trim();
    setModes(); render();
    status(next === "search" ? "ابحث في مصادر الفيديو العامة. تُرسل عبارة البحث فقط إلى خدمة البحث الخارجية." : next === "saved" ? "المحفوظة على هذا الجهاز." : "اختر موضوعًا أو ابحث في المراجع المختارة.");
  }
  async function search() {
    query = $("video-search-input").value.trim().slice(0,160);
    if (mode !== "search") { render(); status(query ? "نتائج البحث داخل المكتبة." : "جميع المراجع المختارة."); return; }
    cancelSearch();
    if (!query) { remote = []; render(); status("اكتب موضوعًا للبحث."); $("video-search-input").focus(); return; }
    const run = searchRun, controller = new AbortController(); searchController = controller;
    $("video-search-button").disabled = true; $("video-grid").setAttribute("aria-busy", "true"); status("جار البحث عن الفيديوهات…");
    try {
      const found = await core.search(catalog.apiBase, query, {signal:controller.signal});
      if (run !== searchRun) return;
      remote = found; render(); status(found.length ? "نتائج يوتيوب مع أسماء الجهات الناشرة." : "لم يرجع المصدر فيديوهات لهذه العبارة. جرّب كلمات أقل.");
    } catch {
      if (run !== searchRun) return;
      remote = []; render();
      status("تعذّر الاتصال بمصدر البحث الآن. المراجع المختارة والمحفوظة متاحة، ويمكنك إعادة المحاولة لاحقًا.", true);
    } finally {
      if (run === searchRun) { $("video-search-button").disabled = false; $("video-grid").removeAttribute("aria-busy"); }
    }
  }
  function player() {
    if (!currentVideo) return;
    $("video-screen").innerHTML = `<iframe src="${E(core.embedUrl(currentVideo.videoId, provider, catalog.apiBase, start))}" title="${E(currentVideo.title)}" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    $("video-dialog").querySelectorAll("[data-video-provider]").forEach(b => b.setAttribute("aria-pressed", String(provider === b.dataset.videoProvider)));
    $("video-player-status").textContent = provider === "invidious" ? "إذا تعذّر تشغيل الفيديو، اختر مشغل يوتيوب أو افتح المقطع من مصدره." : "يعرض هذا المشغل فيديو يوتيوب داخل الصفحة. إذا منع الناشر التضمين، افتح المقطع من مصدره.";
  }
  function open(id) {
    const v = findVideo(id); if (!v) return;
    currentVideo = v; provider = "invidious"; start = 0; captionRun++; captionsController?.abort(); tracks=[]; cues=[];
    $("video-dialog-title").textContent = v.title;
    $("video-original").href = core.watchUrl(v.videoId);
    $("video-transcript").hidden = true; $("video-transcript-status").textContent = "";
    $("video-languages").innerHTML = ""; $("video-cues").innerHTML = "";
    $("video-transcript-search").value = ""; $("video-transcript-search").hidden = true;
    $("video-captions-button").innerHTML = icon("captions") + " نص الفيديو";
    $("video-captions-button").disabled = false;
    player(); $("video-dialog").showModal();
  }
  function renderCues(filter = "") {
    const shown = cues.map((cue, index) => ({...cue,index})).filter(cue => !filter || core.normalize(cue.text).includes(core.normalize(filter)));
    $("video-cues").innerHTML = shown.length ? shown.map(cue => `<div class="video-cue"><button type="button" data-video-seek="${cue.index}" aria-label="انتقل إلى ${core.duration(cue.start)}">${core.duration(cue.start)}</button><p dir="auto">${E(cue.text)}</p></div>`).join("") : '<p class="video-transcript-status">لا توجد سطور مطابقة.</p>';
  }
  async function loadTrack(index, run) {
    const track = tracks[index]; if (!track || !currentVideo) return;
    const id = currentVideo.videoId, controller = new AbortController(); captionsController?.abort(); captionsController=controller;
    cues=[]; $("video-cues").innerHTML=""; $("video-transcript-search").hidden=true;
    $("video-transcript-status").textContent = "جار تحميل نص الترجمة المصاحبة…";
    $("video-languages").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.videoLanguage)===index)));
    try {
      const text = await core.request(catalog.apiBase,"/api/v1/captions/"+id,{label:track.label},{text:true,signal:controller.signal});
      if (run!==captionRun || currentVideo?.videoId!==id) return;
      cues=core.parseVtt(text);
      $("video-transcript-status").textContent = cues.length ? "النص من الترجمة المصاحبة الأصلية للفيديو وقد يحتوي أخطاء. اضغط التوقيت للوصول إلى المقطع." : "لا يحتوي هذا المسار على نص قابل للعرض.";
      $("video-transcript-search").hidden=!cues.length; renderCues();
    } catch {
      if(run!==captionRun) return;
      $("video-transcript-status").textContent="تعذّر تحميل النص من المصدر الآن. يمكنك متابعة مشاهدة الفيديو واستخدام ترجمته داخل المشغل.";
    }
  }
  async function captions() {
    if (!currentVideo) return;
    const id=currentVideo.videoId, run=++captionRun, controller=new AbortController(); captionsController?.abort(); captionsController=controller;
    $("video-transcript").hidden=false; $("video-captions-button").disabled=true;
    $("video-transcript-status").textContent="جار التحقق من نصوص الترجمة المتاحة…";
    $("video-languages").innerHTML=""; $("video-cues").innerHTML=""; $("video-transcript-search").hidden=true;
    try {
      const data=await core.request(catalog.apiBase,"/api/v1/captions/"+id,{}, {signal:controller.signal});
      if(run!==captionRun) return;
      tracks=(Array.isArray(data.captions)?data.captions:[]).filter(t=>t && typeof t.label==="string" && t.label.length<=200).slice(0,80);
      const priority=t=>/^(ar|ar-)/.test(t.languageCode||t.language_code||"")?0:/^(en|en-)/.test(t.languageCode||t.language_code||"")?1:2;
      tracks.sort((a,b)=>priority(a)-priority(b));
      if(!tracks.length){$("video-transcript-status").textContent="لم يوفر مصدر الفيديو نصوص ترجمة متاحة لهذا المقطع.";return;}
      $("video-languages").innerHTML=tracks.map((t,index)=>`<button class="video-button" type="button" data-video-language="${index}" aria-pressed="false">${E(t.label)}</button>`).join("");
      let index=tracks.findIndex(t=>/^(ar|ar-)/.test(t.languageCode||t.language_code||""));
      if(index<0)index=tracks.findIndex(t=>/^(en|en-)/.test(t.languageCode||t.language_code||""));
      await loadTrack(Math.max(0,index),run);
    } catch {
      if(run===captionRun)$("video-transcript-status").textContent="تعذّر الوصول إلى نصوص الترجمة الآن. المشاهدة متاحة عبر المشغل أو المصدر الأصلي.";
    } finally { if(run===captionRun)$("video-captions-button").disabled=false; }
  }
  section.addEventListener("error", event => {
    if (event.target instanceof HTMLImageElement && event.target.closest(".video-poster")) event.target.remove();
  }, true);
  section.addEventListener("click",event=>{
    const b=event.target.closest("button");if(!b)return;
    if(b.dataset.videoMode){setMode(b.dataset.videoMode);return;}
    if(b.dataset.videoTopic){if(mode==="search"){cancelSearch();mode="catalog";query="";$("video-search-input").value="";}topic=b.dataset.videoTopic;setModes();render();status("تم تحديث موضوعات المكتبة.");return;}
    if(b.dataset.videoPlay){open(b.dataset.videoPlay);return;}
    if(b.dataset.videoSave){save(b.dataset.videoSave);return;}
    if(b.id==="video-noura-search"){setMode("search");$("video-search-input").value="نورة العتال";search();}
  });
  $("video-search-form").addEventListener("submit",event=>{event.preventDefault();search();});
  $("video-search-input").addEventListener("input",()=>{if(mode!=="search"){query=$("video-search-input").value.trim();render();}});
  $("video-dialog").addEventListener("click",event=>{
    const b=event.target.closest("button");
    if(b?.id==="video-dialog-close"){$("video-dialog").close();return;}
    if(b?.dataset.videoProvider){provider=b.dataset.videoProvider;player();return;}
    if(b?.id==="video-captions-button"){captions();return;}
    if(b?.dataset.videoLanguage!==undefined){const run=++captionRun;$("video-captions-button").disabled=false;loadTrack(Number(b.dataset.videoLanguage),run);return;}
    if(b?.dataset.videoSeek!==undefined){start=cues[Number(b.dataset.videoSeek)]?.start||0;player();return;}
    if(event.target===$("video-dialog")){const r=$("video-dialog").getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$("video-dialog").close();}
  });
  $("video-transcript-search").addEventListener("input",event=>renderCues(event.target.value));
  $("video-dialog").addEventListener("close",()=>{captionRun++;captionsController?.abort();$("video-captions-button").disabled=false;$("video-screen").innerHTML="";currentVideo=null;});
  setModes();render();status("اختر موضوعًا أو ابحث في المراجع المختارة.");
  // No literary generation, user drafts, or third-party AI requests are part of this library.
})();
