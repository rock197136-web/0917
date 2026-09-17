/* =========================================================
   STATS + SETUP SYNC
========================================================= */
function renderStats(){
  const empty = state.matches.length === 0;
  document.getElementById("welcomeV38").classList.toggle("hidden", !empty);
  document.getElementById("statsBarV38").classList.toggle("hidden", empty);
  const realMatches = state.matches.filter(m => !m.isBye && !m.inactive);
  const total = realMatches.length;
  const completed = realMatches.filter(m=>m.status==='completed').length;
  const progress = total>0 ? Math.round(completed/total*100) : 0;

  // "分享賽事戰報" only makes sense once the tournament is fully wrapped up
  // (100% complete) — otherwise the champion/runner-up/3rd aren't final yet.
  const awardBtnWrap = document.getElementById('awardButtonWrap');
  if(awardBtnWrap) awardBtnWrap.classList.toggle('hidden', !(total > 0 && completed === total));

  document.getElementById('statPlayers').innerText = state.players.length;
  document.getElementById('statTotal').innerText = total;
  document.getElementById('statCompleted').innerText = completed;
  document.getElementById('statProgress').innerText = progress + '%';
  const progressFill = document.getElementById('statProgressFill');
  if(progressFill) progressFill.style.width = progress + '%';

  document.getElementById('headerTName').innerText =
    state.tournament.name ? state.tournament.name : '尚未設定賽事';
}

function loadSetupInputs(){
  document.getElementById('tournamentName').value = state.tournament.name || '';
  document.getElementById('pointsToWin').value = state.tournament.pointsToWin || 4;
  document.getElementById('formatSelect').value = state.tournament.format || 'knockout';
  document.getElementById('quickModeCheckbox').checked = !!state.tournament.quickMode;
  onFormatChange();

  const isRunning = state.tournament.status === 'running';
  const showDetail = !isRunning || playerSetupExpanded;

  if(showDetail && state.players.length > 0){
    createPlayerInputs(0);
    const container = document.getElementById('playerInputs');
    state.players.forEach(p => appendPlayerRow(container, p.name));
  } else if(showDetail && document.getElementById('playerInputs').children.length === 0){
    createPlayerInputs(0);
  }
  if(showDetail && !isRunning && state.players.length === 0 && !rosterDraftPrompted){
    const draft = readRosterDraft();
    if(draft){
      rosterDraftPrompted = true;
      showConfirm(`發現尚未開賽的名單草稿（${draft.players.length} 位），是否恢復姓名與點名狀態？`, () => restoreRosterDraft(draft));
    }
  }
  updatePlayerSetupVisibility();

  const note = document.getElementById('setupNote');
  const startBtn = document.getElementById('startBtn');
  if(isRunning){
    note.innerText = '賽事進行中：重新按下「開始比賽」將會清除目前所有對戰紀錄並重新產生賽程。';
    startBtn.innerText = '重新產生賽程';
  } else {
    note.innerText = '';
    startBtn.innerText = '開始比賽';
  }
}

