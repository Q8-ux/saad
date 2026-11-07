"use client";

import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  AudioLines,
  Brain,
  Check,
  Copy,
  Feather,
  FileImage,
  Library,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MessageCircle,
  MessageCircleQuestion,
  Mic,
  PenLine,
  RefreshCw,
  Route,
  Scale,
  ScanText,
  ShieldCheck,
  Sparkles,
  Square,
  Upload,
  UserRound,
  Video,
  Volume2,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import AppUpdates from "./AppUpdates";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  DIRECT_MEDIA_UPLOAD_BYTES,
  MAX_MEDIA_FILE_BYTES,
  MEDIA_UPLOAD_CHUNK_BYTES,
  mediaSourceMode,
} from "@/lib/media-files";

type Question = {
  id: string;
  role?: string;
  question: string;
  options: string[];
  allow_custom: boolean;
};

type Analysis = {
  story_summary: string;
  emotional_core: string;
  recommended_purpose: string;
  recommended_meter: string;
  meter_reason: string;
  suggested_tone: string;
  questions: Question[];
  submission_id?: string;
};

type Verse = {
  sadr: string;
  ajz: string;
  meaning_note: string;
  rhythm_note: string;
};

type Poem = {
  title: string;
  meter: string;
  meter_reason: string;
  dialect: string;
  tone: string;
  sadr_rhyme: string;
  ajz_rhyme: string;
  rawi: string;
  verses: Verse[];
  fidelity_note: string;
  meter_check: string;
  rhyme_check: string;
  originality_check: string;
  performance_note: string;
  submission_id?: string;
  quality_report?: {
    version: number;
    status: "approved" | "review_recommended";
    score: number;
    issue_count: number;
    last_line_score?: number;
    last_line_status?: "passed" | "review";
    last_line_notes?: string[];
  };
};

type CurrentUser = {
  displayName: string;
  email: string;
  role: "admin" | "user";
  isGuest: boolean;
  sessionToken?: string;
};

type VerseEditFocus =
  | "word"
  | "name"
  | "sadr"
  | "ajz"
  | "rhyme"
  | "whole_verse"
  | "meaning";

const verseEditFocusLabels: Record<VerseEditFocus, string> = {
  word: "مفردة أو كلمة",
  name: "اسم أو شخص",
  sadr: "صدر البيت",
  ajz: "عجز البيت",
  rhyme: "قافية العجز والروي",
  whole_verse: "البيت كاملًا",
  meaning: "المعنى أو الشعور",
};

const LoadingDots = () => (
  <span className="loading-dots" aria-label="جارٍ العمل">
    <i />
    <i />
    <i />
  </span>
);

const formatDuration = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

const formatCount = (value: number) => new Intl.NumberFormat("ar-KW").format(value);
const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

const exampleStory =
  "اكتب قصتك كما حدثت، من غير ترتيب رسمي. مثلاً: كنت أظن أن المسافة تنتهي باللقاء، لكن كلما اقترب الموعد ظهرت ظروف جديدة. أريد أبياتًا فيها عتب هادئ وكرامة، وتنتهي بأمل لا يبدو ضعيفًا.";

const examplePoetryRequest =
  "مثلاً: أريدها وصية لابني بلهجة كويتية، فيها حكمة وتحذير من غدر الزمان. استخدم مفردات بسيطة من واقع القصة، وتجنب الحشو والكلام العام.";

const downloadTextFile = (filename: string, content: string, type = "text/plain;charset=utf-8") => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] || character);

const requestErrorMessage = (requestError: unknown, fallback: string) => {
  const message = requestError instanceof Error ? requestError.message : "";
  if (/string did not match the expected pattern|expected pattern|invalid url|invalid form/i.test(message)) {
    return "تعذّر تجهيز التسجيل للرفع. حدّث الصفحة، اسمح بالميكروفون، ثم سجّل مرة أخرى.";
  }
  if (
    requestError instanceof TypeError ||
    /failed to fetch|load failed|networkerror|network request failed/i.test(message)
  ) {
    return "استغرق الطلب وقتًا أطول من المتوقع. قصتك محفوظة هنا؛ اضغط مرة أخرى.";
  }
  // Browser and network layers can expose technical English errors. Keep the
  // interface Arabic and actionable while preserving Arabic server messages.
  return /[\u0600-\u06FF]/.test(message) ? message : fallback;
};

const pickRecorderMimeType = () => {
  if (typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType),
  );
};

const recordingFilename = (mimeType: string) => {
  if (mimeType.includes("mp4")) return "story.m4a";
  if (mimeType.includes("ogg")) return "story.ogg";
  return "story.webm";
};

const GITHUB_PAGES_PARENT_ORIGIN = "https://q8-ux.github.io";
const AUDIO_BRIDGE_CHANNEL = "ant-alshaer-audio";

const isTrustedGitHubEmbed = () => {
  if (typeof window === "undefined" || window.parent === window) return false;
  try {
    return new URL(document.referrer).origin === GITHUB_PAGES_PARENT_ORIGIN;
  } catch {
    return false;
  }
};

const createAudioRecorder = (stream: MediaStream, mimeType?: string) => {
  const preferredOptions: MediaRecorderOptions = {
    audioBitsPerSecond: AUDIO_RECORDING_BITRATE,
    ...(mimeType ? { mimeType } : {}),
  };
  try {
    return new MediaRecorder(stream, preferredOptions);
  } catch {
    return mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
  }
};

// Keep the complete multipart request safely below the hosting upload ceiling.
// The extra room accounts for the form-data wrapper added around the recording.
const MAX_UPLOAD_AUDIO_BYTES = 800 * 1024;
const AUDIO_RECORDING_BITRATE = 24_000;
const RECORDING_TIMESLICE_MS = 1_000;
const SESSION_REQUEST_TIMEOUT_MS = 12_000;
const MEDIA_CHUNK_REQUEST_TIMEOUT_MS = 20_000;
const MEDIA_CHUNK_MAX_ATTEMPTS = 3;

const withRequestTimeout = async <T,>(
  timeoutMs: number,
  request: (signal: AbortSignal) => Promise<T>,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const waitBeforeRetry = (attempt: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, 500 * attempt));

