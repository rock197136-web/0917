/* =========================================================
   CLOUD SYNC — event code join/create + realtime listeners
========================================================= */
let currentEventCode = null;   // canonical Firestore doc id (the referee/full-access code) — never shown to viewers
let currentRole = 'referee';   // 'referee' (full access) | 'viewer' (read-only)
let currentViewerCode = null;  // the read-only code paired with this event — safe to display to anyone
let applyingRemote = false;

// ---- Slot-machine "隨機刷新賽程" sync state -----------------------------
// The reshuffle animation used to only ever play on whichever device
// clicked the button — every other connected referee/viewer just saw the
// bracket jump straight to the new draw with no animation. `shuffleAt` is
// broadcast as a plain meta field the moment the animation starts (well
// before the new matches themselves are pushed), so every other device can
// kick off the same visual spin at roughly the same time and only stop it
// once the real new bracket actually arrives.
let scheduleSpinTimer = null;   // interval id for the currently-running spin (local or remote-triggered)
let lastLocalShuffleAt = null;  // stamp of a shuffle *this* device just initiated — used to ignore its own echo
let lastAppliedShuffleAt = null;// last shuffleAt value already reacted to, so unrelated meta pushes don't re-trigger it
let metaInitialized = false;    // true once this device has processed its first meta snapshot (its baseline)

function initCloud(){
  const ready = () => {
    updateCloudStatusUI();
    if(!window.cloudSync.isConfigured()){
      document.getElementById('cloudNotConfigured').classList.remove('hidden');
      document.getElementById('cloudConfigured').classList.add('hidden');
      openCloudModal(); // 強制彈出：告知目前僅能本機運作
      return;
    }
    document.getElementById('cloudNotConfigured').classList.add('hidden');
    document.getElementById('cloudConfigured').classList.remove('hidden');

    const params = new URLSearchParams(window.location.search);
    const urlCode = (params.get('code') || '').trim().toUpperCase();
    if(urlCode.length === 3){
      joinEventByCode(urlCode).finally(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.toString());
      });
      return;
    }

    const savedCode = localStorage.getItem(EVENT_CODE_KEY);
    const savedRole = localStorage.getItem(EVENT_ROLE_KEY) || 'referee';
    const savedViewerCode = localStorage.getItem(EVENT_VIEWER_KEY) || null;
    if(savedCode){
      joinCloudEvent(savedCode, savedRole, savedViewerCode);
    } else if(state.tournament.status === 'running' || playerSetupExpanded){
      // 使用者已經在填名單、或賽事已經開始（例如手速快，在 Firebase 初始化
      // 完成、觸發這段 ready() 之前就已經按下「開始比賽」），此時不該再搶
      // 焦點蓋版跳出連線視窗——那會讓剛產生的對戰樹狀圖被彈窗蓋住，看起來
      // 像「沒有第一時間產生」。改成只更新狀態列的雲端小圖示，讓使用者需要
      // 連線時可以自己從畫面上的按鈕點開，不主動搶畫面。
      updateCloudStatusUI();
    } else {
      // 尚未連線過任何賽事、也還沒開始比賽 → 一進站就強制跳出連線視窗，
      // 使用者可選擇建立/加入賽事，或按「關閉」改為本機運行（無連線功能）。
      openCloudModal();
    }
  };
  if(window.cloudSync && window.cloudSync.ready !== undefined && (window.cloudSync.ready || !window.cloudSync.isConfigured())){
    ready();
  }
  window.addEventListener('cloudsync-ready', ready, { once:true });
}

async function joinEventByCode(code){
  try{
    const result = await window.cloudSync.resolveCode(code);
    if(!result) return false;
    const viewerCode = result.role === 'viewer' ? code : (result.data && result.data.viewerCode) || null;
    localStorage.setItem(EVENT_CODE_KEY, result.eventCode);
    localStorage.setItem(EVENT_ROLE_KEY, result.role);
    localStorage.setItem(EVENT_VIEWER_KEY, viewerCode || '');
    joinCloudEvent(result.eventCode, result.role, viewerCode);
    return true;
  }catch(e){
    console.error('透過分享連結加入賽事失敗', e);
    return false;
  }
}

