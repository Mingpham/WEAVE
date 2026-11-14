const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const collect = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry =>
  entry.isDirectory() ? collect(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
for (const [directory, expected] of [['dist', false], ['dist-demo', true]]) {
  const files = collect(path.resolve(__dirname, '..', directory)).filter(file => /\.(hbc|js)$/.test(file));
  assert.ok(files.length, `Missing ${directory} bundle; export it first.`);
  const found = files.some(file => fs.readFileSync(file).includes(Buffer.from('WEAVE_UI_FIXTURE_ONLY')));
  assert.equal(found, expected, `${directory}: unexpected fixture inclusion`);
  console.log(`${directory}: fixture boundary passed`);
}
