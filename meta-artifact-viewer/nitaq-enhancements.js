(function(){
"use strict";
const data=window.NITAQ_DATA;
if(!data)return;
const dictionary=data.dictionary,sites=data.sites,ui=data.ui;
const originals=new WeakMap(),attrOriginals=new WeakMap();
let language=localStorage.getItem("nitaq-language")==="en"?"en":"ar",activeFilter="all",map=null,markerLayer=null;
const markers=new Map(),arabic=/[\u0600-\u06FF]/,digits={"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
const days={"السبت":"Saturday","الأحد":"Sunday","الإثنين":"Monday","الثلاثاء":"Tuesday","الأربعاء":"Wednesday","الخميس":"Thursday","الجمعة":"Friday"};
const months={"يناير":"January","فبراير":"February","مارس":"March","أبريل":"April","مايو":"May","يونيو":"June","يوليو":"July","أغسطس":"August","سبتمبر":"September","أكتوبر":"October","نوفمبر":"November","ديسمبر":"December"};
const panelHtml='<div id="monitoring-overlay" class="monitoring-overlay" aria-hidden="true"><section class="monitoring-panel" role="dialog" aria-modal="true" aria-labelledby="monitoring-title"><header class="monitoring-header"><div><span class="monitoring-kicker" data-ui="kicker"></span><h2 id="monitoring-title"></h2><p id="monitoring-subtitle"></p></div><button id="monitoring-close" type="button" class="monitoring-close">×</button></header><div class="monitoring-stats"><div><strong id="stat-total"></strong><span data-ui="total"></span></div><div><strong id="stat-generation"></strong><span data-ui="generation"></span></div><div><strong id="stat-substations"></strong><span data-ui="substations"></span></div></div><div class="monitoring-toolbar"><div class="monitoring-filters"><button type="button" data-filter="all" class="is-active"></button><button type="button" data-filter="generation"></button><button type="button" data-filter="substation"></button></div><input id="monitoring-search" type="search"></div><div class="monitoring-grid"><div id="monitoring-map"></div><div id="monitoring-list" class="monitoring-list"></div></div><div class="monitoring-notice" id="monitoring-notice"></div><div class="monitoring-source"><a href="https://www.mew.gov.kw/ar/ShowStructureDetails?name=Power+Stations+and+Water+Distillation+Sector" target="_blank" rel="noopener noreferrer" id="official-source"></a></div></section></div>';
function latin(v){return v.replace(/[٠-٩]/g,function(x){return digits[x]||x})}
function dynamicText(value){
 const text=value.trim();
 if(dictionary[text])return dictionary[text];
 let m;
 if((m=text.match(/^سجل الموظفين\s*-\s*([0-9٠-٩]+)\s*موظف$/)))return "Employee Registry — "+latin(m[1])+" employees";
 if((m=text.match(/^الطلبات الإدارية\s*-\s*([0-9٠-٩]+)\s*طلبات$/)))return "Administrative Requests — "+latin(m[1])+" requests";
 if((m=text.match(/^([0-9٠-٩.]+)%\s*من القوة$/)))return latin(m[1])+"% of workforce";
 if((m=text.match(/^([0-9٠-٩.]+)%\s*غياب$/)))return latin(m[1])+"% absence";
 if((m=text.match(/^([0-9٠-٩.]+)%\s*التزام$/)))return latin(m[1])+"% compliance";
 if((m=text.match(/^من أصل\s*([0-9٠-٩]+)$/)))return "out of "+latin(m[1]);
 if((m=text.match(/^([0-9٠-٩]+)\s*موظف في هذه المناوبة$/)))return latin(m[1])+" employees on this shift";
 if((m=text.match(/^قبل\s*([0-9٠-٩]+)\s*دقائق?$/)))return latin(m[1])+" minutes ago";
 if((m=text.match(/^(السبت|الأحد|الإثنين|الثلاثاء|الأربعاء|الخميس|الجمعة)،\s*(.+?)\s*-\s*(.+?)\s*(ص|م)$/))){
  let date=latin(m[2]);Object.entries(months).forEach(function(pair){date=date.replace(pair[0],pair[1])});
  return days[m[1]]+", "+date+" — "+latin(m[3])+" "+(m[4]==="ص"?"AM":"PM");
 }
 return latin(text);
}
function preserve(raw){const lead=(raw.match(/^\s*/)||[""])[0],tail=(raw.match(/\s*$/)||[""])[0],core=raw.slice(lead.length,raw.length-tail.length);return !core||!arabic.test(core)?raw:lead+dynamicText(core)+tail}
function ignored(node){const p=node.nodeType===1?node:node.parentElement;return !p||!!p.closest("#language-switcher,#monitoring-overlay,.monitoring-nav-button,script,style,noscript")}
function processText(node){if(ignored(node))return;const current=node.nodeValue||"";if(language==="en"){if(arabic.test(current))originals.set(node,current);const source=originals.get(node)||current,translated=preserve(source);if(current!==translated)node.nodeValue=translated}else{const source=originals.get(node);if(source!=null&&current!==source)node.nodeValue=source}}
function processAttrs(el){if(ignored(el))return;["placeholder","title","aria-label"].forEach(function(attr){if(!el.hasAttribute(attr))return;const current=el.getAttribute(attr)||"",store=attrOriginals.get(el)||{};if(language==="en"){if(arabic.test(current)){store[attr]=current;attrOriginals.set(el,store)}const source=store[attr]||current,translated=preserve(source);if(current!==translated)el.setAttribute(attr,translated)}else if(store[attr]!=null&&current!==store[attr])el.setAttribute(attr,store[attr])})}
function walk(root){if(!root)return;if(root.nodeType===3){processText(root);return}if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;if(root.nodeType===1)processAttrs(root);const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))n.nodeType===3?processText(n):processAttrs(n)}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function mapsUrl(site){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(site.lat+","+site.lng)}
function ensureSwitch(){if(document.getElementById("language-switcher"))return;const el=document.createElement("div");el.id="language-switcher";el.innerHTML='<button type="button" data-lang="ar">AR</button><button type="button" data-lang="en">EN</button>';el.addEventListener("click",function(e){const b=e.target.closest("button[data-lang]");if(b)apply(b.dataset.lang)});document.body.appendChild(el)}
function updateSwitch(){const el=document.getElementById("language-switcher");if(!el)return;el.querySelector('[data-lang="ar"]').setAttribute("aria-pressed",String(language==="ar"));el.querySelector('[data-lang="en"]').setAttribute("aria-pressed",String(language==="en"));el.setAttribute("aria-label",language==="ar"?"تغيير اللغة":"Change language")}
function ensurePanel(){
 if(document.getElementById("monitoring-overlay"))return;
 document.body.insertAdjacentHTML("beforeend",panelHtml);
 document.getElementById("monitoring-close").addEventListener("click",closePanel);
 document.getElementById("monitoring-overlay").addEventListener("click",function(e){if(e.target.id==="monitoring-overlay")closePanel()});
 document.querySelectorAll("[data-filter]").forEach(function(b){b.addEventListener("click",function(){activeFilter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(function(x){x.classList.toggle("is-active",x===b)});renderSites()})});
 document.getElementById("monitoring-search").addEventListener("input",renderSites);
}
function navIcon(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></svg>'}
function ensureNav(){
 const nav=document.querySelector("aside nav")||document.querySelector("nav");
 if(!nav||nav.querySelector(".monitoring-nav-button"))return;
 const b=document.createElement("button");b.type="button";b.className="monitoring-nav-button";b.innerHTML=navIcon()+"<span></span>";b.addEventListener("click",openPanel);
 const ref=Array.from(nav.querySelectorAll("button")).find(function(x){const t=x.textContent||"";return t.includes("الإدارات والمحطات")||t.includes("Departments & Stations")});
 if(ref)ref.insertAdjacentElement("afterend",b);else nav.appendChild(b);
 updateInjectedLanguage();
}
function updateInjectedLanguage(){
 const t=ui[language],navText=document.querySelector(".monitoring-nav-button span");if(navText)navText.textContent=t.nav;
 if(!document.getElementById("monitoring-overlay"))return;
 document.querySelector('[data-ui="kicker"]').textContent=t.kicker;document.getElementById("monitoring-title").textContent=t.title;document.getElementById("monitoring-subtitle").textContent=t.subtitle;
 document.querySelector('[data-ui="total"]').textContent=t.total;document.querySelector('[data-ui="generation"]').textContent=t.generation;document.querySelector('[data-ui="substations"]').textContent=t.substations;
 document.querySelector('[data-filter="all"]').textContent=t.all;document.querySelector('[data-filter="generation"]').textContent=t.genFilter;document.querySelector('[data-filter="substation"]').textContent=t.subFilter;
 document.getElementById("monitoring-search").placeholder=t.search;document.getElementById("monitoring-close").setAttribute("aria-label",t.close);document.getElementById("monitoring-notice").textContent=t.notice;document.getElementById("official-source").textContent=t.official;document.getElementById("monitoring-map").setAttribute("aria-label",t.title);
}
function loadLeaflet(done){
 if(window.L){done();return}
 if(!document.querySelector("link[data-leaflet]")){const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";link.dataset.leaflet="1";document.head.appendChild(link)}
 const old=document.querySelector("script[data-leaflet]");if(old){old.addEventListener("load",done,{once:true});return}
 const script=document.createElement("script");script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.dataset.leaflet="1";script.onload=done;document.head.appendChild(script);
}
function filteredSites(){const q=(document.getElementById("monitoring-search")?.value||"").trim().toLowerCase();return sites.filter(function(s){return (activeFilter==="all"||s.type===activeFilter)&&(!q||(s.ar+" "+s.en+" "+s.areaAr+" "+s.areaEn).toLowerCase().includes(q))})}
function renderSites(){
 const t=ui[language],items=filteredSites(),list=document.getElementById("monitoring-list");if(!list)return;list.innerHTML=items.length?"":'<div class="site-card">'+escapeHtml(t.empty)+"</div>";
 items.forEach(function(s){const card=document.createElement("article");card.className="site-card";card.innerHTML='<div class="site-card-head"><div><h3>'+escapeHtml(language==="ar"?s.ar:s.en)+"</h3><p>"+escapeHtml(language==="ar"?s.areaAr:s.areaEn)+'</p></div><span class="site-type '+s.type+'">'+escapeHtml(s.type==="generation"?t.typeGen:t.typeSub)+'</span></div><div class="site-meta"><span>'+escapeHtml(t.radius)+": "+s.radius+" "+escapeHtml(t.meters)+'</span><a href="'+mapsUrl(s)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(t.maps)+"</a></div>";card.addEventListener("click",function(e){if(!e.target.closest("a"))focusSite(s.id)});list.appendChild(card)});
 renderMarkers(items);
}
function renderMarkers(items){
 if(!map||!window.L)return;markerLayer.clearLayers();markers.clear();const bounds=[];
 items.forEach(function(s){const t=ui[language],icon=L.divIcon({className:"",html:'<div class="nitaq-marker '+s.type+'"></div>',iconSize:[18,18],iconAnchor:[9,9]});const marker=L.marker([s.lat,s.lng],{icon:icon}).addTo(markerLayer);marker.bindPopup("<strong>"+escapeHtml(language==="ar"?s.ar:s.en)+"</strong><br>"+escapeHtml(language==="ar"?s.areaAr:s.areaEn)+"<br>"+escapeHtml(t.radius)+": "+s.radius+" "+escapeHtml(t.meters)+'<br><a href="'+mapsUrl(s)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(t.maps)+"</a>");markers.set(s.id,marker);bounds.push([s.lat,s.lng])});
 if(bounds.length)map.fitBounds(bounds,{padding:[28,28],maxZoom:11});
}
function initMap(){if(map){setTimeout(function(){map.invalidateSize();renderSites()},80);return}map=L.map("monitoring-map",{zoomControl:true}).setView([29.25,47.9],8);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap contributors"}).addTo(map);markerLayer=L.layerGroup().addTo(map);renderSites()}
function focusSite(id){const marker=markers.get(id),site=sites.find(function(s){return s.id===id});if(marker&&site){map.setView([site.lat,site.lng],12);marker.openPopup()}}
function openPanel(){ensurePanel();updateInjectedLanguage();const o=document.getElementById("monitoring-overlay");o.classList.add("is-open");o.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";loadLeaflet(initMap)}
function closePanel(){const o=document.getElementById("monitoring-overlay");if(o){o.classList.remove("is-open");o.setAttribute("aria-hidden","true")}document.body.style.overflow=""}
function apply(lang){language=lang==="en"?"en":"ar";localStorage.setItem("nitaq-language",language);document.documentElement.lang=language;document.documentElement.dir=language==="ar"?"rtl":"ltr";document.body.setAttribute("dir",document.documentElement.dir);document.title=language==="ar"?"نطاق العمل | نظام متابعة الحضور والانضباط":"Work Scope | Attendance & Discipline Monitoring";walk(document.getElementById("root"));updateSwitch();updateInjectedLanguage();if(document.getElementById("monitoring-overlay")?.classList.contains("is-open"))renderSites()}
function init(){
 ensureSwitch();ensurePanel();ensureNav();document.getElementById("stat-total").textContent=sites.length;document.getElementById("stat-generation").textContent=sites.filter(function(s){return s.type==="generation"}).length;document.getElementById("stat-substations").textContent=sites.filter(function(s){return s.type==="substation"}).length;apply(language);
 const observer=new MutationObserver(function(records){records.forEach(function(r){if(r.type==="characterData")processText(r.target);else r.addedNodes.forEach(walk)});ensureNav()});observer.observe(document.getElementById("root")||document.body,{subtree:true,childList:true,characterData:true});
 document.addEventListener("keydown",function(e){if(e.key==="Escape")closePanel()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(init,0)},{once:true});else setTimeout(init,0);
})();