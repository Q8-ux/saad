/* Waqaya Google Maps route */
(() => {
  const BASE="https://www.google.com/maps";

  function coord(lat,lng){
    const a=Number(lat), b=Number(lng);
    if(!Number.isFinite(a)||!Number.isFinite(b)) return null;
    return a.toFixed(6)+","+b.toFixed(6);
  }
  function openUrl(url){ window.open(url,"_blank","noopener,noreferrer"); return url; }
  function searchUrl(q){ return BASE+"/search/?api=1&query="+encodeURIComponent(q); }
  function placeUrl(lat,lng,label){
    const c=coord(lat,lng);
    if(c) return BASE+"/search/?api=1&query="+encodeURIComponent(c+(label?" "+label:""));
    return label?searchUrl(label):null;
  }
  function directionsUrl(destination, origin, waypoints){
    const p=new URLSearchParams({api:"1",destination});
    if(origin) p.set("origin",origin);
    if(Array.isArray(waypoints)&&waypoints.length) p.set("waypoints",waypoints.join("|"));
    p.set("travelmode","driving");
    return BASE+"/dir/?"+p.toString();
  }
  function requestToDestination(r){
    const c=coord(r?.latitude,r?.longitude);
    return c || [r?.area,r?.locationNote].filter(Boolean).join(" — ");
  }
  function openRequest(r){
    const dest=requestToDestination(r);
    if(!dest) return null;
    return openUrl(searchUrl(dest));
  }
  function directionsToRequest(r, useCurrent=true){
    const dest=requestToDestination(r);
    if(!dest) return null;
    const url=directionsUrl(dest,useCurrent?null:null,[]);
    return openUrl(url);
  }
  function teamRoute(requests, origin){
    const points=(requests||[]).map(requestToDestination).filter(Boolean);
    if(!points.length) return null;
    const dest=points[points.length-1];
    const way=points.slice(0,-1,10);
    return openUrl(directionsUrl(dest,origin||null,way));
  }
  function findByName(name){
    let arr=[];
    try{arr=JSON.parse(localStorage.getItem("waqaya.requests")||"[]")}catch{}
    if(!Array.isArray(arr)) arr=[];
    return arr.find(r=>String(r.ownerName||r.owner||"").includes(name));
  }
  function currentLocation(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation) return reject(new Error("geolocation-unavailable"));
      navigator.geolocation.getCurrentPosition(
        p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),
        reject,
        {enableHighAccuracy:true,timeout:12000,maximumAge:60000}
      );
    });
  }

  window.WaqayaMaps={
    searchUrl,placeUrl,directionsUrl,openRequest,directionsToRequest,teamRoute,
    requestToDestination,findByName,currentLocation,
    openSearch(q){return openUrl(searchUrl(q));},
    openCoordinates(lat,lng,label){const u=placeUrl(lat,lng,label);return u?openUrl(u):null;}
  };
})();