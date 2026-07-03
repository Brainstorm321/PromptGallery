const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { build } = require('./scripts/build-data');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'prompts.json');
const PRIVATE_DATA_FILE = path.join(ROOT, 'private-data', 'premium.json');
const SECRETS_FILE = path.join(ROOT, '.admin-secrets.json');
const PUBLIC_IMAGE_DIR = path.join(ROOT, 'assets', 'images');
const PRIVATE_IMAGE_DIR = path.join(ROOT, 'private-assets', 'images');
const PORT = Number(process.env.PROMPT_GALLERY_ADMIN_PORT || 8787);
const MAX_BODY = 80 * 1024 * 1024;

const CATEGORY_VALUES = ['cityscape', 'portrait', 'scene', 'concept', 'design', 'product', 'commercial', 'workflow', 'tutorial'];
const ACCESS_VALUES = ['Free', 'Premium'];
const TYPE_VALUES = ['Image', 'Video'];
const DEFAULT_TRANSLATION_PROVIDER = process.env.PROMPT_GALLERY_TRANSLATION_PROVIDER || 'ollama';
const DEFAULT_OPENAI_TRANSLATION_MODEL = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4.1-mini';
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_TRANSLATION_MODEL || 'qwen2:7b';
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_TRANSLATION_TIMEOUT_MS = Number(process.env.OLLAMA_TRANSLATION_TIMEOUT_MS || 10 * 60 * 1000);

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

function readSecrets() {
  try {
    return readJson(SECRETS_FILE, {});
  } catch (error) {
    return {};
  }
}

function writeSecrets(value) {
  const current = readSecrets();
  const next = { ...current, ...value };
  Object.keys(next).forEach(key => {
    if (next[key] === '' || next[key] == null) delete next[key];
  });
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(next, null, 2) + '\n', 'utf8');
}

function normalizeTranslationProvider(value) {
  const provider = String(value || '').trim().toLowerCase();
  return ['ollama', 'openai', 'off'].includes(provider) ? provider : 'ollama';
}

function getTranslationConfig() {
  const secrets = readSecrets();
  const provider = normalizeTranslationProvider(process.env.PROMPT_GALLERY_TRANSLATION_PROVIDER || secrets.TRANSLATION_PROVIDER || DEFAULT_TRANSLATION_PROVIDER);
  return {
    provider,
    apiKey: process.env.OPENAI_API_KEY || secrets.OPENAI_API_KEY || '',
    model: process.env.OPENAI_TRANSLATION_MODEL || secrets.OPENAI_TRANSLATION_MODEL || DEFAULT_OPENAI_TRANSLATION_MODEL,
    ollamaModel: process.env.OLLAMA_TRANSLATION_MODEL || secrets.OLLAMA_TRANSLATION_MODEL || DEFAULT_OLLAMA_MODEL,
    ollamaUrl: String(process.env.OLLAMA_BASE_URL || secrets.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL).replace(/\/+$/, ''),
  };
}

function publicTranslationConfig() {
  const config = getTranslationConfig();
  return {
    provider: config.provider,
    hasOpenAIKey: !!config.apiKey,
    model: config.model,
    ollamaModel: config.ollamaModel,
    ollamaUrl: config.ollamaUrl,
  };
}

function requestJson(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (error) { data = { raw: text }; }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(data.error?.message || data.message || text || `HTTP ${res.statusCode}`));
          return;
        }
        resolve(data);
      });
    });
    req.on('error', reject);
    req.setTimeout(45000, () => req.destroy(new Error('Translation request timed out.')));
    req.write(JSON.stringify(body));
    req.end();
  });
}

function requestJsonUrl(endpoint, body) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(endpoint);
    } catch (error) {
      reject(new Error(`Invalid request URL: ${endpoint}`));
      return;
    }
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (error) { data = { raw: text }; }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(data.error?.message || data.message || text || `HTTP ${res.statusCode}`));
          return;
        }
        resolve(data);
      });
    });
    req.on('error', reject);
    req.setTimeout(OLLAMA_TRANSLATION_TIMEOUT_MS, () => req.destroy(new Error('Local translation request timed out. Large local models can need several minutes; try again after the model is warmed up or switch to a smaller model.')));
    req.write(JSON.stringify(body));
    req.end();
  });
}