function updateCloudStatusUI(){
  const dot = document.getElementById('cloudDot');
  const text = document.getElementById('cloudStatusText');
  if(!dot || !text) return;
  if(!window.cloudSync || !window.cloudSync.isConfigured()){
    dot.className = 'cloud-dot off';
    text.innerText = '僅本機儲存（未設定雲端）';
  } else if(currentEventCode){
    dot.className = 'cloud-dot on';
    const shown = currentRole === 'viewer' ? (currentViewerCode || '---') : currentEventCode;
    text.innerHTML = currentRole === 'viewer'
      ? `已連線・<span class="cloud-role">${icon('user',14)}選手模式</span>　代碼 ${escapeHtml(shown)}`
      : `已連線・<span class="cloud-role">${icon('gavel',14)}裁判模式</span>　代碼 ${escapeHtml(shown)}`;
  } else {
    dot.className = 'cloud-dot off';
    text.innerText = '尚未加入任何賽事';
  }
}

function genEventCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXY23456789'; // no O/0/I/1 to avoid confusion
  let code = '';
  for(let i=0; i<3; i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}
function genDistinctCodePair(){
  const a = genEventCode();
  let b = genEventCode();
  while(b === a) b = genEventCode();
  return [a, b];
}

function openCloudModal(){
  document.getElementById('cloudError').innerText = '';
  document.getElementById('cloudCreatedResult').classList.add('hidden');
  const cur = document.getElementById('cloudCurrent');
  if(currentEventCode){
    cur.classList.remove('hidden');
    const codesEl = document.getElementById('cloudCurrentCodes');
    if(currentRole === 'referee'){
      codesEl.innerHTML = `
        <div class="cloud-code-item">
          <div class="cloud-code-tag">裁判用（完整功能）</div>
          <div class="cloud-code-display">${escapeHtml(currentEventCode)}</div>
          <button class="cloud-share-btn" onclick="copyShareLink('${currentEventCode}', this)">${icon('link',14)} 複製裁判連結</button>
        </div>
        ${currentViewerCode ? `
        <div class="cloud-code-item">
          <div class="cloud-code-tag">選手／觀眾用（唯讀）</div>
          <div class="cloud-code-display">${escapeHtml(currentViewerCode)}</div>
          <button class="cloud-share-btn" onclick="copyShareLink('${currentViewerCode}', this)">${icon('link',14)} 複製選手連結</button>
          <button class="cloud-share-btn cloud-qr-btn" onclick="showQRCode('${currentViewerCode}')">${icon('qr-code',14)} 生成QR碼</button>
        </div>` : ''}
      `;
    } else {
      codesEl.innerHTML = `
        <div class="cloud-code-item">
          <div class="cloud-code-tag">目前身分：選手／觀眾（唯讀）</div>
          <div class="cloud-code-display">${escapeHtml(currentViewerCode || '---')}</div>
          ${currentViewerCode ? `
          <button class="cloud-share-btn" onclick="copyShareLink('${currentViewerCode}', this)">${icon('link',14)} 複製選手連結</button>
          <button class="cloud-share-btn cloud-qr-btn" onclick="showQRCode('${currentViewerCode}')">${icon('qr-code',14)} 生成QR碼</button>` : ''}
        </div>
      `;
    }
  } else {
    cur.classList.add('hidden');
  }
  document.getElementById('cloudModal').classList.add('show');
}
function hideCloudModal(){
  document.getElementById('cloudModal').classList.remove('show');
  if(!currentEventCode){
    showToast('已改為本機運行，無連線功能');
  }
}
function switchCloudTab(which){
  document.getElementById('cloudTabBtnCreate').classList.toggle('active', which==='create');
  document.getElementById('cloudTabBtnJoin').classList.toggle('active', which==='join');
  document.getElementById('cloudPaneCreate').classList.toggle('hidden', which!=='create');
  document.getElementById('cloudPaneJoin').classList.toggle('hidden', which!=='join');
}

