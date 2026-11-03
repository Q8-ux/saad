/* Waqaya route runtime: local timeline + audit fallback for GitHub Pages */
(() => {
  const WATCHED_KEYS = new Set(["waqaya.requests","waqaya.vaccinations"]);
  const AUDIT_KEY = "waqaya.audit.timeline";
  const maxEntries = 300;

  function safeParse(v){ try { return JSON.parse(v ?? "null"); } catch { return null; } }
  function pushAudit(entry){
    const current = safeParse(window.localStorage.getItem(AUDIT_KEY));
    const list = Array.isArray(current) ? current : [];
    list.unshift({ at:new Date().toISOString(), ...entry });
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(list.slice(0,maxEntries)));
  }
  function summarize(key, value){
    const data = safeParse(value);
    return {
      key,
      count:Array.isArray(data) ? data.length : null,
      refs:Array.isArray(data) ? data.slice(0,5).map(x=>x?.reference ?? x?.id ?? null).filter(Boolean) : []
    };
  }

  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value){
    const before = WATCHED_KEYS.has(key) ? this.getItem(key) : null;
    const result = originalSetItem.call(this,key,value);
    if (this === window.localStorage && WATCHED_KEYS.has(key) && before !== value) {
      try { pushAudit({type:"data-change", ...summarize(key,value)}); } catch {}
    }
    return result;
  };

  window.WaqayaRoutes = {
    version:"1.0.0",
    getTimeline(){
      const v = safeParse(window.localStorage.getItem(AUDIT_KEY));
      return Array.isArray(v) ? v : [];
    },
    clearTimeline(){ window.localStorage.removeItem(AUDIT_KEY); },
    validateRequest(r){
      const errors=[];
      if(!r?.ownerName || String(r.ownerName).trim().length<2) errors.push("ownerName");
      if(!r?.phone || String(r.phone).replace(/\D/g,"").length<8) errors.push("phone");
      if(!["أغنام","ماعز","أبقار","إبل"].includes(r?.animalType)) errors.push("animalType");
      if(!(Number(r?.headCount)>0)) errors.push("headCount");
      if(!r?.area) errors.push("area");
      if(!r?.preferredDate) errors.push("preferredDate");
      if(!r?.vaccineName) errors.push("vaccineName");
      return {ok:errors.length===0,errors};
    },
    validateVaccination(r){
      const fields=["ownerName","animalType","vaccineName","doseNumber","batchNumber","expiryDate","administeredAt","veterinarian"];
      const errors=fields.filter(k=>!r?.[k]);
      if(!(Number(r?.headCount)>0)) errors.push("headCount");
      return {ok:errors.length===0,errors};
    },
    hooks:{
      mastraEndpoint:null,
      langfuseEnabled:false,
      note:"Mastra/Langfuse require a server-side backend and secrets; hooks are intentionally inactive on GitHub Pages."
    }
  };
})();