/* =========================================================
   STORAGE — local cache (works everywhere: artifact preview
   AND a plain static host like GitHub Pages) + optional
   Firebase cloud sync layered on top for cross-device use.
========================================================= */
const EVENT_CODE_KEY = 'beyblade-x-event-code';
const EVENT_ROLE_KEY = 'beyblade-x-event-role';
const EVENT_VIEWER_KEY = 'beyblade-x-event-viewer-code';
const ROSTER_DRAFT_KEY = 'beyblade-x-roster-draft-v1';
let dirtyMatchIds = new Set();
let cloudRetryTimer = null;
let cloudNeedsFullReplace = false;
function markDirty(id){ if(id) dirtyMatchIds.add(id); }
function markAllDirty(){ state.matches.forEach(m => markDirty(m.id)); }

async function loadLocalCache(){
  try{
    if(window.storage){
      const res = await window.storage.get(STORAGE_KEY, false);
      if(res && res.value){
        state = Object.assign(state, JSON.parse(res.value));
        return;
      }
    }
  }catch(e){}
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) state = Object.assign(state, JSON.parse(raw));
  }catch(e){
    console.log('沒有已儲存的資料，使用預設值。', e);
  }
}

async function saveState(silent){
  const json = JSON.stringify(state);
  let localSaved = false;
  try{ localStorage.setItem(STORAGE_KEY, json); localSaved = true; }catch(e){}
  if(window.storage){
    try{ await window.storage.set(STORAGE_KEY, json, false); localSaved = true; }catch(e){}
  }
  const hasCloud = !!(window.cloudSync && window.cloudSync.ready && currentEventCode);
  if(!silent) flashSaved(localSaved ? (hasCloud ? '同步中…' : '本機已保存') : '本機保存失敗', localSaved ? (hasCloud ? 'syncing' : '') : 'error', hasCloud ? 0 : 1300);
  const synced = await pushToCloud();
  if(!silent && hasCloud) flashSaved(synced ? '雲端已同步' : '同步失敗，待重試', synced ? 'synced' : 'error', synced ? 1300 : 2600);
}

async function pushToCloud(){
  if(!(window.cloudSync && window.cloudSync.ready && currentEventCode)) return false;
  const fullReplace = cloudNeedsFullReplace;
  const ids = fullReplace ? state.matches.map(m => m.id) : Array.from(dirtyMatchIds);
  const sentSignatures = new Map(state.matches.filter(m => ids.includes(m.id)).map(m => [m.id, matchSignature(m)]));
  try{
    await window.cloudSync.pushMeta({
      name: state.tournament.name,
      pointsToWin: state.tournament.pointsToWin,
      format: state.tournament.format,
      quickMode: state.tournament.quickMode,
      status: state.tournament.status,
      players: state.players,
      currentRound: state.currentRound
    });
    const toPush = state.matches.filter(m => ids.includes(m.id));
    if(fullReplace) await window.cloudSync.clearMatches();
    if(toPush.length) await window.cloudSync.pushMatches(toPush);
    ids.forEach(id => {
      const current = state.matches.find(m => m.id === id);
      if(current && matchSignature(current) === sentSignatures.get(id)) dirtyMatchIds.delete(id);
    });
    if(fullReplace && state.matches.length === sentSignatures.size && state.matches.every(m => sentSignatures.get(m.id) === matchSignature(m))) cloudNeedsFullReplace = false;
    if(cloudRetryTimer){ clearTimeout(cloudRetryTimer); cloudRetryTimer = null; }
    return true;
  }catch(e){
    console.error('雲端同步失敗（本機資料仍完整保存）', e);
    if(!cloudRetryTimer){
      cloudRetryTimer = setTimeout(() => {
        cloudRetryTimer = null;
        pushToCloud();
      }, 3000);
    }
    return false;
  }
}

function flashSaved(message, status, duration){
  const flag = document.getElementById('saveFlag');
  if(!flag) return;
  flag.textContent = message || '本機已保存';
  flag.className = `save-flag show ${status || ''}`.trim();
  flag.classList.add('show');
  clearTimeout(saveTimer);
  if(duration !== 0) saveTimer = setTimeout(()=>flag.classList.remove('show'), duration || 1300);
}

let actionToastTimer;
function showToast(message){
  const toast = document.getElementById('actionToast');
  const msgEl = document.getElementById('actionToastMsg');
  if(!toast || !msgEl) return;
  msgEl.innerText = message;
  toast.classList.add('show');
  clearTimeout(actionToastTimer);
  actionToastTimer = setTimeout(()=>toast.classList.remove('show'), 2200);
}

