import Link from 'next/link';

export default function Page(){
  return <main className="appMain">
    <section className="sahelHero">
      <div>
        <span className="eyebrow">منصة نطاق العمل</span>
        <h1>مرحبًا بك</h1>
        <p>الحضور الذكي والانتقالات والطوارئ والتحليل بالذكاء الاصطناعي.</p>
      </div>
      <div className="heroStatus">
        <span>حالة المنصة</span>
        <strong>جاهزة للتشغيل</strong>
        <small>نسخة تجريبية</small>
      </div>
    </section>

    <section className="quickActions">
      <Link href="/dashboard" className="quickAction primaryAction"><span className="quickIcon">⌂</span><div><b>فتح لوحة التحكم</b><small>الوصول إلى جميع خدمات المنصة</small></div></Link>
      <Link href="/transfers" className="quickAction"><span className="quickIcon">🚗</span><div><b>الانتقالات</b><small>طلب ومتابعة تصاريح الانتقال</small></div></Link>
      <Link href="/ai-tools" className="quickAction"><span className="quickIcon">🤖</span><div><b>الذكاء الاصطناعي</b><small>أدوات التحليل المتخصصة</small></div></Link>
    </section>
  </main>;
}
