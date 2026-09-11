// Created: 2026-09-11 19:47:57 +09:00
// Modified: 2026-09-11 21:00:41 +09:00
const input = document.querySelector('#imageInput');
const dropzone = document.querySelector('#dropzone');
const previewWrap = document.querySelector('#previewWrap');
const preview = document.querySelector('#preview');
const chooseButton = document.querySelector('#chooseButton');
const clearButton = document.querySelector('#clearButton');
const recognizeButton = document.querySelector('#recognizeButton');
const status = document.querySelector('#status');
const statusMessage = document.querySelector('#statusMessage');
const retryButton = document.querySelector('#retryButton');
const results = document.querySelector('#results');
const addIngredientButton = document.querySelector('#addIngredient');
const notes = document.querySelector('#notes');
const recipeButton = document.querySelector('#recipeButton');
const recipes = document.querySelector('#recipes');
const servings = document.querySelector('#servings');
const maxMinutes = document.querySelector('#maxMinutes');
const difficulty = document.querySelector('#difficulty');
const recipeDiet = document.querySelector('#recipeDiet');
const avoid = document.querySelector('#avoid');
const profileForm = document.querySelector('#profileForm');
const profileStatus = document.querySelector('#profileStatus');
const profileSave = document.querySelector('#profileSave');
const deleteProfile = document.querySelector('#deleteProfile');
const savedSearch = document.querySelector('#savedSearch');
const savedSort = document.querySelector('#savedSort');
const savedStatus = document.querySelector('#savedStatus');
const savedRecipes = document.querySelector('#savedRecipes');
let selectedFile;
let previewUrl;
let recognizedItems = [];
let lastRecognitionError = false;

function addRecipeList(card, heading, items, ordered = false, className = '') {
  if (!items.length) return;
  const title = document.createElement('h4'); title.textContent = heading;
  const list = document.createElement(ordered ? 'ol' : 'ul'); if (className) list.className = className;
  items.forEach((text) => { const item = document.createElement('li'); item.textContent = text; list.append(item); });
  card.append(title, list);
}

