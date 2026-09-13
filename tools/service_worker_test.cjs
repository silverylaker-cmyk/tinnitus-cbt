const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const handlers = {}, deleted = [];
const caches = {
  keys: async () => ['tinnitus-cbt-17', 'tinnitus-cbt-18', 'other-app-cache'],
  delete: async key => { deleted.push(key); return true; },
};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../sw.js'), 'utf8'), {
  caches, self: {addEventListener: (name, fn) => {handlers[name] = fn;}, clients: {claim: async () => {}}},
});
(async () => {
  let work;
  handlers.activate({waitUntil: p => {work = p;}});
  await work;
  assert.deepEqual(deleted, ['tinnitus-cbt-17']);
  console.log('PASS service worker activation preserves other applications and current cache');
})().catch(e => {console.error(e); process.exitCode = 1;});
