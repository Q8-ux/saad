'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'ar' | 'en';

type Dictionary = Record<string, { ar: string; en: string }>;

const dictionary: Dictionary = {
  platformName: { ar: 'منصة نطاق العمل', en: 'Work Scope Platform' },
  welcome: { ar: 'مرحبًا بك', en: 'Welcome' },
  dashboardIntro: { ar: 'إدارة الحضور والانتقالات والطوارئ والتحليل الذكي من مكان واحد.', en: 'Manage attendance, transfers, emergencies, and AI analysis from one place.' },
  currentStatus: { ar: 'الحالة الحالية', en: 'Current status' },
  insideStation: { ar: 'داخل المنشأة', en: 'Inside facility' },
  notRegistered: { ar: 'غير مسجل حاليًا', en: 'Not currently checked in' },
  smartAttendance: { ar: 'الحضور الذكي', en: 'Smart Attendance' },
  smartAttendanceDesc: { ar: 'تسجيل دخول أو خروج بالنطاق الجغرافي', en: 'Check in or out using geofencing' },
  transfers: { ar: 'الانتقالات', en: 'Transfers' },
  transfersDesc: { ar: 'طلب ومتابعة تصاريح الانتقال', en: 'Request and track transfer permits' },
  emergency: { ar: 'الطوارئ', en: 'Emergency' },
  emergencyDesc: { ar: 'نقاط التجمع والملاجئ والحوادث', en: 'Assembly points, shelters, and incidents' },
  aiCenter: { ar: 'مركز الذكاء الاصطناعي', en: 'AI Center' },
  aiCenterDesc: { ar: 'أدوات متخصصة لكل قسم', en: 'Specialized tools for each department' },
  notifications: { ar: 'التنبيهات', en: 'Notifications' },
  notificationsDesc: { ar: 'التطبيق وواتساب والبريد', en: 'App, WhatsApp, and email alerts' },
  quickOverview: { ar: 'نظرة سريعة', en: 'Quick overview' },
  live: { ar: 'مباشر', en: 'Live' },
  employees: { ar: 'الموظفون', en: 'Employees' },
  attendanceMovements: { ar: 'حركات الحضور', en: 'Attendance records' },
  needsReview: { ar: 'تحتاج مراجعة', en: 'Needs review' },
  executiveReport: { ar: 'التقرير التنفيذي الذكي', en: 'AI Executive Report' },
  executiveReportDesc: { ar: 'ملخص اليوم والمخاطر والقرارات المطلوبة.', en: 'Daily summary, risks, and required decisions.' },
  generateReport: { ar: 'إنشاء التقرير', en: 'Generate report' },
  analyzing: { ar: 'جارٍ التحليل...', en: 'Analyzing...' },
  findings: { ar: 'الملاحظات', en: 'Findings' },
  recommendations: { ar: 'التوصيات', en: 'Recommendations' },
  requiresApproval: { ar: 'يتطلب اعتماد المسؤول.', en: 'Requires manager approval.' },
  recentMovements: { ar: 'آخر الحركات', en: 'Recent activity' },
  employee: { ar: 'الموظف', en: 'Employee' },
  facility: { ar: 'المنشأة', en: 'Facility' },
  movement: { ar: 'الحركة', en: 'Movement' },
  decision: { ar: 'القرار', en: 'Decision' },
  risk: { ar: 'المخاطر', en: 'Risk' },
  time: { ar: 'التوقيت', en: 'Time' },
  home: { ar: 'الرئيسية', en: 'Home' },
  attendance: { ar: 'الحضور', en: 'Attendance' },
  transfer: { ar: 'الانتقال', en: 'Transfer' },
  profile: { ar: 'حسابي', en: 'Profile' },
  back: { ar: 'العودة', en: 'Back' },
  smartTransfers: { ar: 'الانتقالات الذكية', en: 'Smart Transfers' },
  smartTransfersDesc: { ar: 'طلب واعتماد الانتقال بين المنشآت ومتابعة حالة الرحلة.', en: 'Request and approve transfers between facilities and track trip status.' },
  aiTransfers: { ar: 'تحليل الانتقالات بالذكاء الاصطناعي', en: 'AI Transfer Analysis' },
  aiTransfersDesc: { ar: 'يفحص التصاريح النشطة والمنتهية وحالات التأخير والمسافات.', en: 'Analyzes active and expired permits, delays, and distances.' },
  analyzePermits: { ar: 'تحليل التصاريح الآن', en: 'Analyze permits now' },
  transferRequest: { ar: 'طلب تصريح انتقال', en: 'Transfer permit request' },
  fromFacility: { ar: 'من المنشأة', en: 'From facility' },
  toFacility: { ar: 'إلى المنشأة', en: 'To facility' },
  transferReason: { ar: 'سبب الانتقال', en: 'Transfer reason' },
  permitStart: { ar: 'بداية التصريح', en: 'Permit start' },
  permitEnd: { ar: 'نهاية التصريح', en: 'Permit end' },
  expectedDuration: { ar: 'المدة المتوقعة بالدقائق', en: 'Expected duration in minutes' },
  submitTransfer: { ar: 'إرسال طلب التصريح', en: 'Submit permit request' },
  permitStatus: { ar: 'حالة التصاريح', en: 'Permit status' },
  noPermits: { ar: 'لا توجد تصاريح انتقال.', en: 'No transfer permits found.' },
  language: { ar: 'English', en: 'العربية' },
};

type ContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof typeof dictionary) => string;
  isRtl: boolean;
};

const LanguageContext = createContext<ContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');

  useEffect(() => {
    const saved = window.localStorage.getItem('platform-language');
    if (saved === 'ar' || saved === 'en') setLanguageState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem('platform-language', language);
  }, [language]);

  const value = useMemo<ContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key) => dictionary[key][language],
    isRtl: language === 'ar',
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <button
      type="button"
      className="languageSwitcher"
      onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
      aria-label="Switch language"
    >
      {t('language')}
    </button>
  );
}
