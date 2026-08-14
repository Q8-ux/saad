(()=>{
const HOME='../tamweenat/';
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('#adminLogout');
  if(!btn)return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  sessionStorage.removeItem('tamweenatAdminToken');
  sessionStorage.removeItem('tamweenatAdminUser');
  location.replace(HOME);
},true);
})();