/* =========================================================
   RENDER: REFEREE TAB (multiple concurrent panels/tables)
========================================================= */
let refereePanels = [];
let focusedPanelId = null;
const PANELS_KEY = 'beyblade-x-referee-panels-v1';

// 主控模式：純本機顯示偏好（不隨賽事資料同步，每台裝置各自記住），
// 讓裁判台切換成縮小版卡片，方便一次盯著多桌比分操作。
let masterModeOn = false;
const MASTER_MODE_KEY = 'beyblade-x-referee-master-mode-v1';
function loadMasterMode(){
  try{ masterModeOn = localStorage.getItem(MASTER_MODE_KEY) === '1'; }catch(e){ masterModeOn = false; }
  const cb = document.getElementById('masterModeCheckbox');
  if(cb) cb.checked = masterModeOn;
}
function toggleMasterMode(on){
  masterModeOn = !!on;
  try{ localStorage.setItem(MASTER_MODE_KEY, masterModeOn ? '1' : '0'); }catch(e){}
  renderReferee();
}

function loadRefereePanels(){
  try{
    const raw = localStorage.getItem(PANELS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length) { refereePanels = parsed; return; }
    }
  }catch(e){}
  refereePanels = [{ id: genPanelId(), matchId:null, label:'' }];
}
function savePanels(){
  try{ localStorage.setItem(PANELS_KEY, JSON.stringify(refereePanels)); }catch(e){}
  pushPanelsToCloud();
}

// Pushes which match each referee table currently has loaded, so the
// bracket's "進行中 / 即將上場" badges agree across every connected device
// (see the matching comment in onCloudMeta). Skipped while we're in the
// middle of applying an incoming snapshot (avoids an immediate echo write),
// and viewers never own this data so they never push it.
async function pushPanelsToCloud(){
  if(applyingRemote) return;
  if(currentRole === 'viewer') return;
  if(!(window.cloudSync && window.cloudSync.ready && currentEventCode)) return;
  try{
    await window.cloudSync.pushMeta({ refereePanels });
  }catch(e){
    console.error('裁判面板同步失敗（本機資料仍完整保存）', e);
  }
}
function genPanelId(){
  return 'p' + Math.random().toString(36).slice(2,8);
}

function addRefereePanel(){
  if(refereePanels.length >= 4){
    showAlert('最多同時開啟 4 個裁判台面板。如需更多桌次同時進行，建議讓其他裁判用自己的手機/平板開啟同一個賽事代碼，會即時同步。');
    return;
  }
  refereePanels.push({ id: genPanelId(), matchId:null, label:'' });
  savePanels();
  renderReferee();
}

function removeRefereePanel(panelId){
  if(refereePanels.length <= 1) return;
  refereePanels = refereePanels.filter(p => p.id !== panelId);
  if(focusedPanelId === panelId) focusedPanelId = null;
  savePanels();
  renderReferee();
}

function toggleFocusPanel(panelId){
  focusedPanelId = (focusedPanelId === panelId) ? null : panelId;
  renderReferee();
}

function renamePanel(panelId, label){
  const panel = refereePanels.find(p => p.id === panelId);
  if(panel) panel.label = label.trim();
  savePanels();
}

function pickRefereeMatch(panelId, matchId){
  const panel = refereePanels.find(p => p.id === panelId);
  if(panel){
    panel.matchId = matchId;
    delete panel.nextMatchId;
  }
  savePanels();
  renderReferee();
}

function autoAssignPanel(panel, excludeIds){
  const cur = panel.matchId ? state.matches.find(m => m.id === panel.matchId) : null;
  if(cur && !cur.isBye) return; // keep an existing valid pick (even if completed, so the result stays visible)
  const nextUp = nextPlayableMatch(excludeIds);
  panel.matchId = nextUp ? nextUp.id : ((state.matches.find(m => !m.isBye)) || state.matches[0]).id;
  delete panel.nextMatchId;
}

