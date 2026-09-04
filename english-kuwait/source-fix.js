(function(){
  const VERIFIED_SOURCES={
    library:'https://elibrary.moe.edu.kw/StudentsLibrary',
    englishPearlsPreview:'https://elibrary.moe.edu.kw/api/File/preview/book/3291',
    grade6Guide:'https://elibrary.moe.edu.kw/api/File/download/book/1800',
    ministry:'https://www.moe.edu.kw/'
  };
  window.OFFICIAL={...(window.OFFICIAL||{}),...VERIFIED_SOURCES,grade7:null,grade9workbook:null};
  const originalOpenTool=window.openTool;
  window.openTool=function(type){
    if(type!=='books') return typeof originalOpenTool==='function'?originalOpenTool(type):undefined;
    const modal=document.querySelector('#modal');
    const body=document.querySelector('#modalBody');
    if(!modal||!body)return;
    modal.classList.remove('hidden');
    const selected=window.state&&window.state.grade?`الصف ${window.state.grade}`:'الصفوف 6–9';
    body.innerHTML=`
      <h2>📚 الكتب والمصادر الرسمية</h2>
      <p>المصادر التالية تم تحديثها إلى روابط رسمية تعمل حالياً. اختر من مكتبة الطالب <b>${selected}</b> ثم مادة اللغة الإنجليزية والفصل الدراسي المطلوب.</p>
      <div style="display:grid;gap:12px;margin-top:18px">
        <a class="primary link-btn" href="${VERIFIED_SOURCES.library}" target="_blank" rel="noopener">مكتبة الطالب – وزارة التربية ↗</a>
        <a class="ghost link-btn" href="${VERIFIED_SOURCES.englishPearlsPreview}" target="_blank" rel="noopener">معاينة رسمية – English Pearls of Kuwait ↗</a>
        <a class="ghost link-btn" href="${VERIFIED_SOURCES.grade6Guide}" target="_blank" rel="noopener">دليل الصف السادس – مصدر رسمي ↗</a>
        <a class="ghost link-btn" href="${VERIFIED_SOURCES.ministry}" target="_blank" rel="noopener">موقع وزارة التربية ↗</a>
      </div>
      <p style="margin-top:18px;color:#63708a;font-size:13px">تم حذف روابط الكتب القديمة التي كانت تعيد خطأ 404، ولن تظهر داخل المنصة مرة أخرى.</p>`;
  };
})();