function getJsonUrl(endpoint) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(endpoint);
    } catch (error) {
      reject(new Error(`Invalid request URL: ${endpoint}`));
      return;
    }
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'GET',
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (error) { data = { raw: text }; }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(data.error?.message || data.message || text || `HTTP ${res.statusCode}`));
          return;
        }
        resolve(data);
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Local model list request timed out.')));
    req.end();
  });
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

function parseJsonText(text) {
  const clean = String(text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(clean); } catch (error) {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Translation response did not contain JSON.');
  return JSON.parse(match[0]);
}

function detectTranslationDirection(item, requestedDirection) {
  if (requestedDirection && requestedDirection !== 'auto') return requestedDirection;
  const title = isPlaceholder(item.title) ? '' : item.title;
  const titleZh = isPlaceholder(item.titleZh) ? '' : item.titleZh;
  const hasZh = !!(titleZh || item.promptZh);
  const hasEn = !!(title || item.prompt);
  const needsEn = !!((titleZh && !title) || (item.promptZh && !item.prompt));
  const needsZh = !!((title && !titleZh) || (item.prompt && !item.promptZh));
  if (needsEn && needsZh) return 'mixed';
  if (hasZh && needsEn) return 'zhToEn';
  if (hasEn && needsZh) return 'enToZh';
  if (hasZh && !hasEn) return 'zhToEn';
  if (hasEn && !hasZh) return 'enToZh';
  return 'zhToEn';
}

function buildTranslationRequest(item, requestedDirection) {
  const direction = detectTranslationDirection(item, requestedDirection);
  const directionText = direction === 'mixed'
    ? 'missing bilingual fields in both directions'
    : (direction === 'enToZh' ? 'English to Simplified Chinese' : 'Simplified Chinese to English');
  const payload = {
    direction,
    title: isPlaceholder(item.title) ? '' : (item.title || ''),
    titleZh: isPlaceholder(item.titleZh) ? '' : (item.titleZh || ''),
    prompt: item.prompt || '',
    promptZh: item.promptZh || '',
  };
  const systemText = 'You are a strict translation engine for an AI prompt gallery. Translate only the text provided by the user. Do not invent new concepts, do not summarize, and never output placeholders such as Title, Unknown, or Prompt goes here. Preserve URLs, @handles, model names, brand/product names, markdown, and line breaks. Empty input fields must stay empty. Return JSON only.';
  const userText = 'Translate ' + directionText + '. Fill each missing counterpart independently: if titleZh exists and title is empty, translate titleZh into English title; if title exists and titleZh is empty, translate title into Simplified Chinese titleZh; if promptZh exists and prompt is empty, translate promptZh into English prompt; if prompt exists and promptZh is empty, translate prompt into Simplified Chinese promptZh. Already-filled fields must be copied unchanged. English fields must contain no Chinese characters unless the source intentionally includes bilingual labels. Chinese fields should be Simplified Chinese. Keep empty source fields empty. Return exactly these keys: title, titleZh, prompt, promptZh. Input JSON:\n' + JSON.stringify(payload);
  return { direction, systemText, userText };
}

function hasCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ''));
}

function isPlaceholder(value) {
  return /^(untitled|title|unknown|unknown title|prompt|prompt goes here|n\/a|null|none)$/i.test(String(value || '').trim());
}

function isMeaningfulCandidate(value, sourceValue) {
  const candidate = String(value || '').trim();
  if (!candidate || isPlaceholder(candidate)) return false;
  const source = String(sourceValue || '').trim();
  if (source && candidate === source) return false;
  return true;
}