export default function PoetryStudio() {
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [story, setStory] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [poetryRequest, setPoetryRequest] = useState("");
  const [poem, setPoem] = useState<Poem | null>(null);
  const [busy, setBusy] = useState<"analyze" | "generate" | "transcribe" | "verse_transcribe" | "revise" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [shortsBusy, setShortsBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [verseEditorOpen, setVerseEditorOpen] = useState<number | null>(null);
  const [verseNumber, setVerseNumber] = useState("1");
  const [verseEditFocus, setVerseEditFocus] = useState<VerseEditFocus>("word");
  const [verseCurrentText, setVerseCurrentText] = useState("");
  const [verseReplacementText, setVerseReplacementText] = useState("");
  const [verseEditNote, setVerseEditNote] = useState("");
  const [verseEditError, setVerseEditError] = useState("");
  const [verseEditSuccess, setVerseEditSuccess] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingBytesRef = useRef(0);
  const recordingStoppedForSizeRef = useRef(false);
  const recordStartedAtRef = useRef<number | null>(null);
  const recordingTargetRef = useRef<"story" | "verse" | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<"story" | "verse" | null>(null);
  const writingRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const poemWasVisibleRef = useRef(false);
  const sessionTokenRef = useRef("");
  const sessionRequestRef = useRef<Promise<CurrentUser | null> | null>(null);
  const textTabRef = useRef<HTMLButtonElement | null>(null);
  const voiceTabRef = useRef<HTMLButtonElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const handleInputTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || recording || busy) return;
    event.preventDefault();
    const nextMode = event.key === "Home" ? "text" : event.key === "End" ? "voice" : inputMode === "text" ? "voice" : "text";
    setInputMode(nextMode);
    (nextMode === "text" ? textTabRef : voiceTabRef).current?.focus();
  };

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const ensureAppSession = () => {
    if (!sessionRequestRef.current) {
      sessionRequestRef.current = withRequestTimeout(SESSION_REQUEST_TIMEOUT_MS, (signal) =>
        fetch("/api/me", { cache: "no-store", signal }),
      )
        .then(async (response) => {
          if (!response.ok) throw new Error("تعذّر تهيئة جلسة رفع الملف. أعد المحاولة.");
          return (await response.json()) as CurrentUser;
        })
        .then((user) => {
          if (user?.sessionToken) sessionTokenRef.current = user.sessionToken;
          return user;
        })
        .catch((sessionError) => {
          sessionRequestRef.current = null;
          throw sessionError;
        });
    }
    return sessionRequestRef.current;
  };

  const appFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    await ensureAppSession();
    const headers = new Headers(init.headers);
    if (sessionTokenRef.current) {
      headers.set("x-ant-alshaer-session", sessionTokenRef.current);
    }
    const path = new URL(input instanceof Request ? input.url : String(input), window.location.origin).pathname;
    if (["/api/transcribe", "/api/feedback/transcribe", "/api/media/process"].includes(path)) {
      return withRequestTimeout(110000, signal => fetch(input, { ...init, headers, signal: init.signal ? AbortSignal.any([init.signal, signal]) : signal }));
    }
    return fetch(input, { ...init, headers });
  };

  useEffect(() => {
    let active = true;
    ensureAppSession()
      .then((user) => {
        if (active && user) setCurrentUser(user);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (analysis && !poem) {
      window.setTimeout(
        () => {
          writingRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
          writingRef.current?.querySelector<HTMLElement>(".step-title")?.focus({ preventScroll: true });
        },
        140,
      );
    }
  }, [analysis, poem]);

  useEffect(() => {
    if (!poem) {
      poemWasVisibleRef.current = false;
      return;
    }

    if (poemWasVisibleRef.current) return;
    poemWasVisibleRef.current = true;
    const id = window.setTimeout(
      () => {
        resultRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        resultRef.current?.querySelector<HTMLElement>(".poem-title")?.focus({ preventScroll: true });
      },
      120,
    );
    return () => window.clearTimeout(id);
  }, [poem]);

  const apiRequest = async (payload: Record<string, unknown>) => {
    const response = await appFetch("/api/poetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: string; [key: string]: unknown };
    if (!response.ok) {
      throw new Error(data.error || "تعذّر إكمال الطلب الآن.");
    }
    return data;
  };

  const analyzeStoryContent = async (storyText: string, linkedSubmissionId?: string | null) => {
    if (storyText.trim().length < 24) {
      setError("اكتب تفاصيل أكثر قليلًا حتى نفهم المعنى الذي تريد تحويله إلى شعر.");
      return;
    }
    setBusy("analyze");
    setError("");
    setNotice("");
    setPoem(null);
    try {
      const data = (await apiRequest({
        mode: "analyze",
        story: storyText.trim(),
        submission_id: linkedSubmissionId || undefined,
      })) as Analysis;
      setAnalysis(data);
      if (data.submission_id) setSubmissionId(data.submission_id);
      setAnswers(
        Object.fromEntries(data.questions.map((question) => [question.id, question.options[0] || ""])),
      );
      setPoetryRequest("");
    } catch (requestError) {
      setError(requestErrorMessage(requestError, "حدث خطأ غير متوقع."));
    } finally {
      setBusy(null);
    }
  };

  const analyzeStory = async () => analyzeStoryContent(story, submissionId);

  const generatePoem = async () => {
    if (!analysis) return;
    setBusy("generate");
    setError("");
    try {
      const generationAnswers = poetryRequest.trim()
        ? { ...answers, custom_request: poetryRequest.trim() }
        : answers;
      const data = (await apiRequest({
        mode: "generate",
        submission_id: submissionId || undefined,
        story: story.trim(),
        analysis,
        answers: generationAnswers,
      })) as Poem;
      setPoem(data);
      if (data.submission_id) setSubmissionId(data.submission_id);
    } catch (requestError) {
      setError(requestErrorMessage(requestError, "تعذّر توليد الأبيات."));
    } finally {
      setBusy(null);
    }
  };

  const revisePoem = async (instruction: string) => {
    if (!analysis || !poem) return false;
    setBusy("revise");
    setError("");
    try {
      const revisionAnswers = poetryRequest.trim()
        ? { ...answers, custom_request: poetryRequest.trim() }
        : answers;
      const data = (await apiRequest({
        mode: "revise",
        submission_id: submissionId || undefined,
        story: story.trim(),
        analysis,
        answers: revisionAnswers,
        current_poem: poem,
        revision_instruction: instruction,
      })) as Poem;
      setPoem(data);
      if (data.submission_id) setSubmissionId(data.submission_id);
      return true;
    } catch (requestError) {
      setError(requestErrorMessage(requestError, "تعذّر تعديل الأبيات."));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const transcribe = async (
    blob: Blob,
    durationSeconds: number,
    wasStoppedForSize = false,
  ) => {
    if (blob.size > MAX_UPLOAD_AUDIO_BYTES) {
      setError("التسجيل كبير للرفع دفعة واحدة. سجّل جزءًا أقصر أو قسّم القصة إلى تسجيلين.");
      return;
    }
    setBusy("transcribe");
    setError("");
    const formData = new FormData();
    formData.append("audio", blob, recordingFilename(blob.type));
    formData.append("duration_seconds", String(durationSeconds));
    try {
      const response = await appFetch(new URL("/api/transcribe", window.location.origin), {
        method: "POST",
        body: formData,
      });
      const raw = await response.text();
      let data: {
        error?: string;
        text?: string;
        submission_id?: string;
      } = {};
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        // A proxy may return HTML instead of JSON; never show its technical body.
      }
      if (response.status === 413) {
        throw new Error("التسجيل كبير للرفع دفعة واحدة. سجّل جزءًا أقصر أو قسّم القصة إلى تسجيلين.");
      }
      if (!response.ok) throw new Error(data.error || "تعذّر تفريغ التسجيل.");
      const extractedText = data.text?.trim();
      if (!extractedText) throw new Error("لم يظهر كلام واضح في التسجيل. اقترب من الميكروفون وأعد المحاولة.");
      setStory(extractedText);
      setSubmissionId(data.submission_id || null);
      setAnalysis(null);
      setAnswers({});
      setPoem(null);
      setInputMode("text");
      await analyzeStoryContent(extractedText, data.submission_id);
      if (wasStoppedForSize) {
        setNotice(
          "أوقفنا التسجيل تلقائيًا عند الحد الآمن للرفع، وفُرّغ الجزء المسجّل. يمكنك إضافة بقية القصة في خانة الكتابة ثم تحليلها.",
        );
      }
    } catch (requestError) {
      setError(requestErrorMessage(requestError, "تعذّر تفريغ التسجيل."));
    } finally {
      setBusy(null);
    }
  };

  const transcribeVerseNote = async (blob: Blob) => {
    if (blob.size > MAX_UPLOAD_AUDIO_BYTES) {
      setVerseEditError("الملاحظة الصوتية طويلة. سجّل ملاحظة أقصر ثم أعد المحاولة.");
      return;
    }
    setBusy("verse_transcribe");
    setVerseEditError("");
    const formData = new FormData();
    formData.append("media", blob, recordingFilename(blob.type));
    try {
      const response = await appFetch(new URL("/api/feedback/transcribe", window.location.origin), {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; text?: string };
      if (!response.ok) throw new Error(data.error || "تعذّر تحويل الملاحظة الصوتية إلى نص.");
      const dictatedNote = data.text?.trim();
      if (!dictatedNote) throw new Error("لم يظهر كلام واضح في الملاحظة الصوتية.");
      setVerseEditNote((current) => [current.trim(), dictatedNote].filter(Boolean).join(" "));
    } catch (requestError) {
      setVerseEditError(
        requestErrorMessage(requestError, "تعذّر تحويل الملاحظة الصوتية إلى نص."),
      );
    } finally {
      setBusy(null);
    }
  };

  const routeRecordedAudio = (
    audioBlob: Blob,
    durationSeconds: number,
    wasStoppedForSize = false,
  ) => {
    const target = recordingTargetRef.current;
    recordingTargetRef.current = null;
    if (target === "verse") {
      void transcribeVerseNote(audioBlob);
      return;
    }
    void transcribe(audioBlob, durationSeconds, wasStoppedForSize);
  };

  const extractAndAnalyzeMedia = async (file: File) => {
    const sourceMode = mediaSourceMode(file.name, file.type);
    if (!sourceMode) {
      setError("صيغة الملف غير مدعومة. استخدم MP3 أو M4A أو WAV أو OGG أو MP4 أو WebM.");
      return;
    }
    if (file.size === 0) {
      setError("الملف فارغ. اختر ملفًا يحتوي على صوت واضح.");
      return;
    }
    if (file.size > MAX_MEDIA_FILE_BYTES) {
      setError("حجم الملف يتجاوز ٢٠ م.ب. اختر ملفًا أصغر أو اضغط الفيديو قبل رفعه.");
      return;
    }

    setBusy("transcribe");
    setError("");
    setNotice("جارٍ رفع الملف واستخراج الكلام منه…");
    setMediaUploadProgress(0);
    const uploadId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / MEDIA_UPLOAD_CHUNK_BYTES);

    try {
      let response: Response;
      if (file.size <= DIRECT_MEDIA_UPLOAD_BYTES) {
        const formData = new FormData();
        formData.append("media", file, file.name);
        formData.append("duration_seconds", "0");
        response = await appFetch(new URL("/api/transcribe", window.location.origin), {
          method: "POST",
          body: formData,
        });
        setMediaUploadProgress(70);
      } else {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          const start = chunkIndex * MEDIA_UPLOAD_CHUNK_BYTES;
          const chunk = file.slice(start, Math.min(start + MEDIA_UPLOAD_CHUNK_BYTES, file.size));
          let uploaded = false;
          let uploadError = "تعذّر رفع أحد أجزاء الملف.";

          for (let attempt = 1; attempt <= MEDIA_CHUNK_MAX_ATTEMPTS; attempt += 1) {
            const formData = new FormData();
            formData.append("chunk", chunk, `chunk-${chunkIndex}.bin`);
            formData.append("upload_id", uploadId);
            formData.append("chunk_index", String(chunkIndex));
            formData.append("total_chunks", String(totalChunks));
            formData.append("total_size", String(file.size));
            formData.append("filename", file.name);
            formData.append("content_type", file.type || "application/octet-stream");

            let chunkResponse: Response | null = null;
            try {
              chunkResponse = await withRequestTimeout(
                MEDIA_CHUNK_REQUEST_TIMEOUT_MS,
                (signal) => appFetch("/api/media/chunk", { method: "POST", body: formData, signal }),
              );
            } catch {
              uploadError = "انقطع الاتصال أثناء رفع الملف.";
            }

            if (chunkResponse?.ok) {
              uploaded = true;
              break;
            }

            if (chunkResponse) {
              const chunkResult = (await chunkResponse.json().catch(() => ({}))) as { error?: string };
              uploadError = chunkResult.error || uploadError;
              const retryable = chunkResponse.status === 408 || chunkResponse.status === 429 || chunkResponse.status >= 500;
              if (!retryable) throw new Error(uploadError);
            }

            if (attempt < MEDIA_CHUNK_MAX_ATTEMPTS) {
              setNotice(`الاتصال بطيء؛ نعيد رفع الجزء ${chunkIndex + 1} تلقائيًا…`);
              await waitBeforeRetry(attempt);
            }
          }

          if (!uploaded) {
            throw new Error(`${uploadError} حاول مرة أخرى، ولن تحتاج إلى تغيير الملف.`);
          }

          setMediaUploadProgress(Math.round(((chunkIndex + 1) / totalChunks) * 70));
        }

        setNotice("اكتمل الرفع. جارٍ استخراج الكلام وتحليل المحتوى…");
        response = await appFetch("/api/media/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            upload_id: uploadId,
            filename: file.name,
            content_type: file.type || "application/octet-stream",
            total_chunks: totalChunks,
            total_size: file.size,
          }),
        });
      }

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        text?: string;
        submission_id?: string;
      };
      if (!response.ok) throw new Error(result.error || "تعذّر استخراج الكلام من الملف.");
      const extractedText = result.text?.trim() || "";
      if (!extractedText) throw new Error("لم يظهر كلام واضح في الملف.");

      setMediaUploadProgress(100);
      setStory(extractedText);
      setSubmissionId(result.submission_id || null);
      setInputMode("text");
      setNotice("تم استخراج الكلام. جارٍ تحليل القصة تلقائيًا…");
      await analyzeStoryContent(extractedText, result.submission_id);
    } catch (requestError) {
      if (file.size > DIRECT_MEDIA_UPLOAD_BYTES) {
        await withRequestTimeout(8_000, (signal) =>
          appFetch("/api/media/chunk", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ upload_id: uploadId, total_chunks: totalChunks }),
            signal,
          }),
        ).catch(() => undefined);
      }
      setError(requestErrorMessage(requestError, "تعذّر رفع الملف أو استخراج الكلام منه."));
    } finally {
      setBusy(null);
      setMediaUploadProgress(null);
    }
  };

  useEffect(() => {
    if (!isTrustedGitHubEmbed()) return;

    const receiveGitHubAudio = (event: MessageEvent) => {
      if (event.origin !== GITHUB_PAGES_PARENT_ORIGIN || event.source !== window.parent) return;
      const message = event.data as {
        channel?: string;
        type?: string;
        audioBuffer?: ArrayBuffer;
        mimeType?: string;
        durationSeconds?: number;
        stoppedForSize?: boolean;
        message?: string;
      };
      if (message?.channel !== AUDIO_BRIDGE_CHANNEL) return;

      if (message.type === "recording-started") {
        setRecordSeconds(0);
        recordStartedAtRef.current = Date.now();
        setRecording(true);
        if (recordingTargetRef.current === "verse") {
          setVerseEditError("");
        } else {
          setNotice("تم تشغيل الميكروفون. اضغط الزر مرة أخرى عند انتهاء القصة.");
        }
        return;
      }

      if (message.type === "recording-error") {
        setRecording(false);
        recordStartedAtRef.current = null;
        setNotice("");
        if (recordingTargetRef.current === "verse") {
          setVerseEditError("تعذّر تشغيل الميكروفون. اسمح باستخدامه أو اكتب ملاحظتك في الخانة.");
        } else {
          setError(
            message.message ||
              "تعذّر تشغيل الميكروفون داخل المتصفح. استخدم خيار تسجيل أو اختيار ملف صوتي.",
          );
        }
        recordingTargetRef.current = null;
        return;
      }

      if (message.type === "recording-complete" && message.audioBuffer instanceof ArrayBuffer) {
        const audioBlob = new Blob([message.audioBuffer], {
          type: message.mimeType || "audio/webm",
        });
        setRecording(false);
        recordStartedAtRef.current = null;
        setNotice("");
        if (audioBlob.size === 0) {
          if (recordingTargetRef.current === "verse") {
            setVerseEditError("الملاحظة الصوتية فارغة. تكلم ثم أوقف التسجيل.");
          } else {
            setError("التسجيل فارغ. سجّل قصتك ثم أوقف التسجيل.");
          }
          recordingTargetRef.current = null;
          return;
        }
        routeRecordedAudio(
          audioBlob,
          Math.max(1, Math.round(message.durationSeconds || 1)),
          Boolean(message.stoppedForSize),
        );
      }
    };

    window.addEventListener("message", receiveGitHubAudio);
    return () => window.removeEventListener("message", receiveGitHubAudio);
  });

  const useMediaFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    void extractAndAnalyzeMedia(file);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async (target: "story" | "verse" = "story") => {
    if (recording) {
      if (isTrustedGitHubEmbed()) {
        window.parent.postMessage(
          { channel: AUDIO_BRIDGE_CHANNEL, type: "stop-recording" },
          GITHUB_PAGES_PARENT_ORIGIN,
        );
        return;
      }
      stopRecording();
      return;
    }

    recordingTargetRef.current = target;
    setRecordingTarget(target);

    if (isTrustedGitHubEmbed()) {
      if (target === "verse") {
        setVerseEditError("");
      } else {
        setError("");
        setNotice("بانتظار إذن الميكروفون من المتصفح…");
      }
      window.parent.postMessage(
        { channel: AUDIO_BRIDGE_CHANNEL, type: "start-recording" },
        GITHUB_PAGES_PARENT_ORIGIN,
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      if (target === "verse") {
        setVerseEditError("المتصفح الحالي لا يدعم الميكروفون هنا. اكتب ملاحظتك في الخانة.");
      } else {
        setError("المتصفح الحالي لا يدعم التسجيل الصوتي. يمكنك كتابة القصة مباشرة.");
      }
      recordingTargetRef.current = null;
      return;
    }

    setError("");
    setNotice("");
    let stream: MediaStream | null = null;
    try {
      const recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream = recordingStream;
      const mimeType = pickRecorderMimeType();
      const recorder = createAudioRecorder(recordingStream, mimeType);
      streamRef.current = recordingStream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recordingBytesRef.current = 0;
      recordingStoppedForSizeRef.current = false;
      setRecordSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        if (recordingBytesRef.current + event.data.size > MAX_UPLOAD_AUDIO_BYTES) {
          recordingStoppedForSizeRef.current = true;
          if (recorder.state === "recording") recorder.stop();
          return;
        }
        chunksRef.current.push(event.data);
        recordingBytesRef.current += event.data.size;
      };
      recorder.onstop = () => {
        const wasStoppedForSize = recordingStoppedForSizeRef.current;
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        const durationSeconds = recordStartedAtRef.current
          ? Math.max(1, Math.round((Date.now() - recordStartedAtRef.current) / 1000))
          : recordSeconds;
        recordingStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        recordStartedAtRef.current = null;
        recordingBytesRef.current = 0;
        setRecording(false);
        if (audioBlob.size === 0) {
          if (recordingTargetRef.current === "verse") {
            setVerseEditError("الملاحظة الصوتية فارغة. تكلم ثم أوقف التسجيل.");
          } else {
            setError(
              wasStoppedForSize
                ? "بلغ التسجيل الحد الآمن قبل وصول صوت صالح للتفريغ. سجّل جزءًا أقصر ثم أعد المحاولة."
                : "التسجيل فارغ. سجّل قصتك ثم أوقف التسجيل.",
            );
          }
          recordingTargetRef.current = null;
          return;
        }
        routeRecordedAudio(audioBlob, durationSeconds, wasStoppedForSize);
      };
      recorder.onerror = () => {
        recordingStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        recordStartedAtRef.current = null;
        setRecording(false);
        if (recordingTargetRef.current === "verse") {
          setVerseEditError("تعذّر إكمال الملاحظة الصوتية. أعد المحاولة أو اكتبها في الخانة.");
        } else {
          setError("تعذّر إكمال التسجيل الصوتي. أعد المحاولة بعد التأكد من إذن الميكروفون.");
        }
        recordingTargetRef.current = null;
      };
      recorder.start(RECORDING_TIMESLICE_MS);
      recordStartedAtRef.current = Date.now();
      setRecording(true);
    } catch (recordingError) {
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const errorName = recordingError instanceof DOMException ? recordingError.name : "";
      if (target === "verse") {
        setVerseEditError(
          errorName === "NotAllowedError" || errorName === "SecurityError"
            ? "إذن الميكروفون مرفوض. اسمح به من إعدادات المتصفح أو اكتب ملاحظتك."
            : "تعذّر تشغيل الميكروفون. اكتب ملاحظتك في الخانة أو أعد المحاولة.",
        );
      } else if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setError("إذن الميكروفون مرفوض. اسمح به من إعدادات المتصفح أو استخدم خيار الملف الصوتي.");
      } else if (errorName === "NotFoundError") {
        setError("لم يعثر المتصفح على ميكروفون. استخدم خيار تسجيل أو اختيار ملف صوتي.");
      } else {
        setError("لم نتمكن من تشغيل الميكروفون. استخدم خيار تسجيل أو اختيار ملف صوتي.");
      }
      recordingTargetRef.current = null;
    }
  };

  const copyPoem = async () => {
    if (!poem) return;
    const text = [
      poem.title,
      `البحر: ${poem.meter}`,
      "",
      ...poem.verses.map((verse) => `${verse.sadr}  —  ${verse.ajz}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setNotice("تم نسخ القصيدة. يمكنك لصقها ومشاركتها الآن.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("تعذّر النسخ من هذا المتصفح. حدّد نص الأبيات وانسخه، أو نزّل بطاقة القصيدة.");
    }
  };

  const listenToPoem = () => {
    if (!poem || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setNotice("الاستماع غير مدعوم في هذا المتصفح. يمكنك نسخ القصيدة وقراءتها في قارئ الجهاز.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      [poem.title, ...poem.verses.flatMap((verse) => [verse.sadr, verse.ajz])].join(". "),
    );
    utterance.lang = "ar-KW";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
    setNotice("بدأ الإلقاء التجريبي بصوت الجهاز. جودة الصوت تختلف حسب المتصفح.");
  };

  const downloadPoemCard = () => {
    if (!poem) return;
    const verseLines = poem.verses
      .map((verse, index) => {
        const y = 360 + index * 124;
        return `<text x="800" y="${y}" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override" font-size="31" font-weight="700" fill="#192520">${escapeXml(verse.sadr)}</text><text x="800" y="${y + 46}" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override" font-size="31" font-weight="700" fill="#192520">${escapeXml(verse.ajz)}</text>`;
      })
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200"><rect width="1600" height="1200" fill="#fffdf8"/><circle cx="140" cy="120" r="260" fill="#b48a43" opacity=".08"/><circle cx="1460" cy="1080" r="320" fill="#1f4a3a" opacity=".07"/><rect x="100" y="92" width="1400" height="1016" rx="44" fill="none" stroke="#1f4a3a" stroke-opacity=".18" stroke-width="3"/><text x="800" y="182" text-anchor="middle" direction="rtl" font-family="Cairo,Arial,sans-serif" font-size="60" font-weight="900" fill="#1f4a3a">${escapeXml(poem.title)}</text><text x="800" y="244" text-anchor="middle" direction="rtl" font-family="Cairo,Arial,sans-serif" font-size="24" fill="#8b672d">${escapeXml(poem.meter)} · ${escapeXml(poem.dialect)}</text><g font-family="Cairo,Arial,sans-serif">${verseLines}</g><text x="800" y="1060" text-anchor="middle" direction="rtl" font-family="Cairo,Arial,sans-serif" font-size="24" font-weight="800" fill="#1f4a3a">أنت الشاعر · 2026</text></svg>`;
    downloadTextFile("ant-alshaer-poem-card.svg", svg, "image/svg+xml;charset=utf-8");
    setNotice("تم تنزيل بطاقة القصيدة بصيغة SVG عالية الدقة.");
  };

  const downloadShortsPlan = async () => {
    if (!poem) return;
    setShortsBusy(true);
    setError("");
    try {
      const response = await appFetch("/api/marketing/shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: poem.title, meter: poem.meter, verses: poem.verses }),
      });
      const data = (await response.json()) as {
        error?: string;
        format?: string;
        duration_seconds?: number;
        scenes?: Array<{ number: number; verse: string; visual_direction: string; voice_direction: string }>;
      };
      if (!response.ok) throw new Error(data.error || "تعذّر تجهيز مخطط الفيديو.");
      const text = [
        `مخطط فيديو قصير: ${poem.title}`,
        `المقاس: ${data.format} | المدة: ${data.duration_seconds} ثانية`,
        "",
        ...(data.scenes || []).flatMap((scene) => [
          `المشهد ${scene.number}: ${scene.verse}`,
          `الصورة: ${scene.visual_direction}`,
          `الإلقاء: ${scene.voice_direction}`,
          "",
        ]),
      ].join("\n");
      downloadTextFile("ant-alshaer-short-video-plan.txt", text);
      setNotice("تم تنزيل مخطط فيديو عمودي للقصيدة.");
    } catch (requestError) {
      setError(requestErrorMessage(requestError, "تعذّر تجهيز مخطط الفيديو."));
    } finally {
      setShortsBusy(false);
    }
  };

  const reset = () => {
    setStory("");
    setSubmissionId(null);
    setAnalysis(null);
    setAnswers({});
    setPoetryRequest("");
    setPoem(null);
    setError("");
    setNotice("");
    setInputMode("text");
    setVerseEditorOpen(null);
    setVerseEditError("");
    setVerseEditSuccess("");
  };

  const openVerseEditor = (index: number) => {
    if (recording && recordingTargetRef.current === "verse") return;
    setVerseNumber(String(index + 1));
    setVerseEditFocus("word");
    setVerseCurrentText("");
    setVerseReplacementText("");
    setVerseEditNote("");
    setVerseEditError("");
    setVerseEditSuccess("");
    setVerseEditorOpen(index);
  };

  const closeVerseEditor = () => {
    if (busy === "revise" || busy === "verse_transcribe" || (recording && recordingTargetRef.current === "verse")) return;
    setVerseEditorOpen(null);
    setVerseEditError("");
    setVerseEditSuccess("");
  };

  const selectedVerse = poem?.verses[Number(verseNumber) - 1];

  const applyVerseEdit = async () => {
    if (!poem) return;
    setVerseEditSuccess("");
    const selectedNumber = Number(verseNumber);
    if (!Number.isInteger(selectedNumber) || selectedNumber < 1 || selectedNumber > poem.verses.length) {
      setVerseEditError("اختر رقم بيت صحيحًا من القصيدة.");
      return;
    }

    const currentText = verseCurrentText.trim();
    const replacementText = verseReplacementText.trim();
    const note = verseEditNote.trim();
    if (!currentText && !replacementText && !note) {
      setVerseEditError("اكتب الكلمة التي تريد تغييرها أو ملاحظتك على البيت.");
      return;
    }

    const changes = [
      `تعديل موضعي: عدّل البيت رقم ${selectedNumber} فقط. أبقِ كل الأبيات الأخرى كما هي لفظًا ومعنى، وحافظ على البحر وعدد الأبيات والقافية.`,
      selectedVerse ? `صدر البيت: «${selectedVerse.sadr}». عجز البيت: «${selectedVerse.ajz}».` : "",
      `موضع التعديل: ${verseEditFocusLabels[verseEditFocus]}.`,
      currentText ? `النص الحالي المراد تغييره: «${currentText}».` : "",
      replacementText ? `البديل المطلوب أو المعنى المرغوب: «${replacementText}».` : "",
      note ? `ملاحظة صاحب القصيدة: «${note}».` : "",
    ].filter(Boolean);

    const updated = await revisePoem(changes.join(" ").slice(0, 390));
    if (updated) {
      setVerseCurrentText("");
      setVerseReplacementText("");
      setVerseEditNote("");
      setVerseEditError("");
      setVerseEditSuccess(
        `تم حفظ تعديل البيت ${selectedNumber} داخل مشروع القصيدة. يمكنك متابعة تعديل البيت نفسه أو اختيار بيت آخر.`,
      );
    }
  };

  const logout = async () => {
    await Promise.allSettled([
      fetch("/api/auth/session", { method: "DELETE" }),
      fetch("/api/admin/session", { method: "DELETE" }),
    ]);
    window.location.assign("/login");
  };

  return (
    <div className="app-shell">
      <AppUpdates busy={busy !== null || recording || shortsBusy} hasDraft={Boolean(story.trim() || poem || verseEditorOpen !== null)} />
      <a className="skip-link" href="#poetry-studio">انتقل إلى كتابة القصة</a>
      <header className="page-wrap site-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Feather size={23} strokeWidth={1.8} />
          </div>
          <div>
            <div className="brand-name">أنت الشاعر</div>
            <div className="brand-tagline">قصتك بصوت القصيدة</div>
          </div>
        </div>
        <div className="header-actions">
          {currentUser && !currentUser.isGuest && (
            <div className="header-user" title={currentUser.email}>
              <UserRound size={16} />
              <bdi>{currentUser.displayName.split(" ")[0]}</bdi>
            </div>
          )}
          {currentUser?.isGuest && (
            <div className="header-user" title="وضع زائر مؤقت">
              <UserRound size={16} />
              <span>زائر</span>
            </div>
          )}
          <Link className="header-link" href="/archive" aria-label="أرشيفي الشعري">
            <Archive size={16} />
            <span>أرشيفي</span>
          </Link>
          {currentUser?.role === "admin" && (
            <Link className="header-link admin" href="/admin" aria-label="لوحة الإدارة">
              <LayoutDashboard size={16} />
              <span>لوحة الإدارة</span>
            </Link>
          )}
          {currentUser && !currentUser.isGuest && (
            <button className="header-link header-logout" type="button" aria-label="تسجيل الخروج" onClick={() => void logout()}>
              <LogOut size={16} />
              <span>خروج</span>
            </button>
          )}
          <div className="header-badge" aria-label="مرجع شعري موثّق" title="مرجع شعري موثّق">
            <i />
            <span>مرجع شعري موثّق</span>
            <ShieldCheck size={16} />
          </div>
        </div>
      </header>

      <main className="page-wrap" id="main-content">
        <section className="hero">
          <div className="eyebrow">
            <Sparkles size={15} />
            من الحكاية إلى القصيدة
          </div>
          <h1>
            احكِ قصتك <span>ونصوغها شعرًا</span>
          </h1>
          <p>
            اكتب ما حدث أو سجّله بصوتك. نفهم مقصدك أولًا، نسألك عمّا ينقص، ثم نكتب لك
            أبياتًا خاصة بك مع بيان البحر والقافية وفحص إيقاعي أولي.
          </p>
        </section>

        <ol className="studio-progress" aria-label="مراحل كتابة القصيدة">
          {["القصة", "التفاصيل", "القصيدة"].map((label, index) => {
            const activeStep = poem ? 2 : analysis ? 1 : 0;
            return (
              <li key={label} className={index < activeStep ? "complete" : ""} aria-current={index === activeStep ? "step" : undefined}>
                <span className="progress-number" aria-hidden="true">{index < activeStep ? <Check size={14} /> : formatCount(index + 1)}</span>
                <span>{label}</span>
              </li>
            );
          })}
        </ol>

        <section className="studio-grid" id="poetry-studio" aria-label="استوديو القصيدة" tabIndex={-1}>
          <div className="card main-card" aria-busy={busy !== null}>
            <div className="step-row">
              <div className="step-copy">
                <div className="step-number">١</div>
                <div>
                  <label className="step-title" htmlFor="story">احكِ لنا القصة</label>
                  <div className="step-subtitle">لا تحتاج إلى صياغة مرتبة أو كلمات شعرية</div>
                </div>
              </div>
              <div className="text-tabs" role="tablist" aria-label="طريقة إدخال القصة">
                <button
                  ref={textTabRef}
                  id="story-text-tab"
                  type="button"
                  className={`tab-button ${inputMode === "text" ? "active" : ""}`}
                  onClick={() => setInputMode("text")}
                  role="tab"
                  aria-selected={inputMode === "text"}
                  aria-controls="story-text-panel"
                  tabIndex={inputMode === "text" ? 0 : -1}
                  onKeyDown={handleInputTabKey}
                  disabled={recording || busy !== null}
                >
                  <PenLine size={15} />
                  كتابة
                </button>
                <button
                  ref={voiceTabRef}
                  id="story-voice-tab"
                  type="button"
                  className={`tab-button ${inputMode === "voice" ? "active" : ""}`}
                  onClick={() => setInputMode("voice")}
                  role="tab"
                  aria-selected={inputMode === "voice"}
                  aria-controls="story-voice-panel"
                  tabIndex={inputMode === "voice" ? 0 : -1}
                  onKeyDown={handleInputTabKey}
                  disabled={recording || busy !== null}
                >
                  <Mic size={15} />
                  صوت أو فيديو
                </button>
              </div>
            </div>

              <div className="story-box" id="story-text-panel" role="tabpanel" aria-labelledby="story-text-tab" hidden={inputMode !== "text"}>
                <textarea
                  id="story"
                  name="story"
                  className="story-textarea"
                  aria-label="اكتب قصتك"
                  aria-describedby="story-help story-count"
                  maxLength={3000}
                  placeholder={exampleStory}
                  value={story}
                  onChange={(event) => setStory(event.target.value)}
                />
                <div className="char-count" id="story-count" aria-label={`${formatCount(story.length)} حرف من أصل ٣٠٠٠`}><bdi>{formatCount(story.length)} / ٣٠٠٠</bdi></div>
              </div>
              <div className="voice-panel" id="story-voice-panel" role="tabpanel" aria-labelledby="story-voice-tab" hidden={inputMode !== "voice"}>
                <input
                  ref={audioFileInputRef}
                  className="audio-file-input"
                  type="file"
                  accept="audio/*,video/mp4,video/webm,.flac,.mp3,.mpeg,.mpga,.m4a,.ogg,.wav,.webm,.mp4"
                  onChange={useMediaFile}
                  tabIndex={-1}
                />
                <button
                  type="button"
                  className={`record-button ${recording ? "recording" : ""}`}
                  onClick={() => void startRecording("story")}
                  aria-label={recording ? "إيقاف التسجيل" : "بدء التسجيل"}
                  aria-pressed={recording}
                  disabled={busy === "transcribe"}
                >
                  {recording ? <Square size={26} fill="currentColor" /> : <Mic size={29} />}
                </button>
                <div className="record-title">
                  {busy === "transcribe"
                    ? mediaUploadProgress !== null
                      ? `نستخرج الكلام ونحلّله • ${mediaUploadProgress}٪`
                      : "نحوّل صوتك إلى نص"
                    : recording
                      ? `جارٍ التسجيل • ${formatDuration(recordSeconds)}`
                      : "اضغط وابدأ الحكاية"}
                </div>
                <div className="record-note">
                  {busy === "transcribe"
                    ? mediaUploadProgress !== null
                      ? "لا تغلق الصفحة حتى يكتمل رفع الملف واستخراج الكلام."
                      : "انتظر لحظات، ثم راجع النص قبل التحليل."
                    : recording
                      ? "نحافظ على حجم التسجيل مناسبًا للرفع، وسنوقفه تلقائيًا قبل تجاوز الحد."
                      : "سجّل مباشرة، أو ارفع ملف صوت أو فيديو حتى ٢٠ م.ب."}
                </div>
                {mediaUploadProgress !== null && (
                  <progress className="upload-progress" max={100} value={mediaUploadProgress} aria-label="تقدم رفع الملف" />
                )}
                <button
                  type="button"
                  className="audio-file-button"
                  onClick={() => audioFileInputRef.current?.click()}
                  disabled={recording || busy === "transcribe"}
                >
                  <Upload size={17} aria-hidden="true" />
                  رفع ملف صوت أو فيديو
                </button>
              </div>

            <p className="field-help" id="story-help">
              {inputMode === "voice" ? "بعد التسجيل أو رفع الملف سنستخرج القصة ونحلّلها، ويمكنك مراجعة النص." : story.trim().length > 0 && story.trim().length < 24
                ? `أضف ${formatCount(24 - story.trim().length)} حرفًا على الأقل حتى يتاح تحليل القصة.`
                : "اذكر ما حدث وما شعرت به. يتاح التحليل بعد كتابة ٢٤ حرفًا على الأقل."}
            </p>
            <p className="sr-only" role="status" aria-live="polite">
              {busy === "analyze" ? "جارٍ تحليل قصتك، انتظر ظهور التفاصيل." : busy === "generate" ? "جارٍ كتابة القصيدة، ستظهر الأبيات عند اكتمالها." : busy === "revise" ? "جارٍ مراجعة الأبيات." : busy === "transcribe" ? "جارٍ رفع الملف واستخراج القصة." : recording ? "التسجيل جارٍ. اضغط إيقاف التسجيل عندما تنتهي." : ""}
            </p>

            <div className="action-row">
              <div className="privacy-note">
                <LockKeyhole size={14} />
                المحتوى خاص، ويُرفض السب والقذف والإساءة
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={analyzeStory}
                disabled={busy !== null || story.trim().length < 24}
              >
                {busy === "analyze" ? <LoadingDots /> : <Brain size={18} />}
                {busy === "analyze" ? "نحلّل المعنى" : "حلّل قصتي"}
                {busy !== "analyze" && <ArrowLeft size={17} />}
              </button>
            </div>

            {notice && (
              <div className="notice-box" role="status">
                {notice}
              </div>
            )}
            {error && <div className="error-box" role="alert" ref={errorRef} tabIndex={-1}>{error}</div>}

            {analysis && (
              <section className="analysis-panel" aria-label="تحليل القصة وتفاصيل القصيدة">
                <div className="analysis-banner">
                  <div className="analysis-label">
                    <ScanText size={16} />
                    ما فهمناه من قصتك
                  </div>
                  <div className="analysis-summary">{analysis.story_summary}</div>
                  <div className="recommendation-row">
                    <span className="recommendation-chip">
                      <WandSparkles size={13} />
                      {analysis.recommended_purpose}
                    </span>
                    <span className="recommendation-chip">
                      <Scale size={13} />
                      البحر المقترح: {analysis.recommended_meter}
                    </span>
                    <span className="recommendation-chip">
                      <AudioLines size={13} />
                      {analysis.suggested_tone}
                    </span>
                  </div>
                </div>

                <div className="writing-panel" ref={writingRef}>
                  <div className="step-copy">
                    <div className="step-number">٢</div>
                    <div>
                      <h2 className="step-title" tabIndex={-1}>اكتب كيف تريد القصيدة</h2>
                      <div className="step-subtitle">
                        اذكر لمن ستُقال، واللهجة، والشعور أو الخاتمة التي تريدها
                      </div>
                    </div>
                  </div>

                  <div className="poetry-request-box">
                    <textarea
                      id="poetry-request"
                      className="poetry-request-textarea"
                      aria-label="اكتب طلبك للقصيدة"
                      name="poetry-request"
                      aria-describedby="poetry-request-help"
                      maxLength={700}
                      placeholder={examplePoetryRequest}
                      value={poetryRequest}
                      onChange={(event) => setPoetryRequest(event.target.value)}
                    />
                    <div className="char-count"><bdi>{formatCount(poetryRequest.length)} / ٧٠٠</bdi></div>
                  </div>
                  <div className="request-help" id="poetry-request-help">
                    يمكنك ترك الخانة فارغة واعتماد اقتراحات التحليل، أو كتابة طلبك بطريقتك. القصيدة ستة أبيات دائمًا.
                  </div>
                </div>

                <div className="questions-panel">
                  <div className="step-copy">
                    <div className="step-number">٣</div>
                    <div>
                      <div className="step-title">راجع الاختيارات المقترحة</div>
                      <div className="step-subtitle">
                        اختر ما يناسبك أو اكتب إجابة خاصة قبل نظم الأبيات
                      </div>
                    </div>
                  </div>

                  <div className="question-list">
                    {analysis.questions.filter((question) => question.role !== "verse_count").map((question) => (
                      <fieldset className="question-group" key={question.id}>
                        <legend className="question-label">{question.question}</legend>
                        <div className="option-grid">
                          {question.options.map((option) => (
                            <button
                              type="button"
                              key={option}
                              className={`option-button ${answers[question.id] === option ? "selected" : ""}`}
                              aria-pressed={answers[question.id] === option}
                              onClick={() =>
                                setAnswers((current) => ({ ...current, [question.id]: option }))
                              }
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        {question.allow_custom && (
                          <input
                            className="free-answer"
                            name={`answer-${question.id}`}
                            aria-label={`إجابة خاصة: ${question.question}`}
                            value={
                              question.options.includes(answers[question.id] || "")
                                ? ""
                                : answers[question.id] || ""
                            }
                            placeholder="أو اكتب إجابتك الخاصة"
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: event.target.value,
                              }))
                            }
                          />
                        )}
                      </fieldset>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="primary-button wide"
                    style={{ marginTop: 24 }}
                    onClick={generatePoem}
                    disabled={busy !== null}
                  >
                    {busy === "generate" ? <LoadingDots /> : <Feather size={19} />}
                    {busy === "generate" ? "نكتب الأبيات" : "اكتب القصيدة الآن"}
                  </button>
                </div>
              </section>
            )}

            {poem && (
              <section className="result-panel" ref={resultRef} aria-labelledby="poem-title">
                <div className="result-head">
                  <div>
                    <h2 className="poem-title" id="poem-title" tabIndex={-1}>{poem.title}</h2>
                    <div className="poem-meta">
                      <span className="status-chip">البحر المعتمد: {poem.meter}</span>
                      {poem.sadr_rhyme !== "غير ملزمة" && (
                        <span className="status-chip">قافية الصدر: {poem.sadr_rhyme}</span>
                      )}
                      <span className="status-chip">قافية العجز: {poem.ajz_rhyme}</span>
                      <span className="status-chip">روي العجز: {poem.rawi}</span>
                      <span className="status-chip">{poem.dialect}</span>
                      <span className="status-chip project-save-chip">
                        <Check size={14} />
                        مشروع القصيدة محفوظ تلقائيًا
                      </span>
                    </div>
                  </div>
                  <button type="button" className="secondary-button" onClick={copyPoem}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "تم النسخ" : "نسخ القصيدة"}
                  </button>
                </div>

                <div className="poem-paper">
                  {poem.verses.map((verse, index) => (
                    <div className="verse-block" key={`${verse.sadr}-${index}`}>
                      <div className="verse">
                        <div className="hemistich">{verse.sadr}</div>
                        <div className="verse-divider" aria-hidden="true">◆</div>
                        <div className="hemistich">{verse.ajz}</div>
                      </div>
                      <button
                        type="button"
                        className="verse-inline-edit"
                        onClick={() => verseEditorOpen === index ? closeVerseEditor() : openVerseEditor(index)}
                        disabled={busy !== null || (recording && recordingTarget !== "verse")}
                        aria-expanded={verseEditorOpen === index}
                        aria-label={`تعديل البيت رقم ${index + 1}`}
                      >
                        <PenLine size={15} />
                        {verseEditorOpen === index ? "إغلاق التعديل" : `تعديل البيت ${index + 1}`}
                        <Mic size={15} />
                      </button>

                      {verseEditorOpen === index && (
                        <section className="verse-editor inline" aria-label={`تعديل البيت رقم ${index + 1}`}>
                          <div className="verse-editor-head">
                            <div>
                              <div className="verse-editor-kicker">البيت {index + 1}</div>
                              <h3>اكتب ملاحظتك أو سجّلها بصوتك</h3>
                              <p>حدّد الخطأ في الصدر أو العجز أو القافية، ثم اطلب التغيير الذي تريده.</p>
                            </div>
                            <button
                              type="button"
                              className="verse-editor-close"
                              onClick={closeVerseEditor}
                              disabled={busy === "revise" || busy === "verse_transcribe" || (recording && recordingTarget === "verse")}
                            >
                              إغلاق
                            </button>
                          </div>

                          <div className="verse-parts-preview">
                            <div><span>صدر البيت</span><strong>{verse.sadr}</strong></div>
                            <div><span>عجز البيت</span><strong>{verse.ajz}</strong></div>
                            <div className="verse-rhyme-preview">
                              <span>القافية والروي</span>
                              <strong>{poem.ajz_rhyme} · الروي {poem.rawi}</strong>
                            </div>
                          </div>

                          <label className="verse-editor-field verse-focus-field">
                            <span>ما الذي تريد تعديله؟</span>
                            <select
                              value={verseEditFocus}
                              onChange={(event) => {
                                setVerseEditFocus(event.target.value as VerseEditFocus);
                                setVerseCurrentText("");
                                setVerseReplacementText("");
                                setVerseEditSuccess("");
                              }}
                            >
                              {(Object.keys(verseEditFocusLabels) as VerseEditFocus[]).map((focus) => (
                                <option key={focus} value={focus}>{verseEditFocusLabels[focus]}</option>
                              ))}
                            </select>
                          </label>

                          {(verseEditFocus === "word" || verseEditFocus === "name") && (
                            <div className="verse-editor-grid">
                              <label className="verse-editor-field">
                                <span>{verseEditFocus === "name" ? "الاسم الحالي" : "المفردة الحالية"}</span>
                                <input
                                  value={verseCurrentText}
                                  onChange={(event) => {
                                    setVerseCurrentText(event.target.value);
                                    setVerseEditSuccess("");
                                  }}
                                  maxLength={56}
                                  placeholder="اكتب النص الموجود في البيت"
                                />
                              </label>
                              <label className="verse-editor-field">
                                <span>{verseEditFocus === "name" ? "الاسم البديل" : "المفردة البديلة"}</span>
                                <input
                                  value={verseReplacementText}
                                  onChange={(event) => {
                                    setVerseReplacementText(event.target.value);
                                    setVerseEditSuccess("");
                                  }}
                                  maxLength={56}
                                  placeholder="اكتب البديل الذي تريده"
                                />
                              </label>
                            </div>
                          )}

                          <div className="verse-editor-field verse-editor-note">
                            <span>ملاحظتك على هذا البيت</span>
                            <div className="verse-note-input">
                              <textarea
                                aria-label={`ملاحظتك على البيت رقم ${index + 1}`}
                                value={verseEditNote}
                                onChange={(event) => {
                                  setVerseEditNote(event.target.value);
                                  setVerseEditSuccess("");
                                }}
                                maxLength={160}
                                placeholder="مثال: هذا العجز مكسور، عدّل وزنه. أو: غيّر هذه المفردة مع الحفاظ على القافية."
                              />
                              <button
                                type="button"
                                className={`verse-note-mic ${recording && recordingTarget === "verse" ? "recording" : ""}`}
                                onClick={() => void startRecording("verse")}
                                disabled={busy !== null || (recording && recordingTarget !== "verse")}
                                aria-label={recording && recordingTarget === "verse" ? "إيقاف تسجيل الملاحظة" : "تسجيل ملاحظة صوتية"}
                              >
                                {busy === "verse_transcribe" ? <LoadingDots /> : recording && recordingTarget === "verse" ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
                                <span>
                                  {busy === "verse_transcribe"
                                    ? "نحوّل الملاحظة إلى نص"
                                    : recording && recordingTarget === "verse"
                                      ? `إيقاف التسجيل • ${formatDuration(recordSeconds)}`
                                      : "سجّل ملاحظتك"}
                                </span>
                              </button>
                            </div>
                          </div>

                          {verseEditError && <div className="verse-editor-error">{verseEditError}</div>}
                          {verseEditSuccess && (
                            <div className="verse-editor-success" role="status">
                              <Check size={16} />
                              <span>{verseEditSuccess}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            className="primary-button verse-editor-submit"
                            onClick={() => void applyVerseEdit()}
                            disabled={busy !== null || (recording && recordingTarget === "verse")}
                          >
                            {busy === "revise" ? <LoadingDots /> : <PenLine size={17} />}
                            {busy === "revise" ? "نعدّل البيت" : "طبّق الملاحظة على هذا البيت"}
                          </button>
                        </section>
                      )}
                    </div>
                  ))}
                </div>

                <div className="audit-grid">
                  <div className="audit-item">
                    <div className="audit-title">
                      <AudioLines size={14} />
                      فحص الإيقاع
                    </div>
                    <div className="audit-copy">{poem.meter_check}</div>
                  </div>
                  <div className="audit-item">
                    <div className="audit-title">
                      <Scale size={14} />
                      فحص القافية
                    </div>
                    <div className="audit-copy">{poem.rhyme_check}</div>
                  </div>
                  <div className="audit-item">
                    <div className="audit-title">
                      <ShieldCheck size={14} />
                      الأصالة
                    </div>
                    <div className="audit-copy">{poem.originality_check}</div>
                  </div>
                  <div className="audit-item">
                    <div className="audit-title">
                      <Feather size={14} />
                      قوة البيت الأخير
                    </div>
                    <div className="audit-copy">
                      {poem.quality_report?.last_line_score ?? "—"}/100
                      {poem.quality_report?.last_line_notes?.[0]
                        ? ` · ${poem.quality_report.last_line_notes[0]}`
                        : " · خاتمة مرتبطة بمسار القصيدة."}
                    </div>
                  </div>
                </div>

                <section className="poem-tools" aria-label="أدوات القصيدة">
                  <div className="poem-tools-head">
                    <div>
                      <span>الاستماع والمشاركة</span>
                      <h3>حوّل القصيدة إلى تجربة قابلة للمشاركة</h3>
                    </div>
                    <Route size={22} aria-hidden="true" />
                  </div>
                  <div className="poem-tools-grid">
                    <button type="button" onClick={listenToPoem}>
                      <Volume2 size={19} />
                      <span><strong>استمع للقصيدة</strong><small>إلقاء تجريبي بصوت الجهاز</small></span>
                    </button>
                    <button type="button" onClick={downloadPoemCard}>
                      <FileImage size={19} />
                      <span><strong>نزّل بطاقة القصيدة</strong><small>تصميم SVG عربي عالي الدقة</small></span>
                    </button>
                    <button type="button" onClick={() => void downloadShortsPlan()} disabled={shortsBusy}>
                      <Video size={19} />
                      <span><strong>{shortsBusy ? "نجهّز المشاهد" : "جهّز فيديو قصير"}</strong><small>مخطط عمودي من ستة مشاهد</small></span>
                    </button>
                  </div>
                </section>

                <div className="caveat">
                  <AlertTriangle size={16} style={{ flex: "0 0 auto", marginTop: 2 }} />
                  {poem.performance_note}
                </div>

                <div className="result-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      revisePoem(
                        "نقّح المفردات: استخدم ألفاظًا خليجية مألوفة من واقع الحكاية، واحذف كل حشو أو كلمة غريبة أو قافية جاءت بلا معنى. أبقِ البحر وعدد الأبيات والقافية كما هي.",
                      )
                    }
                    disabled={busy !== null}
                  >
                    <WandSparkles size={15} />
                    نقّح المفردات
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      revisePoem(
                        "قوِّ الخاتمة من غير تغيير عدد الأبيات: اجعلها نتيجة طبيعية لمعنى القصيدة، وابتعد عن العبارات العامة أو النهاية المعلقة.",
                      )
                    }
                    disabled={busy !== null}
                  >
                    <RefreshCw size={15} />
                    قوِّ الخاتمة
                  </button>
                  <button type="button" className="ghost-button" onClick={reset}>
                    <RefreshCw size={15} />
                    ابدأ قصة جديدة
                  </button>
                  <Link className="secondary-button" href="/archive">
                    <Archive size={15} />
                    عرض أرشيفي
                  </Link>
                  {busy === "revise" && <LoadingDots />}
                </div>
              </section>
            )}
          </div>

          <aside className="side-column">
            <div className="card side-card">
              <div className="side-heading">
                <MessageCircleQuestion size={18} />
                ماذا يحدث بعد قصتك؟
              </div>
              <div className="process-list">
                <div className="process-item">
                  <div className="process-icon"><Brain size={17} /></div>
                  <div>
                    <div className="process-title">فهم المعنى والشعور</div>
                    <div className="process-desc">نستخرج الحدث، المقصد، النبرة، وما يجب ألّا يُفقد.</div>
                  </div>
                </div>
                <div className="process-item">
                  <div className="process-icon"><MessageCircleQuestion size={17} /></div>
                  <div>
                    <div className="process-title">أسئلة تخص قصتك</div>
                    <div className="process-desc">نسأل عن المرسل إليه والنهاية واللهجة بدل افتراضها.</div>
                  </div>
                </div>
                <div className="process-item">
                  <div className="process-icon"><Scale size={17} /></div>
                  <div>
                    <div className="process-title">اختيار البناء الشعري</div>
                    <div className="process-desc">نحدّد البحر والقافيتين والروي قبل كتابة البيت الأول.</div>
                  </div>
                </div>
                <div className="process-item">
                  <div className="process-icon"><ShieldCheck size={17} /></div>
                  <div>
                    <div className="process-title">كتابة ثم مراجعة</div>
                    <div className="process-desc">نراجع المعنى والقافية والإيقاع ونوضح حدود الفحص الآلي.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card side-card reference-card">
              <div className="side-heading">
                <Library size={18} />
                المرجع الشعري
              </div>
              <p className="reference-copy">
                مكتبة مرجعية تجمع مصادر للبحور والأوزان والأداء الحي. نستخدم القواعد
                المختصرة للبناء والمراجعة، ولا ننسخ كتبًا أو أبياتًا محمية.
              </p>
              <div className="stats-row">
                <div className="stat"><strong>١١</strong><span>مرجعًا محلّلًا</span></div>
                <div className="stat"><strong>١٣</strong><span>بحرًا ولونًا</span></div>
                <div className="stat"><strong>٣٢</strong><span>قاعدة محورية</span></div>
              </div>
            </div>

          </aside>
        </section>
      </main>

      <footer className="page-wrap footer">
        <p className="footer-rights">حقوق المحتوى محفوظة © 2026</p>
        <nav className="footer-contact-links" aria-label="وسائل التواصل">
          <a
            className="footer-contact-link"
            href="mailto:saad.alraedan@gmail.com"
            aria-label="راسلنا عبر البريد الإلكتروني"
          >
            <Mail size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>البريد الإلكتروني</span>
          </a>
          <a
            className="footer-contact-link"
            href="https://wa.me/96551231313"
            target="_blank"
            rel="noreferrer"
            aria-label="تواصل معنا عبر واتساب"
          >
            <MessageCircle size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>واتساب</span>
          </a>
        </nav>
      </footer>
    </div>
  );
}
