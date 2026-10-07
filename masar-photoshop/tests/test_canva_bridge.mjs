import assert from 'node:assert/strict';
import {uploadExports} from '../canva-bridge.mjs';
const project = {project: 'test', canva: {folder_id: 'verified-folder'}};
const files = [{path:'/private/export.png', name:'approved', approved:true}];
const calls = [];
const connector = {
  async mcp__codex_apps__canva_upload_asset_from_url(args) {
    calls.push(args);
    return {content:[{type:'text',text:JSON.stringify({job:{asset:{id:'media-1'}}})}]};
  },
  async mcp__codex_apps__canva_move_item_to_folder(args) {
    calls.push(args);
    return {content:[{type:'text',text:'{"status":"success"}'}]};
  }
};
assert.deepEqual(await uploadExports({project,files},connector),
  [{path:'/private/export.png',media_id:'media-1',filed:true}]);
assert.equal(calls[1].to_folder_id,'verified-folder');
await assert.rejects(uploadExports({project,files:[{...files[0],approved:false}]},connector),/reviewed/);
await assert.rejects(uploadExports({project,files:[{...files[0],path:'/private/design.comp'}]},connector),/PNG/);
await assert.rejects(uploadExports({project,files},{...connector,
  async mcp__codex_apps__canva_move_item_to_folder(){throw new Error('move failed');}}),
  error => error.completedUploads[0].media_id === 'media-1');
console.log('Canva bridge: upload, folder routing, approval, format and partial failure checks passed');