async function handleCreateEvent(){
  const errEl = document.getElementById('cloudError');
  errEl.innerText = '';
  const [refCode, viewerCode] = genDistinctCodePair();
  const name = document.getElementById('cloudNewName').value.trim();
  try{
    if(name) state.tournament.name = name;
    await window.cloudSync.createEvent(refCode, viewerCode, {
      name: state.tournament.name, pointsToWin: state.tournament.pointsToWin,
      format: state.tournament.format, status: state.tournament.status,
      players: state.players, currentRound: state.currentRound
    });
    if(state.matches.length) await window.cloudSync.pushMatches(state.matches);

    localStorage.setItem(EVENT_CODE_KEY, refCode);
    localStorage.setItem(EVENT_ROLE_KEY, 'referee');
    localStorage.setItem(EVENT_VIEWER_KEY, viewerCode);
    joinCloudEvent(refCode, 'referee', viewerCode);

    document.getElementById('cloudResultRefCode').innerText = refCode;
    document.getElementById('cloudResultViewerCode').innerText = viewerCode;
    document.getElementById('cloudCreatedResult').classList.remove('hidden');
    document.getElementById('cloudCurrent').classList.add('hidden');
  }catch(e){
    errEl.innerText = '建立失敗，請確認網路連線或 Firebase 設定後再試一次。';
    console.error(e);
  }
}

async function handleJoinEvent(){
  const errEl = document.getElementById('cloudError');
  errEl.innerText = '';
  const code = document.getElementById('cloudJoinCode').value.trim().toUpperCase();
  if(code.length !== 3){ errEl.innerText = '請輸入 3 碼賽事代碼。'; return; }
  try{
    const ok = await joinEventByCode(code);
    if(!ok){ errEl.innerText = '找不到這組賽事代碼，請確認是否輸入正確。'; return; }
    hideCloudModal();
  }catch(e){
    errEl.innerText = '加入失敗，請確認網路連線後再試一次。';
    console.error(e);
  }
}

function joinCloudEvent(refCode, role, viewerCode){
  currentEventCode = refCode;
  currentRole = role || 'referee';
  currentViewerCode = viewerCode || currentViewerCode || null;
  window.cloudSync.join(refCode, onCloudMeta, onCloudMatches);
  applyRoleUI();
  updateCloudStatusUI();
}

function applyRoleUI(){
  document.body.classList.toggle('viewer-mode', currentRole === 'viewer');
  if(currentRole === 'viewer'){
    const activeTab = document.querySelector('.tab.active');
    if(activeTab && (activeTab.dataset.tab === 'referee' || activeTab.dataset.tab === 'setup')){
      switchTab('standings');
    }
  }
  renderAll();
}

function leaveCloudEvent(){
  showConfirm('離開此賽事後，這台裝置會回到「僅本機」模式，之後可再輸入代碼重新加入。確定要離開嗎？', () => {
    if(window.cloudSync && window.cloudSync.leave) window.cloudSync.leave();
    currentEventCode = null;
    currentRole = 'referee';
    currentViewerCode = null;
    localStorage.removeItem(EVENT_CODE_KEY);
    localStorage.removeItem(EVENT_ROLE_KEY);
    localStorage.removeItem(EVENT_VIEWER_KEY);
    document.body.classList.remove('viewer-mode');
    updateCloudStatusUI();
    hideCloudModal();
  });
}

