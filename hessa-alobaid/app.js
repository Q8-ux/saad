const mobileMenuToggle = document.getElementById('mobileMenuToggle');

document.querySelectorAll('.mobile-drawer a').forEach((link) => {
  link.addEventListener('click', () => {
    if (mobileMenuToggle) mobileMenuToggle.checked = false;
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenuToggle) {
    mobileMenuToggle.checked = false;
  }
});

const memoForm = document.getElementById('memoForm');
const memoResult = document.getElementById('memoResult');
const memoText = document.getElementById('memoText');

memoForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const memoType = document.getElementById('memoType')?.value || 'مذكرة قانونية';
  const caseType = document.getElementById('caseType')?.value || 'غير محدد';
  const court = document.getElementById('court')?.value || 'الجهة المختصة';
  const role = document.getElementById('role')?.value || 'مقدم المذكرة';
  const parties = document.getElementById('parties')?.value || 'الأطراف وفق بيانات القضية';
  const facts = document.getElementById('facts')?.value.trim() || '';
  const claims = document.getElementById('claims')?.value.trim() || '';
  const defenses = document.getElementById('defenses')?.value.trim() || 'تُستكمل الدفوع والأسانيد القانونية بعد المراجعة المهنية.';

  const draft = `بسم الله الرحمن الرحيم\n\nأمام ${court}\n\n${memoType}\nفي القضية: ${caseType}\n\nمقدمة من: ${role}\nضد: ${parties}\n\nأولاً: الوقائع\n${facts}\n\nثانياً: الدفوع والأسانيد\n${defenses}\n\nثالثاً: الطلبات\n${claims}\n\nولذلك\nيلتمس مقدم هذه المذكرة من الجهة الموقرة النظر في الطلبات الواردة أعلاه، مع حفظ سائر الحقوق الأخرى.\n\nوتفضلوا بقبول فائق الاحترام.\n\nتنبيه: هذه مسودة أولية تم إنشاؤها من البيانات المدخلة، ولا تُعد مذكرة قانونية نهائية قبل مراجعتها واعتمادها من محامٍ مختص.`;

  if (memoText && memoResult) {
    memoText.textContent = draft;
    memoResult.classList.remove('hidden');
    memoResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  localStorage.setItem('hessaMemoDraft', draft);
});

document.getElementById('copyMemo')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(memoText?.textContent || '');
    alert('تم نسخ المسودة');
  } catch {
    alert('تعذر النسخ تلقائيًا');
  }
});

document.getElementById('printMemo')?.addEventListener('click', () => {
  const content = memoText?.textContent || '';
  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(`<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>المسودة القانونية</title><style>body{font-family:Tahoma,Arial,sans-serif;padding:40px;line-height:2;white-space:pre-wrap}</style></head><body>${content.replaceAll('\n', '<br>')}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
});

document.getElementById('consultationForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  alert('تم استلام طلبك في النسخة التجريبية. يلزم ربط النموذج بقاعدة بيانات أو بريد إلكتروني قبل النشر الرسمي.');
  event.currentTarget.reset();
});

const savedDraft = localStorage.getItem('hessaMemoDraft');
if (savedDraft && memoText && memoResult) {
  memoText.textContent = savedDraft;
  memoResult.classList.remove('hidden');
}
