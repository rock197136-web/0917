/* =========================================================
   RANDOMIZE SCHEDULE (knockout bracket) — slot-machine reshuffle
========================================================= */
function shuffleArray(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomizeSchedule(){
  const more = document.getElementById('bracketMoreMenu');
  if(more) more.removeAttribute('open');
  if(state.matches.length === 0){
    showAlert('尚未產生對戰紀錄，請先前往「賽事設定」開始比賽。');
    return;
  }
  if(state.players.length < 2){
    showAlert('至少需要 2 位玩家才能重新抽籤排表。');
    return;
  }
  showConfirm('隨機刷新賽程將清除目前所有對戰紀錄，重新抽籤排出全新對戰紀錄，確定嗎？', () => {
    runScheduleShuffleAnimation();
  });
}

// Starts the slot-machine name-spin over whatever bracket boxes are
// currently rendered. Shared by the device that clicks "隨機刷新賽程"
// AND by every other connected referee/viewer device, which triggers this
// in response to the shuffleAt broadcast in onCloudMeta — that's what makes
// the reshuffle animation visible to everyone watching, not just whoever
// pressed the button. Returns false (and starts nothing) if there's
// nothing on screen to animate, e.g. the bracket tab was never opened yet.
//
// Rather than a slow vertical reel, each name cell just rapidly swaps to a
// different random name every tick (with a quick colour-flash animation so
// even a repeated pick still reads as "changing"). Runs for a short, snappy
// burst (~0.5s total, see runScheduleShuffleAnimation) rather than a long
// spin-down.
const NAME_FLICKER_MS = 80; // how often each cell's text swaps

function startScheduleSpin(){
  stopScheduleSpin();
  const wrap = document.getElementById('bracketTree');
  const nameEls = wrap ? Array.from(wrap.querySelectorAll('.bslot-name, .champ-name')) : [];
  const pool = state.players.map(p => p.name).filter(Boolean);
  if(pool.length === 0 || nameEls.length === 0) return false;
  nameEls.forEach(el => el.classList.add('name-flicker'));
  scheduleSpinTimer = setInterval(() => {
    nameEls.forEach(el => {
      let pick = pool[Math.floor(Math.random() * pool.length)];
      if(pool.length > 1 && pick === el.textContent){
        pick = pool[(pool.indexOf(pick) + 1) % pool.length];
      }
      el.textContent = pick;
    });
  }, NAME_FLICKER_MS);
  return true;
}

function stopScheduleSpin(){
  if(scheduleSpinTimer){ clearInterval(scheduleSpinTimer); scheduleSpinTimer = null; }
  const wrap = document.getElementById('bracketTree');
  if(wrap){
    wrap.querySelectorAll('.name-flicker').forEach(el => el.classList.remove('name-flicker'));
  }
}

function runScheduleShuffleAnimation(){
  const btn = document.getElementById('shuffleScheduleBtn');
  if(btn){
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `${icon('shuffle',16)} 抽籤中…`;
  }

  // Broadcast BEFORE spinning locally (not after finalizing) so every other
  // connected device can start its own spin at roughly the same moment —
  // finalizeScheduleShuffle() (which pushes the actual new matches) only
  // runs once this local animation finishes, so remote devices end up
  // spinning for about the same 1.5s window before the real bracket lands.
  lastLocalShuffleAt = Date.now();
  if(window.cloudSync && window.cloudSync.ready && currentEventCode){
    window.cloudSync.pushMeta({ shuffleAt: lastLocalShuffleAt }).catch(()=>{});
  }

  const duration = 480;
  const started = startScheduleSpin();
  if(!started){
    finalizeScheduleShuffle(btn);
    return;
  }
  setTimeout(() => {
    stopScheduleSpin();
    finalizeScheduleShuffle(btn);
  }, duration);
}

function finalizeScheduleShuffle(btn){
  // generateKnockoutBracket() does its own full random draw internally
  // (matchups AND which slot any bye lands in), so state.players can stay
  // in its existing order — the roster itself.
  const newMatches = state.tournament.format === 'double_elimination' ? generateDoubleElimination(state.players) : generateKnockoutBracket(state.players);
  state.matches = newMatches;
  state.currentRound = 1;
  state.tournament.status = 'running';
  refereePanels.forEach(p => p.matchId = null);
  savePanels();
  markAllDirty();

  cloudNeedsFullReplace = true;
  saveState();

  renderAll();
  showToast('對戰賽程已刷新');

  if(btn){
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || `${icon('shuffle',16)} 隨機刷新賽程`;
  }
}

