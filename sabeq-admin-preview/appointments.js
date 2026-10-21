/* Sabeq office appointments: authenticated scheduling, no invoice/case management. */
(() => {
  'use strict';
  const names=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const statuses={pending:'بانتظار التأكيد',confirmed:'مؤكد',cancelled:'ملغي',completed:'مكتمل',new:'طلب سابق'};
  let current=null;
  const row=(book)=>`<tr>
    <td><strong>${esc(book.name)}</strong><small><bdi>${esc(book.phone)}</bdi> · <bdi>${esc(book.email)}</bdi></small></td>
    <td><bdi>${esc(book.slot_date||'لم يحدد')}</bdi><small><bdi>${esc(book.slot_time||'طلب سابق بدون موعد')}</bdi></small></td>
    <td>${esc(statuses[book.status]||book.status)}</td>
    <td>${book.slot_date?`<select aria-label="حالة الحجز" data-booking-id="${esc(book.id)}"><option value="pending" ${book.status==='pending'?'selected':''}>بانتظار التأكيد</option><option value="confirmed" ${book.status==='confirmed'?'selected':''}>تأكيد</option><option value="completed" ${book.status==='completed'?'selected':''}>مكتمل</option><option value="cancelled" ${book.status==='cancelled'?'selected':''}>إلغاء</option></select>`:'<span class="muted">طلب قديم — لا يوجد تاريخ محدد</span>'}</td>
  </tr>`;
  function mount(element,api,toast){
    let alive=true;
    element.innerHTML='<div class="section-intro"><h2>مواعيد واستشارات المكتب</h2></div><div class="skeleton">جارٍ تحميل جدول المكتب من الخادم…</div>';
    async function reload(){
      try {
        const data=await api('appointments');
        if(!alive||!element.isConnected)return;
        current=data;
        render(data);
      }catch(error){
        if(alive&&element.isConnected)element.innerHTML='<div class="section-intro"><h2>مواعيد واستشارات المكتب</h2></div><div class="banner error" role="alert">تعذر قراءة جدول المواعيد: '+esc(error.message)+'. قد تحتاج الخدمة إلى نشر تحديث الخادم وترحيل قاعدة البيانات أولاً.</div>';
      }
    }
    function render(data){
      const s=data.schedule||{},days=Array.isArray(s.days)?s.days:[];
      element.innerHTML=`
        <div class="section-intro"><div><h2>مواعيد واستشارات المكتب</h2><p>حدد الأيام والساعات والسعة مسبقاً. يظهر للزوار فقط ما سمحت به إعدادات المكتب.</p></div></div>
        <div class="banner">الحجز مغلق إذا لم تفعّل الجدول صراحة. قبول الطلب من الزائر لا يعني تأكيد الموعد؛ راجعه ثم غيّر حالته إلى «مؤكد».</div>
        <section class="panel"><div class="panel-head"><h3>إعداد أيام المكتب وحد الاستشارات</h3></div>
          <form class="panel-body" id="office-schedule">
            <label class="checkbox"><input type="checkbox" name="enabled" ${s.enabled?'checked':''}><span>السماح للزوار بحجز الفترات المحددة أدناه</span></label>
            <div class="form-grid">
              <label class="field"><span>عدد الأيام المعروضة مسبقاً (7–60)</span><input name="horizonDays" type="number" min="7" max="60" required value="${esc(s.horizonDays||30)}"></label>
              <label class="field"><span>المهلة الدنيا قبل الموعد بالساعات (0–168)</span><input name="leadHours" type="number" min="0" max="168" required value="${esc(s.leadHours??24)}"></label>
            </div>
            <div class="table-scroll" tabindex="0" role="region" aria-label="أيام المكتب">
              <table class="qa-schedule"><thead><tr><th>اليوم</th><th>متاح</th><th>الفترات (15 دقيقة)</th><th>الحجوزات لكل فترة</th><th>الحد اليومي</th></tr></thead>
                <tbody>${names.map((name,i)=>{
                  const d=days.find(x=>x.day===i)||{enabled:false,times:[],capacity:1,dailyLimit:4};
                  return `<tr data-day="${i}"><td><strong>${name}</strong></td><td><input aria-label="إتاحة ${name}" name="day-enabled-${i}" type="checkbox" ${d.enabled?'checked':''}></td><td><input aria-label="فترات ${name}" name="times-${i}" dir="ltr" placeholder="09:00, 10:00" value="${esc((d.times||[]).join(', '))}"></td><td><input aria-label="سعة ${name}" name="capacity-${i}" type="number" min="1" max="10" required value="${esc(d.capacity)}"></td><td><input aria-label="حد يوم ${name}" name="daily-${i}" type="number" min="1" max="50" required value="${esc(d.dailyLimit)}"></td></tr>`;
                }).join('')}</tbody>
              </table>
            </div>
            <p class="service-status">أوقات المكتب بتوقيت الكويت (UTC+3)، بصيغة 09:00, 10:00، وبفواصل ربع ساعة. تُحفظ الإعدادات على الخادم ولا تظهر تفاصيل العملاء للعامة.</p>
            <div class="actions"><button type="submit" class="primary">حفظ وتطبيق الجدول</button><button type="button" id="reload-appointments">تحديث الطلبات</button></div>
          </form>
        </section>
        <section class="panel"><div class="panel-head"><h3>جدول الحجوزات ومراجعة الطلبات</h3></div>
          ${data.bookings?.length?`<div class="table-scroll"><table><thead><tr><th>الزائر</th><th>اليوم والوقت</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>${data.bookings.map(row).join('')}</tbody></table></div>`:'<div class="empty"><h3>لا توجد حجوزات بمواعيد محددة بعد</h3></div>'}
        </section>
        <section class="panel"><div class="panel-head"><h3>طلبات الاستشارات القديمة دون موعد</h3></div>
          ${data.legacy?.length?`<div class="table-scroll"><table><thead><tr><th>الزائر</th><th>التاريخ</th><th>الحالة</th><th>الملاحظة</th></tr></thead><tbody>${data.legacy.map(row).join('')}</tbody></table></div>`:'<div class="empty"><h3>لا توجد طلبات قديمة</h3></div>'}
          <p class="service-status">هذه الطلبات أُنشئت قبل ربط جدول المواعيد. لا يتم تحويلها تلقائياً إلى حجوزات مؤكدة.</p>
        </section>`;
      const form=element.querySelector('#office-schedule');
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        const button=form.querySelector('[type="submit"]');button.disabled=true;
        try{
          const f=new FormData(form);
          const days=names.map((name,i)=>({
            day:i,enabled:f.get('day-enabled-'+i)==='on',
            times:String(f.get('times-'+i)||'').split(',').map(t=>t.trim()).filter(Boolean),
            capacity:Number(f.get('capacity-'+i)),dailyLimit:Number(f.get('daily-'+i))
          }));
          const payload={enabled:f.get('enabled')==='on',horizonDays:Number(f.get('horizonDays')),leadHours:Number(f.get('leadHours')),days};
          await api('schedule',payload);
          toast('حُفظ جدول المكتب وحدود الاستشارات في الخادم.');
          await reload();
        }catch(err){toast('تعذر حفظ الجدول: '+err.message);}finally{button.disabled=false;}
      });
      element.querySelector('#reload-appointments').addEventListener('click',()=>void reload());
      element.querySelectorAll('[data-booking-id]').forEach(select=>select.addEventListener('change',async()=>{
        select.disabled=true;
        try{await api('appointments',{id:select.dataset.bookingId,status:select.value});toast('تم تحديث حالة الحجز.');await reload();}
        catch(err){toast('تعذر تغيير الحجز: '+err.message);await reload();}
        finally{select.disabled=false;}
      }));
    }
    void reload();
    return ()=>{alive=false;};
  }
  globalThis.SabeqAppointments={mount};
})();
