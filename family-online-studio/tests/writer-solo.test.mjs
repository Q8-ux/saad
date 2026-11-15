import assert from 'node:assert/strict';
import test from 'node:test';
import { availableWriterSoloScopes, buildWriterSoloExport, readWriterSoloDraft, writingRules } from '../assets/writer-solo.mjs';

const script = {
  kind: 'series', title: 'نافذة & شارع', author: 'كاتب تجريبي', notes: 'ملاحظات داخلية',
  comments: [{ text: 'تعليق داخل الاستوديو' }],
  units: [{ id: 'u1', title: 'الحلقة الأولى' }, { id: 'u2', title: 'الحلقة الثانية' }],
  characters: [{ id: 'c1', name: 'ليلى' }],
  scenes: [
    { id: 's1', unitId: 'u1', time: 'مساء', location: 'الردهة', title: 'الوصول', blocks: [
      { type: 'action', text: 'تظهر رسالة SMS الساعة ٨:٣٠.' },
      { type: 'dialogue', characterId: 'c1', text: 'أخلي الظرف هني، ولا أنطرج؟ <متابعة>' },
      { type: 'transition', text: 'قطع' },
    ] },
    { id: 's2', unitId: 'u2', time: 'صباح', location: 'المكتبة', title: 'البداية', blocks: [
      { type: 'dialogue', label: 'صوت بعيد', text: 'مرّوا الساعة تسع.' },
      { type: 'dialogue', text: 'من هناك؟' },
    ] },
  ],
};

test('series exports the chosen episode with scene number, Arabic dialogue and escaped XML', () => {
  assert.deepEqual(availableWriterSoloScopes(script, 's1').map(item => item.value), ['all', 'unit', 'scene']);
  const result = buildWriterSoloExport(script, 's1', 'unit');
  assert.match(result.name, /الحلقة الأولى.*\.fdx$/u);
  assert.match(result.text, /<Paragraph Type="Scene Heading" Number="1"><Text>مساء - الردهة - الوصول<\/Text>/u);
  assert.match(result.text, /<Text>ليلى<\/Text>/u);
  assert.match(result.text, /أخلي الظرف هني، ولا أنطرج؟ &lt;متابعة&gt;/u);
  assert.match(result.text, /نافذة &amp; شارع/u);
  assert.doesNotMatch(result.text, /الحلقة الثانية|ملاحظات داخلية|تعليق داخل الاستوديو/u);
  assert.throws(() => buildWriterSoloExport(script, 'missing', 'scene'), /النطاق/u);
});

test('whole stageplay keeps the act order, speakers and stage directions', () => {
  const play = structuredClone(script);
  play.kind = 'play';
  play.units[0].title = 'الفصل الأول';
  play.units[1].title = 'الفصل الثاني';
  play.scenes[0].blocks.unshift({ type: 'sound', text: '(إضاءة خافتة)' });
  const { text } = buildWriterSoloExport(play, 's1', 'all');
  assert.ok(text.indexOf('الفصل الأول') < text.indexOf('الفصل الثاني'));
  assert.match(text, /<Paragraph Type="New Act"><Text>الفصل الأول<\/Text>/u);
  assert.match(text, /إضاءة خافتة/u);
  assert.match(text, /<Paragraph Type="Character"><Text>صوت بعيد<\/Text>/u);
  assert.match(text, /<Paragraph Type="Character"><Text>متحدث غير محدد<\/Text><\/Paragraph>\n<Paragraph Type="Dialogue"><Text>من هناك؟/u);
});

test('book export contains the selected texts or the complete book without scholarly notes', () => {
  const book = {
    kind: 'book', title: 'A Writing Book', subtitle: 'Ideas & Craft', author: 'Sample Writer', edition: 'Draft',
    parts: [{ title: 'Part One', from: 1, to: 3 }], notes: 'Keep private',
    frontMatter: [{ id: 'intro', title: 'Introduction', blocks: [{ text: 'An opening.' }] }],
    chapters: [{ id: 'rule1', number: 1, title: 'First chapter', notes: 'Keep private', blocks: [{ text: 'أول فقرة.' }, { text: 'Second paragraph.' }] }],
  };
  assert.deepEqual(availableWriterSoloScopes(book, 'rule1').map(item => item.value), ['all', 'section']);
  const full = buildWriterSoloExport(book, 'rule1', 'all');
  assert.match(full.name, /\.txt$/u);
  assert.match(full.text, /Introduction\n\nAn opening\.\n\nPart One\n\n1\. First chapter/u);
  assert.doesNotMatch(full.text, /Keep private/u);
  const section = buildWriterSoloExport(book, 'rule1', 'section');
  assert.match(section.text, /أول فقرة\./u);
  assert.doesNotMatch(section.text, /Introduction|Part One/u);
  assert.equal(readWriterSoloDraft('\uFEFFFirst\r\nSecond\r\n', 'chapter.txt', 'book'), 'First\nSecond\n');
  assert.throws(() => readWriterSoloDraft('abc', 'chapter.pdf', 'book'), /الصيغة/u);
  assert.throws(() => readWriterSoloDraft('<!DOCTYPE test>', 'test.fdx', 'play'), /غير مدعومة/u);
  assert.match(writingRules('book').join(' '), /للكتاب المعرفي/u);
});
