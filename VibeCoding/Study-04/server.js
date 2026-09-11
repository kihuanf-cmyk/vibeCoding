// Created: 2026-09-11 19:47:57 +09:00
// Modified: 2026-09-11 20:53:15 +09:00
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(ROOT, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MODEL = 'inclusionai/ling-3.0-flash-vl:free';
const EXTERNAL_REQUEST_TIMEOUT_MS = 45 * 1000;
const MAX_EXPENSIVE_REQUESTS_PER_CLIENT = 1;
const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const activeExpensiveRequests = new Map();
let storeWriteQueue = Promise.resolve();

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('request_too_large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('invalid_json')); }
    });
    request.on('error', reject);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function getUserId(request, response) {
  const cookies = String(request.headers.cookie || '');
  const existing = cookies.match(/(?:^|;\s*)fridge_user=([^;]+)/)?.[1];
  if (existing && /^[a-zA-Z0-9-]{16,64}$/.test(existing)) return existing;
  const userId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  response.setHeader('Set-Cookie', `fridge_user=${userId}; HttpOnly; SameSite=Lax; Path=/`);
  return userId;
}

function readStore() {
  if (!fs.existsSync(STORE_PATH)) return { profiles: {}, recipes: {} };
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch { return { profiles: {}, recipes: {} }; }
}

function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function updateStore(mutator) {
  const operation = storeWriteQueue.then(async () => {
    const store = readStore();
    const result = await mutator(store);
    writeStore(store);
    return result;
  });
  storeWriteQueue = operation.catch(() => undefined);
  return operation;
}

function clientKey(request) {
  return request.socket?.remoteAddress || 'unknown';
}

function acquireExpensiveRequest(request, endpoint) {
  const key = `${endpoint}:${clientKey(request)}`;
  const active = activeExpensiveRequests.get(key) || 0;
  if (active >= MAX_EXPENSIVE_REQUESTS_PER_CLIENT) return null;
  activeExpensiveRequests.set(key, active + 1);
  return () => {
    const remaining = (activeExpensiveRequests.get(key) || 1) - 1;
    if (remaining > 0) activeExpensiveRequests.set(key, remaining);
    else activeExpensiveRequests.delete(key);
  };
}

function sendRateLimited(response) {
  response.setHeader('Retry-After', '1');
  sendJson(response, 429, { error: '요청이 이미 처리 중입니다. 잠시 후 다시 시도해 주세요.' });
}

function externalFetch(url, options) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS) });
}

function normalizeProfile(input, current = {}) {
  const diet = ['none', 'vegetarian', 'vegan', 'low-carb'].includes(input.diet) ? input.diet : (current.diet || 'none');
  const list = (value) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 30) : (Array.isArray(current[value]) ? current[value] : []);
  return {
    displayName: String(input.displayName ?? current.displayName ?? '').trim().slice(0, 40),
    servingsDefault: Math.max(1, Math.min(12, Number(input.servingsDefault ?? current.servingsDefault ?? 2) || 2)),
    diet,
    allergies: list(input.allergies ?? 'allergies'),
    avoidIngredients: list(input.avoidIngredients ?? 'avoidIngredients'),
    defaultMaxMinutes: Math.max(5, Math.min(180, Number(input.defaultMaxMinutes ?? current.defaultMaxMinutes ?? 30) || 30))
  };
}

function normalizeSavedRecipe(input) {
  const recipe = input.recipe;
  if (!recipe || typeof recipe !== 'object' || !String(recipe.title || '').trim() || !Array.isArray(recipe.steps)) throw new Error('invalid_recipe');
  return { recipe, sourceIngredients: Array.isArray(input.sourceIngredients) ? input.sourceIngredients.slice(0, 50) : [] };
}

