(() => {
  'use strict';
  if (window !== window.top || location.origin !== 'https://q8-ux.github.io' || !location.pathname.startsWith('/saad/family-online-studio/') || window.__foIOSInstalled) return;
  const handler = window.webkit?.messageHandlers?.studioNative;
  if (!handler) return;
  window.__foIOSInstalled = true;
  let exporting = false;
  const urls = new Map(), streams = new Set();
  const createURL = URL.createObjectURL.bind(URL), revokeURL = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = blob => { const url = createURL(blob); urls.set(url, blob); return url; };
  URL.revokeObjectURL = url => { urls.delete(url); revokeURL(url); };
  const send = value => handler.postMessage(value);
  window.__FO_IOS_EXPORT_RESULT__ = () => { exporting = false; };
  async function exportURL(url, filename) {
    if (exporting) return;
    exporting = true;
    const id = crypto.randomUUID();
    try {
      const blob = urls.get(url) || await (await fetch(url)).blob();
      if (blob.size > 20 * 1024 * 1024) throw new Error('الملف أكبر من حد التصدير في التطبيق.');
      send({type:'export-start', id, name:String(filename || 'writing-studio-export'), size:blob.size});
      let sequence = 0;
      for (let offset=0; offset<blob.size; offset+=32768) {
        const bytes = new Uint8Array(await blob.slice(offset, offset+32768).arrayBuffer());
        send({type:'export-chunk', id, sequence:sequence++, data:btoa(String.fromCharCode(...bytes))});
        if (sequence % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      send({type:'export-end', id});
    } catch (error) {
      exporting = false;
      send({type:'export-cancel', id});
      alert(error.message || 'تعذر إعداد الملف للحفظ.');
    }
  }
  const downloadable = anchor => anchor && anchor.hasAttribute('download') && /^(blob:|data:)/.test(anchor.href);
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(...args) {
    if (downloadable(this)) { void exportURL(this.href, this.download); return; }
    return click.apply(this,args);
  };
  document.addEventListener('click', event => {
    const anchor = event.target instanceof Element ? event.target.closest('a[download]') : null;
    if (downloadable(anchor)) { event.preventDefault(); void exportURL(anchor.href,anchor.download); }
  },true);
  window.print = () => { void document.fonts.ready.then(() => requestAnimationFrame(() => send({type:'print'}))); };
  class NativeUtterance { constructor(text) { this.text=String(text??''); this.lang='ar-KW'; this.rate=1; } }
  try {
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:NativeUtterance});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      cancel:()=>send({type:'tts-stop'}),getVoices:()=>[],
      speak:value=>send({type:'tts-speak',text:String(value.text??'').slice(0,12000)}),
      addEventListener:()=>{},removeEventListener:()=>{}
    }});
  } catch {}
  const gum=navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if(gum)navigator.mediaDevices.getUserMedia=async constraints=>{send({type:'tts-stop'});const stream=await gum(constraints);streams.add(stream);return stream;};
  window.__FO_IOS_PAUSE__=()=>{for(const stream of streams)for(const track of stream.getTracks())track.stop();streams.clear();};
})();
