/* =========================================================
   TOOLBOX — RANDOM NAME DRAW
========================================================= */
const DRAW_TOOL_STORAGE_KEY = 'beybladeX_drawTool_v1';
const PRIZE_DRAW_STORAGE_KEY = 'beybladeX_prizeDraw_v1';
let drawToolResults = [];
let drawAnimationTimer = null;
let drawAnimationInterval = null;
let prizeDrawWinners = [];
let prizeDrawInitialized = false;

function getDrawNames(){
  const input = document.getElementById('drawNamesInput');
  if(!input) return [];
  const seen = new Set();
  return input.value.split(/\r?\n/).map(name => name.trim()).filter(name => {
    if(!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function saveDrawTool(){
  const namesInput = document.getElementById('drawNamesInput');
  const countInput = document.getElementById('drawCountInput');
  if(!namesInput || !countInput) return;
  try{
    localStorage.setItem(DRAW_TOOL_STORAGE_KEY, JSON.stringify({
      names:namesInput.value,
      count:countInput.value
    }));
  }catch(e){}
}

function initDrawTool(){
  const namesInput = document.getElementById('drawNamesInput');
  const countInput = document.getElementById('drawCountInput');
  if(!namesInput || !countInput) return;
  try{
    const saved = JSON.parse(localStorage.getItem(DRAW_TOOL_STORAGE_KEY) || 'null');
    if(saved && typeof saved.names === 'string') namesInput.value = saved.names;
    if(saved && Number(saved.count) >= 1) countInput.value = String(Math.floor(Number(saved.count)));
  }catch(e){}
  updateDrawToolState(false);
}

function resetDrawResults(){
  if(drawAnimationTimer){ window.clearTimeout(drawAnimationTimer); drawAnimationTimer = null; }
  if(drawAnimationInterval){ window.clearInterval(drawAnimationInterval); drawAnimationInterval = null; }
  drawToolResults = [];
  const list = document.getElementById('drawResultList');
  const empty = document.getElementById('drawResultEmpty');
  const copyBtn = document.getElementById('drawCopyBtn');
  const result = document.querySelector('.draw-result');
  const drawBtn = document.getElementById('drawNamesBtn');
  const label = document.getElementById('drawBtnLabel');
  const fullscreen = document.getElementById('drawFullscreen');
  if(fullscreen){ fullscreen.classList.remove('active'); fullscreen.setAttribute('aria-hidden','true'); }
  unlockDrawViewport();
  if(result) result.classList.remove('is-drawing');
  if(drawBtn) drawBtn.classList.remove('is-drawing');
  if(label) label.textContent = '開始抽籤';
  if(list){ list.innerHTML = ''; list.classList.add('hidden'); }
  if(empty){ empty.textContent = '抽籤結果會顯示在這裡'; empty.classList.remove('hidden'); }
  if(copyBtn) copyBtn.disabled = true;
}

function updateDrawToolState(clearResults){
  const names = getDrawNames();
  const countInput = document.getElementById('drawCountInput');
  const badge = document.getElementById('drawNameCount');
  const hint = document.getElementById('drawHint');
  const drawBtn = document.getElementById('drawNamesBtn');
  if(!countInput || !badge || !hint || !drawBtn) return;

  const count = Math.floor(Number(countInput.value));
  countInput.max = String(Math.max(1,names.length));
  badge.textContent = `${names.length} 人`;

  if(names.length === 0){
    hint.textContent = '請先輸入抽籤名單。';
    drawBtn.disabled = true;
  }else if(!Number.isInteger(count) || count < 1){
    hint.textContent = '抽選人數至少需要 1 人。';
    drawBtn.disabled = true;
  }else if(count > names.length){
    hint.textContent = `抽選人數不能超過名單中的 ${names.length} 人。`;
    drawBtn.disabled = true;
  }else{
    hint.textContent = `將從 ${names.length} 人中抽出 ${count} 人，名單不會重複中籤。`;
    drawBtn.disabled = false;
  }
  if(clearResults) resetDrawResults();
  saveDrawTool();
}

function secureRandomIndex(max){
  if(max <= 1) return 0;
  if(window.crypto && window.crypto.getRandomValues){
    const range = 0x100000000;
    const limit = Math.floor(range / max) * max;
    const value = new Uint32Array(1);
    do{ window.crypto.getRandomValues(value); }while(value[0] >= limit);
    return value[0] % max;
  }
  return Math.floor(Math.random() * max);
}

let drawLockedScrollY = 0;
function lockDrawViewport(){
  drawLockedScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.top = `-${drawLockedScrollY}px`;
  document.body.classList.add('draw-overlay-open');
}

function unlockDrawViewport(){
  if(!document.body.classList.contains('draw-overlay-open')) return;
  document.body.classList.remove('draw-overlay-open');
  document.body.style.top = '';
  window.scrollTo(0,drawLockedScrollY);
}

function drawRandomNames(){
  if(drawAnimationTimer) return;
  const names = getDrawNames();
  const countInput = document.getElementById('drawCountInput');
  const count = countInput ? Math.floor(Number(countInput.value)) : 0;
  if(names.length === 0){ showToast('請先輸入抽籤名單'); return; }
  if(!Number.isInteger(count) || count < 1 || count > names.length){
    showToast(`抽選人數請設定在 1 到 ${names.length} 人之間`);
    return;
  }

  const pool = [...names];
  for(let i = pool.length - 1; i > 0; i--){
    const j = secureRandomIndex(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  drawToolResults = pool.slice(0,count);
  const result = document.querySelector('.draw-result');
  const list = document.getElementById('drawResultList');
  const empty = document.getElementById('drawResultEmpty');
  const copyBtn = document.getElementById('drawCopyBtn');
  const drawBtn = document.getElementById('drawNamesBtn');
  const label = document.getElementById('drawBtnLabel');
  const fullscreen = document.getElementById('drawFullscreen');
  const fullscreenName = document.getElementById('drawFullscreenName');
  const fullscreenPrev = document.getElementById('drawFullscreenPrev');
  const fullscreenNext = document.getElementById('drawFullscreenNext');
  const fullscreenReel = document.getElementById('drawFullscreenReel');
  if(!result || !list || !empty || !copyBtn || !drawBtn || !fullscreen || !fullscreenName || !fullscreenPrev || !fullscreenNext || !fullscreenReel) return;

  const fullscreenTitle = document.getElementById('drawFullscreenTitle');
  const fullscreenKicker = fullscreen.querySelector('.draw-fullscreen-kicker');
  if(fullscreenTitle) fullscreenTitle.textContent = '抽籤進行中';
  if(fullscreenKicker) fullscreenKicker.textContent = 'RANDOM DRAW SYSTEM';

  list.innerHTML = '';
  list.classList.add('hidden');
  empty.textContent = '抽籤進行中…';
  empty.classList.remove('hidden');
  copyBtn.disabled = true;
  drawBtn.classList.add('is-drawing');
  drawBtn.disabled = true;
  if(label) label.textContent = '抽取中…';
  fullscreen.classList.remove('active');
  void fullscreen.offsetWidth;
  fullscreen.classList.add('active');
  fullscreen.setAttribute('aria-hidden','false');
  lockDrawViewport();

  const pickIndex = excluded => {
    if(names.length <= excluded.length) return secureRandomIndex(names.length);
    let index;
    do{ index = secureRandomIndex(names.length); }while(excluded.includes(index));
    return index;
  };
  let slots = [secureRandomIndex(names.length),0,0];
  slots[1] = pickIndex([slots[0]]);
  slots[2] = pickIndex([slots[0],slots[1]]);
  const spinStartedAt = performance.now();
  const showCandidate = () => {
    slots = [slots[1],slots[2],pickIndex([slots[1],slots[2]])];
    fullscreenPrev.textContent = names[slots[0]];
    fullscreenName.textContent = names[slots[1]];
    fullscreenNext.textContent = names[slots[2]];
    const elapsed = Math.min(1500,performance.now() - spinStartedAt);
    const speed = Math.round(58 + Math.pow(elapsed / 1500,2.25) * 145);
    fullscreenReel.style.setProperty('--slot-speed',`${speed}ms`);
    fullscreenReel.classList.remove('tick');
    void fullscreenReel.offsetWidth;
    fullscreenReel.classList.add('tick');
    drawAnimationInterval = window.setTimeout(showCandidate,speed);
  };
  showCandidate();
  drawAnimationTimer = window.setTimeout(() => {
    if(drawAnimationInterval){ window.clearTimeout(drawAnimationInterval); drawAnimationInterval = null; }
    drawAnimationTimer = null;
    fullscreen.classList.remove('active');
    fullscreen.setAttribute('aria-hidden','true');
    unlockDrawViewport();
    drawBtn.classList.remove('is-drawing');
    if(label) label.textContent = '開始抽籤';
    renderDrawResults();
    updateDrawToolState(false);
    showToast(`已抽出 ${count} 位中籤者`);
  }, 1500);
}

function renderDrawResults(){
  const list = document.getElementById('drawResultList');
  const empty = document.getElementById('drawResultEmpty');
  const copyBtn = document.getElementById('drawCopyBtn');
  if(!list || !empty || !copyBtn) return;
  list.innerHTML = drawToolResults.map((name,index) => `
    <div class="draw-result-row" style="animation-delay:${index * 35}ms">
      <span class="draw-result-index">${String(index + 1).padStart(2,'0')}</span>
      <span class="draw-result-name">${escapeHtml(name)}</span>
    </div>`).join('');
  empty.classList.add('hidden');
  list.classList.remove('hidden');
  copyBtn.disabled = drawToolResults.length === 0;
}

function clearDrawNames(){
  const input = document.getElementById('drawNamesInput');
  const countInput = document.getElementById('drawCountInput');
  if(input) input.value = '';
  if(countInput) countInput.value = '1';
  updateDrawToolState(true);
  if(input) input.focus();
}

async function copyDrawResults(){
  if(drawToolResults.length === 0){ showToast('目前沒有可複製的中籤名單'); return; }
  const text = drawToolResults.join('\n');
  let copied = false;
  if(navigator.clipboard && navigator.clipboard.writeText){
    try{ await navigator.clipboard.writeText(text); copied = true; }catch(e){}
  }
  if(!copied){
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly','');
    helper.setAttribute('aria-hidden','true');
    helper.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;';
    document.body.appendChild(helper);
    helper.focus({preventScroll:true});
    helper.select();
    helper.setSelectionRange(0,helper.value.length);
    try{ copied = document.execCommand('copy'); }catch(e){ copied = false; }
    helper.remove();
  }
  if(copied){
    showToast('中籤名單已複製');
  }else{
    showToast('複製失敗，請手動選取名單');
  }
}

