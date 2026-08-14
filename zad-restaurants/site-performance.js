(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .catalog,.operations,.how,footer{content-visibility:auto;contain-intrinsic-size:1px 900px}
    img{content-visibility:auto}
    @media(max-width:760px){
      .topbar,.deliveryCard,.freshCard,.productImage label{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
      .product:hover{transform:none!important;box-shadow:none!important}
    }
  `;
  document.head.appendChild(style);

  const tuneImage=img=>{
    if(!(img instanceof HTMLImageElement))return;
    const src=img.getAttribute('src')||'';
    const isHero=src.includes('hero-market');
    if(isHero){img.fetchPriority='high';img.decoding='async';return;}
    img.loading='lazy';img.decoding='async';img.fetchPriority='low';
  };
  const tuneNode=node=>{
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    if(node.tagName==='IMG')tuneImage(node);
    node.querySelectorAll?.('img').forEach(tuneImage);
  };
  document.querySelectorAll('img').forEach(tuneImage);
  const observer=new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(tuneNode)));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),10000);
})();