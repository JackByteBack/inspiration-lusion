import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.buf': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.exr': 'image/x-exr',
  '.hdr': 'image/vnd.radiance',
  '.glb': 'model/gltf-binary',
  '.ktx2': 'image/ktx2',
};

function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+/g, '/');
  const abs = path.normalize(path.join(ROOT, clean));
  if (!abs.startsWith(ROOT)) return null;
  const candidates = [];
  if (clean.endsWith('/')) candidates.push(path.join(abs, 'index.html'));
  else {
    candidates.push(abs);
    if (!path.extname(abs)) {
      candidates.push(abs + '.html');
      candidates.push(path.join(abs, 'index.html'));
    }
  }
  return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || null;
}

http
  .createServer((req, res) => {
    const file = resolve(req.url || '/');
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found: ' + req.url);
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const stat = fs.statSync(file);
    const range = req.headers.range;

    if (range) {
      const [startStr, endStr] = range.replace('bytes=', '').split('-');
      const start = Number(startStr) || 0;
      const end = endStr ? Math.min(Number(endStr), stat.size - 1) : stat.size - 1;
      res.writeHead(206, {
        'content-type': type,
        'content-range': `bytes ${start}-${end}/${stat.size}`,
        'accept-ranges': 'bytes',
        'content-length': end - start + 1,
        'cache-control': 'no-cache',
      });
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'content-type': type,
      'content-length': stat.size,
      'accept-ranges': 'bytes',
      'cache-control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`Lusion clone running at http://localhost:${PORT}`));
