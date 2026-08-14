(()=>{
  const SESSION_KEY='tamweenatRestaurantSession';
  const raw=sessionStorage.getItem(SESSION_KEY);
  if(!raw){location.replace('./login.html');return}
  let session={};
  try{session=JSON.parse(raw)||{}}catch{sessionStorage.removeItem(SESSION_KEY);location.replace('./login.html');return}

  const style=document.createElement('link');
  style.rel='stylesheet';
  style.href='./supplies.css';
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded',()=>{
    const logout=document.getElementById('logoutBtn');
    if(logout)logout.addEventListener('click',()=>{sessionStorage.removeItem(SESSION_KEY);location.replace('./login.html')});
    const userLabel=document.getElementById('loggedInUser');
    if(userLabel)userLabel.textContent=session.restaurantName||session.username||'المطعم';

    if(!document.querySelector('script[data-supplies-catalog]')){
      const script=document.createElement('script');
      script.src='./supplies.js';
      script.dataset.suppliesCatalog='1';
      document.body.appendChild(script);
    }
  });
})();