function renderReferee(){
  const wrap = document.getElementById('refereePanels');
  if(!wrap) return;

  wrap.classList.toggle('master-mode', masterModeOn);
  const refereeSection = document.getElementById('tab-referee');
  if(refereeSection) refereeSection.classList.toggle('master-mode', masterModeOn);
  const masterCb = document.getElementById('masterModeCheckbox');
  if(masterCb) masterCb.checked = masterModeOn;

  if(state.matches.length === 0){
    wrap.innerHTML = `<div class="card"><div class="referee-empty"><div class="big">尚未產生賽事</div>請先前往「賽事設定」建立賽事。</div></div>`;
    return;
  }
  if(refereePanels.length === 0) refereePanels.push({ id: genPanelId(), matchId:null, label:'' });

  const assignedSoFar = [];
  refereePanels.forEach(panel => {
    autoAssignPanel(panel, assignedSoFar);
    assignedSoFar.push(panel.matchId);
  });
  savePanels();

  // Referee panel assignments drive the bracket's "進行中 / 即將上場" badges,
  // so treat any assignment change the same as a score change: refresh now
  // if the standings/bracket tab happens to be visible, otherwise mark it
  // dirty so it catches up next time the user switches there.
  if(isTabVisible('standings')){ renderStandings(); standingsDirty = false; }
  else standingsDirty = true;

  if(focusedPanelId && !refereePanels.some(p => p.id === focusedPanelId)) focusedPanelId = null;

  const banner = document.getElementById('refereeFocusBanner');
  if(banner){
    if(focusedPanelId && refereePanels.length > 1){
      const idx = refereePanels.findIndex(p => p.id === focusedPanelId);
      const focusedPanel = refereePanels[idx];
      const label = focusedPanel.label || `裁判 ${idx+1}`;
      banner.innerHTML = `
        <div>目前僅顯示 <b>${escapeHtml(label)}</b> 面板，其他 ${refereePanels.length-1} 個面板已隱藏，避免誤按。</div>
        <button class="btn btn-dark btn-sm" onclick="toggleFocusPanel('${focusedPanel.id}')">顯示所有面板</button>`;
    } else {
      banner.innerHTML = '';
    }
  }

  const panelsToShow = (focusedPanelId && refereePanels.length > 1)
    ? refereePanels.filter(p => p.id === focusedPanelId)
    : refereePanels;

  wrap.innerHTML = panelsToShow.map((panel) => {
    const i = refereePanels.indexOf(panel);
    return `
    <div class="card referee-panel">
      <div class="ref-panel-head">
        <input class="text-input ref-panel-label" value="${escapeAttr(panel.label || '')}"
               placeholder="裁判 ${i+1}（選填）" onchange="renamePanel('${panel.id}', this.value)">
        ${refereePanels.length > 1 ? `<button class="icon-btn focus-btn ${focusedPanelId===panel.id ? 'active':''}" title="${focusedPanelId===panel.id ? '顯示所有面板' : '隱藏其他面板，避免誤按'}" aria-label="${focusedPanelId===panel.id ? '顯示所有面板' : '隱藏其他面板，避免誤按'}" onclick="toggleFocusPanel('${panel.id}')">${focusedPanelId===panel.id ? icon('layout-grid',14) : icon('eye',14)}</button>` : ''}
        ${refereePanels.length > 1 ? `<button class="icon-btn" title="移除此面板" aria-label="移除此面板" onclick="removeRefereePanel('${panel.id}')">${icon('x',14)}</button>` : ''}
      </div>
      <div class="ref-picker">
        <div class="field-label">選擇對戰</div>
        <select class="text-input" id="refPicker-${panel.id}" onchange="pickRefereeMatch('${panel.id}', this.value)"></select>
      </div>
      <div id="refBody-${panel.id}"></div>
    </div>
  `;
  }).join('');

  const rounds = Math.max(...state.matches.map(m => m.round), 1);
  const isKnockoutFmt = isElimination(state.tournament.format);
  panelsToShow.forEach(panel => {
    const picker = document.getElementById(`refPicker-${panel.id}`);
    let optionsHtml = '';
    for(let r=1; r<=rounds; r++){
      const msAll = state.matches.filter(m => m.round === r && !m.isBye && !m.inactive);
      if(msAll.length === 0) continue;
      const bronzeMs = msAll.filter(m => m.thirdPlace);
      const normalMs = msAll.filter(m => !m.thirdPlace);
      const roundLabel = msAll[0].bracket ? doubleRoundLabel(msAll[0]) : isKnockoutFmt ? bracketRoundLabel(r, rounds) : `第 ${r} 輪`;

      if(bronzeMs.length){
        optionsHtml += `<optgroup label="季軍戰">`;
        bronzeMs.forEach(m => {
          const tag = m.status === 'completed' ? '✓ ' : '';
          optionsHtml += `<option value="${m.id}">${tag}${escapeHtml(nameOf(m.playerA))} vs ${escapeHtml(nameOf(m.playerB))}</option>`;
        });
        optionsHtml += `</optgroup>`;
      }
      if(normalMs.length){
        optionsHtml += `<optgroup label="${roundLabel}">`;
        normalMs.forEach(m => {
          const tag = m.status === 'completed' ? '✓ ' : '';
          optionsHtml += `<option value="${m.id}">${tag}${escapeHtml(nameOf(m.playerA))} vs ${escapeHtml(nameOf(m.playerB))}</option>`;
        });
        optionsHtml += `</optgroup>`;
      }
    }
    picker.innerHTML = optionsHtml;
    picker.value = panel.matchId;

    const match = state.matches.find(m => m.id === panel.matchId);
    renderRefereeMatch(match, panel.id);
  });
}

