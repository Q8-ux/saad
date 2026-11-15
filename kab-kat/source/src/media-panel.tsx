import { Film, Image, Music2, Plus, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useEditor } from "@/editor/use-editor";
import type { MediaAsset, MediaType } from "@/media/types";
import { clock } from "./editor-tools";

const filters = [
  { id: "all", text: "الكل" },
  { id: "video", text: "فيديو" },
  { id: "audio", text: "صوت" },
  { id: "image", text: "صور" },
] as const;
const mediaIcons = { video: Film, image: Image, audio: Music2 };

export function MediaPanel({ onAdd, onImport, disabled, importing }: {
  onAdd: (asset: MediaAsset) => void;
  onImport: () => void;
  disabled: boolean;
  importing: boolean;
}) {
  const all = useEditor((e) => e.media.getAssets());
  const [filter, setFilter] = useState<"all" | MediaType>("all");
  const assets = filter === "all" ? all : all.filter(({ type }) => type === filter);
  return (
    <section className="panel media-panel" aria-label="مكتبة الوسائط">
      <div className="panel-heading">
        <h2>الوسائط</h2>
        <button className="icon accent" aria-label="استيراد وسائط" title="استيراد وسائط" disabled={disabled} onClick={onImport}><Plus /></button>
      </div>
      <div className="media-filters" aria-label="تصفية الوسائط">
        {filters.map(({ id, text }) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{text}</button>)}
      </div>
      {assets.length > 0 ? (
        <div className="media-list">
          {assets.map((asset) => {
            const Icon = mediaIcons[asset.type];
            return (
              <div className="media-item" key={asset.id}>
                <div className="media-thumb">{asset.thumbnailUrl ? <img src={asset.thumbnailUrl} alt="" /> : <Icon size={21} />}</div>
                <div className="media-details">
                  <strong dir="auto" title={asset.name}>{asset.name}</strong>
                  <small dir="ltr">{asset.duration ? clock(asset.duration, true) : "—"}</small>
                </div>
                <button className="icon accent" title="إضافة إلى الخط الزمني" aria-label={"إضافة " + asset.name + " إلى الخط الزمني"} disabled={disabled} onClick={() => onAdd(asset)}><Plus /></button>
              </div>
            );
          })}
          {importing && <p className="status-hint" role="status">جارٍ استيراد الوسائط…</p>}
        </div>
      ) : (
        <div className="media-empty-wrap">
          <button className="media-empty" onClick={onImport} disabled={disabled}>
            <UploadCloud size={26} />
            <strong>{importing ? "جارٍ الاستيراد…" : "استيراد الوسائط"}</strong>
            <span>{all.length ? "أضف ملفات إلى المكتبة" : "اختر فيديو أو صورة أو ملفًا صوتيًا"}</span>
          </button>
        </div>
      )}
    </section>
  );
}
