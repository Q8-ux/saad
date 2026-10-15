export const EVENT = Object.freeze({
  title: 'حفل زفاف حمد — أفراح الماضي',
  groom: 'حمد',
  family: 'عائلة الماضي',
  hosts: 'ناصر ماضي راضي الشمري وإخوانه',
  date: '2026-10-20',
  timeLabel: 'مساءً',
  timeZone: 'Asia/Kuwait',
  venue: 'ديوان الماضي',
  address: 'منطقة سعد العبدالله، قطعة 8، شارع 24، مقابل المعسكر، الكويت',
  sourceQrUrl: 'https://q.me-qr.com/4vy1rdpc',
  latitude: 29.3181267,
  longitude: 47.7118721,
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=29.3181267%2C47.7118721',
  publicUrl: 'https://q8-ux.github.io/saad/hamad-wedding/',
  contacts: Object.freeze(['65505654', '99732147', '50168888', '66002205']),
});

export function whatsappUrl(phone, message = '') {
  if (!EVENT.contacts.includes(phone)) throw new RangeError('اختر أحد أرقام العائلة');
  const base = `https://wa.me/965${phone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function daysToEvent(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  const today = Date.UTC(+part('year'), +part('month') - 1, +part('day'));
  const eventDate = Date.parse(`${EVENT.date}T00:00:00Z`);
  return Math.round((eventDate - today) / 86400000);
}

export function countdownText(now) {
  const days = daysToEvent(now);
  if (days < 0) return 'دامت الأفراح… وشكرًا لكل من شاركنا فرحتنا';
  if (days === 0) return 'اليوم فرحتنا… حياكم الله مساءً';
  if (days === 1) return 'غدًا نلتقي… حياكم الله';
  if (days === 2) return 'باقي يومان على ليلة الفرح';
  const number = new Intl.NumberFormat('ar-KW').format(days);
  return days <= 10 ? `باقي ${number} أيام على ليلة الفرح` : `باقي ${number} يومًا على ليلة الفرح`;
}

export function shareText() {
  return 'أفراح الماضي ✨\nتتشرف عائلة الماضي بدعوتكم لحضور حفل زفاف حمد\nالثلاثاء 20 أكتوبر 2026 مساءً\nديوان الماضي — سعد العبدالله\nبحضوركم يتم الفرح والسرور\n' + EVENT.publicUrl;
}

