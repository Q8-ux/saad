(() => {
  "use strict";

  const appOrigin = "https://abyat-alshier.centrino.chatgpt.site";
  const frame = document.querySelector(".site-frame");
  const loader = document.querySelector(".loading-shell");
  const retryButton = document.querySelector(".retry");
  const route = document.body.dataset.appPath || "/";
  const audioBridgeChannel = "ant-alshaer-audio";
  const maxAudioBytes = 800 * 1024;
  const recorderBitrate = 24_000;
  let activeRecorder = null;
  let activeStream = null;
  let audioChunks = [];
  let audioBytes = 0;
  let recordingStartedAt = 0;
  let stoppedForSize = false;

  if (!(frame instanceof HTMLIFrameElement)) return;

  const sendToApp = (message, transfer = []) => {
    frame.contentWindow?.postMessage(
      { channel: audioBridgeChannel, ...message },
      appOrigin,
      transfer,
    );
  };

  const stopTracks = () => {
    activeStream?.getTracks().forEach((track) => track.stop());
    activeStream = null;
  };

  const stopParentRecording = () => {
    if (activeRecorder?.state === "recording") activeRecorder.stop();
  };

  const recorderMimeType = () => {
    if (typeof MediaRecorder?.isTypeSupported !== "function") return undefined;
    return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    );
  };

  const createRecorder = (stream, mimeType) => {
    const options = {
      audioBitsPerSecond: recorderBitrate,
      ...(mimeType ? { mimeType } : {}),
    };
    try {
      return new MediaRecorder(stream, options);
    } catch {
      return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    }
  };

  const startParentRecording = async () => {
    if (activeRecorder?.state === "recording") {
      sendToApp({ type: "recording-started" });
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      sendToApp({
        type: "recording-error",
        message: "المتصفح الحالي لا يسمح بالتسجيل المباشر. استخدم خيار تسجيل أو اختيار ملف صوتي.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = recorderMimeType();
      const recorder = createRecorder(stream, mimeType);
      activeStream = stream;
      activeRecorder = recorder;
      audioChunks = [];
      audioBytes = 0;
      stoppedForSize = false;
      recordingStartedAt = Date.now();

      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        if (audioBytes + event.data.size > maxAudioBytes) {
          stoppedForSize = true;
          stopParentRecording();
          return;
        }
        audioChunks.push(event.data);
        audioBytes += event.data.size;
      };

      recorder.onerror = () => {
        stopTracks();
        activeRecorder = null;
        sendToApp({
          type: "recording-error",
          message: "تعذّر إكمال التسجيل. استخدم خيار تسجيل أو اختيار ملف صوتي.",
        });
      };

      recorder.onstop = async () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000));
        const blob = new Blob(audioChunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        stopTracks();
        activeRecorder = null;
        audioChunks = [];
        audioBytes = 0;
        if (!blob.size) {
          sendToApp({ type: "recording-error", message: "التسجيل فارغ. أعد المحاولة وتحدث بعد ظهور علامة التسجيل." });
          return;
        }
        const audioBuffer = await blob.arrayBuffer();
        sendToApp(
          {
            type: "recording-complete",
            audioBuffer,
            mimeType: blob.type,
            durationSeconds,
            stoppedForSize,
          },
          [audioBuffer],
        );
      };

      recorder.start(1000);
      sendToApp({ type: "recording-started" });
    } catch (error) {
      stopTracks();
      activeRecorder = null;
      const errorName = error instanceof DOMException ? error.name : "";
      sendToApp({
        type: "recording-error",
        message:
          errorName === "NotAllowedError" || errorName === "SecurityError"
            ? "إذن الميكروفون مرفوض. اسمح به من إعدادات المتصفح أو استخدم خيار الملف الصوتي."
            : "لم نتمكن من تشغيل الميكروفون. استخدم خيار تسجيل أو اختيار ملف صوتي.",
      });
    }
  };

  const loadApp = () => {
    const target = new URL(route, appOrigin);
    target.search = window.location.search;
    target.hash = window.location.hash;
    frame.src = target.toString();
  };

  frame.addEventListener("load", () => {
    if (loader instanceof HTMLElement) loader.hidden = true;
  });

  retryButton?.addEventListener("click", () => {
    if (loader instanceof HTMLElement) {
      loader.hidden = false;
      loader.classList.remove("is-slow");
    }
    stopParentRecording();
    frame.src = "about:blank";
    window.setTimeout(loadApp, 60);
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== appOrigin || event.source !== frame.contentWindow) return;
    if (event.data?.channel !== audioBridgeChannel) return;
    if (event.data.type === "start-recording") void startParentRecording();
    if (event.data.type === "stop-recording") stopParentRecording();
  });

  window.addEventListener("pagehide", () => {
    stopParentRecording();
    stopTracks();
  });

  window.setTimeout(() => loader?.classList.add("is-slow"), 7000);
  loadApp();
})();
