// Writes .br and .gz copies of text assets after the build, so the server can
// send compressed HTML, CSS and JavaScript without doing the work per request.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const dist = new URL('../dist/client', import.meta.url).pathname;
let n = 0;
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(html|css|js|svg|xml|txt|json)$/.test(f.name)) {
      const buf = fs.readFileSync(p);
      if (buf.length < 600) continue;
      fs.writeFileSync(p + '.br', zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 10 } }));
      fs.writeFileSync(p + '.gz', zlib.gzipSync(buf, { level: 9 }));
      n++;
    }
  }
})(dist);
console.log(`compressed ${n} files`);
