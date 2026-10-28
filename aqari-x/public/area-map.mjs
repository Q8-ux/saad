import { escapeHTML as esc } from './core.mjs?v=1.4.0';
import { areaName } from './discovery.mjs?v=1.4.0';
import { getLocale, translate, localize } from './i18n.mjs?v=1.4.0';
// Only fetched while the visitor opens the map; no geolocation or tile prefetch.
const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export async function mountAreaMap(root,properties,onArea) {
  let alive=true,map,layer,tileError=false;
  const dispose=()=>{alive=false;map?.remove();};
  root.innerHTML='<div class="map-loading" role="status">جارٍ تحميل خريطة المناطق…</div>';
  try {
    const [L,{AREA_CENTRES,AREA_DATA_SOURCE}]=await Promise.all([import('./vendor/leaflet/leaflet.mjs?v=1.4.0'),import('./kuwait-area-centres.mjs?v=1.4.0')]);
    if(!root.isConnected)return {destroy:dispose,update:()=>{}};
    root.innerHTML=`<div class="map-heading"><div><strong>استكشف مناطق الكويت</strong><p>الأرقام تمثل عدد العروض في المنطقة، وليست مواقع العقارات الدقيقة.</p></div><button type="button" class="btn secondary small" data-map-fit>عرض كل المناطق</button></div><div class="area-map-canvas" aria-label="خريطة تجمعات المناطق في الكويت"></div><p class="map-status" role="status"></p><p class="map-tile-error" role="status" hidden>تعذر تحميل بعض أجزاء الخريطة. يمكنك اختيار المنطقة من الأزرار أو متابعة القائمة.</p><div class="map-area-options" role="group" aria-label="مناطق العروض"></div><p class="map-credit">${translate('مراكز المناطق')}: <a href="${esc(AREA_DATA_SOURCE.url)}" target="_blank" rel="noopener noreferrer">${esc(AREA_DATA_SOURCE.name)}</a> · ${esc(AREA_DATA_SOURCE.license)}</p>`;
    map=L.map(root.querySelector('.area-map-canvas'),{scrollWheelZoom:false,zoomControl:false,attributionControl:true}).setView([29.24,47.98],10);
    L.control.zoom({position:'topleft',zoomInTitle:translate('تكبير الخريطة'),zoomOutTitle:translate('تصغير الخريطة')}).addTo(map);
    const tiles=L.tileLayer(TILE_URL,{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'}).addTo(map);
    tiles.on('tileerror',()=>{if(!alive)return;tileError=true;root.querySelector('.map-tile-error').hidden=false;});
    layer=L.layerGroup().addTo(map);
    let bounds;
    const fit=()=>{if(bounds?.isValid())map.fitBounds(bounds.pad(.2),{maxZoom:12,animate:false});else map.setView([29.24,47.98],10);};
    root.querySelector('[data-map-fit]').onclick=fit;
    const update=items=>{
      if(!alive)return;
      layer.clearLayers();const groups=new Map();let unmapped=0;
      for(const p of items){const area=areaName(p.location);const centre=area&&AREA_CENTRES[area];if(!centre){unmapped++;continue;}groups.set(area,{...centre,count:(groups.get(area)?.count||0)+1});}
      bounds=L.latLngBounds([]);
      for(const [area,c] of groups){
        bounds.extend([c.lat,c.lng]);
        const marker=L.marker([c.lat,c.lng],{icon:L.divIcon({className:'area-count-marker',html:`<span>${c.count}</span>`,iconSize:[44,44],iconAnchor:[22,22]}),title:`${translate(area)} · ${c.count} ${translate('عرض')}`,alt:`${translate(area)} · ${c.count} ${translate('عرض')}`}).addTo(layer);
        marker.getElement()?.setAttribute('aria-label',`${translate(area)} · ${c.count} ${translate('عرض')}`);
        marker.bindTooltip(()=>{const el=document.createElement('span');el.textContent=translate(area);return el;},{direction:'top'});
        marker.on('click',()=>onArea(area));
      }
      root.querySelector('.map-status').textContent=getLocale()==='en'?`${items.length-unmapped} listings grouped by area · ${unmapped} without a mapped area`:getLocale()==='ur'?`${items.length-unmapped} اشتہارات علاقے کے لحاظ سے · ${unmapped} نقشے پر علاقہ دستیاب نہیں`:`${items.length-unmapped} عرض ضمن تجمعات المناطق · ${unmapped} دون منطقة محددة على الخريطة`;
      root.querySelector('.map-area-options').innerHTML=[...groups].map(([area,c])=>`<button class="area-option" type="button" data-map-area="${esc(area)}">${esc(area)}<b>${c.count}</b></button>`).join('');
      root.querySelectorAll('[data-map-area]').forEach(b=>b.onclick=()=>onArea(b.dataset.mapArea));
      fit();localize(root);
    };
    update(properties);localize(root);
    // Leaflet reads its own reserved container after creation; no resize polling.
    map.invalidateSize();
    return {destroy:dispose,update};
  } catch {
    if(alive&&root.isConnected){root.innerHTML='<div class="notice">تعذر تحميل الخريطة. العروض والفلاتر متاحة في القائمة أدناه.</div>';localize(root);}
    return {destroy:dispose,update:()=>{}};
  }
}