function setStatus(message, loading = false, retry = false) { statusMessage.textContent = message; status.classList.toggle('loading', loading); retryButton.hidden = !retry; }
function splitValues(value) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function setProfileStatus(message, loading = false) { profileStatus.textContent = message; profileStatus.classList.toggle('loading', loading); }
function setSavedStatus(message, loading = false) { savedStatus.textContent = message; savedStatus.classList.toggle('loading', loading); }
function sessionExpired() { setProfileStatus('세션이 만료되었습니다. 프로필을 다시 저장해 주세요.'); setSavedStatus('세션이 만료되었습니다. 페이지를 새로고침해 다시 시작해 주세요.'); }
async function responseData(response) { let data = {}; try { data = await response.json(); } catch { data = {}; } if (response.status === 401) { sessionExpired(); throw new Error('세션이 만료되었습니다. 페이지를 새로고침해 다시 시작해 주세요.'); } if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.'); return data; }
function revokePreviewUrl() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
}
async function loadProfile() {
  try { const profile = await responseData(await fetch('/api/profile')); if (!profile) return;
  document.querySelector('#displayName').value = profile.displayName || '';
  document.querySelector('#defaultServings').value = profile.servingsDefault || 2;
  document.querySelector('#defaultMinutes').value = profile.defaultMaxMinutes || 30;
  document.querySelector('#diet').value = profile.diet || 'none';
  document.querySelector('#allergies').value = (profile.allergies || []).join(', ');
  document.querySelector('#avoidIngredients').value = (profile.avoidIngredients || []).join(', ');
  servings.value = profile.servingsDefault || 2; maxMinutes.value = profile.defaultMaxMinutes || 30; recipeDiet.value = profile.diet || 'none'; avoid.value = [...(profile.allergies || []), ...(profile.avoidIngredients || [])].join(', '); setProfileStatus(`현재 식단 선호: ${recipeDiet.options[recipeDiet.selectedIndex].textContent}. 다음 추천에 적용됩니다.`); } catch (error) { setProfileStatus(`프로필을 불러오지 못했습니다: ${error.message}`); }
}
async function loadSavedRecipes() {
  setSavedStatus('저장 레시피를 불러오는 중입니다...', true);
  try {
    const params = new URLSearchParams({ q: savedSearch.value, sort: savedSort.value }); const data = await responseData(await fetch(`/api/recipes/saved?${params}`)); savedRecipes.replaceChildren();
    if (!data.length) { setSavedStatus(''); const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = savedSearch.value ? '검색 조건에 맞는 레시피가 없습니다.' : '저장한 레시피가 없습니다. 추천 결과에서 저장해 보세요.'; savedRecipes.append(empty); return; }
    setSavedStatus(`${data.length}개의 저장 레시피`);
    data.forEach((item) => {
      const row = document.createElement('article'); row.className = 'saved-item'; const title = document.createElement('h3'); title.textContent = item.recipe.title; const date = document.createElement('p'); date.textContent = new Date(item.createdAt).toLocaleDateString('ko-KR');
      const detail = document.createElement('button'); detail.type = 'button'; detail.className = 'button subtle detail-button'; detail.textContent = '상세 보기'; detail.setAttribute('aria-expanded', 'false'); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'button subtle'; remove.textContent = '삭제'; const detailBox = document.createElement('div'); detailBox.className = 'saved-detail'; detailBox.hidden = true;
      detail.addEventListener('click', async () => { if (!detailBox.hidden) { detailBox.hidden = true; detail.setAttribute('aria-expanded', 'false'); return; } detail.disabled = true; detail.textContent = '불러오는 중...'; try { const saved = await responseData(await fetch(`/api/recipes/saved/${item.id}`)); detailBox.replaceChildren(); renderRecipeDetails(detailBox, saved.recipe); detailBox.hidden = false; detail.setAttribute('aria-expanded', 'true'); } catch (error) { detailBox.textContent = `상세 정보를 불러오지 못했습니다: ${error.message}`; detailBox.hidden = false; } finally { detail.disabled = false; detail.textContent = '상세 보기'; } });
      remove.addEventListener('click', async () => { if (remove.disabled || !window.confirm('이 레시피를 삭제할까요? 삭제 후 복구할 수 없습니다.')) return; remove.disabled = true; remove.textContent = '삭제 중...'; try { await responseData(await fetch(`/api/recipes/saved/${item.id}`, { method: 'DELETE' })); await loadSavedRecipes(); } catch (error) { remove.disabled = false; remove.textContent = '삭제'; setSavedStatus(`레시피 삭제에 실패했습니다: ${error.message}`); } });
      row.append(title, date, detail, remove, detailBox); savedRecipes.append(row);
    });
  } catch (error) { savedRecipes.replaceChildren(); setSavedStatus(`저장 레시피를 불러오지 못했습니다: ${error.message}`); const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'button subtle'; retry.textContent = '다시 불러오기'; retry.addEventListener('click', loadSavedRecipes); savedRecipes.append(retry); }
}
function renderRecipeDetails(card, recipe) {
  const title = document.createElement('h4'); title.textContent = recipe.title; card.append(title);
  const summary = document.createElement('p'); summary.textContent = recipe.summary; card.append(summary);
  addRecipeList(card, '재료', (recipe.ingredients || []).map((item) => `${item.name} ${item.amount}`)); addRecipeList(card, '조리 순서', recipe.steps || [], true); addRecipeList(card, '팁', recipe.tips || []); addRecipeList(card, '주의사항', recipe.safetyNotes || []);
}
function clearRecognitionState(message = '사진을 올리면 인식 결과가 여기에 나타납니다.') { revokePreviewUrl(); selectedFile = undefined; input.value = ''; previewWrap.hidden = true; dropzone.hidden = false; recognizeButton.disabled = true; recipeButton.disabled = true; addIngredientButton.hidden = true; recognizedItems = []; results.replaceChildren(); recipes.replaceChildren(); notes.textContent = ''; setStatus(message); }
function updateRecipeAvailability() { recipeButton.disabled = ![...results.querySelectorAll('.result-item input')].some((field) => field.value.trim()); }
function renderIngredients() {
  results.replaceChildren(); recognizedItems.forEach((item, index) => { const row = document.createElement('div'); row.className = 'result-item'; const name = document.createElement('input'); name.value = item.name; name.setAttribute('aria-label', `${index + 1}번째 재료명`); const quantity = document.createElement('input'); quantity.value = item.quantity; quantity.setAttribute('aria-label', `${index + 1}번째 재료 수량`); const condition = document.createElement('input'); condition.value = item.condition; condition.setAttribute('aria-label', `${index + 1}번째 재료 상태`); const meta = document.createElement('span'); meta.className = 'meta'; meta.textContent = `확신도 ${Math.round(item.confidence * 100)}%`; const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'button remove-ingredient'; remove.textContent = '삭제'; remove.addEventListener('click', () => { recognizedItems.splice(index, 1); renderIngredients(); }); row.append(name, quantity, condition, meta, remove); results.append(row); }); addIngredientButton.hidden = false; updateRecipeAvailability();
}
function editedIngredients() { return [...results.querySelectorAll('.result-item')].map((row, index) => ({ ...recognizedItems[index], name: row.children[0].value.trim(), quantity: row.children[1].value.trim() || '알 수 없음', condition: row.children[2].value.trim() || '알 수 없음' })).filter((item) => item.name); }
function selectFile(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { clearRecognitionState('지원 형식(JPEG, PNG, WebP)의 10MB 이하 이미지를 선택해 주세요.'); return; }
  revokePreviewUrl(); selectedFile = file; previewUrl = URL.createObjectURL(file); preview.src = previewUrl; dropzone.hidden = true; previewWrap.hidden = false; recognizeButton.disabled = false; setStatus('사진이 준비되었습니다. 인식을 시작해 보세요.');
}
chooseButton.addEventListener('click', () => input.click());
clearButton.addEventListener('click', () => clearRecognitionState());
input.addEventListener('change', () => selectFile(input.files[0]));
['dragenter', 'dragover'].forEach((event) => dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((event) => dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', (event) => selectFile(event.dataTransfer.files[0]));
recognizeButton.addEventListener('click', async () => {
  if (!selectedFile) return;
  recognizeButton.disabled = true; clearButton.disabled = true; setStatus('사진 속 재료를 살펴보는 중입니다...', true); results.replaceChildren(); notes.textContent = ''; recipes.replaceChildren();
  const form = new FormData(); form.append('image', selectedFile);
  try {
    const data = await responseData(await fetch('/api/ingredients/recognize', { method: 'POST', body: form })); recognizedItems = data.items || []; lastRecognitionError = false; notes.textContent = data.notes || '';
    if (!recognizedItems.length) { addIngredientButton.hidden = false; setStatus('뚜렷한 재료를 찾지 못했습니다. 사진을 밝게 찍거나 재료를 직접 추가해 보세요.'); return; }
    renderIngredients(); setStatus(`${recognizedItems.length}개의 재료를 찾았습니다. 이름, 수량, 상태를 확인해 주세요.`);
  } catch (error) { lastRecognitionError = true; setStatus(`${error.message} 사진을 확인한 뒤 다시 시도해 주세요.`, false, true); } finally { recognizeButton.disabled = !selectedFile; clearButton.disabled = false; }
});
recipeButton.addEventListener('click', async () => {
  const ingredients = editedIngredients();
  if (!ingredients.length) return;
  recipeButton.disabled = true; recipes.replaceChildren(); setStatus('재료에 맞는 레시피를 만드는 중입니다...', true);
  try {
    const data = await responseData(await fetch('/api/recipes/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients, preferences: { servings: Number(servings.value), maxMinutes: Number(maxMinutes.value), difficulty: difficulty.value, diet: recipeDiet.value, avoid: splitValues(avoid.value) } }) }));
    if (!data.recipes?.length) { setStatus('조건에 맞는 레시피를 찾지 못했습니다. 식단이나 시간 조건을 조금 넓혀 다시 시도해 보세요.', false, true); return; }
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
      const save = document.createElement('button'); save.className = 'button primary save-button'; save.type = 'button'; save.textContent = '레시피 저장'; save.addEventListener('click', async () => { if (save.disabled) return; save.disabled = true; save.textContent = '저장 중...'; try { await responseData(await fetch('/api/recipes/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipe, sourceIngredients: ingredients }) })); save.textContent = '저장됨'; setStatus('레시피를 저장했습니다. 저장 목록에서 상세를 다시 볼 수 있습니다.'); await loadSavedRecipes(); } catch (error) { save.disabled = false; save.textContent = '다시 저장'; setStatus(`레시피 저장에 실패했습니다: ${error.message}`); } }); card.append(save);
      recipes.append(card);
    });
  } catch (error) { setStatus(`레시피 추천에 실패했습니다: ${error.message}`, false, true); } finally { recipeButton.disabled = !editedIngredients().length; }
});
profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (profileSave.disabled) return; profileSave.disabled = true; profileSave.textContent = '저장 중...'; setProfileStatus('프로필을 저장하는 중입니다...', true);
  try { const profile = await responseData(await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: document.querySelector('#displayName').value, servingsDefault: Number(document.querySelector('#defaultServings').value), defaultMaxMinutes: Number(document.querySelector('#defaultMinutes').value), diet: document.querySelector('#diet').value, allergies: splitValues(document.querySelector('#allergies').value), avoidIngredients: splitValues(document.querySelector('#avoidIngredients').value) }) })); recipeDiet.value = profile.diet; servings.value = profile.servingsDefault; maxMinutes.value = profile.defaultMaxMinutes; avoid.value = [...profile.allergies, ...profile.avoidIngredients].join(', '); setProfileStatus(`프로필이 저장되었습니다. ${recipeDiet.options[recipeDiet.selectedIndex].textContent} 식단이 다음 추천에 적용됩니다.`); } catch (error) { setProfileStatus(`프로필 저장에 실패했습니다: ${error.message}`); } finally { profileSave.disabled = false; profileSave.textContent = '프로필 저장'; }
});
deleteProfile.addEventListener('click', async () => { if (deleteProfile.disabled || !window.confirm('프로필과 저장 레시피를 모두 삭제할까요? 삭제 후 복구할 수 없습니다.')) return; deleteProfile.disabled = true; deleteProfile.textContent = '삭제 중...'; try { await responseData(await fetch('/api/profile', { method: 'DELETE' })); profileForm.reset(); clearRecognitionState(); await loadSavedRecipes(); setProfileStatus('모든 데이터가 삭제되었습니다.'); } catch (error) { setProfileStatus(`전체 데이터 삭제에 실패했습니다: ${error.message}`); } finally { deleteProfile.disabled = false; deleteProfile.textContent = '전체 데이터 삭제'; } });
retryButton.addEventListener('click', () => { if (lastRecognitionError) recognizeButton.click(); else recipeButton.click(); });
addIngredientButton.addEventListener('click', () => { recognizedItems.push({ name: '', quantity: '알 수 없음', condition: '알 수 없음', confidence: 0 }); renderIngredients(); results.lastElementChild?.querySelector('input')?.focus(); });
results.addEventListener('input', updateRecipeAvailability);
savedSearch.addEventListener('input', loadSavedRecipes); savedSort.addEventListener('change', loadSavedRecipes);
loadProfile(); loadSavedRecipes();