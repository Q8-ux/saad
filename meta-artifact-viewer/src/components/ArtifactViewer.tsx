import { ChangeEvent, useMemo, useState } from 'react'

const DEFAULT_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #f4f4f5, #e4e4e7);
      color: #18181b;
    }
    .card {
      width: min(92%, 620px);
      padding: 32px;
      border-radius: 22px;
      background: white;
      box-shadow: 0 18px 50px rgba(0,0,0,.12);
      text-align: center;
    }
    h1 { margin-top: 0; }
    p { line-height: 1.9; color: #52525b; }
  </style>
</head>
<body>
  <main class="card">
    <h1>العارض المحلي جاهز</h1>
    <p>ارفع ملف HTML أو الصق كود الصفحة في الحقل، وسيتم عرضه هنا مباشرة دون الاعتماد على روابط Meta المحمية.</p>
  </main>
</body>
</html>`

export function ArtifactViewer() {
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [fileName, setFileName] = useState('صفحة تجريبية')
  const [showEditor, setShowEditor] = useState(false)

  const documentTitle = useMemo(() => fileName || 'HTML محلي', [fileName])

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension !== 'html' && extension !== 'htm') {
      window.alert('يرجى اختيار ملف HTML أو HTM فقط.')
      event.target.value = ''
      return
    }

    try {
      const contents = await file.text()
      setHtml(contents)
      setFileName(file.name)
    } catch {
      window.alert('تعذر قراءة الملف. حاول مرة أخرى.')
    } finally {
      event.target.value = ''
    }
  }

  const resetViewer = () => {
    setHtml(DEFAULT_HTML)
    setFileName('صفحة تجريبية')
  }

  return (
    <section className="w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-zinc-950">عارض HTML المحلي</h1>
          <p className="mt-1 text-xs text-zinc-500">{documentTitle}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
            رفع ملف HTML
            <input type="file" accept=".html,.htm,text/html" className="hidden" onChange={handleFile} />
          </label>

          <button
            type="button"
            onClick={() => setShowEditor((value) => !value)}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            {showEditor ? 'إخفاء المحرر' : 'لصق كود HTML'}
          </button>

          <button
            type="button"
            onClick={resetViewer}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            إعادة ضبط
          </button>
        </div>
      </div>

      {showEditor && (
        <div className="border-b border-zinc-200 bg-zinc-950 p-4">
          <label htmlFor="html-editor" className="mb-2 block text-sm font-semibold text-white">
            الصق كود HTML الكامل هنا
          </label>
          <textarea
            id="html-editor"
            value={html}
            onChange={(event) => {
              setHtml(event.target.value)
              setFileName('كود ملصق')
            }}
            spellCheck={false}
            dir="ltr"
            className="h-64 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 p-4 font-mono text-xs leading-6 text-zinc-100 outline-none focus:border-zinc-400"
          />
        </div>
      )}

      <div className="bg-zinc-100 p-3 sm:p-5">
        <iframe
          title={documentTitle}
          srcDoc={html}
          sandbox="allow-forms allow-modals allow-popups allow-scripts"
          className="h-[70vh] w-full rounded-xl border border-zinc-300 bg-white"
        />
      </div>

      <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        رابط metaaiusercontent محمي من Meta ولا يمكن إصلاحه أو تضمينه. العارض يعمل عند رفع ملف المصدر HTML نفسه أو لصق كوده.
      </div>
    </section>
  )
}
