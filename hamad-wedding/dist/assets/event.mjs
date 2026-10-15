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

export function shareText() {
  return 'أفراح الماضي ✨\nتتشرف عائلة الماضي بدعوتكم لحضور حفل زفاف حمد\nالثلاثاء 20 أكتوبر 2026 مساءً\nديوان الماضي — سعد العبدالله\nبحضوركم يتم الفرح والسرور\n' + EVENT.publicUrl;
}