function recipeKey(recipe) { return JSON.stringify([recipe.title, recipe.steps]); }

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_IMAGE_BYTES + 1024 * 1024) {
        reject(new Error('request_too_large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function parseImage(request, body) {
  const contentType = request.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error('invalid_multipart');
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const start = body.indexOf(Buffer.from('\r\n\r\n'));
  if (start < 0) throw new Error('missing_file');
  const headerEnd = start + 4;
  const fileStart = body.indexOf(boundary, headerEnd);
  if (fileStart < 0) throw new Error('missing_file');
  const header = body.subarray(0, start).toString('utf8');
  const file = body.subarray(headerEnd, fileStart - 2);
  const contentTypeMatch = header.match(/Content-Type:\s*([^\r\n]+)/i);
  const mime = (contentTypeMatch ? contentTypeMatch[1] : '').trim().toLowerCase();
  const supported = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!supported.has(mime)) throw new Error('unsupported_type');
  if (!file.length || file.length > MAX_IMAGE_BYTES) throw new Error('invalid_size');
  const validSignature = (mime === 'image/jpeg' && file.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (mime === 'image/png' && file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mime === 'image/webp' && file.subarray(0, 4).toString() === 'RIFF' && file.subarray(8, 12).toString() === 'WEBP');
  if (!validSignature) throw new Error('invalid_image');
  return { mime, data: file.toString('base64') };
}

function normalizeResult(raw) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const result = JSON.parse(cleaned);
  const items = Array.isArray(result.items) ? result.items.map((item) => ({
    name: String(item.name || '').trim(),
    quantity: String(item.quantity || '알 수 없음').trim(),
    condition: String(item.condition || '알 수 없음').trim(),
    confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0))
  })).filter((item) => item.name) : [];
  return { items, notes: String(result.notes || '').trim() };
}

function normalizeRecipes(raw) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const result = JSON.parse(cleaned);
  const recipes = Array.isArray(result.recipes) ? result.recipes.slice(0, 5).map((recipe) => ({
    title: String(recipe.title || '').trim(),
    summary: String(recipe.summary || '').trim(),
    servings: Math.max(1, Number(recipe.servings) || 1),
    timeMinutes: Math.max(1, Number(recipe.timeMinutes) || 1),
    difficulty: ['easy', 'medium', 'hard'].includes(recipe.difficulty) ? recipe.difficulty : 'medium',
    usedIngredients: Array.isArray(recipe.usedIngredients) ? recipe.usedIngredients.map(String) : [],
    requiredMissing: Array.isArray(recipe.requiredMissing) ? recipe.requiredMissing.map(String) : [],
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((item) => ({ name: String(item.name || ''), amount: String(item.amount || '') })).filter((item) => item.name) : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps.map(String).filter(Boolean) : [],
    tips: Array.isArray(recipe.tips) ? recipe.tips.map(String).filter(Boolean) : [],
    safetyNotes: Array.isArray(recipe.safetyNotes) ? recipe.safetyNotes.map(String).filter(Boolean) : []
  })).filter((recipe) => recipe.title && recipe.steps.length) : [];
  return { recipes };
}