function nextPlayableMatch(excludeIds){
  const ex = new Set(excludeIds || []);
  return state.matches.find(m => m.status === 'pending' && m.playerA && m.playerB && !m.isBye && !ex.has(m.id));
}

// Read-only preview of what advanceReferee() would load next for this panel,
// used to show "下一場" under a just-decided winner without mutating state.
//
// Computed for ALL waiting panels together (not just this one) so that when
// two tables finish at the same time, they don't both preview the exact
// same upcoming match — each waiting panel claims a different pending
// match, in panel order, and only falls back to repeating a match if there
// simply aren't enough distinct pending matches left for every waiting table.
function computeNextMatchAssignments(){
  const assignments = {};
  // Matches currently loaded on a panel that hasn't finished yet are "in use"
  // and must never be handed to another panel as its next match.
  const inUse = new Set(
    refereePanels
      .filter(p => state.matches.find(x => x.id === p.matchId)?.status !== 'completed')
      .map(p => p.matchId)
  );

  const waiting = refereePanels.filter(p =>
    state.matches.find(x => x.id === p.matchId)?.status === 'completed');

  const claimed = new Set(inUse);
  waiting.forEach(panel => {
    const currentRound = state.matches.find(x => x.id === panel.matchId)?.round;
    const savedChoice = panel.nextMatchId && state.matches.find(m =>
      m.id === panel.nextMatchId && m.status === 'pending' && m.playerA && m.playerB &&
      !m.isBye && !m.inactive && !claimed.has(m.id));
    const sameRoundNext = !savedChoice && state.matches.find(m =>
      m.round === currentRound && m.status === 'pending' && m.playerA && m.playerB &&
      !m.isBye && !m.inactive && !claimed.has(m.id));
    const next = savedChoice || sameRoundNext || state.matches.find(m =>
      m.status === 'pending' && m.playerA && m.playerB && !m.isBye && !m.inactive && !claimed.has(m.id));
    assignments[panel.id] = next || null;
    if(next) claimed.add(next.id);
  });

  return assignments;
}

function computeNextMatchForPanel(panelId){
  return computeNextMatchAssignments()[panelId] || null;
}

const nextMatchPreviewFlashPanels = new Set();
const nextMatchSwitchingPanels = new Set();

function getAvailableNextMatchesForPanel(panelId){
  const assignments = computeNextMatchAssignments();
  const inUse = new Set(
    refereePanels
      .filter(p => p.id !== panelId && state.matches.find(m => m.id === p.matchId)?.status !== 'completed')
      .map(p => p.matchId)
  );
  const claimedByOtherPanels = new Set(
    Object.entries(assignments)
      .filter(([id, match]) => id !== panelId && match)
      .map(([, match]) => match.id)
  );
  return state.matches.filter(m =>
    m.status === 'pending' && m.playerA && m.playerB && !m.isBye && !m.inactive &&
    !inUse.has(m.id) && !claimedByOtherPanels.has(m.id)
  );
}

function hasAlternativeNextMatch(panelId){
  return getAvailableNextMatchesForPanel(panelId).length > 1;
}

