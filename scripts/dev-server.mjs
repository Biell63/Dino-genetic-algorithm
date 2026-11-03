// Servidor estático para desenvolvimento, sem dependências. Módulos ES não rodam abrindo o arquivo
// direto (file://), o navegador exige HTTP.
// Escuta só em 127.0.0.1, serve GET/HEAD apenas dos itens da lista abaixo, bloqueia "../" e arquivos
// ocultos e manda cabeçalhos de segurança.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 8080;
const PUBLIC_ENTRIES = new Set(['index.html', 'styles', 'src', 'assets']);

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
});

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
});

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type });
  res.end(body);
}

// caminho seguro dentro do projeto, ou null se a URL for suspeita
function resolveSafePath(rawUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) {
    return null;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const segments = relative.split('/');
  if (!PUBLIC_ENTRIES.has(segments[0]) || segments.some((s) => s.startsWith('.') || s === '..')) {
    return null;
  }
  const absolute = resolve(join(ROOT, relative));
  return absolute.startsWith(ROOT + sep) ? absolute : null;
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Método não permitido');
  }
  const filePath = resolveSafePath(req.url ?? '/');
  if (filePath === null) {
    return send(res, 404, 'Não encontrado');
  }
  try {
    const info = await stat(filePath);
    const type = MIME_TYPES[extname(filePath)];
    if (!info.isFile() || !type) {
      return send(res, 404, 'Não encontrado');
    }
    const body = req.method === 'HEAD' ? '' : await readFile(filePath);
    return send(res, 200, body, type);
  } catch {
    return send(res, 404, 'Não encontrado');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`A porta ${PORT} já está em uso. Tente outra: PORT=8081 npm start`);
  } else {
    console.error(`Falha ao iniciar o servidor: ${error.message}`);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Dino Genetic Algorithm rodando em http://${HOST}:${PORT}  (Ctrl+C para parar)`);
});
