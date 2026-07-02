const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { build } = require('./scripts/build-data');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'prompts.json');
const IMAGE_DIR = path.join(ROOT, 'assets', 'images');
const PORT = Number(process.env.PROMPT_GALLERY_ADMIN_PORT || 8787);
const MAX_BODY = 80 * 1024 * 1024;

const CATEGORY_VALUES = ['cityscape', 'portrait', 'scene', 'concept', 'design', 'product', 'commercial', 'workflow', 'tutorial'];
const ACCESS_VALUES = ['Free', 'Premium'];
const TYPE_VALUES = ['Image', 'Video'];

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function send(res, status, payload, headers = {}) {
  const isBuffer = Buffer.isBuffer(payload);
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    ...(isBuffer ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
    ...headers
  });
  res.end(isBuffer ? payload : JSON.stringify(payload));
}

function sendText(res, status, text, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(text);
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readBodyJson(req) {
  const body = await collectBody(req);
  if (!body.length) return {};
  return JSON.parse(body.toString('utf8'));
}

function slugify(value, fallback = 'prompt') {
  const ascii = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return ascii || `${fallback}-${Date.now().toString(36)}`;
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map(s => s.trim()).filter(Boolean);
  return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
}

function normalizePrompt(item, existing) {
  const next = {
    id: String(item.id || existing?.id || slugify(item.title || item.titleZh, 'prompt')).trim(),
    title: String(item.title || existing?.title || 'Untitled').trim(),
    titleZh: String(item.titleZh || existing?.titleZh || '').trim(),
    author: String(item.author || existing?.author || '@unknown').trim(),
    category: String(item.category || existing?.category || 'concept').trim().toLowerCase(),
    type: String(item.type || existing?.type || 'Image').trim(),
    access: String(item.access || existing?.access || 'Free').trim(),
    tags: normalizeTags(item.tags ?? existing?.tags),
    image: String(item.image || existing?.image || '').trim(),
    originalUrl: String(item.originalUrl || existing?.originalUrl || '').trim(),
    prompt: String(item.prompt || existing?.prompt || ''),
    promptZh: String(item.promptZh || existing?.promptZh || '')
  };

  if (!CATEGORY_VALUES.includes(next.category)) next.category = 'concept';
  if (!TYPE_VALUES.includes(next.type)) next.type = 'Image';
  if (!ACCESS_VALUES.includes(next.access)) next.access = 'Free';
  if (!next.titleZh) delete next.titleZh;
  if (!next.promptZh) delete next.promptZh;
  return next;
}

function saveUploadedImage(file, baseName) {
  if (!file || !file.dataUrl) return null;
  const match = String(file.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Image upload format is invalid.');

  const mime = match[1].toLowerCase();
  const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : mime.includes('gif') ? 'gif' : 'png';
  const rawName = path.basename(String(file.name || `${baseName}.${ext}`), path.extname(String(file.name || '')));
  const filename = `${slugify(baseName || rawName, 'image')}-${Date.now().toString(36)}.${ext}`;
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMAGE_DIR, filename), Buffer.from(match[2], 'base64'));
  return `assets/images/${filename}`;
}

function runGit(args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: ROOT, windowsHide: true }, (error, stdout, stderr) => {
      const output = `${stdout || ''}${stderr || ''}`.trim();
      if (error) {
        error.output = output;
        reject(error);
        return;
      }
      resolve(output);
    });
  });
}

async function publish() {
  const status = await runGit(['status', '--short']);
  if (!status.trim()) return 'No changes to publish.';
  await runGit(['add', '.']);
  const message = `Update prompt gallery content ${new Date().toISOString().slice(0, 10)}`;
  await runGit(['commit', '-m', message]);
  const pushed = await runGit(['push']);
  return pushed || 'Pushed to GitHub.';
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function serveFile(res, requestPath) {
  const relative = requestPath === '/admin' || requestPath === '/admin/' ? 'admin/index.html' : requestPath.replace(/^\//, '');
  const fullPath = path.resolve(ROOT, relative);
  if (!fullPath.startsWith(ROOT) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    sendText(res, 404, 'Not found');
    return;
  }
  sendText(res, 200, fs.readFileSync(fullPath), contentType(fullPath));
}

function localAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];
  Object.values(nets).flat().forEach(net => {
    if (net && net.family === 'IPv4' && !net.internal) addresses.push(net.address);
  });
  return addresses;
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/prompts') {
    send(res, 200, { prompts: readJson(DATA_FILE, []), categories: CATEGORY_VALUES, access: ACCESS_VALUES, types: TYPE_VALUES });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/prompts') {
    const payload = await readBodyJson(req);
    const prompts = readJson(DATA_FILE, []);
    const existingIndex = prompts.findIndex(p => p.id === payload.item?.id);
    const existing = existingIndex >= 0 ? prompts[existingIndex] : null;
    const item = normalizePrompt(payload.item || {}, existing);
    const imagePath = saveUploadedImage(payload.imageFile, item.title || item.titleZh || item.id);
    if (imagePath) item.image = imagePath;
    if (!item.image) throw new Error('Please choose an image before saving.');

    const duplicate = prompts.find(p => p.id === item.id && (!existing || p !== existing));
    if (duplicate) item.id = `${item.id}-${Date.now().toString(36)}`;

    if (existingIndex >= 0) prompts[existingIndex] = item;
    else prompts.unshift(item);

    writeJson(DATA_FILE, prompts);
    const built = build();
    send(res, 200, { ok: true, item, built });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/build') {
    send(res, 200, { ok: true, built: build() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/publish') {
    build();
    const output = await publish();
    send(res, 200, { ok: true, output });
    return;
  }

  send(res, 404, { error: 'API route not found.' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    serveFile(res, url.pathname);
  } catch (error) {
    send(res, 500, { error: error.message || String(error), detail: error.output || '' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Prompt Gallery Admin is running.`);
  console.log(`Computer: http://localhost:${PORT}/admin`);
  for (const address of localAddresses()) {
    console.log(`iPad on same Wi-Fi: http://${address}:${PORT}/admin`);
  }
});