async function recognize(image) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('missing_api_key');
  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: [
      { type: 'text', text: 'Identify only the food ingredients visibly present in this refrigerator image. Return JSON only in this exact shape: {"items":[{"name":"string","quantity":"string","condition":"string","confidence":0.0}],"notes":"string"}. Do not invent hidden items. Use Korean names where possible. If uncertain, lower confidence.' },
      { type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.data}` } }
    ] }],
    max_tokens: 512,
    reasoning: { effort: 'none' }
  };
  const result = await externalFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost', 'X-Title': 'Fridge ingredient recognition' },
    body: JSON.stringify(payload)
  });
  const data = await result.json();
  if (!result.ok) {
    const error = data.error?.message || 'OpenRouter request failed';
    const failure = new Error(error);
    failure.status = result.status;
    throw failure;
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('empty_model_response');
  return normalizeResult(content);
}

async function recommendRecipes(input) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('missing_api_key');
  if (!Array.isArray(input.ingredients) || !input.ingredients.length) throw new Error('ingredients_required');
  const preferences = input.preferences || {};
  const ingredients = input.ingredients.slice(0, 50).map((item) => ({
    name: String(item.name || '').trim(), quantity: String(item.quantity || '알 수 없음').trim(), condition: String(item.condition || '알 수 없음').trim()
  })).filter((item) => item.name);
  if (!ingredients.length) throw new Error('ingredients_required');
  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: `Using only these confirmed ingredients, generate 3 practical recipes. Return JSON only in this exact shape: {"recipes":[{"title":"string","summary":"string","servings":2,"timeMinutes":15,"difficulty":"easy","usedIngredients":["string"],"requiredMissing":["string"],"ingredients":[{"name":"string","amount":"string"}],"steps":["string"],"tips":["string"],"safetyNotes":["string"]}]}. Never present missing ingredients as available. Respect these preferences: ${JSON.stringify({ servings: preferences.servings || 2, maxMinutes: preferences.maxMinutes || 30, difficulty: preferences.difficulty || 'easy', diet: preferences.diet || 'none', avoid: Array.isArray(preferences.avoid) ? preferences.avoid.slice(0, 30) : [] })}. Confirmed ingredients: ${JSON.stringify(ingredients)}` }],
    max_tokens: 1800,
    reasoning: { effort: 'none' }
  };
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await externalFetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost', 'X-Title': 'Fridge recipe recommendation' }, body: JSON.stringify(payload)
      });
      const data = await result.json();
      if (!result.ok) { const failure = new Error(data.error?.message || 'OpenRouter request failed'); failure.status = result.status; throw failure; }
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('empty_model_response');
      return normalizeRecipes(content);
    } catch (error) {
      lastError = error;
      if (attempt === 1 || (error.status && error.status < 500 && error.status !== 429)) throw error;
    }
  }
  throw lastError;
}

async function handle(request, response) {
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
    response.end(fs.readFileSync(path.join(ROOT, 'public', 'index.html')));
    return;
  }
  if (request.method === 'GET' && request.url.startsWith('/static/')) {
    const filePath = path.join(ROOT, 'public', request.url.replace('/static/', ''));
    if (!filePath.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(filePath)) return sendJson(response, 404, { error: 'not_found' });
    response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    response.end(fs.readFileSync(filePath));
    return;
  }
  if (request.method === 'POST' && request.url === '/api/recipes/recommend') {
    const release = acquireExpensiveRequest(request, 'recommend');
    if (!release) return sendRateLimited(response);
    try { sendJson(response, 200, await recommendRecipes(await readJsonBody(request))); }
    catch (error) { const status = error.status || (error.message === 'ingredients_required' || error.message === 'invalid_json' ? 400 : 502); sendJson(response, status, { error: status === 400 ? '재료 목록을 확인해 주세요.' : '레시피 생성에 실패했습니다.', detail: error.message }); }
    finally { release(); }
    return;
  }
  if (request.method === 'POST' && request.url === '/api/ingredients/recognize') {
    const release = acquireExpensiveRequest(request, 'recognize');
    if (!release) return sendRateLimited(response);
    try {
      const image = parseImage(request, await readBody(request));
      const result = await recognize(image);
      sendJson(response, 200, result);
    } catch (error) {
      const status = error.status || (error.message === 'missing_api_key' ? 500 : error.message.includes('invalid') || error.message.includes('unsupported') || error.message.includes('missing_file') ? 400 : 502);
      sendJson(response, status, { error: status === 400 ? '이미지 파일을 확인해 주세요.' : '이미지 인식에 실패했습니다.', detail: error.message });
    } finally { release(); }
    return;
  }
  if (request.url.startsWith('/api/')) {
    const userId = getUserId(request, response);
    const store = ['GET', 'DELETE'].includes(request.method) ? readStore() : null;
    if (request.method === 'GET' && request.url === '/api/profile') {
      sendJson(response, 200, store.profiles[userId] || null);
      return;
    }
    if (['POST', 'PATCH'].includes(request.method) && request.url === '/api/profile') {
      try {
        const input = await readJsonBody(request);
        const savedProfile = await updateStore((currentStore) => {
          const profile = normalizeProfile(input, currentStore.profiles[userId] || {});
          if (!profile.displayName) throw new Error('display_name_required');
          const now = new Date().toISOString();
          currentStore.profiles[userId] = { id: userId, ...profile, createdAt: currentStore.profiles[userId]?.createdAt || now, updatedAt: now };
          return currentStore.profiles[userId];
        });
        sendJson(response, 200, savedProfile);
      } catch (error) { sendJson(response, 400, { error: '프로필 정보를 확인해 주세요.', detail: error.message }); }
      return;
    }
    if (request.method === 'DELETE' && request.url === '/api/profile') {
      updateStore((currentStore) => {
        delete currentStore.profiles[userId];
        Object.keys(currentStore.recipes).filter((id) => currentStore.recipes[id].userId === userId).forEach((id) => delete currentStore.recipes[id]);
      }).then(() => sendJson(response, 200, { deleted: true })).catch(() => sendJson(response, 500, { error: 'server_error' }));
      return;
    }
    if (request.method === 'GET' && request.url.startsWith('/api/recipes/saved')) {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      const requestedId = url.pathname.split('/').filter(Boolean)[3];
      const userRecipes = Object.values(store.recipes).filter((item) => item.userId === userId);
      if (requestedId) {
        const found = userRecipes.find((item) => item.id === requestedId);
        sendJson(response, found ? 200 : 404, found || { error: 'not_found' });
      } else {
        const query = (url.searchParams.get('q') || '').toLowerCase();
        const sort = url.searchParams.get('sort') || 'latest';
        const filtered = userRecipes.filter((item) => !query || item.recipe.title.toLowerCase().includes(query) || JSON.stringify(item.recipe.ingredients || []).toLowerCase().includes(query));
        filtered.sort((a, b) => sort === 'title' ? a.recipe.title.localeCompare(b.recipe.title) : b.createdAt.localeCompare(a.createdAt));
        sendJson(response, 200, filtered);
      }
      return;
    }
    if (request.method === 'POST' && request.url === '/api/recipes/saved') {
      try {
        const input = normalizeSavedRecipe(await readJsonBody(request));
        const result = await updateStore((currentStore) => {
          const duplicate = Object.values(currentStore.recipes).find((item) => item.userId === userId && recipeKey(item.recipe) === recipeKey(input.recipe));
          if (duplicate) return { status: 200, item: duplicate };
          const now = new Date().toISOString();
          const saved = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`, userId, recipe: input.recipe, sourceIngredients: input.sourceIngredients, createdAt: now, updatedAt: now };
          currentStore.recipes[saved.id] = saved;
          return { status: 201, item: saved };
        });
        sendJson(response, result.status, result.item);
      } catch (error) { sendJson(response, 400, { error: '저장할 레시피를 확인해 주세요.', detail: error.message }); }
      return;
    }
    if (request.method === 'DELETE' && request.url.startsWith('/api/recipes/saved/')) {
      const recipeId = request.url.split('/').pop();
      if (!store.recipes[recipeId] || store.recipes[recipeId].userId !== userId) { sendJson(response, 404, { error: 'not_found' }); return; }
      updateStore((currentStore) => {
        if (currentStore.recipes[recipeId]?.userId === userId) delete currentStore.recipes[recipeId];
      }).then(() => sendJson(response, 200, { deleted: true })).catch(() => sendJson(response, 500, { error: 'server_error' }));
      return;
    }
  }
  return sendJson(response, 404, { error: 'not_found' });
}

loadEnv();
http.createServer((request, response) => handle(request, response).catch(() => sendJson(response, 500, { error: 'server_error' }))).listen(PORT, () => console.log(`Fridge app running at http://localhost:${PORT}`));