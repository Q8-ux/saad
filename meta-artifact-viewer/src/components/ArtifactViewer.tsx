import { useEffect, useMemo, useState } from 'react'

const DEFAULT_ARTIFACT_URL =
  'https://976879275378787.a.metaaiusercontent.com/html?artifact_uuid=052ed18b-db2d-48ab-add5-f171461a73ca&ext=1785502800&hash=Q5fpDAF5ELMDMdNfq9kESeHIheW2'

export function ArtifactViewer() {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const artifactUrl = useMemo(
    () => import.meta.env.VITE_ARTIFACT_URL || DEFAULT_ARTIFACT_URL,
    [],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (loading) setFailed(true)
    }, 15000)

    return () => window.clearTimeout(timer)
  }, [loading])

  return (
    <section className="w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex h-11 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4" dir="ltr">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-zinc-500">Shared artefact</span>
        <span className="w-14" />
      </div>

      <div className="relative min-h-[65vh] bg-white md:aspect-[16/10] md:min-h-0">
        {loading && !failed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              <svg className="h-8 w-8 animate-spin text-zinc-950" viewBox="0 0 24 24" fill="none" role="status" aria-label="جارٍ التحميل">
                <path d="M12 2.75A9.25 9.25 0 0 1 21.25 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M21.25 12A9.25 9.25 0 0 1 12 21.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <path d="M12 21.25A9.25 9.25 0 0 1 2.75 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              </svg>
              <p className="text-sm text-zinc-500">جارٍ تحميل المحتوى المشترك...</p>
            </div>
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white p-6 text-center">
            <div className="max-w-md">
              <h2 className="text-lg font-bold text-zinc-950">تعذر تحميل المحتوى</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                قد يكون الرابط منتهي الصلاحية، أو يمنع العرض داخل iframe، أو تم تغيير إعدادات الخصوصية.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFailed(false)
                  setLoading(true)
                }}
                className="mt-5 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}

        <iframe
          key={`${failed}`}
          src={artifactUrl}
          onLoad={() => {
            setLoading(false)
            setFailed(false)
          }}
          onError={() => {
            setLoading(false)
            setFailed(true)
          }}
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-forms allow-same-origin allow-downloads"
          referrerPolicy="no-referrer"
          className="h-full min-h-[65vh] w-full border-0 md:min-h-0"
          title="المحتوى المشترك"
        />
      </div>
    </section>
  )
}
