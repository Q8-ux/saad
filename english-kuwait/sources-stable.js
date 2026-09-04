(()=>{
  const OFFICIAL_LIBRARY='https://elibrary.moe.edu.kw/StudentsLibrary';
  const OFFICIAL_HOME='https://elibrary.moe.edu.kw/';

  function sourceModal(){
    const modal=document.querySelector('#modal');
    const body=document.querySelector('#modalBody');
    if(!modal||!body) return;
    modal.classList.remove('hidden');
    body.innerHTML=`
      <h2>📚 الكتب والمصادر الرسمية</h2>
      <p>حتى لا تتعطل الروابط عند تغيير وزارة التربية لمسارات الملفات، لا نفتح ملفات الكتب الداخلية مباشرة. افتح مكتبة الطالب الرسمية ثم اختر: <b>المرحلة المتوسطة → الصف → اللغة الإنجليزية → الفصل الدراسي</b>.</p>
      <p><a class="primary link-btn" href="${OFFICIAL_LIBRARY}" target="_blank" rel="noopener noreferrer">فتح مكتبة الطالب الرسمية ↗</a></p>
      <p><a class="ghost link-btn" href="${OFFICIAL_HOME}" target="_blank" rel="noopener noreferrer">المكتبة الإلكترونية لوزارة التربية ↗</a></p>
      <div class="audio-box"><b>ملاحظة</b><p>تم إلغاء روابط الكتب الفردية لأنها قد تتغير من الوزارة وتؤدي إلى صفحة 404. المصدر الرسمي الرئيسي هو المرجع الثابت للمنصة.</p></div>`;
  }

  const oldOpenTool=window.openTool;
  window.openTool=function(type){
    if(type==='books') return sourceModal();
    if(typeof oldOpenTool==='function') return oldOpenTool(type);
  };

  const admin=document.querySelector('#adminBtn');
  if(admin) admin.onclick=()=>sourceModal();

  document.querySelectorAll('a[href*="elibrary.moe.edu.kw/api/File"]').forEach(a=>{
    a.href=OFFICIAL_LIBRARY;
    a.textContent='مكتبة الطالب الرسمية ↗';
  });
})();
