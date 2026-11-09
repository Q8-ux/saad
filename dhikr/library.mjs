export const SECTIONS = [
  { id: 'fatiha', title: 'سورة الفاتحة', subtitle: 'السورة كاملة · ٧ آيات', surah: 1, from: 1, to: 7, repeat: 7 },
  { id: 'baqara-start', title: 'بداية سورة البقرة', subtitle: 'سورة البقرة · الآيات ١–٥', surah: 2, from: 1, to: 5, repeat: 1 },
  { id: 'baqara-16', title: 'من سورة البقرة', subtitle: 'سورة البقرة · الآيات ١٦–٣٠', surah: 2, from: 16, to: 30, repeat: 1 },
  { id: 'imran', title: 'بداية سورة آل عمران', subtitle: 'سورة آل عمران · الآيات ١–٥', surah: 3, from: 1, to: 5, repeat: 1 },
  { id: 'kursi', title: 'آية الكرسي', subtitle: 'سورة البقرة · الآية ٢٥٥', surah: 2, from: 255, to: 255, repeat: 5 },
  { id: 'baqara-end', title: 'خواتيم سورة البقرة', subtitle: 'سورة البقرة · الآيتان ٢٨٥–٢٨٦', surah: 2, from: 285, to: 286, repeat: 1 },
  { id: 'saffat', title: 'بداية سورة الصافات', subtitle: 'سورة الصافات · الآيات ١–٥', surah: 37, from: 1, to: 5, repeat: 1 },
  { id: 'mulk', title: 'بداية سورة الملك', subtitle: 'سورة الملك · الآيات ١–٥', surah: 67, from: 1, to: 5, repeat: 1 },
  { id: 'zalzalah', title: 'سورة الزلزلة', subtitle: 'السورة كاملة · ٨ آيات', surah: 99, from: 1, to: 8, repeat: 1 },
  { id: 'kafirun', title: 'سورة الكافرون', subtitle: 'السورة كاملة · ٦ آيات', surah: 109, from: 1, to: 6, repeat: 3 },
  { id: 'ikhlas', title: 'سورة الإخلاص', subtitle: 'السورة كاملة · ٤ آيات', surah: 112, from: 1, to: 4, repeat: 3 },
  { id: 'falaq', title: 'سورة الفلق', subtitle: 'السورة كاملة · ٥ آيات', surah: 113, from: 1, to: 5, repeat: 3 },
  { id: 'nas', title: 'سورة الناس', subtitle: 'السورة كاملة · ٦ آيات', surah: 114, from: 1, to: 6, repeat: 3 },
  { id: 'dua-1', title: 'بسم الله، الله أكبر', text: 'بسم الله، الله أكبر من كل عين عائنة لم تذكر الله.', repeat: 1, audio: 'assets/dua-1.mp3' },
  { id: 'dua-2', title: 'حسبنا الله ونعم الوكيل', text: 'حسبنا الله ونعم الوكيل على من آذانا بعين ولم يذكر الله ولم يتب من ذلك.', repeat: 1, audio: 'assets/dua-2.mp3' },
  { id: 'dua-3', title: 'من كل نفس حاسدة', text: 'حسبنا الله ونعم الوكيل على من آذانا بنفس خبيثة حاسدة.', repeat: 1, audio: 'assets/dua-3.mp3' },
  { id: 'dua-4', title: 'الاستعانة بالله', text: 'حسبنا الله ونعم الوكيل على من آذانا بسحر.', repeat: 1, audio: 'assets/dua-4.mp3' },
  { id: 'dua-5', title: 'الاستعاذة من الشياطين', text: 'حسبنا الله ونعم الوكيل على من آذانا من مس الشياطين.', repeat: 1, audio: 'assets/dua-5.mp3' },
  { id: 'dua-6', title: 'على كل عين عائنة', text: 'بسم الله، الله أكبر على كل عين عائنة.', repeat: 1, audio: 'assets/dua-6.mp3' },
  { id: 'dua-7', title: 'دعاء الختام', text: 'بسم الله، الله أكبر نبطل بها كل عين عائنة من الإنس ومن الجن من الرجال ومن النساء من الأقارب ومن الغرباء.', repeat: 1, audio: 'assets/dua-7.mp3' },
].map(section => ({ ...section, type: section.surah ? 'quran' : 'dua' }));

export const BAQARA_FULL = {id:'baqara-full',title:'سورة البقرة كاملة',subtitle:'سورة البقرة · ٢٨٦ آية',surah:2,from:1,to:286,repeat:1,type:'quran',inWird:false};
export const ALL_SECTIONS = [...SECTIONS, BAQARA_FULL];

export const AUDIO_BASES = [
  'https://everyayah.com/data/MaherAlMuaiqly128kbps/',
  'https://verse.mp3quran.net/data/MaherAlMuaiqly128kbps/',
];

export const arabic = number => new Intl.NumberFormat('ar-KW', {useGrouping: false}).format(number);
export const repeatTarget = (section, overrides = {}) => {
  const value = Number(overrides[section.id]);
  return Number.isInteger(value) && value >= 1 && value <= 20 ? value : section.repeat;
};
export const audioFilename = (surah, ayah) => `${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;

export function tracksFor(section) {
  if (section.type === 'dua') return [{ key: section.id, sources: [section.audio] }];
  const tracks = [];
  if (section.from === 1 && section.surah !== 1) {
    tracks.push({key: 'basmala', sources: AUDIO_BASES.map(base => base + audioFilename(section.surah, 0))});
  }
  for (let ayah = section.from; ayah <= section.to; ayah++) {
    tracks.push({key: `${section.surah}:${ayah}`, sources: AUDIO_BASES.map(base => base + audioFilename(section.surah, ayah))});
  }
  return tracks;
}

// A cursor advances only after a complete audio track ends successfully.
export function advanceCursor(cursor, sections = SECTIONS, overrides = {}, continuous = false) {
  const section = sections[cursor.section];
  if (cursor.track + 1 < tracksFor(section).length) return {...cursor, track: cursor.track + 1, completed: false};
  if (cursor.round + 1 < repeatTarget(section, overrides)) return {...cursor, track: 0, round: cursor.round + 1, completed: true};
  if (continuous && section.inWird !== false) {
    const next=sections.findIndex((candidate,index)=>index>cursor.section && candidate.inWird!==false);
    if(next>=0) return {section:next,track:0,round:0,completed:true};
  }
  return null;
}

export function safeSaved(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const counts = {}, overrides = {};
  for (const section of ALL_SECTIONS) {
    const target = repeatTarget(section, value.overrides || {});
    if (target !== section.repeat) overrides[section.id] = target;
    const count = Number(value.counts?.[section.id]);
    if (Number.isInteger(count) && count >= 0) counts[section.id] = Math.min(count, target);
  }
  return {counts, overrides, lang:['ar','en','ur'].includes(value.lang) ? value.lang : 'ar', selected: ALL_SECTIONS.some(s => s.id === value.selected) ? value.selected : 'fatiha', theme: 'dark', font: Math.min(46, Math.max(24, Number(value.font) || 32))};
}
