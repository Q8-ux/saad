import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('independent deployments use the same original motion renderer',async()=>{
const own=await readFile(new URL('../assets/motion/motion-core.mjs',import.meta.url),'utf8');
const source=await readFile(new URL('../../sabeq-legal/motion/motion-core.mjs',import.meta.url),'utf8');
assert.equal(own,source);
});
