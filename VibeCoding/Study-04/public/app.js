// Created: 2026-09-11 19:47:57 +09:00
const input = document.querySelector('#imageInput');
const dropzone = document.querySelector('#dropzone');
const previewWrap = document.querySelector('#previewWrap');
const preview = document.querySelector('#preview');
const chooseButton = document.querySelector('#chooseButton');
const clearButton = document.querySelector('#clearButton');
const recognizeButton = document.querySelector('#recognizeButton');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const notes = document.querySelector('#notes');
const recipeButton = document.querySelector('#recipeButton');
const recipes = document.querySelector('#recipes');
const servings = document.querySelector('#servings');
const maxMinutes = document.querySelector('#maxMinutes');
const difficulty = document.querySelector('#difficulty');
const avoid = document.querySelector('#avoid');
const profileForm = document.querySelector('#profileForm');
const profileStatus = document.querySelector('#profileStatus');
const savedSearch = document.querySelector('#savedSearch');
const savedSort = document.querySelector('#savedSort');
const savedRecipes = document.querySelector('#savedRecipes');
let selectedFile;
let recognizedItems = [];

function addRecipeList(card, heading, items, ordered = false, className = '') {
  if (!items.length) return;
  const title = document.createElement('h4'); title.textContent = heading;
  const list = document.createElement(ordered ? 'ol' : 'ul'); if (className) list.className = className;
  items.forEach((text) => { const item = document.createElement('li'); item.textContent = text; list.append(item); });
  card.append(title, list);
}

