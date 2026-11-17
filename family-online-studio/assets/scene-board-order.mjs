// A scene's ONLY authoritative number is its 1-based position in doc.scenes.
// Never save a second scene number in its title. Do not mutate dialogue, notes,
// unit relationships, IDs or non-numbered titles.
const sceneIndexWord = '(?:[0-9٠-٩۰-۹]{1,4}|الأول|الأولى|أول|الثاني|الثانية|الثالث|الثالثة|الرابع|الرابعة|الخامس|الخامسة|السادس|السادسة|السابع|السابعة|الثامن|الثامنة|التاسع|التاسعة|العاشر|العاشرة)';
const numberedScenePrefix = new RegExp(
  '^(?:المشهد|مشهد)\\s*(?:رقم\\s*)?[\\(（]?\\s*' + sceneIndexWord + '\\s*[\\)）]?\\s*(?:[:：،.\\-–—/]+\\s*|\\s+|$)', 'u'
);

export function cleanSceneTitle(value) {
  let title = String(value ?? '').trim();
  // Extract the author's subtitle without treating an old scene index as content.
  for (let i = 0; i < 4; i++) {
    const next = title.replace(numberedScenePrefix, '').trim();
    if (next === title) break;
    title = next;
  }
  return title.slice(0,250);
}

export function cleanSceneDocument(document) {
  if (!document || !Array.isArray(document.scenes)) return document;
  let changed = false;
  const scenes = document.scenes.map(scene => {
    const title = cleanSceneTitle(scene.title);
    if (title === scene.title) return scene;
    changed = true;
    return {...scene,title};
  });
  return changed ? {...document,scenes} : document;
}

export function reorderSceneByNumber(document, sceneId, oneBasedNumber) {
  if (!document || !Array.isArray(document.scenes)) return document;
  const destination = Number(oneBasedNumber);
  if (!Number.isSafeInteger(destination) || destination < 1 || destination > document.scenes.length) return document;
  const from = document.scenes.findIndex(scene => scene.id === sceneId);
  if (from === -1) return document;
  if (from === destination - 1) return cleanSceneDocument(document);
  const scenes = [...document.scenes];
  const [moved] = scenes.splice(from, 1);
  scenes.splice(destination - 1, 0, moved);
  return cleanSceneDocument({...document,scenes});
}
