export function ArtifactViewer() {
  return (
    <section className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex h-11 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4" dir="ltr">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-zinc-500">Local viewer</span>
        <span className="w-14" />
      </div>

      <div className="flex min-h-[62vh] items-center justify-center bg-white p-6 text-center">
        <div className="mx-auto max-w-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl" aria-hidden="true">
            ✓
          </div>

          <h1 className="mt-6 text-2xl font-bold text-zinc-950">تم تشغيل الصفحة محليًا</h1>

          <p className="mt-3 text-sm leading-7 text-zinc-600">
            أُلغي نهائيًا فتح روابط Meta الداخلية والمحمية. هذه الصفحة لم تعد تحوّلك إلى
            metaaiusercontent.com، ولذلك لن تظهر رسالة Direct navigation not allowed من داخل الموقع.
          </p>

          <div className="mt-7 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-right">
            <h2 className="font-bold text-zinc-900">حالة المشروع</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
              <li>• لا يوجد iframe خارجي.</li>
              <li>• لا يوجد تحويل تلقائي إلى Meta AI.</li>
              <li>• لا يوجد رابط metaaiusercontent داخل الواجهة.</li>
              <li>• العرض يعمل بالكامل من GitHub Pages.</li>
            </ul>
          </div>

          <p className="mt-6 text-xs leading-6 text-zinc-500">
            لعرض محتوى الأداة الأصلي هنا، يجب توفير ملفات المصدر نفسها بدل رابط Meta المؤقت والمحمي.
          </p>
        </div>
      </div>
    </section>
  )
}
