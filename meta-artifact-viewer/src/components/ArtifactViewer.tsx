import { useMemo, useState } from 'react'

const DEFAULT_ARTIFACT_URL =
  'https://www.meta.ai/share/a/052ed18b-db2d-48ab-add5-f171461a73ca'

export function ArtifactViewer() {
  const [copied, setCopied] = useState(false)

  const artifactUrl = useMemo(
    () => import.meta.env.VITE_ARTIFACT_URL || DEFAULT_ARTIFACT_URL,
    [],
  )

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(artifactUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex h-11 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4" dir="ltr">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-zinc-500">Shared artefact</span>
        <span className="w-14" />
      </div>

      <div className="flex min-h-[62vh] items-center justify-center bg-white p-6 text-center">
        <div className="mx-auto max-w-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-3xl">
            ↗
          </div>

          <h1 className="mt-6 text-2xl font-bold text-zinc-950">فتح المحتوى المشترك</h1>

          <p className="mt-3 text-sm leading-7 text-zinc-600">
            اضغط الزر لفتح صفحة المشاركة الرسمية في Meta AI. تم إلغاء استخدام رابط الخادم الداخلي لأنه لا يسمح بالفتح المباشر.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={artifactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              فتح المحتوى في Meta AI
            </a>

            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
            >
              {copied ? 'تم نسخ الرابط' : 'نسخ رابط المشاركة'}
            </button>
          </div>

          <p className="mt-6 text-xs leading-6 text-zinc-500">
            إذا ظهرت رسالة أن الصفحة غير متاحة، فهذا يعني أن رابط المشاركة حُذف أو تغيّرت خصوصيته من داخل Meta AI.
          </p>
        </div>
      </div>
    </section>
  )
}
