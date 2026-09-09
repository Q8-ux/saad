'use strict';

function openAiError(error) {
  const status = Number(error?.status || error?.response?.status || 0);
  const code = error?.code || error?.error?.code;
  if (status === 401 || status === 403) return { status: 503, message: 'مفتاح OpenAI غير صالح أو غير مفعل في الخادم.' };
  if (status === 429 && code === 'insufficient_quota') return { status: 503, message: 'رصيد OpenAI أو حد الإنفاق للمشروع غير كافٍ. يرجى مراجعة إعدادات الفوترة في حساب الخدمة.' };
  if (status === 429) return { status: 503, message: 'تم بلوغ حد استخدام خدمة الذكاء الاصطناعي مؤقتاً. يرجى المحاولة بعد قليل.' };
  return { status: 503, message: 'تعذر تنفيذ الطلب الآن. يرجى المحاولة مجدداً.' };
}

function openAiErrorDetails(error) {
  // Do not log provider messages, request bodies or headers: they can contain secrets.
  return {
    status: Number(error?.status || error?.response?.status || 0),
    code: String(error?.code || error?.error?.code || 'unknown'),
    requestId: error?.request_id || null,
  };
}

module.exports = { openAiError, openAiErrorDetails };
