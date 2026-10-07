/** Run with the authenticated Canva connector tools supplied by the agent runtime.
 * This module does not implement OAuth, store tokens, or provide an unattended service.
 */
export async function uploadExports({project, files}, connector) {
  if (!project?.canva?.folder_id || !Array.isArray(files) || !files.length) {
    throw new Error('A connected project profile and explicit files are required');
  }
  for (const file of files) {
    if (typeof file.path !== 'string' || !file.path.startsWith('/') ||
        !/\.(png|jpe?g|webp)$/i.test(file.path)) {
      throw new Error('Provide absolute local PNG/JPEG/WebP paths');
    }
    if (!file.approved) throw new Error('Only visually reviewed exports can be uploaded');
  }
  const results = [];
  function unwrap(response) {
    if (response.isError) throw new Error('Canva connector rejected the operation');
    if (response.structuredContent) return response.structuredContent;
    return JSON.parse(response.content.find(item => item.type === 'text').text);
  }
  for (const file of files) {
    const response = unwrap(await connector.mcp__codex_apps__canva_upload_asset_from_url({
      asset_file: file.path,
      name: project.project + ' — ' + file.name,
      user_intent: 'رفع التصدير المعتمد من مسار الفوتوشوب إلى كانفا'
    }));
    const asset = response.job?.asset || response.asset;
    const id = asset?.id || response.media_id;
    if (!id) throw new Error('Upload did not return a completed media ID; do not retry blindly');
    // Retain uploaded ID before moving, so callers can recover without duplicating uploads.
    const result = {path: file.path, media_id: id, filed: false};
    results.push(result);
    try {
      unwrap(await connector.mcp__codex_apps__canva_move_item_to_folder({
        item_id: id,
        to_folder_id: project.canva.folder_id,
        user_intent: 'حفظ التصدير في مجلد المشروع المرتبط'
      }));
      result.filed = true;
    } catch (error) {
      error.completedUploads = results;
      throw error;
    }
  }
  return results;
}
