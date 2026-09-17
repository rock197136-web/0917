/* =========================================================
   START TOURNAMENT
========================================================= */
function startTournament(){
  const isRunning = state.tournament.status === 'running';
  // 玩家名單維持收合狀態時，直接沿用目前已登記的正式名單即可重新產生賽程，
  // 不需要先展開名單、把晶片清單重新建立出來才能刷新。展開中或賽事尚未開始
  // （表示畫面上本來就是可編輯的晶片清單）時，才照原本方式讀取輸入框內容。
  const usingExistingRoster = isRunning && !playerSetupExpanded;

  let names;
  if(usingExistingRoster){
    names = state.players.map(p => p.name);
  } else {
    // 如果晶片輸入框裡還有沒按 Enter 的文字，開賽前先自動補收進清單
    const chipInput = document.getElementById('playerChipInput');
    if(chipInput && chipInput.value.trim()){
      addPlayerChip(chipInput.value.trim());
      chipInput.value = '';
    }

    const chips = Array.from(document.querySelectorAll('#playerInputs .player-chip'));
    const entries = chips.map((chip, i) => ({
      idx: i+1,
      chip,
      name: (chip.dataset.name || '').trim(),
      attendance: chip.dataset.attendance || 'pending'
    }));

    entries.forEach(e => e.chip.classList.remove('input-error'));

    const filled = entries.filter(e => e.name && e.attendance !== 'absent');
    names = filled.map(e => e.name);

    const groups = new Map();
    filled.forEach(e => {
      const key = normalizePlayerName(e.name);
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });
    const dupGroups = Array.from(groups.values()).filter(g => g.length > 1);

    if(dupGroups.length > 0){
      dupGroups.forEach(g => g.forEach(e => e.chip.classList.add('input-error')));
      const lines = dupGroups.map(g =>
        g.map(e => `${String(e.idx).padStart(2,'0')}.${e.name}`).join('、') + ' 重複名稱'
      );
      showAlert(`玩家名稱不可重複：\n${lines.join('\n')}`);
      return;
    }

  }

  if(names.length < 2){
    const absentCount = Array.from(document.querySelectorAll('#playerInputs .player-chip'))
      .filter(chip => chip.dataset.attendance === 'absent').length;
    showAlert(absentCount > 0
      ? `排除 ${absentCount} 位未到玩家後，至少需要 2 位玩家才能開始比賽。`
      : '至少需要 2 位玩家才能開始比賽。');
    return;
  }

  if(state.matches.length > 0){
    const isRegenerate = state.tournament.status === 'running';
    showConfirm('目前已有比賽資料，開始新賽事將清除所有紀錄，確定嗎？', () => {
      finalizeStartTournament(names);
      if(isRegenerate) showToast('對戰賽程已刷新');
    });
    return;
  }

  finalizeStartTournament(names);
}

function finalizeStartTournament(names){
  const players = names.map((name,i)=>({ id:`P${String(i+1).padStart(2,'0')}`, name }));
  const pointsToWin = Number(document.getElementById('pointsToWin').value);
  const format = document.getElementById('formatSelect').value;
  const quickMode = isElimination(format) && document.getElementById('quickModeCheckbox').checked;

  // generateKnockoutBracket() now does its own full random draw internally
  // (both matchups AND which match slot any bye lands in), so the roster
  // itself can stay in the order it was entered — no need to shuffle it
  // here just to get a random bracket.
  const newMatches = format === 'double_elimination' ? generateDoubleElimination(players) : format === 'knockout' ? generateKnockoutBracket(players) : generateRoundRobin(players, format);
  state.players = players;
  state.matches = newMatches;
  state.currentRound = 1;
  state.tournament = {
    name: document.getElementById('tournamentName').value.trim() || 'BEYBLADE X 對戰賽',
    pointsToWin, format, quickMode, status:'running'
  };
  refereePanels.forEach(p => p.matchId = null);
  savePanels();
  markAllDirty();
  playerSetupExpanded = false; // 開賽（或重新產生賽程）後，「參賽玩家」自動收合成摘要
  attendanceManagerOpen = false;
  try{ localStorage.removeItem(ROSTER_DRAFT_KEY); }catch(e){}

  cloudNeedsFullReplace = true;
  saveState();
  renderAll();
  switchTab('standings');
}

