(()=>{
 if(window.__sabeqNativeInstalled)return;
 window.__sabeqNativeInstalled=true;
 const blobs=new Map();window.__sabeqExportBlobs=blobs;
 const create=URL.createObjectURL.bind(URL);
 URL.createObjectURL=blob=>{const url=create(blob);if(blob.size<=10485760){while(blobs.size>=4)blobs.delete(blobs.keys().next().value);blobs.set(url,blob);setTimeout(()=>blobs.delete(url),30000);}return url;};
 const print=html=>window.SabeqFile.postMessage(JSON.stringify({action:'print',html}));
 window.print=()=>print(document.documentElement.outerHTML);
 const attach=frame=>{const hook=()=>{try{if(frame.srcdoc)frame.contentWindow.print=()=>print(frame.srcdoc);}catch(e){/* Cross-origin frames are intentionally inaccessible. */}};frame.addEventListener('load',hook);hook();};
 document.querySelectorAll('iframe').forEach(attach);
 new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.tagName==='IFRAME')attach(node);}))).observe(document.documentElement,{childList:true,subtree:true});
})();
