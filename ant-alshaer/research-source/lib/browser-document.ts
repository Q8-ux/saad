import { MAX_STORY_CHARACTERS } from './story-limits';
import { MAX_DOCUMENT_FILE_BYTES } from './media-files';
import type { Worker as OcrWorker } from 'tesseract.js';

const ASSETS = '/document-reader/v1';
export const MAX_LOCAL_PDF_PAGES = 30;
type Progress = (message: string, fraction: number) => void;

export function needsBrowserDocumentRead(name: string) {
  return /\.(pdf|png|jpe?g|webp)$/iu.test(name);
}

export function checkedBrowserDocumentText(text: string) {
  const value = text.replace(/\u0000/gu, '').trim();
  if (!value) throw new Error('لم يظهر نص مقروء. الأصل محفوظ؛ اختر صورة أوضح أو الصق النص.');
  if (value.length > MAX_STORY_CHARACTERS) throw new Error('النص يتجاوز ٣٠ ألف حرف. الأصل محفوظ؛ اختر الجزء المطلوب دون اقتطاع تلقائي.');
  return value;
}

function bounded<T>(operation: Promise<T>, signal: AbortSignal, milliseconds = 120_000): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error('أُوقفت القراءة. الملف الأصلي محفوظ في أرشيفك.'));
  return new Promise((resolve, reject) => {
    const cancel = () => reject(new Error('أُوقفت القراءة. الملف الأصلي محفوظ في أرشيفك.'));
    const timer = window.setTimeout(() => reject(new Error('استغرقت القراءة وقتًا طويلًا. الأصل محفوظ؛ جرّب صفحات أقل أو صورة أوضح.')), milliseconds);
    signal.addEventListener('abort', cancel, { once: true });
    operation.then(resolve, reject).finally(() => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
    });
  });
}

