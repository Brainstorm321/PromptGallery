const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'prompts.json');
const PROMPTS_JS = path.join(ROOT, 'prompts.js');
const DOWNLOADS_JS = path.join(ROOT, 'download-assets.js');
const HTML_FILES = [path.join(ROOT, 'index.html'), path.join(ROOT, 'detail.html')];
const VERSIONED_ASSETS = ['css/style.css', 'prompts.js', 'i18n.js', 'app.js', 'download-assets.js', 'detail.js'];

function makeAssetVersion() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateHtmlAssetVersions(version) {
  for (const file of HTML_FILES) {
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, 'utf8');
    for (const asset of VERSIONED_ASSETS) {
      html = html.replace(new RegExp(`${escapeRegExp(asset)}(\\?v=[^"']*)?`, 'g'), `${asset}?v=${version}`);
    }
    fs.writeFileSync(file, html, 'utf8');
  }
}

function readPrompts() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function publicPrompt(item) {
  const { access, ...rest } = item;
  return rest;
}

function publicPrompts(prompts) {
  return prompts
    .filter(item => String(item.access || 'Free').toLowerCase() === 'free')
    .map(publicPrompt);
}

function writePromptsJs(prompts) {
  const body = JSON.stringify(publicPrompts(prompts), null, 2).replace(/</g, '\\u003c');
  fs.writeFileSync(PROMPTS_JS, `// prompts.js - public prompt gallery data.\nwindow.PROMPTS = ${body};\n`, 'utf8');
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/png';
}

function normalizeWebPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function writeDownloadAssets(prompts) {
  const downloads = {};
  for (const item of publicPrompts(prompts)) {
    const webPath = normalizeWebPath(item.image);
    if (!webPath || /^https?:\/\//i.test(webPath)) continue;
    const fullPath = path.join(ROOT, webPath);
    if (!fs.existsSync(fullPath)) continue;
    downloads[webPath] = {
      mime: mimeFor(fullPath),
      base64: fs.readFileSync(fullPath).toString('base64')
    };
  }
  fs.writeFileSync(
    DOWNLOADS_JS,
    `// Generated from data/prompts.json image paths. Do not edit by hand.\nwindow.PROMPT_IMAGE_DOWNLOADS = ${JSON.stringify(downloads)};\n`,
    'utf8'
  );
}

function build() {
  const prompts = readPrompts();
  writePromptsJs(prompts);
  writeDownloadAssets(prompts);
  const version = makeAssetVersion();
  updateHtmlAssetVersions(version);
  return { count: publicPrompts(prompts).length, total: prompts.length, version };
}

if (require.main === module) {
  const result = build();
  console.log(`Built ${result.count} prompts with asset version ${result.version}.`);
}

module.exports = { build, readPrompts };