function mergeTranslation(item, direction, translated) {
  const sourceTitle = isPlaceholder(item.title) ? '' : String(item.title || '').trim();
  const sourceTitleZh = isPlaceholder(item.titleZh) ? '' : String(item.titleZh || '').trim();
  const allowEnglish = direction === 'zhToEn' || direction === 'mixed';
  const allowChinese = direction === 'enToZh' || direction === 'mixed';
  const output = {
    title: hasCjk(sourceTitle) ? '' : sourceTitle,
    titleZh: hasCjk(sourceTitleZh) ? sourceTitleZh : '',
    prompt: String(item.prompt || '').trim(),
    promptZh: String(item.promptZh || '').trim(),
  };
  const warnings = [];

  if (allowChinese) {
    const titleZh = String(translated.titleZh || translated.title || '').trim();
    const promptZh = String(translated.promptZh || translated.prompt || '').trim();
    if (sourceTitle && isMeaningfulCandidate(titleZh, sourceTitleZh) && hasCjk(titleZh)) {
      output.titleZh = titleZh;
    } else if (sourceTitle && !sourceTitleZh) {
      warnings.push('Chinese title was not updated because the model did not return clear Chinese.');
    }
    if (item.prompt && isMeaningfulCandidate(promptZh, item.promptZh) && promptZh !== String(item.prompt || '').trim() && (hasCjk(promptZh) || !item.prompt)) {
      output.promptZh = promptZh;
    } else if (item.prompt && !item.promptZh) {
      warnings.push('Chinese prompt was not updated because the model output looked unchanged or not Chinese.');
    }
  }

  if (allowEnglish) {
    const title = String(translated.title || translated.titleZh || '').trim();
    const prompt = String(translated.prompt || translated.promptZh || '').trim();
    if (sourceTitleZh && isMeaningfulCandidate(title, sourceTitle) && !hasCjk(title)) {
      output.title = title;
    } else if (sourceTitleZh && !sourceTitle) {
      warnings.push('English title was not updated because the model returned Chinese or placeholder text.');
    }
    if (item.promptZh && isMeaningfulCandidate(prompt, item.prompt) && prompt !== String(item.promptZh || '').trim()) {
      output.prompt = prompt;
    } else if (item.promptZh && !item.prompt) {
      warnings.push('English prompt was not updated because the model output looked unchanged or still Chinese.');
    }
  }

  return { item: output, warnings };
}

async function translateWithOpenAI(item, request, config) {
  const body = {
    model: config.model,
    text: {
      format: {
        type: 'json_schema',
        name: 'prompt_gallery_translation',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            titleZh: { type: 'string' },
            prompt: { type: 'string' },
            promptZh: { type: 'string' },
          },
          required: ['title', 'titleZh', 'prompt', 'promptZh'],
        },
      },
    },
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: request.systemText }],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: request.userText }],
      },
    ],
  };

  const data = await requestJson({
    hostname: 'api.openai.com',
    path: '/v1/responses',
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + config.apiKey,
      'Content-Type': 'application/json',
    },
  }, body);

  const translated = parseJsonText(extractResponseText(data));
  return { direction: request.direction, model: config.model, provider: 'openai', ...mergeTranslation(item, request.direction, translated) };
}

async function translateWithOllama(item, request, config) {
  const model = String(config.ollamaModel || '').trim();
  if (!model) throw new Error('Ollama model is not configured.');

  const data = await requestJsonUrl(config.ollamaUrl + '/api/chat', {
    model,
    stream: false,
    format: 'json',
    think: false,
    keep_alive: '10m',
    options: { temperature: 0.1 },
    messages: [
      { role: 'system', content: request.systemText },
      { role: 'user', content: request.userText },
    ],
  });

  const text = data.message?.content || data.response || '';
  let translated = {};
  let parseWarning = '';
  try {
    translated = parseJsonText(text);
  } catch (error) {
    parseWarning = 'Ollama did not return valid JSON, so only safe field-level fallback translation was applied.';
  }
  const merged = mergeTranslation(item, request.direction, translated);
  if (parseWarning) merged.warnings.push(parseWarning);
  await repairOllamaTitleTranslation(item, request.direction, config, merged);
  await repairOllamaPromptTranslation(item, request.direction, config, merged);
  return { direction: request.direction, model: 'Ollama - ' + model, provider: 'ollama', ...merged };
}

