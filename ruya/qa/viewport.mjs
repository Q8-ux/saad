const frame=document.getElementById('app');
for(const b of document.querySelectorAll('[data-width]'))b.addEventListener('click',()=>{frame.width=b.dataset.width;document.getElementById('status').textContent=`${b.dataset.width}px iframe viewport; no device emulation`;});
