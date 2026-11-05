/* Gulf Investment Compass — browser-only multilingual UI + source-bounded assistant.
   Source notes reviewed 2026-11-05. This assistant does not invent legal advice. */
(()=>{
"use strict";
const countries=window.GULF_COUNTRIES||[], offers=window.GULF_OPPORTUNITIES||[], t=window.GULF_TEXT||{}, summaries=window.GULF_SUMMARIES||{};
const langs=["ar","en","id","vi","hi","zh-TW"];
const langTags={ar:"ar-KW",en:"en-US",id:"id-ID",vi:"vi-VN",hi:"hi-IN","zh-TW":"zh-TW"};
const $=id=>document.getElementById(id);
let locale="ar", countryFilter="all",sectorFilter="all",query="",lastReply=null,voice=null;
const encode=s=>String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
const officialUrl=url=>{try{const x=new URL(url);if(x.protocol==="https:")return x.href;}catch{}return "#"};
const imgUrl=file=>"https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(file)+"?width=900";
const k=()=>t[locale]||t.en;
function topicLabel(tag){const s=window.GULF_SECTORS[tag]||[tag];return s[langs.indexOf(locale)]||s[1]||tag}
function brief(c){return (summaries[locale]||summaries.en)[c.id]||(summaries.en||{})[c.id]}
function setLocale(lang){locale=langs.includes(lang)?lang:"en";document.documentElement.lang=locale;document.documentElement.dir=locale==="ar"?"rtl":"ltr";document.title=k().brand+" | Gulf Investment Compass";document.querySelectorAll("[data-t]").forEach(n=>{if(k()[n.dataset.t])n.textContent=k()[n.dataset.t]});$("language").value=locale;$("country").innerHTML='<option value="all">'+encode(k().allCountries)+'</option>'+countries.map(c=>'<option value="'+c.id+'">'+c.flag+" "+encode(locale==="ar"?c.ar:c.en)+'</option>').join("");$("country").value=countryFilter;
 $("sector").innerHTML='<option value="all">'+encode(k().allSectors)+'</option>'+Object.keys(window.GULF_SECTORS).filter(x=>x!=="all").map(x=>'<option value="'+x+'">'+encode(topicLabel(x))+'</option>').join("");$("sector").value=sectorFilter;
 $("search").placeholder=k().search;$("chatInput").placeholder=k().ask;
 renderCountries();renderOffers();renderLaws();renderDialogWelcome();
 if(voice)voice.setLanguage(langTags[locale]);}
function isVisible(c){if(countryFilter!=="all"&&c.id!==countryFilter)return false;if(sectorFilter!=="all"&&!c.tags.includes(sectorFilter))return false;const hay=(c.en+" "+c.ar+" "+c.capital+" "+brief(c).sectors+" "+brief(c).summary+" "+c.tags.join(" ")).toLowerCase();return !query||hay.includes(query.toLowerCase());}
function renderCountries(){const d=k();const matched=countries.filter(isVisible);$("cards").innerHTML=matched.map(c=>{const b=brief(c);return '<article class="country-card"><div class="country-image"><img loading="lazy" decoding="async" src="'+imgUrl(c.photo)+'" alt="'+encode(c.en)+' geographic photo, not an investment project photograph"><span class="country-flag">'+c.flag+" "+encode(locale==="ar"?c.ar:c.en)+'</span></div><div class="country-body"><h3>'+encode(locale==="ar"?c.ar:c.en)+'</h3><p>'+encode(b.summary)+'</p><div class="country-links"><a href="'+officialUrl(c.law)+'" target="_blank" rel="noopener noreferrer">'+encode(d.lawView)+' ↗</a><a href="'+officialUrl(c.guide)+'" target="_blank" rel="noopener noreferrer">'+encode(d.opView)+' ↗</a></div><small class="credit">'+encode(d.photo)+': <a href="'+officialUrl(c.commons)+'" target="_blank" rel="noopener noreferrer">'+encode(c.author)+" · "+encode(c.licence)+'</a>. '+encode(d.photoNote)+'</small></div></article>'}).join("")||'<div class="notice">'+encode(d.noMatch)+'</div>';
 $("countryCount").textContent=String(matched.length);}
const oppNames={
"om-livestock":{ar:"مزرعة تسمين المواشي وإنتاج الألبان — النجد",id:"Peternakan penggemukan ternak dan susu — Al Najd",vi:"Trang trại chăn nuôi và sữa — Al Najd",hi:"पशुपालन व डेयरी फार्म — अल नज्द","zh-TW":"畜牧育肥與乳製品農場—Al Najd"},
"om-smart":{ar:"مجمع زراعي ذكي — قريات",id:"Klaster pertanian pintar — Qurayat",vi:"Cụm nông nghiệp thông minh — Qurayat",hi:"स्मार्ट कृषि क्लस्टर — क़ुरियात","zh-TW":"智慧農業園區—Qurayat"},
"om-urban":{ar:"مدينة الثريا — تطوير متعدد الاستخدامات",id:"Kota A’Thuraya — kawasan multifungsi",vi:"Thành phố A’Thuraya — dự án đa chức năng",hi:"अल थुरैया मिश्रित उपयोग परियोजना","zh-TW":"A’Thuraya 複合用途開發"},
"sa-industries":{ar:"قطاعات الصناعة والتصنيع في السعودية",id:"Sektor industri dan manufaktur Saudi",vi:"Ngành sản xuất tại Saudi Arabia",hi:"सऊदी विनिर्माण उद्योग","zh-TW":"沙烏地製造產業"},
"ae-startup":{ar:"تأسيس الشركات والابتكار في الإمارات",id:"Pendirian usaha dan inovasi UEA",vi:"Thành lập doanh nghiệp và đổi mới tại UAE",hi:"यूएई कंपनी स्थापना व नवाचार","zh-TW":"阿聯酋公司設立與創新"},
"qa-cyber":{ar:"قطاع الأمن السيبراني في قطر",id:"Sektor keamanan siber Qatar",vi:"Ngành an ninh mạng Qatar",hi:"क़तर साइबर सुरक्षा क्षेत्र","zh-TW":"卡達資安產業"},
"bh-ict":{ar:"قطاع تقنية المعلومات والاتصالات في البحرين",id:"Sektor TIK Bahrain",vi:"Ngành CNTT và truyền thông Bahrain",hi:"बहरीन आईसीटी क्षेत्र","zh-TW":"巴林資通訊產業"},
"kw-digital":{ar:"التكنولوجيا والتحول الرقمي في الكويت",id:"Teknologi dan transformasi digital Kuwait",vi:"Công nghệ và chuyển đổi số Kuwait",hi:"कुवैत तकनीक व डिजिटल परिवर्तन","zh-TW":"科威特科技與數位轉型"}
};
function offerName(o){return oppNames[o.id]?.[locale]||o.title;}
function renderOffers(){const d=k();const v=offers.filter(o=>(countryFilter==="all"||o.country===countryFilter)&&(sectorFilter==="all"||o.sector===sectorFilter)&&(!query||[offerName(o),o.title,o.sector].join(" ").toLowerCase().includes(query.toLowerCase())));$("opportunitiesCards").innerHTML=v.map(o=>{const c=countries.find(c=>c.id===o.country),isListing=o.kind==="official-listing";return '<article class="opportunity"><div class="opp-top"><span class="badge '+(isListing?"":"portal")+'">'+encode(isListing?d.officialListing:d.sectorGateway)+'</span><span>'+c.flag+'</span></div><h3>'+encode(offerName(o))+'</h3><div class="opp-meta">'+encode(topicLabel(o.sector))+(isListing&&o.value!=="—"?' · '+encode(o.value):"")+'</div><p>'+encode(d.review)+' · '+encode(o.date)+' · '+encode(d.photoNote)+'</p><a class="source-link" href="'+officialUrl(o.official)+'" target="_blank" rel="noopener noreferrer">'+encode(d.visit)+' ↗</a></article>'}).join("")||'<div class="notice">'+encode(d.noMatch)+'</div>'; $("offerCount").textContent=String(v.length);}
function renderLaws(){const d=k();$("lawCards").innerHTML=countries.filter(isVisible).map(c=>{const b=brief(c);return '<article class="law-card"><h3>'+c.flag+" "+encode(locale==="ar"?c.ar:c.en)+'</h3><b>'+encode(c.lawName)+'</b><p>'+encode(b.summary)+'</p><p><strong>'+encode(d.ownership)+': </strong>'+encode(b.hint)+'</p><div class="law-actions"><a class="source-link" href="'+officialUrl(c.law)+'" target="_blank" rel="noopener noreferrer">'+encode(d.lawView)+' ↗</a><a class="source-link" href="'+officialUrl(c.register)+'" target="_blank" rel="noopener noreferrer">'+encode(d.guide)+' ↗</a></div></article>'}).join("")||'<div class="notice">'+encode(d.noMatch)+'</div>';}
function filterAll(){renderCountries();renderOffers();renderLaws();}
function userBubble(text){const node=document.createElement("div");node.className="bubble user";node.textContent=text;$("chatLog").append(node);$("chatLog").scrollTop=$("chatLog").scrollHeight;}
function assistantBubble(msg,sources=[]){const node=document.createElement("div");node.className="bubble";const txt=document.createElement("div");txt.textContent=msg;node.append(txt);if(sources.length){const list=document.createElement("div");list.className="sources";const uniq=[...new Set(sources)].slice(0,4);for(const src of uniq){const a=document.createElement("a");a.href=officialUrl(src);a.target="_blank";a.rel="noopener noreferrer";a.textContent=k().answerSource+" ↗";list.append(a)}node.append(list)}$("chatLog").append(node);$("chatLog").scrollTop=$("chatLog").scrollHeight;}
function renderDialogWelcome(){$("chatLog").replaceChildren();assistantBubble(k().assistantSub,[]);}
const aliases={sa:["saudi","السعود","سعودية","السعودية","arabia","السعوديه","arab saudi","arab saudi","arabia saudi","saud","saudita","arab saudi","سعود","saudi arabia","arab saudi","沙烏地","सऊदी","Ả rập","Ả Rập","Arab Saudi"],ae:["uae","emirates","الإمارات","امارات","dubai","دبي","abu dhabi","阿聯酋","संयुक्त अरब","dubai","uni emirat","UEA"],qa:["qatar","قطر","doha","الدوحة","卡達","क़तर","Qatar"],om:["oman","عمان","عُمان","muscat","مسقط","阿曼","ओमान"],bh:["bahrain","البحرين","بحرين","manama","巴林","बहरीन"],kw:["kuwait","الكويت","كويت","Kuwait","科威特","कुवैत"]};
function detectCountry(q){const lower=q.toLocaleLowerCase();for(const c of countries){if(aliases[c.id].some(a=>lower.includes(a.toLocaleLowerCase())))return c;}return countryFilter!=="all"?countries.find(c=>c.id===countryFilter):null;}
const keywordSets={
ownership:/ملك|تملك|اجنب|أجنب|own|foreign|100%|investor|sở hữu|nước ngoài|kepemilikan|asing|विदेशी|स्वामित्व|外資|持股|股權|investment law|القانون/i,
register:/تأسيس|انشاء شرك|إنشاء شرك|ترخيص|تسجيل|سجل|register|license|licens|company|establish|pđăng ký|đăng ký|pendaftaran|izin|perusahaan|पंजीकरण|कंपनी|登記|公司|設立|许可|許可/i,
opportunities:/فرص|استثمار|مشروع|قطاع|projects?|opportun|sector|invest|peluang|proyek|sektor|dự án|cơ hội|ngành|निवेश|परियोजना|अवसर|機會|產業|計畫/i
};
function referencedAnswer(q){const d=k();const country=detectCountry(q);const isInvest=keywordSets.opportunities.test(q),isRegister=keywordSets.register.test(q),isOwnership=keywordSets.ownership.test(q);if(!country){
 const choices=countries.map(c=>c.flag+" "+(locale==="ar"?c.ar:c.en)).join(" · ");
 const general=(isInvest?d.sectorSub:d.countrySub)+"\n"+choices+"\n"+d.risk;
 return {answer:general,links:countries.slice(0,3).map(x=>x.guide)};
 }
 const b=brief(country);let answer=(locale==="ar"?country.ar:country.en)+" — "+b.summary;
 if(isInvest&&!isRegister&&!isOwnership){const matched=offers.filter(x=>x.country===country.id);answer+="\n"+b.sectors+".\n"+(matched.length?matched.map(x=>"• "+offerName(x)+(x.value!=="—"?" · "+x.value:"")).join("\n"):"");}
 answer+="\n"+b.hint+"\n"+d.risk;
 return {answer,links:isInvest&&!isRegister&&!isOwnership?[country.guide,country.law]:[country.law,country.register]};
}
async function sendQuestion(text,fromVoice=false){const value=String(text||"").trim();if(!value)return "";const safe=value.slice(0,900);userBubble(safe);$("chatState").textContent=k().thinking;const r=referencedAnswer(safe);lastReply=r;assistantBubble(r.answer,r.links);$("chatState").textContent=k().ready;return r.answer;}
function installVoice(){if(!window.TalkingPath?.create){$("voiceBtn").disabled=true;$("chatState").textContent=k().voiceUnavailable;return;}voice=window.TalkingPath.create({mode:"free-browser",language:langTags[locale],onText:async text=>sendQuestion(text,true),onState:e=>{$("chatState").textContent=e.state==="listening"?k().listening:e.state==="thinking"?k().thinking:e.state==="speaking"?k().speaking:e.state==="error"?k().voiceUnavailable:k().ready;}});
 $("voiceBtn").addEventListener("click",async()=>{try{await voice.start();}catch(e){$("chatState").textContent=k().voiceUnavailable;}});
 $("stopVoice").addEventListener("click",()=>{try{voice.stop();window.speechSynthesis?.cancel();$("chatState").textContent=k().ready;}catch{}});
 $("readLast").addEventListener("click",async()=>{if(!lastReply)return;try{await voice.speak(lastReply.answer);}catch{$("chatState").textContent=k().voiceUnavailable;}});
}
function main(){
 $("country").addEventListener("change",e=>{countryFilter=e.target.value;filterAll()});
 $("sector").addEventListener("change",e=>{sectorFilter=e.target.value;filterAll()});
 $("search").addEventListener("input",e=>{query=e.target.value.trim();filterAll()});
 $("language").addEventListener("change",e=>setLocale(e.target.value));
 $("chatForm").addEventListener("submit",async e=>{e.preventDefault();const text=$("chatInput").value;$("chatInput").value="";await sendQuestion(text);});
 for(let i=1;i<=3;i++)$("quick"+i).addEventListener("click",async()=>sendQuestion(k()["quick"+i]));
 installVoice();setLocale("ar");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",main);else main();
})();
