#!/usr/bin/env node
/**
 * INV-11 / spec §16 rule 9: the reference scenario must never be hardcoded in product code.
 * Scans apps/, packages/ and supabase/functions/ for the terms in
 * tests/fixtures/forbidden-terms.json and exits 1 on any match. Scenario data belongs only in
 * tests/fixtures/ and the seed script.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { terms } = JSON.parse(
  readFileSync(join(root, 'tests/fixtures/forbidden-terms.json'), 'utf8'),
);
const SCAN = ['apps', 'packages', 'supabase/functions'];
const SKIP_DIRS = new Set(['node_modules', '.expo', 'android', 'ios', 'dist', 'coverage']);
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|sql|md|ya?ml)$/;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = terms.map((t) => ({
  term: t,
  re: new RegExp(`(?<![\\w-])${escape(t)}(?![\\w-])`),
}));

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* files(p);
    } else if (EXT.test(name) && name !== 'deno.lock') {
      yield p;
    }
  }
}

const hits = [];
for (const dir of SCAN) {
  const abs = join(root, dir);
  if (!existsSync(abs)) continue;
  for (const file of files(abs)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const { term, re } of patterns) {
        if (re.test(line)) hits.push(`${relative(root, file)}:${i + 1}  "${term}"`);
      }
    });
  }
}

if (hits.length) {
  console.error('INV-11 violation — reference-scenario data found in product code:');
  for (const h of hits) console.error(`  ${h}`);
  console.error('Move scenario data to tests/fixtures/ or the seed script (spec §16 rule 9).');
  process.exit(1);
}
console.log(`check-hardcode: OK (${terms.length} terms, ${SCAN.join(', ')})`);