function onCloudMeta(data){
  applyingRemote = true;

  // Detect a reshuffle broadcast from ANY device (see "Slot-machine sync
  // state" above). Compare against lastAppliedShuffleAt so an unrelated
  // meta push (which still carries the same, already-seen shuffleAt field
  // via Firestore's merge) never re-triggers the spin. The very first
  // snapshot this device ever receives (on page load / join) just adopts
  // whatever shuffleAt is already on record as the baseline — it's history,
  // not a live event, so it must not play the animation.
  const shuffleIsFresh = metaInitialized
    && data.shuffleAt
    && data.shuffleAt !== lastAppliedShuffleAt
    && data.shuffleAt !== lastLocalShuffleAt; // ignore the echo of our own broadcast — that device is already spinning
  // Hosted/Firebase mode immediately echoes this device's own shuffleAt write.
  // Re-rendering on that echo replaces every name node captured by
  // startScheduleSpin(), making the flicker appear to vanish online even
  // though it works offline. The echo contains no new tournament content,
  // so retain the current DOM until finalizeScheduleShuffle() renders the
  // completed draw.
  const isOwnShuffleEcho = scheduleSpinTimer !== null
    && !!data.shuffleAt
    && data.shuffleAt === lastLocalShuffleAt;
  metaInitialized = true;
  if(data.shuffleAt) lastAppliedShuffleAt = data.shuffleAt;

  state.tournament.name = data.name ?? state.tournament.name;
  state.tournament.pointsToWin = data.pointsToWin ?? state.tournament.pointsToWin;
  state.tournament.format = data.format ?? state.tournament.format;
  state.tournament.quickMode = data.quickMode ?? state.tournament.quickMode;
  state.tournament.status = data.status ?? state.tournament.status;
  state.players = Array.isArray(data.players) ? data.players : state.players;
  state.currentRound = data.currentRound ?? state.currentRound;
  if(data.viewerCode && currentRole === 'referee'){
    currentViewerCode = data.viewerCode;
    localStorage.setItem(EVENT_VIEWER_KEY, data.viewerCode);
  }
  // Referee-table assignments ("進行中" vs "即將上場" on the bracket) live in
  // refereePanels. This used to be localStorage-only, so any device other
  // than the one that made the assignment never learned which match was
  // actually live and fell back to guessing its own "next" match — showing
  // "即將上場" for a match that was really "進行中" on the referee's device.
  // Apply the synced copy here so every device agrees.
  if(Array.isArray(data.refereePanels) && data.refereePanels.length){
    refereePanels = data.refereePanels;
    try{ localStorage.setItem(PANELS_KEY, JSON.stringify(refereePanels)); }catch(e){}
  }
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  if(!isOwnShuffleEcho) renderAll();
  updateCloudStatusUI();
  applyingRemote = false;

  // Start the spin only AFTER renderAll() has (re)built the bracket DOM —
  // starting it earlier would grab name elements that renderAll() then
  // immediately throws away, leaving nothing visibly spinning. A generous
  // fallback timeout clears it even if the real reshuffled matches never
  // arrive (e.g. the connection drops), so the tree can't spin forever.
  if(shuffleIsFresh){
    startScheduleSpin();
    setTimeout(stopScheduleSpin, 4000);
  }
}

// Fixed-field signature (not JSON.stringify) so key-order differences between
// our local objects and Firestore-round-tripped ones never cause a false
// "changed" positive — only fields that actually affect rendering are compared.
function matchSignature(m){
  if(!m) return '';
  const log = Array.isArray(m.log) ? m.log.map(l => `${l.side}:${l.finish}:${l.points}`).join(',') : '';
  return [m.playerA, m.playerB, m.status, m.pointsA, m.pointsB, m.winner, m.completedAt, log].join('|');
}

function onCloudMatches(list){
  applyingRemote = true;
  const incoming = list.slice().sort((a,b) => {
    if(a.round !== b.round) return a.round - b.round;
    const ai = parseInt(String(a.id).split('-')[1] || 0, 10) || 0;
    const bi = parseInt(String(b.id).split('-')[1] || 0, 10) || 0;
    return ai - bi;
  });
  // 全量重建時 clearMatches 會先送來空快照；此時保留本機新賽程，等待完整清單抵達。
  if(cloudNeedsFullReplace && incoming.length === 0 && state.matches.length > 0){
    applyingRemote = false;
    return;
  }

  // Perf: a snapshot fires for every push — including the echo of our own
  // score taps — so diff against what's already rendered and only do the
  // expensive full rebuild when something actually structural changed
  // (match count, or more than one match at once). A single changed match
  // (by far the common case) gets the same lightweight path as local taps.
  const prevById = new Map(state.matches.map(m => [m.id, m]));
  let structureChanged = incoming.length !== state.matches.length;
  const changedIds = [];
  incoming.forEach(m => {
    const prev = prevById.get(m.id);
    if(!prev){ structureChanged = true; return; }
    if(matchSignature(prev) !== matchSignature(m)) changedIds.push(m.id);
  });

  state.matches = incoming;
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}

  // The real reshuffled bracket has arrived — stop any slot-machine spin
  // this device kicked off in response to the shuffleAt broadcast (or its
  // own local one) before rendering the actual new draw over it. A reshuffle
  // always touches every match at once, so it always lands in the
  // structureChanged/multi-match branch below, never the single-match one.
  const isFullRebuild = structureChanged || changedIds.length > 1;
  if(isFullRebuild) stopScheduleSpin();

  if(isFullRebuild) renderAll();
  else if(changedIds.length === 1) refreshAfterScoreChange(changedIds[0]);
  applyingRemote = false;
}