// Only assets from this application are loaded. No file or image is sent to
// a third-party OCR service, and no API key is needed for reading a document.
export async function readDocumentInBrowser(file: File, progress: Progress, signal: AbortSignal) {
  if (!needsBrowserDocumentRead(file.name) || file.size > MAX_DOCUMENT_FILE_BYTES || !file.size) {
    throw new Error('اختر صورة أو PDF صالحًا لا يتجاوز ٨ م.ب.');
  }
  let worker: OcrWorker | undefined;
  let pendingWorker: Promise<OcrWorker> | undefined;
  let currentFraction = 0;
  const recognize = async (canvas: HTMLCanvasElement) => {
    if (!worker) {
      progress('الملف محفوظ. جارٍ تجهيز قراءة العربية والإنجليزية على جهازك…', currentFraction);
      const { createWorker, OEM } = await import('tesseract.js');
      pendingWorker = createWorker(['ara', 'eng'], OEM.LSTM_ONLY, {
        workerPath: `${ASSETS}/worker.min.js`,
        corePath: `${ASSETS}/core`,
        langPath: `${ASSETS}/languages`,
        workerBlobURL: false,
        cacheMethod: 'none',
        logger: (message) => {
          if (message.status === 'recognizing text') progress(`جارٍ قراءة النص على جهازك… ${Math.round(message.progress * 100)}٪`, currentFraction);
        },
      });
      worker = await bounded(pendingWorker, signal);
      await worker.setParameters({ preserve_interword_spaces: '1' });
    }
    const result = await bounded(worker.recognize(canvas), signal);
    return result.data.text.trim();
  };
  const stop = () => { if (worker) void worker.terminate(); };
  signal.addEventListener('abort', stop, { once: true });
  try {
    const signature = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    if (/\.pdf$/iu.test(file.name)) {
      if (!new TextDecoder('latin1').decode(signature).includes('%PDF-')) throw new Error('الملف لا يحتوي على PDF صالح. الأصل محفوظ.');
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = `${ASSETS}/pdf.worker.min.mjs`;
      const task = pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        cMapUrl: `${ASSETS}/cmaps/`, cMapPacked: true,
        standardFontDataUrl: `${ASSETS}/standard_fonts/`, wasmUrl: `${ASSETS}/wasm/`,
        isEvalSupported: false, enableXfa: false, stopAtErrors: true,
        canvasMaxAreaInBytes: 24_000_000,
      });
      const abortPdf = () => { void task.destroy(); };
      signal.addEventListener('abort', abortPdf, { once: true });
      try {
        const pdf = await bounded(task.promise, signal);
        if (pdf.numPages > MAX_LOCAL_PDF_PAGES) throw new Error('الأصل محفوظ. حد القراءة في المرة الواحدة ٣٠ صفحة؛ اختر الجزء المطلوب من PDF.');
        const pages: string[] = [];
        const imageOps = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject]);
        for (let number = 1; number <= pdf.numPages; number++) {
          signal.throwIfAborted();
          currentFraction = (number - 1) / pdf.numPages;
          progress(`جارٍ قراءة صفحة ${number} من ${pdf.numPages} على جهازك…`, currentFraction);
          const page = await bounded(pdf.getPage(number), signal);
          let canvas: HTMLCanvasElement | undefined;
          try {
            const content = await bounded(page.getTextContent(), signal);
            const nativeText = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
            const operators = await bounded(page.getOperatorList(), signal);
            // Image-bearing pages can contain a scanned body under a selectable
            // heading. OCR the whole page so that body is not silently omitted.
            const needsOcr = !nativeText || operators.fnArray.some(operation => imageOps.has(operation));
            let text = nativeText;
            if (needsOcr) {
              const base = page.getViewport({ scale: 1 });
              const scale = Math.min(2.4, 2800 / Math.max(base.width, base.height), Math.sqrt(6_000_000 / (base.width * base.height)));
              const viewport = page.getViewport({ scale });
              canvas = document.createElement('canvas');
              canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
              const context = canvas.getContext('2d', { willReadFrequently: true });
              if (!context) throw new Error('تعذر تجهيز قراءة الصفحة على جهازك. الأصل محفوظ.');
              await bounded(page.render({ canvas, canvasContext: context, viewport, background: 'white' }).promise, signal);
              text = await recognize(canvas) || nativeText;
            }
            pages.push(text);
            if (pages.join('\n\n').length > MAX_STORY_CHARACTERS) throw new Error('النص يتجاوز ٣٠ ألف حرف. الأصل محفوظ؛ اختر الجزء المطلوب.');
          } finally {
            if (canvas) { canvas.width = 0; canvas.height = 0; }
            page.cleanup();
          }
        }
        progress('اكتملت قراءة PDF. جارٍ حفظ النص…', 1);
        return checkedBrowserDocumentText(pages.join('\n\n'));
      } finally {
        signal.removeEventListener('abort', abortPdf);
        await task.destroy();
      }
    }

    const validImage = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47 ||
      signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff ||
      new TextDecoder('latin1').decode(signature.slice(0, 4)) === 'RIFF' && new TextDecoder('latin1').decode(signature.slice(8, 12)) === 'WEBP';
    if (!validImage) throw new Error('الملف لا يحتوي على صورة PNG أو JPG أو WebP صالحة. الأصل محفوظ.');
    const bitmap = await bounded(createImageBitmap(file), signal);
    const canvas = document.createElement('canvas');
    try {
      if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) throw new Error('أبعاد الصورة كبيرة جدًا. الأصل محفوظ؛ اختر صورة بأبعاد أصغر.');
      const scale = Math.min(1, 2800 / Math.max(bitmap.width, bitmap.height), Math.sqrt(6_000_000 / (bitmap.width * bitmap.height)));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('تعذر تجهيز قراءة الصورة على جهازك. الأصل محفوظ.');
      context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const text = checkedBrowserDocumentText(await recognize(canvas));
      progress('اكتملت قراءة الصورة. جارٍ حفظ النص…', 1);
      return text;
    } finally {
      bitmap.close(); canvas.width = 0; canvas.height = 0;
    }
  } finally {
    signal.removeEventListener('abort', stop);
    if (worker) await worker.terminate();
    else if (pendingWorker) void pendingWorker.then(value => value.terminate(), () => undefined);
  }
}
