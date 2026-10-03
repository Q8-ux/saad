"use strict";
(() => {
  const button=document.getElementById("menuBtn"),drawer=document.getElementById("drawer"),close=document.getElementById("closeBtn"),shade=document.getElementById("drawerShade");
  if(!button||!drawer)return;
  function set(open){drawer.classList.toggle("open",open);document.body.classList.toggle("menu-open",open);button.setAttribute("aria-expanded",String(open));drawer.inert=!open;if(shade)shade.hidden=!open;if(open)close?.focus();else button.focus();}
  drawer.inert=true;
  button.addEventListener("click",()=>set(!drawer.classList.contains("open")));
  close?.addEventListener("click",()=>set(false));shade?.addEventListener("click",()=>set(false));
  drawer.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>set(false)));
  document.addEventListener("keydown",event=>{
    if(!drawer.classList.contains("open"))return;
    if(event.key==="Escape"){event.preventDefault();set(false);}
    if(event.key==="Tab"){const nodes=[...drawer.querySelectorAll("button,a")];const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  const year=document.getElementById("footerYear");if(year)year.textContent=String(new Date().getFullYear());
})();
