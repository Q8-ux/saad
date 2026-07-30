import { ArtifactViewer } from './components/ArtifactViewer'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 antialiased">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6">
        <div className="text-lg font-bold text-zinc-950">Meta AI</div>
        <div className="text-sm text-zinc-500">المحتوى المشترك</div>
      </header>
      <main className="flex flex-1 items-center justify-center p-3 sm:p-6 md:p-8">
        <ArtifactViewer />
      </main>
    </div>
  )
}
