(()=>{
  const SESSION_KEY='tamweenatRestaurantSession';
  const TOKEN_KEY='tamweenatRestaurantToken';
  const HOME='../tamweenat/';
  const raw=sessionStorage.getItem(SESSION_KEY),token=sessionStorage.getItem(TOKEN_KEY);
  if(!raw||!token){location.replace('./login.html');return}
  let session={};
  try{session=JSON.parse(raw)||{}}catch{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(TOKEN_KEY);location.replace('./login.html');return}

  ['./supplies.css','./account-advanced.css'].forEach(href=>{const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link)});

  document.addEventListener('DOMContentLoaded',()=>{
    const logout=document.getElementById('logoutBtn');
    if(logout)logout.addEventListener('click',()=>{
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      location.replace(HOME);
    });
    const userLabel=document.getElementById('loggedInUser');
    if(userLabel)userLabel.textContent=`${session.restaurantName||'المطعم'} — ${session.name||session.username||''}`;
    const load=(src,key)=>{if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.dataset[key]='1';document.body.appendChild(s)};
    load('./supplies.js','suppliesCatalog');
    setTimeout(()=>load('./account-advanced.js','accountAdvanced'),30);
  });
})();