// Start update checks independently of Quran-data loading.
const VERSION='20261109-night-4';
if('serviceWorker' in navigator){
  const hadController=Boolean(navigator.serviceWorker.controller);
  let reloading=false,pending=false,registration;
  const applyUpdate=()=>{
    if(reloading)return;
    const audio=document.querySelector('#audio');
    if(audio&&!audio.paused&&!audio.ended){
      if(!pending){pending=true;const retry=()=>{pending=false;applyUpdate();};audio.addEventListener('pause',retry,{once:true});audio.addEventListener('ended',retry,{once:true});}
      return;
    }
    reloading=true;location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController)applyUpdate();});
  const worker=new URL('./sw.js',import.meta.url);worker.searchParams.set('v',VERSION);
  navigator.serviceWorker.register(worker.href,{scope:new URL('./',import.meta.url).pathname,updateViaCache:'none'}).then(value=>{
    registration=value;return value.update();
  }).catch(()=>{});
  addEventListener('pageshow',event=>{if(event.persisted)registration?.update().catch(()=>{});});
}
