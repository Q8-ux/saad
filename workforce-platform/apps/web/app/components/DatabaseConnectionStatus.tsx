'use client';

import { useEffect, useState } from 'react';
import { fetchDashboardMetrics, isSupabaseConfigured, type DashboardMetrics } from '../lib/supabase';
import { useLanguage } from './LanguageProvider';

export default function DatabaseConnectionStatus() {
  const { language } = useLanguage();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [status, setStatus] = useState<'checking' | 'connected' | 'missing' | 'error'>('checking');
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('missing');
      return;
    }

    let active = true;
    fetchDashboardMetrics()
      .then(data => {
        if (!active) return;
        setMetrics(data);
        setStatus('connected');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => { active = false; };
  }, []);

  return (
    <section className={`databaseStatus databaseStatus--${status}`} aria-live="polite">
      <div>
        <strong>{status === 'connected' ? t('قاعدة البيانات متصلة', 'Database connected') : status === 'checking' ? t('جارٍ فحص قاعدة البيانات', 'Checking database') : status === 'missing' ? t('يلزم إضافة مفتاح Supabase', 'Supabase key required') : t('تعذر الاتصال بقاعدة البيانات', 'Database connection failed')}</strong>
        <span>{status === 'connected' ? t('البيانات التالية تُقرأ مباشرة من Supabase.', 'The following values are loaded directly from Supabase.') : t('تم تجهيز الكود والمخطط؛ بقيت بيانات الاتصال وتشغيل ملف SQL.', 'The integration and schema are ready; connection values and SQL execution remain.')}</span>
      </div>
      {metrics && (
        <div className="databaseStatusMetrics">
          <b>{t('الموظفون', 'Employees')}: {metrics.employees}</b>
          <b>{t('داخل المواقع', 'On site')}: {metrics.onSite}</b>
          <b>{t('الانتقالات', 'Transfers')}: {metrics.activeTransfers}</b>
          <b>{t('الحوادث', 'Incidents')}: {metrics.openIncidents}</b>
          <b>{t('المنشآت', 'Facilities')}: {metrics.facilities}</b>
        </div>
      )}
    </section>
  );
}
