const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const collect = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry =>
  entry.isDirectory() ? collect(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
for (const directory of process.argv.slice(2).length ? process.argv.slice(2) : ['dist']) {
  const files = collect(path.resolve(__dirname, '..', directory)).filter(file => /\.(hbc|js)$/.test(file));
  assert.ok(files.length, `Missing ${directory} bundle; export it first.`);
  const found = files.some(file => fs.readFileSync(file).includes(Buffer.from('WEAVE_UI_FIXTURE_ONLY')));
  assert.equal(found, false, `${directory}: product bundle contains fixtures`);
  console.log(`${directory}: fixture boundary passed`);
}
