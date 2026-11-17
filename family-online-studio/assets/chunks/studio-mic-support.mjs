// Pure microphone capability helpers for the studio's in-field voice dialog.
// Do not request the microphone except inside the user's explicit button action.
export function microphoneFailureMessage(error) {
  switch (String(error?.name || '')) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'المتصفح منع الميكروفون. افتح أذونات هذا الموقع واسمح بالميكروفون، ثم حاول مجددًا. إذا كنت داخل متصفح تطبيق آخر، افتح الموقع في Chrome.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'الميكروفون مشغول أو لم يبدأ. أغلق التسجيل الصوتي أو المكالمة في التطبيقات الأخرى ثم جرّب مجددًا، أو ارفع تسجيلًا.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'لم يجد المتصفح ميكروفونًا متاحًا. تأكد من ميكروفون الهاتف أو استخدم رفع تسجيل صوتي.';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'تعذر تشغيل الميكروفون بالإعدادات المطلوبة. جرّب مرة أخرى أو ارفع تسجيلًا صوتيًا.';
    case 'AbortError':
      return 'أوقف الجهاز تشغيل الميكروفون أثناء البدء. أغلق البرامج التي تستخدم الصوت، ثم أعد المحاولة.';
    case 'NotSupportedError':
    case 'UnsupportedError':
      return 'التسجيل المباشر غير مدعوم في هذا المتصفح. افتح الصفحة في Chrome أو ارفع تسجيلًا صوتيًا.';
    default:
      return 'تعذر بدء التسجيل في هذا المتصفح. جرّب Chrome أو استخدم «رفع تسجيل». يمكنك أيضًا الإملاء من ميكروفون لوحة مفاتيح الهاتف داخل مربع النص.';
  }
}

export function microphoneRecordingMime(Recorder) {
  if (typeof Recorder?.isTypeSupported !== 'function') return '';
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']
    .find(type => Recorder.isTypeSupported(type)) || '';
}

export async function acquireStudioMicrophone(mediaDevices) {
  if (typeof mediaDevices?.getUserMedia !== 'function') {
    const error = new Error('Microphone API not available');
    error.name = 'UnsupportedError';
    throw error;
  }
  try {
    return await mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (error) {
    // Retry only for unsupported audio constraints. Never repeat permission prompts
    // after a denial or retry when the device is physically unavailable.
    if (error?.name !== 'OverconstrainedError' && error?.name !== 'ConstraintNotSatisfiedError') throw error;
    return mediaDevices.getUserMedia({ audio: true });
  }
}