function switchToOtherPendingMatch(panelId){
  const panel = refereePanels.find(p => p.id === panelId);
  if(!panel || nextMatchSwitchingPanels.has(panelId)) return;
  const current = computeNextMatchForPanel(panelId);
  const candidates = getAvailableNextMatchesForPanel(panelId);
  if(candidates.length < 2){
    showToast('目前沒有其他可切換的未完成對戰');
    return;
  }

  // Candidates stay in schedule order. Each press advances to a different
  // available match; the saved choice is what the green next button loads.
  const currentIndex = candidates.findIndex(m => current && m.id === current.id);
  const selected = candidates[(currentIndex + 1 + candidates.length) % candidates.length];
  const startingMatchId = panel.matchId;
  // 先提交選擇，再播放動畫；動畫期間按「下一場」也會進入畫面剛選定的場次。
  panel.nextMatchId = selected.id;
  nextMatchSwitchingPanels.add(panelId);
  savePanels();

  // Phase 1: visibly sweep the old preview away. Phase 2 rebuilds the panel
  // with the chosen match and plays the brighter arrival/lock-on animation.
  const body = document.getElementById(`refBody-${panelId}`);
  const preview = body && body.querySelector('.next-match-preview');
  const switchButton = body && body.querySelector('.btn-switch-match');
  const nextButton = body && body.querySelector('.btn-next-match');
  if(preview) preview.classList.add('is-refreshing-out');
  if(switchButton){
    switchButton.disabled = true;
    switchButton.classList.add('is-switching');
  }
  if(nextButton) nextButton.disabled = true;

  setTimeout(() => {
    nextMatchSwitchingPanels.delete(panelId);
    const stillOnWinner = panel.matchId === startingMatchId &&
      state.matches.find(m => m.id === startingMatchId)?.status === 'completed';
    if(stillOnWinner) nextMatchPreviewFlashPanels.add(panelId);
    renderReferee();
    nextMatchPreviewFlashPanels.delete(panelId);
  }, preview ? 260 : 0);
}

function renderRefereeMatch(match, panelId){
  const body = document.getElementById(`refBody-${panelId}`);
  if(!body) return;
  const panelCard = body.closest('.referee-panel');
  if(panelCard){
    panelCard.classList.toggle('referee-panel-bronze', !!(match && match.thirdPlace));
    panelCard.classList.toggle('referee-panel-final', isFinalMatch(match));
  }
  if(!match) return;
  const quickMode = !!state.tournament.quickMode;
  const target = state.tournament.pointsToWin;
  const pa = nameOf(match.playerA), pb = nameOf(match.playerB);
  const completed = match.status === 'completed';
  const activeFeedback = scoreTapFeedback.get(match.id);
  const scoreFeedbackHtml = activeFeedback && activeFeedback.until > Date.now()
    ? `<div class="score-tap-feedback side-${activeFeedback.side.toLowerCase()}" data-match-id="${escapeAttr(match.id)}" aria-live="polite">＋${activeFeedback.points}</div>`
    : '';

  const nextMatchPreview = completed ? computeNextMatchForPanel(panelId) : null;
  const nextMatchHtml = nextMatchPreview
    ? `<div class="text-muted next-match-preview ${nextMatchPreviewFlashPanels.has(panelId) ? 'is-switched' : ''}" aria-live="polite">
         <span class="next-match-refresh-mark">${icon('shuffle',13)}</span>
         <span class="next-match-kicker">下一場・第 ${realMatchNumber(nextMatchPreview)} 場</span>
         <span class="next-match-names">${escapeHtml(nameOf(nextMatchPreview.playerA))} <span class="versus-word">VS</span> ${escapeHtml(nameOf(nextMatchPreview.playerB))}</span>
       </div>`
    : `<div class="text-muted">目前沒有下一場對戰了</div>`;

  const ringRowHtml = quickMode ? '' : `
    <div class="ring-row">
      <div class="ring-wrap">
        ${buildBattery(match.pointsA, target)}
        <div class="battery-value">${match.pointsA}<span class="of"> / ${target}</span></div>
        <div class="ring-name">${escapeHtml(pa)}</div>
      </div>
      <div class="vs-mark">VS</div>
      <div class="ring-wrap">
        ${buildBattery(match.pointsB, target)}
        <div class="battery-value">${match.pointsB}<span class="of"> / ${target}</span></div>
        <div class="ring-name">${escapeHtml(pb)}</div>
      </div>
    </div>
  `;

  const mainHtml = completed ? `
      <div class="winner-banner">
        <div class="wname"><span class="winner-check">✓</span>${escapeHtml(nameOf(match.winner))} <span class="winner-word">獲勝</span></div>
        ${nextMatchHtml}
      </div>
    ` : (!match.playerA || !match.playerB) ? `
      <div class="referee-empty" style="padding:36px 16px;">
        <div class="big">尚有選手未決定</div>
        請等待前面的對戰產生結果後，這場才能開始。
      </div>
    ` : quickMode ? `
      <div class="quick-win-grid">
        <button class="quick-win-btn side-blue" onclick="recordQuickWin('${match.id}','A')">
          <span class="quick-win-name">${escapeHtml(pa)}</span>
          <span class="quick-win-label">獲勝</span>
        </button>
        <div class="quick-vs-mark">VS</div>
        <button class="quick-win-btn side-red" onclick="recordQuickWin('${match.id}','B')">
          <span class="quick-win-name">${escapeHtml(pb)}</span>
          <span class="quick-win-label">獲勝</span>
        </button>
      </div>
    ` : `
      <div class="finish-grid">
        <div class="finish-col side-a">
          ${finishButtons(match.id, 'A')}
        </div>
        <div class="finish-col side-b">
          ${finishButtons(match.id, 'B')}
        </div>
      </div>
    `;

  const isKnockoutFmt = isElimination(state.tournament.format);
  const maxRound = isKnockoutFmt ? Math.max(...state.matches.map(x => x.round)) : match.round;
  const refTitleLabel = match.bracket ? doubleRoundLabel(match) : match.thirdPlace ? '季軍戰' : (isKnockoutFmt ? bracketRoundLabel(match.round, maxRound) : `第 ${match.round} 輪`);
  body.classList.add("score-console");
  body.classList.toggle("quick-console", quickMode);
  body.classList.toggle("completed-console", completed);
  body.innerHTML = `
    <div class="referee-title">${refTitleLabel}</div>
    ${scoreFeedbackHtml}
    ${ringRowHtml}
    ${mainHtml}

    <div class="ref-footer">
      ${quickMode ? '' : `<button class="btn btn-dark" onclick="undoLastPoint('${match.id}')" ${match.log.length===0?'disabled':''}>撤銷上一分</button>`}
      ${(!quickMode || completed) ? `<button class="btn btn-ghost btn-reset-match" onclick="resetMatch('${match.id}')" ${(!quickMode && match.log.length===0) ? 'disabled':''}>勝負重置</button>` : ''}
      ${completed ? (nextMatchPreview
          ? `<button class="btn btn-switch-match ${nextMatchSwitchingPanels.has(panelId) ? 'is-switching' : ''}" onclick="switchToOtherPendingMatch('${panelId}')" ${hasAlternativeNextMatch(panelId) && !nextMatchSwitchingPanels.has(panelId) ? '' : 'disabled'}>切換場次 ${icon('shuffle',15)}</button>
             <button class="btn btn-primary btn-next-match" onclick="advanceReferee('${panelId}')" ${nextMatchSwitchingPanels.has(panelId) ? 'disabled' : ''}>下一場 ${icon('arrow-right',16)}</button>`
          : (hasPendingMatches()
              ? `<button class="btn btn-dark" disabled>目前無可分配場次</button>`
              : `<button class="btn btn-primary" onclick="showFinalResults()">戰績結算</button>`)
        ) : ''}
    </div>
  `;
}

