(() => {
  const $ = id => document.getElementById(id);
  const avatars = ['🧢','😎','🧔🏻','🤠'];
  async function api(url, options={}) {
    const res = await fetch(url,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    const data = await res.json().catch(()=>({ok:false,error:'تعذر قراءة الرد.'}));
    if(!res.ok) throw new Error(data.error||'حدث خطأ.');
    return data;
  }
  function showMessage(text, ok=false){ const el=$('authMessage'); el.textContent=text; el.style.color=ok?'#ccff00':'#ff9e99'; }
  function setUser(user){
    window.jackUser=user;
    $('authGate').classList.toggle('hidden',!!user);
    $('accountBar').classList.toggle('hidden',!user);
    if(!user)return;
    $('accountAvatar').textContent=avatars[user.avatarIndex]||'🐺';
    $('accountName').textContent=user.username;
    $('accountLevel').textContent=`المستوى ${user.level}`;
    $('accountStats').innerHTML=`<span>🏆 ${user.wins}</span><span>🎮 ${user.gamesPlayed}</span><span>🪙 ${user.coins}</span><span>XP ${user.xp}</span>`;
    const nameInput=$('playerName'); if(nameInput){nameInput.value=user.username;nameInput.readOnly=true;}
    if(typeof selectedAvatar!=='undefined') selectedAvatar=user.avatarIndex||0;
  }
  async function boot(){ try{const data=await api('/api/me');setUser(data.user);}catch{setUser(null);} }
  document.querySelectorAll('.auth-tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.auth-tab').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.auth-form').forEach(f=>f.classList.toggle('active',f.id===btn.dataset.target));
    showMessage('');
  }));
  $('registerForm').addEventListener('submit',async e=>{e.preventDefault();showMessage('جاري إنشاء الحساب...',true);try{await api('/api/auth/register',{method:'POST',body:JSON.stringify({username:$('regUsername').value,email:$('regEmail').value,password:$('regPassword').value})});location.reload();}catch(err){showMessage(err.message);}});
  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();showMessage('جاري تسجيل الدخول...',true);try{await api('/api/auth/login',{method:'POST',body:JSON.stringify({login:$('loginId').value,password:$('loginPassword').value})});location.reload();}catch(err){showMessage(err.message);}});
  $('logoutBtn').addEventListener('click',async()=>{await api('/api/auth/logout',{method:'POST'}).catch(()=>{});location.reload();});
  window.refreshJackProfile=async()=>{try{const data=await api('/api/me');setUser(data.user);}catch{}};
  boot();
})();
