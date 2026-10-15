export const EVENT = Object.freeze({
  title: 'حفل زفاف حمد — أفراح الماضي',
  groom: 'حمد',
  family: 'عائلة الماضي',
  hosts: 'ناصر ماضي راضي الشمري وإخوانه',
  date: '2026-10-20',
  nextDate: '2026-10-21',
  timeLabel: 'مساءً',
  timeZone: 'Asia/Kuwait',
  venue: 'ديوان الماضي',
  address: 'منطقة سعد العبدالله، قطعة 8، شارع 24، مقابل المعسكر، الكويت',
  sourceQrUrl: 'https://q.me-qr.com/4vy1rdpc',
  latitude: 29.3181267,
  longitude: 47.7118721,
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=29.3181267%2C47.7118721',
  publicUrl: 'https://q8-ux.github.io/saad/hamad-wedding/',
  contacts: Object.freeze(['65005654', '99732147', '50168888', '66002205']),
});

export function whatsappUrl(phone, message = '') {
  if (!EVENT.contacts.includes(phone)) throw new RangeError('اختر أحد أرقام العائلة');
  const base = `https://wa.me/965${phone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function replyMessage({ name, response, count = 1 }) {
  const guest = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!guest) throw new TypeError('يرجى كتابة اسمك الكريم');
  const status = {
    going: 'بإذن الله سأحضر وأشارككم فرحتكم.',
    maybe: 'يسعدني استقبال دعوتكم، وسأؤكد حضوري لاحقًا.',
    declined: 'أعتذر عن الحضور، وأبارك لكم هذا الزواج المبارك.',
  }[response];
  if (!status) throw new TypeError('يرجى اختيار ردّك على الدعوة');
  const total = Number(count);
  if (response === 'going' && (!Number.isInteger(total) || total < 1 || total > 20)) {
    throw new RangeError('يرجى اختيار عدد حضور بين 1 و20');
  }
  return [
    'السلام عليكم،', `معكم ${guest}.`,
    'بخصوص دعوة زفاف حمد يوم الثلاثاء 20 أكتوبر 2026 مساءً في ديوان الماضي،',
    status, response === 'going' ? `عدد الحضور بما فيهم أنا: ${total}.` : '',
    'بارك الله لهما وبارك عليهما وجمع بينهما في خير.',
  ].filter(Boolean).join('\n');
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

export function googleCalendarUrl() {
  const details = [
    `${EVENT.family} — ${EVENT.hosts}`,
    'مساء الثلاثاء 20 أكتوبر 2026، بتوقيت الكويت. ساعة البداية لم تُحدَّد في البطاقة الأصلية.',
    'نعتذر عن قبول العانية.', `الموقع: ${EVENT.mapUrl}`, `الدعوة: ${EVENT.publicUrl}`,
  ].join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: EVENT.title, dates: '20261020/20261021',
    ctz: EVENT.timeZone, location: `${EVENT.venue}، ${EVENT.address}`, details,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function shareText() {
  return 'أفراح الماضي ✨\nتتشرف عائلة الماضي بدعوتكم لحضور حفل زفاف حمد\nالثلاثاء 20 أكتوبر 2026 مساءً\nديوان الماضي — سعد العبدالله\nبحضوركم يتم الفرح والسرور\n' + EVENT.publicUrl;
}

function foldIcsLine(line) {
  const result = [];
  let current = '';
  let size = 0;
  for (const character of line) {
    const length = new TextEncoder().encode(character).length;
    if (size + length > 75) { result.push(current); current = ' '; size = 1; }
    current += character;
    size += length;
  }
  result.push(current);
  return result.join('\r\n');
}

export function calendarIcs() {
  const escape = value => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const description = `${EVENT.family} — ${EVENT.hosts}\nمساء الثلاثاء 20 أكتوبر 2026 بتوقيت الكويت. ساعة البداية غير محددة في البطاقة الأصلية.\nنعتذر عن قبول العانية.\nالموقع: ${EVENT.mapUrl}\nالدعوة: ${EVENT.publicUrl}`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Al Madi//Hamad Wedding//AR',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-TIMEZONE:Asia/Kuwait',
    'BEGIN:VEVENT', 'UID:hamad-almadi-20261020@q8-ux.github.io',
    'DTSTAMP:20261015T185319Z', `DTSTART;VALUE=DATE:${EVENT.date.replaceAll('-', '')}`,
    `DTEND;VALUE=DATE:${EVENT.nextDate.replaceAll('-', '')}`, `SUMMARY:${escape(EVENT.title)}`,
    `LOCATION:${escape(`${EVENT.venue}، ${EVENT.address}`)}`, `DESCRIPTION:${escape(description)}`,
    `GEO:${EVENT.latitude};${EVENT.longitude}`, `URL:${EVENT.publicUrl}`,
    'STATUS:CONFIRMED', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR', '',
  ].map(foldIcsLine).join('\r\n');
}