function setStatus(message, loading = false) { status.textContent = message; status.classList.toggle('loading', loading); }
function splitValues(value) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function setProfileStatus(message) { profileStatus.textContent = message; }
async function loadProfile() {
  const response = await fetch('/api/profile'); const profile = await response.json();
  if (!profile) return;
  document.querySelector('#displayName').value = profile.displayName || '';
  document.querySelector('#defaultServings').value = profile.servingsDefault || 2;
  document.querySelector('#defaultMinutes').value = profile.defaultMaxMinutes || 30;
  document.querySelector('#diet').value = profile.diet || 'none';
  document.querySelector('#allergies').value = (profile.allergies || []).join(', ');
  document.querySelector('#avoidIngredients').value = (profile.avoidIngredients || []).join(', ');
  servings.value = profile.servingsDefault || 2; maxMinutes.value = profile.defaultMaxMinutes || 30; difficulty.value = 'easy'; avoid.value = [...(profile.allergies || []), ...(profile.avoidIngredients || [])].join(', ');
}
async function loadSavedRecipes() {
  const params = new URLSearchParams({ q: savedSearch.value, sort: savedSort.value });
  const response = await fetch(`/api/recipes/saved?${params}`); const data = await response.json(); savedRecipes.replaceChildren();
  if (!data.length) { const empty = document.createElement('p'); empty.className = 'status'; empty.textContent = '저장한 레시피가 없습니다.'; savedRecipes.append(empty); return; }
  data.forEach((item) => { const row = document.createElement('article'); row.className = 'saved-item'; const title = document.createElement('h3'); title.textContent = item.recipe.title; const date = document.createElement('p'); date.textContent = new Date(item.createdAt).toLocaleDateString('ko-KR'); const remove = document.createElement('button'); remove.className = 'button subtle'; remove.textContent = '삭제'; remove.addEventListener('click', async () => { if (!window.confirm('이 레시피를 삭제할까요?')) return; await fetch(`/api/recipes/saved/${item.id}`, { method: 'DELETE' }); loadSavedRecipes(); }); row.append(title, date, remove); savedRecipes.append(row); });
}
function selectFile(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { setStatus('JPEG, PNG, WebP 형식의 10MB 이하 이미지를 선택해 주세요.'); return; }
  selectedFile = file; preview.src = URL.createObjectURL(file); dropzone.hidden = true; previewWrap.hidden = false; recognizeButton.disabled = false; setStatus('사진이 준비되었습니다. 인식을 시작해 보세요.');
}
chooseButton.addEventListener('click', () => input.click());
clearButton.addEventListener('click', () => { selectedFile = undefined; recognizedItems = []; input.value = ''; previewWrap.hidden = true; dropzone.hidden = false; recognizeButton.disabled = true; recipeButton.disabled = true; results.replaceChildren(); recipes.replaceChildren(); notes.textContent = ''; setStatus('사진을 올리면 인식 결과가 여기에 나타납니다.'); });
input.addEventListener('change', () => selectFile(input.files[0]));
['dragenter', 'dragover'].forEach((event) => dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((event) => dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', (event) => selectFile(event.dataTransfer.files[0]));
recognizeButton.addEventListener('click', async () => {
  if (!selectedFile) return;
  recognizeButton.disabled = true; setStatus('사진 속 재료를 살펴보는 중입니다...', true); results.replaceChildren(); notes.textContent = '';
  const form = new FormData(); form.append('image', selectedFile);
  try {
    const response = await fetch('/api/ingredients/recognize', { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '인식에 실패했습니다.');
    recognizedItems = data.items;
    recipeButton.disabled = !recognizedItems.length;
    setStatus(data.items.length ? `${data.items.length}개의 재료를 찾았습니다. 이름을 눌러 수정할 수 있습니다.` : '뚜렷한 재료를 찾지 못했습니다.');
    data.items.forEach((item) => { const row = document.createElement('div'); row.className = 'result-item'; const name = document.createElement('input'); name.value = item.name; name.setAttribute('aria-label', '재료명'); const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `${item.quantity} · ${item.condition} · 확신도 ${Math.round(item.confidence * 100)}%`; row.append(name, meta); results.append(row); });
    notes.textContent = data.notes;
  } catch (error) { setStatus(error.message); } finally { recognizeButton.disabled = false; }
});
recipeButton.addEventListener('click', async () => {
  const ingredients = [...results.querySelectorAll('.result-item')].map((row, index) => ({ ...recognizedItems[index], name: row.querySelector('input').value.trim() })).filter((item) => item.name);
  if (!ingredients.length) return;
  recipeButton.disabled = true; recipes.replaceChildren(); setStatus('재료에 맞는 레시피를 만드는 중입니다...', true);
  try {
    const response = await fetch('/api/recipes/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients, preferences: { servings: Number(servings.value), maxMinutes: Number(maxMinutes.value), difficulty: difficulty.value, diet: 'none', avoid: avoid.value.split(',').map((value) => value.trim()).filter(Boolean) } }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || '레시피 생성에 실패했습니다.');
    setStatus(`${data.recipes.length}개의 레시피를 추천했습니다.`);
    data.recipes.forEach((recipe) => {
      const card = document.createElement('article'); card.className = 'recipe-card';
      const title = document.createElement('h3'); title.textContent = recipe.title;
      const summary = document.createElement('p'); summary.className = 'recipe-summary'; summary.textContent = recipe.summary;
      const meta = document.createElement('p'); meta.className = 'recipe-meta'; meta.textContent = `${recipe.timeMinutes}분 · ${recipe.servings}인분 · ${recipe.difficulty}`;
      card.append(title, summary, meta);
      addRecipeList(card, '재료', recipe.ingredients.map((item) => `${item.name} ${item.amount}`));
      if (recipe.requiredMissing.length) { const missing = document.createElement('p'); missing.className = 'missing'; missing.textContent = `추가 필요: ${recipe.requiredMissing.join(', ')}`; card.append(missing); }
      addRecipeList(card, '조리 순서', recipe.steps, true);
      addRecipeList(card, '주의사항', recipe.safetyNotes);
      const save = document.createElement('button'); save.className = 'button primary save-button'; save.textContent = '레시피 저장'; save.addEventListener('click', async () => { const saved = await fetch('/api/recipes/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipe, sourceIngredients: ingredients }) }); save.textContent = saved.ok ? '저장됨' : '저장 실패'; if (saved.ok) loadSavedRecipes(); }); card.append(save);
      recipes.append(card);
    });
  } catch (error) { setStatus(error.message); } finally { recipeButton.disabled = false; }
});
profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: document.querySelector('#displayName').value, servingsDefault: Number(document.querySelector('#defaultServings').value), defaultMaxMinutes: Number(document.querySelector('#defaultMinutes').value), diet: document.querySelector('#diet').value, allergies: splitValues(document.querySelector('#allergies').value), avoidIngredients: splitValues(document.querySelector('#avoidIngredients').value) }) });
  setProfileStatus(response.ok ? '프로필이 저장되었습니다.' : '프로필 저장에 실패했습니다.');
});
document.querySelector('#deleteProfile').addEventListener('click', async () => { if (!window.confirm('프로필과 저장 레시피를 모두 삭제할까요?')) return; const response = await fetch('/api/profile', { method: 'DELETE' }); if (response.ok) { profileForm.reset(); savedRecipes.replaceChildren(); setProfileStatus('모든 데이터가 삭제되었습니다.'); } });
savedSearch.addEventListener('input', loadSavedRecipes); savedSort.addEventListener('change', loadSavedRecipes);
loadProfile(); loadSavedRecipes();