function cleanSimpleTranslation(value) {
  return String(value || '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(translation|translated text)\s*:\s*/i, '')
    .trim();
}

async function translateSimpleFieldWithOllama(value, targetLanguage, config) {
  const model = String(config.ollamaModel || '').trim();
  const data = await requestJsonUrl(config.ollamaUrl + '/api/chat', {
    model,
    stream: false,
    think: false,
    keep_alive: '10m',
    options: { temperature: 0 },
    messages: [
      { role: 'system', content: 'You are a faithful translation engine. Output only the translated text, no explanation. Preserve markdown, XML tags, code-like tokens, URLs, phonetics, and line breaks.' },
      { role: 'user', content: 'Translate to ' + targetLanguage + ': ' + value },
    ],
  });
  return cleanSimpleTranslation(data.message?.content || data.response || '');
}

async function repairOllamaTitleTranslation(item, direction, config, merged) {
  if ((direction === 'enToZh' || direction === 'mixed') && item.title && !hasCjk(merged.item.titleZh)) {
    const titleZh = await translateSimpleFieldWithOllama(item.title, 'Simplified Chinese', config);
    if (titleZh && hasCjk(titleZh)) {
      merged.item.titleZh = titleZh;
      merged.warnings = merged.warnings.filter(text => !text.startsWith('Chinese title'));
    }
  }
  if ((direction === 'zhToEn' || direction === 'mixed') && item.titleZh && (!merged.item.title || isPlaceholder(merged.item.title) || hasCjk(merged.item.title))) {
    const title = await translateSimpleFieldWithOllama(item.titleZh, 'English', config);
    if (title && !hasCjk(title) && !isPlaceholder(title)) {
      merged.item.title = title;
      merged.warnings = merged.warnings.filter(text => !text.startsWith('English title'));
    }
  }
}

function removeWarningPrefix(warnings, prefix) {
  return warnings.filter(text => !text.startsWith(prefix));
}

async function repairOllamaPromptTranslation(item, direction, config, merged) {
  if ((direction === 'enToZh' || direction === 'mixed') && item.prompt) {
    const source = String(item.prompt || '').trim();
    const current = String(merged.item.promptZh || '').trim();
    const needsRepair = !current || current === source || merged.warnings.some(text => text.startsWith('Chinese prompt'));
    if (needsRepair) {
      const promptZh = await translateSimpleFieldWithOllama(source, 'Simplified Chinese. Keep markdown, XML tags, code-like tokens, phonetics, and bracketed meanings when appropriate', config);
      if (promptZh && promptZh !== source && hasCjk(promptZh)) {
        merged.item.promptZh = promptZh;
        merged.warnings = removeWarningPrefix(merged.warnings, 'Chinese prompt');
      }
    }
  }
  if ((direction === 'zhToEn' || direction === 'mixed') && item.promptZh) {
    const source = String(item.promptZh || '').trim();
    const current = String(merged.item.prompt || '').trim();
    const needsRepair = !current || current === source || merged.warnings.some(text => text.startsWith('English prompt'));
    if (needsRepair) {
      const prompt = await translateSimpleFieldWithOllama(source, 'English. Keep markdown, XML tags, code-like tokens, phonetics, and bracketed Chinese meanings when appropriate', config);
      if (prompt && prompt !== source && !isPlaceholder(prompt)) {
        merged.item.prompt = prompt;
        merged.warnings = removeWarningPrefix(merged.warnings, 'English prompt');
      }
    }
  }
}

async function translatePromptItem(item, requestedDirection) {
  if (String(item.access || '').toLowerCase() === 'premium') {
    throw new Error('Premium records are local-only. Auto translation is disabled for Premium items.');
  }

  const config = getTranslationConfig();
  if (config.provider === 'off') {
    throw new Error('Auto translation is turned off in settings.');
  }

  const request = buildTranslationRequest(item, requestedDirection);
  if (config.provider === 'openai') {
    if (!config.apiKey) {
      throw new Error('OpenAI API Key is not configured. Open Translation Settings or set OPENAI_API_KEY before starting the admin server.');
    }
    return translateWithOpenAI(item, request, config);
  }

  try {
    return await translateWithOllama(item, request, config);
  } catch (error) {
    throw new Error('Ollama translation failed. Please confirm Ollama is running and model "' + config.ollamaModel + '" is installed. ' + error.message);
  }
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

function normalizeCategories(value) {
  const values = normalizeTags(value).map(s => s.toLowerCase());
  const unique = [...new Set(values)].filter(value => CATEGORY_VALUES.includes(value));
  const next = unique.length ? unique : ['concept'];
  return next.length === 1 ? next[0] : next;
}

function normalizePrompt(item, existing) {
  const next = {
    id: String(item.id || existing?.id || slugify(item.title || item.titleZh, 'prompt')).trim(),
    title: String(item.title || existing?.title || 'Untitled').trim(),
    titleZh: String(item.titleZh || existing?.titleZh || '').trim(),
    author: String(item.author || existing?.author || '@unknown').trim(),
    category: normalizeCategories(item.category ?? existing?.category ?? 'concept'),
    type: String(item.type || existing?.type || 'Image').trim(),
    access: String(item.access || existing?.access || 'Free').trim(),
    tags: normalizeTags(item.tags ?? existing?.tags),
    image: String(item.image || existing?.image || '').trim(),
    originalUrl: String(item.originalUrl || existing?.originalUrl || '').trim(),
    prompt: String(item.prompt || existing?.prompt || ''),
    promptZh: String(item.promptZh || existing?.promptZh || '')
  };

  next.category = normalizeCategories(next.category);
  if (!TYPE_VALUES.includes(next.type)) next.type = 'Image';
  if (!ACCESS_VALUES.includes(next.access)) next.access = 'Free';
  if (!next.titleZh) delete next.titleZh;
  if (!next.promptZh) delete next.promptZh;
  return next;
}

function isLocalImagePath(value) {
  const webPath = String(value || '').replace(/\\/g, '/');
  return (webPath.startsWith('assets/images/') || webPath.startsWith('private-assets/images/')) && !webPath.includes('..');
}

function isPremiumItem(item) {
  return String(item?.access || '').toLowerCase() === 'premium';
}

function readPublicPrompts() {
  return readJson(DATA_FILE, []).map(item => ({ ...item, access: 'Free' }));
}

function readPrivatePrompts() {
  return readJson(PRIVATE_DATA_FILE, []).map(item => ({ ...item, access: 'Premium' }));
}

function readAllPrompts() {
  return [...readPublicPrompts(), ...readPrivatePrompts()];
}

function writePromptStores(prompts) {
  const publicPrompts = [];
  const privatePrompts = [];
  for (const item of prompts) {
    if (isPremiumItem(item)) privatePrompts.push({ ...item, access: 'Premium' });
    else publicPrompts.push({ ...item, access: 'Free' });
  }
  writeJson(DATA_FILE, publicPrompts);
  writeJson(PRIVATE_DATA_FILE, privatePrompts);
}

function removeLocalImageIfUnused(imagePath, prompts) {
  if (!isLocalImagePath(imagePath)) return false;
  const stillUsed = prompts.some(item => item.image === imagePath);
  if (stillUsed) return false;
  const fullPath = path.join(ROOT, imagePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
}

function saveUploadedImage(file, baseName, access = 'Free') {  if (!file || !file.dataUrl) return null;
  const match = String(file.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Image upload format is invalid.');

  const mime = match[1].toLowerCase();
  const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : mime.includes('gif') ? 'gif' : 'png';
  const rawName = path.basename(String(file.name || `${baseName}.${ext}`), path.extname(String(file.name || '')));
  const filename = `${slugify(baseName || rawName, 'image')}-${Date.now().toString(36)}.${ext}`;
  const isPremium = String(access || '').toLowerCase() === 'premium';
  const imageDir = isPremium ? PRIVATE_IMAGE_DIR : PUBLIC_IMAGE_DIR;
  const webDir = isPremium ? 'private-assets/images' : 'assets/images';
  fs.mkdirSync(imageDir, { recursive: true });
  fs.writeFileSync(path.join(imageDir, filename), Buffer.from(match[2], 'base64'));
  return `${webDir}/${filename}`;
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

  await runGit(['add', '--', 'data/prompts.json', 'prompts.js', 'download-assets.js', 'index.html', 'detail.html']);
  const newImages = await runGit(['ls-files', '--others', '--exclude-standard', 'assets/images']);
  const imageFiles = newImages.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (imageFiles.length) {
    await runGit(['add', '--', ...imageFiles]);
  }

  const prompts = readPublicPrompts();
  const usedImages = new Set(prompts.map(item => item.image).filter(Boolean));
  const deletedStatus = status.split(/\r?\n/).map(line => line.trim()).filter(line => line.startsWith('D assets/images/') || line.startsWith('D  assets/images/'));
  const deletedImages = deletedStatus.map(line => line.replace(/^D\s+/, '').trim()).filter(file => !usedImages.has(file.replace(/\\/g, '/')));
  if (deletedImages.length) {
    await runGit(['add', '--', ...deletedImages]);
  }

  const staged = await runGit(['diff', '--cached', '--name-only']);
  if (!staged.trim()) return 'No publishable content changes. Unrelated local changes were left untouched.';

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
    send(res, 200, { prompts: readAllPrompts(), categories: CATEGORY_VALUES, access: ACCESS_VALUES, types: TYPE_VALUES });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/settings') {
    send(res, 200, publicTranslationConfig());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/ollama/models') {
    const config = getTranslationConfig();
    const data = await getJsonUrl(`${config.ollamaUrl}/api/tags`);
    const models = (data.models || []).map(model => model.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
    send(res, 200, { ok: true, models });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/settings') {
    const payload = await readBodyJson(req);
    const provider = normalizeTranslationProvider(payload.provider);
    const nextSecrets = {
      TRANSLATION_PROVIDER: provider,
      OPENAI_TRANSLATION_MODEL: String(payload.openAIModel || payload.model || '').trim() || DEFAULT_OPENAI_TRANSLATION_MODEL,
      OLLAMA_TRANSLATION_MODEL: String(payload.ollamaModel || '').trim() || DEFAULT_OLLAMA_MODEL,
      OLLAMA_BASE_URL: String(payload.ollamaUrl || '').trim() || DEFAULT_OLLAMA_URL,
    };
    if (Object.prototype.hasOwnProperty.call(payload, 'openAIKey')) {
      nextSecrets.OPENAI_API_KEY = String(payload.openAIKey || '').trim();
    }
    writeSecrets(nextSecrets);
    send(res, 200, { ok: true, ...publicTranslationConfig() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/translate') {
    const payload = await readBodyJson(req);
    const result = await translatePromptItem(payload.item || {}, payload.direction || 'auto');
    send(res, 200, { ok: true, ...result });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/prompts') {    const payload = await readBodyJson(req);
    const prompts = readAllPrompts();
    const existingIndex = prompts.findIndex(p => p.id === payload.item?.id);
    const existing = existingIndex >= 0 ? prompts[existingIndex] : null;
    const item = normalizePrompt(payload.item || {}, existing);
    const imagePath = saveUploadedImage(payload.imageFile, item.title || item.titleZh || item.id, item.access);
    if (imagePath) item.image = imagePath;
    const replacedImage = imagePath && existing?.image && existing.image !== item.image ? existing.image : '';
    if (!item.image) throw new Error('Please choose an image before saving.');

    const duplicate = prompts.find(p => p.id === item.id && (!existing || p !== existing));
    if (duplicate) item.id = `${item.id}-${Date.now().toString(36)}`;

    const nextPrompts = existingIndex >= 0
      ? [item, ...prompts.filter(p => p.id !== existing.id)]
      : [item, ...prompts];
    if (replacedImage) removeLocalImageIfUnused(replacedImage, nextPrompts);

    writePromptStores(nextPrompts);
    const built = build();
    send(res, 200, { ok: true, item, built });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/prompts/delete') {
    const payload = await readBodyJson(req);
    const id = String(payload.id || '').trim();
    if (!id) throw new Error('Prompt id is required.');
    const prompts = readAllPrompts();
    const target = prompts.find(item => item.id === id);
    if (!target) throw new Error('Prompt was not found.');
    const nextPrompts = prompts.filter(item => item.id !== id);
    writePromptStores(nextPrompts);
    const imageRemoved = payload.deleteImage !== false ? removeLocalImageIfUnused(target.image, nextPrompts) : false;
    const built = build();
    send(res, 200, { ok: true, deletedId: id, imageRemoved, built });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/build') {    send(res, 200, { ok: true, built: build() });
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