function finBadgeIcon(key){
  const paths={
    SPIN:'<path d="M19 7a8 8 0 1 0 1 9M19 3v4h-4"/><path d="M9 12h6"/>',
    OVER:'<path d="M3 18h14M14 5h7v7M20 6l-9 9"/><path d="M4 9h5v5H4z"/>',
    BURST:'<path d="m9 4-2 5-4 2 5 2 2 7 3-6 7-2-6-3-2-6"/><path d="m18 4 2-2M20 18l2 2M3 3l2 2"/>',
    XTREME:'<path d="M3 17h8l4-10h6M17 3l4 4-4 4"/><path d="m4 10 3-3 3 3"/>'
  };
  return `<svg class="fin-badge-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key]||paths.SPIN}</svg>`;
}
function legacyFinBadgeIcon(key){
  if(key === 'SPIN'){
    return `<svg class="fin-badge-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`;
  }
  if(key === 'OVER'){
    return `<svg class="fin-badge-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 22 20H2Z"/></svg>`;
  }
  // BURST / XTREME: jagged/sparkle star shapes drawn with a plain CSS
  // clip-path (see .fin-badge-star rules) rather than a hand-built SVG
  // path, since a star polygon is easy to get subtly wrong in path form.
  return `<span class="fin-badge-star"></span>`;
}
function finishButtons(matchId, side){
  return Object.entries(FINISH).map(([key, f]) => `
    <button class="finish-btn ${f.cls}" onclick="recordFinish('${matchId}','${side}','${key}')">
      <span class="fin-text">
        <span class="finish-label">${f.label}</span>
        <span class="finish-sub" aria-label="${key}">${[...key].map(letter => `<span aria-hidden="true">${letter}</span>`).join('')}</span>
      </span>
      <span class="fin-ticks"></span>
      <span class="finish-pts">+${f.points}</span>
    </button>
  `).join('');
}

function resolveColor(varRef){
  const name = varRef.replace('var(','').replace(')','');
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#39ff14';
}

