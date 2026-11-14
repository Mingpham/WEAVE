import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const captures = fs
  .readdirSync(root)
  .filter((name) => /^SCR-\d+.*\.png$/.test(name))
  .sort()
  .map((file) => ({
    file,
    screen: file.slice(0, 6),
    sha256: crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, file)))
      .digest('hex'),
  }));
const note =
  'Full native component content rendered in React Native Web at 390px width. Fixture data is visibly labelled. No live integration, Google sign-in, or Android device acceptance claim. Product auth and fixture guard are unchanged.';
fs.writeFileSync(
  path.join(root, 'manifest.json'),
  JSON.stringify(
    { capturedAt: new Date().toISOString(), count: captures.length, note, captures },
    null,
    2,
  ),
);
const tiles = captures
  .map(
    ({ file, screen }) =>
      `<article><h2>${screen} · ${file.slice(7, -4).replaceAll('-', ' ')}</h2><a href="${file}"><img src="${file}" loading="lazy" alt="${screen} full content"></a></article>`,
  )
  .join('');
fs.writeFileSync(
  path.join(root, 'index.html'),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>WEAVE · Full UI captures</title><style>body{font:16px system-ui;background:#f3f6f3;color:#17352c;margin:24px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,390px));gap:24px;align-items:start}article{background:white;border:1px solid #cbd9ce;border-radius:16px;overflow:hidden}h2{padding:0 16px;font-size:17px}img{width:100%;display:block}p{max-width:900px;line-height:1.6}</style><h1>WEAVE · 37 full UI captures</h1><p>${note}</p><p>SCR-01–33 and supporting Sign In, Task Editor, Ask Probe and Direct Answer. <a href="manifest.json">Manifest and hashes</a>.</p><section>${tiles}</section></html>`,
);
fs.writeFileSync(
  path.join(root, 'README.txt'),
  `WEAVE FULL UI CAPTURES\n${note}\n\nOpen index.html. The earlier weave-ui/ folder is historical blocked-route evidence; this folder contains the full component presentation.\n`,
);
console.log(
  JSON.stringify({
    captures: captures.length,
    uniqueImages: new Set(captures.map((item) => item.sha256)).size,
  }),
);
