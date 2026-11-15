import { createRoot } from "react-dom/client";
import { Clapperboard, LoaderCircle } from "lucide-react";
import "@fontsource-variable/cairo";
import "sonner/dist/styles.css";
import "./style.css";

const ui = createRoot(document.getElementById("app")!);
ui.render(<main className="boot"><LoaderCircle className="spinner" /><p role="status">جارٍ تحميل محرّك OpenCut…</p></main>);
import("./workspace").then(({ default: Workspace }) => {
  ui.render(<Workspace />);
}).catch((error: unknown) => {
  console.error("Kab Kat startup failed:", error);
  ui.render(<main className="boot"><Clapperboard /><h1>كب كت</h1><p>تعذّر تحميل محرّك المونتاج.</p><button className="quiet" onClick={() => location.reload()}>إعادة التحميل</button></main>);
});
