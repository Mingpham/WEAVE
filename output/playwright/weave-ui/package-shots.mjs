import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const names = fs
  .readdirSync(root)
  .filter((n) => /^SCR-\d+.*\.png$/.test(n))
  .sort();
const rows = names.map((file) => {
  const id = Number(file.match(/^SCR-(\d+)/)[1]);
  const status =
    id === 1
      ? 'Visible: Welcome'
      : id === 3
        ? 'Visible: Join Code; service unavailable'
        : id === 34
          ? 'Visible: Sign In; service unavailable'
          : [2, 4, 5, 7].includes(id)
            ? 'Blocked: Unable to connect'
            : 'Blocked: no authenticated project; redirected to Welcome';
  const sha256 = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, file)))
    .digest('hex');
  return {
    screen: id === 34 ? 'Supporting Sign In' : `SCR-${String(id).padStart(2, '0')}`,
    file,
    status,
    sha256,
  };
});
const manifest = {
  capturedAt: new Date().toISOString(),
  source: 'http://127.0.0.1:8081',
  platform: 'Actual running React Native Web app, NOT Android device screenshots',
  viewport: { width: 390, height: 844 },
  note: 'No prototype images or fabricated data. Project routes were probed with the placeholder not-connected because no authenticated project was available. A redirected/blocked capture is NOT an image of its intended component. This is a complete capture of the requested route states, not complete UI acceptance.',
  captures: rows,
};
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
const escape = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const tile = (r) =>
  `<article><h2>${escape(r.screen)} — ${escape(r.file.replace(/^SCR-\d+-/, '').replace(/-BLOCKED|\.png/g, ''))}</h2><p>${escape(r.status)}</p><a href="${r.file}"><img src="${r.file}" loading="lazy" alt="${escape(r.status)}"></a></article>`;
const visible = rows.filter((r) =>
  [1, 3, 34].some((n) => r.file.startsWith(`SCR-${String(n).padStart(2, '0')}-`)),
);
const blocked = rows.filter((r) => !visible.includes(r));
fs.writeFileSync(
  path.join(root, 'index.html'),
  `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>WEAVE — ảnh giao diện thực tế</title><style>body{font:16px system-ui;background:#f3f6f3;color:#17352c;margin:24px}h1{font-size:28px}.note{max-width:1000px;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,390px));gap:24px;align-items:start}article{background:white;border:1px solid #d4dfd5;border-radius:16px;overflow:hidden}h2,p{padding:0 16px}h2{font-size:17px}article p{font-size:13px;color:#626b63}img{width:100%;display:block}summary{cursor:pointer;padding:24px 0;font-size:22px;font-weight:700}</style><h1>WEAVE — ảnh chụp app web đang chạy</h1><p class="note">34 ảnh: 33 đường dẫn theo đặc tả và màn đăng nhập bổ sung, khung 390×844. Đây là ảnh thật của bản web đang chạy, không phải prototype hoặc ảnh dựng. Hiện chỉ Welcome, Join Code và Sign In hiện được nội dung UI; các màn khác đang bị chặn bởi phiên/dữ liệu/provider. Ảnh chuyển về Welcome không phải ảnh của màn đích. Chưa có bộ ảnh Android native.</p><div class="grid">${visible.map(tile).join('')}</div><details><summary>Xem 31 ảnh trạng thái bị chặn / chuyển hướng</summary><div class="grid">${blocked.map(tile).join('')}</div></details><p>Chi tiết và SHA-256: <a href="manifest.json">manifest.json</a>.</p></html>`,
);
fs.writeFileSync(
  path.join(root, 'README.txt'),
  'WEAVE ACTUAL RUNNING WEB UI\n\n' +
    manifest.note +
    '\n\n' +
    rows.map((r) => r.screen + ': ' + r.status + ' -> ' + r.file).join('\n'),
);
console.log(
  JSON.stringify({
    captures: rows.length,
    uniqueImages: new Set(rows.map((r) => r.sha256)).size,
    gallery: path.join(root, 'index.html'),
  }),
);
