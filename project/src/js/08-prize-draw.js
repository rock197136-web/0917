/* =========================================================
   TOOLBOX — PARTICIPANT PRIZE DRAW
========================================================= */
let prizeLastDrawNames = [];

function getPrizeParticipants(){
  const seen = new Set();
  const savedPlayers = (Array.isArray(state.players) ? state.players : [])
    .filter(player => player && player.name && !player.withdrawn)
    .map(player => String(player.name).trim());
  const setupPlayers = savedPlayers.length ? [] : Array.from(document.querySelectorAll('#playerInputs .player-chip'))
    .filter(chip => chip.dataset.attendance !== 'absent')
    .map(chip => String(chip.dataset.name || '').trim());
  return (savedPlayers.length ? savedPlayers : setupPlayers)
    .filter(name => {
      if(!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

function savePrizeDraw(){
  const countInput = document.getElementById('prizeDrawCountInput');
  try{
    localStorage.setItem(PRIZE_DRAW_STORAGE_KEY, JSON.stringify({
      winners:prizeDrawWinners,
      count:countInput ? countInput.value : '1'
    }));
  }catch(e){}
}

function initPrizeDraw(){
  const countInput = document.getElementById('prizeDrawCountInput');
  try{
    const saved = JSON.parse(localStorage.getItem(PRIZE_DRAW_STORAGE_KEY) || 'null');
    if(saved && Array.isArray(saved.winners)) prizeDrawWinners = saved.winners.map(String);
    if(countInput && saved && Number(saved.count) >= 1) countInput.value = String(Math.floor(Number(saved.count)));
  }catch(e){}
  prizeDrawInitialized = true;
  syncPrizeDrawPlayers();
}

function syncPrizeDrawPlayers(){
  if(!prizeDrawInitialized) return;
  const participantSet = new Set(getPrizeParticipants());
  const filtered = prizeDrawWinners.filter((name,index,list) => participantSet.has(name) && list.indexOf(name) === index);
  if(filtered.length !== prizeDrawWinners.length){
    prizeDrawWinners = filtered;
    prizeLastDrawNames = prizeLastDrawNames.filter(name => participantSet.has(name));
    savePrizeDraw();
  }
  updatePrizeDrawState();
}

function getPrizeRemaining(){
  const winnerSet = new Set(prizeDrawWinners);
  return getPrizeParticipants().filter(name => !winnerSet.has(name));
}

function renderPrizeDraw(){
  const participants = getPrizeParticipants();
  const remaining = getPrizeRemaining();
  const pool = document.getElementById('prizePoolList');
  const badge = document.getElementById('prizePoolCount');
  const list = document.getElementById('prizeResultList');
  const empty = document.getElementById('prizeResultEmpty');
  const resetBtn = document.getElementById('prizeResetBtn');
  if(!pool || !badge || !list || !empty || !resetBtn) return;

  badge.textContent = participants.length ? `可抽 ${remaining.length} / ${participants.length} 人` : '0 人';
  pool.innerHTML = remaining.length
    ? remaining.map(name => `<span class="prize-player-chip">${icon('user',13)}<span>${escapeHtml(name)}</span></span>`).join('')
    : `<div class="prize-pool-empty">${participants.length ? '所有參賽者皆已中獎' : '開始比賽後會自動帶入參賽玩家'}</div>`;

  if(prizeDrawWinners.length){
    list.innerHTML = prizeDrawWinners.map((name,index) => `
      <div class="draw-result-row${prizeLastDrawNames.includes(name) ? ' prize-result-new' : ''}" style="animation-delay:${index * 30}ms">
        <span class="draw-result-index">${String(index + 1).padStart(2,'0')}</span>
        <span class="draw-result-name">${escapeHtml(name)}</span>
      </div>`).join('');
    empty.classList.add('hidden');
    list.classList.remove('hidden');
  }else{
    list.innerHTML = '';
    list.classList.add('hidden');
    empty.classList.remove('hidden');
  }
  resetBtn.disabled = prizeDrawWinners.length === 0 || !!drawAnimationTimer;
}

function updatePrizeDrawState(){
  if(!prizeDrawInitialized) return;
  const remaining = getPrizeRemaining();
  const countInput = document.getElementById('prizeDrawCountInput');
  const hint = document.getElementById('prizeDrawHint');
  const button = document.getElementById('prizeDrawBtn');
  const label = document.getElementById('prizeDrawBtnLabel');
  if(!countInput || !hint || !button || !label) return;
  const count = Math.floor(Number(countInput.value));
  countInput.max = String(Math.max(1,remaining.length));
  label.textContent = prizeDrawWinners.length ? '繼續抽獎' : '開始抽獎';

  if(getPrizeParticipants().length === 0){
    hint.textContent = '請先在賽事設定建立參賽玩家。';
    button.disabled = true;
  }else if(remaining.length === 0){
    hint.textContent = '所有參賽者皆已中獎，可重置紀錄後重新抽選。';
    button.disabled = true;
  }else if(!Number.isInteger(count) || count < 1){
    hint.textContent = '本次抽選人數至少需要 1 人。';
    button.disabled = true;
  }else if(count > remaining.length){
    hint.textContent = `本次最多可抽出 ${remaining.length} 人。`;
    button.disabled = true;
  }else{
    hint.textContent = `將從剩餘 ${remaining.length} 人中抽出 ${count} 人，中獎者不會再次入選。`;
    button.disabled = !!drawAnimationTimer;
  }
  renderPrizeDraw();
  savePrizeDraw();
}

function drawPrizeWinners(){
  if(drawAnimationTimer) return;
  const remaining = getPrizeRemaining();
  const countInput = document.getElementById('prizeDrawCountInput');
  const count = countInput ? Math.floor(Number(countInput.value)) : 0;
  if(remaining.length === 0){ showToast('目前沒有可抽選的參賽者'); return; }
  if(!Number.isInteger(count) || count < 1 || count > remaining.length){
    showToast(`本次抽選人數請設定在 1 到 ${remaining.length} 人之間`);
    return;
  }

  const shuffled = [...remaining];
  for(let i = shuffled.length - 1; i > 0; i--){
    const j = secureRandomIndex(i + 1);
    [shuffled[i],shuffled[j]] = [shuffled[j],shuffled[i]];
  }
  const newWinners = shuffled.slice(0,count);
  const button = document.getElementById('prizeDrawBtn');
  const label = document.getElementById('prizeDrawBtnLabel');
  const result = document.getElementById('prizeDrawResult');
  const fullscreen = document.getElementById('drawFullscreen');
  const fullscreenName = document.getElementById('drawFullscreenName');
  const fullscreenPrev = document.getElementById('drawFullscreenPrev');
  const fullscreenNext = document.getElementById('drawFullscreenNext');
  const fullscreenReel = document.getElementById('drawFullscreenReel');
  if(!button || !label || !result || !fullscreen || !fullscreenName || !fullscreenPrev || !fullscreenNext || !fullscreenReel) return;

  const fullscreenTitle = document.getElementById('drawFullscreenTitle');
  const fullscreenKicker = fullscreen.querySelector('.draw-fullscreen-kicker');
  if(fullscreenTitle) fullscreenTitle.textContent = '獎品抽選中';
  if(fullscreenKicker) fullscreenKicker.textContent = 'PRIZE DRAW SYSTEM';
  button.classList.add('is-drawing');
  button.disabled = true;
  label.textContent = '抽取中…';
  result.classList.add('is-drawing');
  fullscreen.classList.remove('active');
  void fullscreen.offsetWidth;
  fullscreen.classList.add('active');
  fullscreen.setAttribute('aria-hidden','false');
  lockDrawViewport();

  const pickIndex = excluded => {
    if(remaining.length <= excluded.length) return secureRandomIndex(remaining.length);
    let index;
    do{ index = secureRandomIndex(remaining.length); }while(excluded.includes(index));
    return index;
  };
  let slots = [secureRandomIndex(remaining.length),0,0];
  slots[1] = pickIndex([slots[0]]);
  slots[2] = pickIndex([slots[0],slots[1]]);
  const spinStartedAt = performance.now();
  const showCandidate = () => {
    slots = [slots[1],slots[2],pickIndex([slots[1],slots[2]])];
    fullscreenPrev.textContent = remaining[slots[0]];
    fullscreenName.textContent = remaining[slots[1]];
    fullscreenNext.textContent = remaining[slots[2]];
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
    button.classList.remove('is-drawing');
    result.classList.remove('is-drawing');
    prizeLastDrawNames = newWinners;
    prizeDrawWinners.push(...newWinners);
    savePrizeDraw();
    updatePrizeDrawState();
    showToast(`已抽出 ${count} 位中獎者，可繼續抽獎`);
  },1500);
}

function resetPrizeDraw(){
  if(drawAnimationTimer || prizeDrawWinners.length === 0) return;
  showConfirm('確定要清除所有中獎紀錄，讓全部參賽者重新加入抽選嗎？', () => {
    prizeDrawWinners = [];
    prizeLastDrawNames = [];
    savePrizeDraw();
    updatePrizeDrawState();
    showToast('已重置中獎紀錄');
  });
}

function buildShareLink(code){
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('code', code);
  return url.toString();
}

let currentQRCode = null;

function showQRCode(code){
  code = (code || '').trim().toUpperCase();
  if(code.length !== 3) return;
  currentQRCode = code;
  const link = buildShareLink(code);
  const img = document.getElementById('qrCodeImg');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(link)}`;
  document.getElementById('qrCodeLink').innerText = link;
  document.getElementById('qrModal').classList.add('show');
}

function hideQRModal(){
  document.getElementById('qrModal').classList.remove('show');
}

