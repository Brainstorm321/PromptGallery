const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'prompts.json');
const PROMPTS_JS = path.join(ROOT, 'prompts.js');
const DOWNLOADS_JS = path.join(ROOT, 'download-assets.js');

function readPrompts() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writePromptsJs(prompts) {
  const body = JSON.stringify(prompts, null, 2).replace(/</g, '\\u003c');
  fs.writeFileSync(PROMPTS_JS, `// prompts.js - prompt gallery data\nwindow.PROMPTS = ${body};\n`, 'utf8');
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
  for (const item of prompts) {
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
  return { count: prompts.length };
}

if (require.main === module) {
  const result = build();
  console.log(`Built ${result.count} prompts.`);
}

module.exports = { build, readPrompts };