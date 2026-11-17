// Board ordering is positional: scene number = index in the manuscript (1-based).
// Never rewrite arbitrary titles, character dialogue, scene IDs, notes or unit IDs.
const SIMPLE_SCENE_TITLE = /^(?:المشهد|مشهد)\s*(?:[0-9٠-٩۰-۹]{1,3}|الأول|الأولى|الثاني|الثانية|الثالث|الثالثة|الرابع|الرابعة|الخامس|الخامسة|السادس|السادسة|السابع|السابعة|الثامن|الثامنة|التاسع|التاسعة|العاشر|العاشرة)$/u;

export function reorderSceneByNumber(document, sceneId, oneBasedNumber) {
  if (!document || !Array.isArray(document.scenes)) return document;
  const count = document.scenes.length;
  const destination = Number(oneBasedNumber);
  if (!Number.isSafeInteger(destination) || destination < 1 || destination > count) return document;
  const from = document.scenes.findIndex(scene => scene.id === sceneId);
  if (from === -1 || from === destination - 1) return document;

  const scenes = [...document.scenes];
  const [moved] = scenes.splice(from, 1);
  scenes.splice(destination - 1, 0, moved);

  // Only rename mechanically generated labels such as «المشهد 2».
  // Titles containing locations, context, or author-chosen names remain intact.
  const updated = scenes.map((scene, index) =>
    SIMPLE_SCENE_TITLE.test(String(scene.title || '').trim())
      ? { ...scene, title: 'المشهد ' + (index + 1) }
      : scene
  );
  return { ...document, scenes: updated };
}
