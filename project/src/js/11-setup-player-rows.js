/* =========================================================
   SETUP: PLAYER ROWS
========================================================= */
let restoringRosterDraft = false;
let rosterDraftPrompted = false;

function normalizePlayerName(name){
  return String(name || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-Hant');
}

function findDuplicatePlayerChip(name, exceptChip){
  const key = normalizePlayerName(name);
  return Array.from(document.querySelectorAll('#playerInputs .player-chip'))
    .find(chip => chip !== exceptChip && normalizePlayerName(chip.dataset.name) === key);
}

function saveRosterDraft(){
  if(restoringRosterDraft || state.tournament.status === 'running') return;
  const players = Array.from(document.querySelectorAll('#playerInputs .player-chip')).map(chip => ({
    name: chip.dataset.name || '', attendance: chip.dataset.attendance || 'pending'
  })).filter(p => p.name.trim());
  try{
    if(players.length) localStorage.setItem(ROSTER_DRAFT_KEY, JSON.stringify({ players, updatedAt:Date.now() }));
    else localStorage.removeItem(ROSTER_DRAFT_KEY);
  }catch(e){}
}

function readRosterDraft(){
  try{
    const draft = JSON.parse(localStorage.getItem(ROSTER_DRAFT_KEY) || 'null');
    return draft && Array.isArray(draft.players) && draft.players.length ? draft : null;
  }catch(e){ return null; }
}

function restoreRosterDraft(draft){
  if(!draft || !Array.isArray(draft.players)) return;
  restoringRosterDraft = true;
  createPlayerInputs(0);
  draft.players.forEach(p => addPlayerChip(p.name, p.attendance));
  restoringRosterDraft = false;
  renumberPlayerRows();
  renderAttendanceManager();
  showToast(`已恢復 ${draft.players.length} 位選手與點名狀態`);
}

function createPlayerInputs(n){
  // n 保留參數相容舊呼叫點，但晶片式清單不需要空白佔位列
  const container = document.getElementById('playerInputs');
  container.innerHTML = '';
  ensureChipInput(container);
  renumberPlayerRows();
}

function ensureChipInput(container){
  if(document.getElementById('playerChipInput')) return;
  const input = document.createElement('input');
  input.id = 'playerChipInput';
  input.className = 'chip-text-input';
  input.placeholder = '輸入玩家名稱後按 Enter 新增';
  input.addEventListener('keydown', onChipInputKeydown);
  container.appendChild(input);
}

function onChipInputKeydown(e){
  const input = e.target;
  if(e.key === 'Enter' || e.key === ','){
    e.preventDefault();
    const name = input.value.trim();
    if(name){
      addPlayerChip(name);
      input.value = '';
    }
  } else if(e.key === 'Backspace' && input.value === ''){
    const container = document.getElementById('playerInputs');
    const chips = container.querySelectorAll('.player-chip');
    if(chips.length > 0) chips[chips.length-1].remove();
    renumberPlayerRows();
    saveRosterDraft();
  }
}

function addPlayerChip(name, attendance){
  const container = document.getElementById('playerInputs');
  ensureChipInput(container);
  const displayName = String(name || '').trim().replace(/\s+/g, ' ');
  if(!displayName) return false;
  if(findDuplicatePlayerChip(displayName)){
    showToast(`已忽略重複姓名：${displayName}`);
    return false;
  }
  const chip = document.createElement('span');
  chip.className = 'player-chip';
  chip.dataset.name = displayName;
  chip.dataset.attendance = attendance || 'pending';
  const idx = container.querySelectorAll('.player-chip').length + 1;
  chip.innerHTML = `
    <span class="chip-index">${String(idx).padStart(2,'0')}</span>
    <span class="chip-name" ondblclick="editChip(this)" title="雙擊可重新命名">${escapeHtml(displayName)}</span>
    <button type="button" class="chip-remove" onclick="removePlayerChip(this)" title="移除" aria-label="移除">×</button>
  `;
  const chipInput = document.getElementById('playerChipInput');
  container.insertBefore(chip, chipInput);
  renumberPlayerRows();
  saveRosterDraft();
  return true;
}

function editChip(nameSpan){
  const chip = nameSpan.closest('.player-chip');
  if(!chip) return;
  const current = chip.dataset.name || '';
  const input = document.createElement('input');
  input.className = 'chip-edit-input';
  input.value = current;
  input.style.width = Math.max(40, current.length*8) + 'px';
  chip.replaceChild(input, nameSpan);
  input.focus();
  input.select();

  let committed = false;
  const commit = () => {
    if(committed) return;
    committed = true;
    const val = input.value.trim().replace(/\s+/g, ' ');
    if(!val){ chip.remove(); renumberPlayerRows(); return; }
    if(findDuplicatePlayerChip(val, chip)){
      showAlert(`「${val}」已在參賽名單內，請使用不同姓名或加上辨識碼。`);
      input.value = current;
      committed = false;
      input.focus();
      return;
    }
    chip.dataset.name = val;
    chip.classList.remove('input-error');
    const newSpan = document.createElement('span');
    newSpan.className = 'chip-name';
    newSpan.title = '雙擊可重新命名';
    newSpan.textContent = val;
    newSpan.ondblclick = () => editChip(newSpan);
    if(input.parentNode === chip) chip.replaceChild(newSpan, input);
    renumberPlayerRows();
    renderAttendanceManager();
    saveRosterDraft();
  };
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); commit(); }
    if(e.key === 'Escape'){ e.preventDefault(); input.value = current; commit(); }
  });
  input.addEventListener('blur', commit);
}

function addPlayerRow(){
  // 「＋ 新增玩家」現在只需把焦點移到晶片輸入框，讓使用者直接打字 + Enter
  const container = document.getElementById('playerInputs');
  ensureChipInput(container);
  document.getElementById('playerChipInput').focus();
}

function onFormatChange(userChanged){
  const format = document.getElementById('formatSelect').value;
  const isKnockout = isElimination(format);
  document.getElementById('bulkAddSection').classList.toggle('hidden', !isKnockout);
  document.getElementById('quickModeSection').classList.toggle('hidden', !isKnockout);
  if(!isKnockout) document.getElementById('quickModeCheckbox').checked = false;
  else if(userChanged) document.getElementById('quickModeCheckbox').checked = true;
  const note = document.getElementById('formatNote');
  if(note){
    note.innerText = format === 'double_elimination' ? '雙敗淘汰：首敗進敗部、再敗出局。敗部冠軍須連勝兩場總決賽；輪空自動晉級，不計敗場。' : isKnockout
      ? '單淘汰賽模式：輸了立刻出局，「即時戰況」頁籤將顯示對戰樹狀圖，方便觀看晉級狀況。'
      : '';
  }
}

// 相容舊呼叫點（批量套用名單、從 state.players 載入既有名單時使用）
function appendPlayerRow(container, value, attendance){
  ensureChipInput(container);
  const name = String(value || '').trim();
  if(name) addPlayerChip(name, attendance);
}

function applyBulkNames(){
  const raw = document.getElementById('bulkNamesInput').value;
  const names = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if(names.length === 0){
    showAlert('請輸入至少 1 位玩家名稱，一行一個。');
    return;
  }

  const container = document.getElementById('playerInputs');
  ensureChipInput(container);

  // 既有名單不清空；所有姓名入口共用 normalizePlayerName 的比較規則。
  const registeredNames = new Set(
    Array.from(container.querySelectorAll('.player-chip'))
      .map(chip => normalizePlayerName(chip.dataset.name))
      .filter(Boolean)
  );
  const addedNames = [];
  let duplicateCount = 0;

  names.forEach(name => {
    const normalized = normalizePlayerName(name);
    if(!normalized || registeredNames.has(normalized)){
      duplicateCount++;
      return;
    }
    registeredNames.add(normalized);
    addedNames.push(name);
    appendPlayerRow(container, name);
  });

  renumberPlayerRows();
  renderAttendanceManager();
  document.getElementById('bulkNamesInput').value = '';
  const totalPlayers = container.querySelectorAll('.player-chip').length;
  const duplicateMessage = duplicateCount > 0
    ? `，已自動忽略 ${duplicateCount} 筆重複姓名`
    : '';
  showAlert(`已新增 ${addedNames.length} 位玩家${duplicateMessage}。目前參賽名單共 ${totalPlayers} 位。`);
}

function removePlayerChip(btn){
  const chip = btn.closest('.player-chip');
  if(chip) chip.remove();
  renumberPlayerRows();
  renderAttendanceManager();
  saveRosterDraft();
}

function renumberPlayerRows(){
  const chips = document.querySelectorAll('#playerInputs .player-chip');
  chips.forEach((chip, i) => {
    const badge = chip.querySelector('.chip-index');
    if(badge) badge.textContent = String(i+1).padStart(2,'0');
  });
  const hint = document.getElementById('playerCountHint');
  if(hint) hint.textContent = chips.length > 0 ? `已新增 ${chips.length} 位` : '';
  const chipInput = document.getElementById('playerChipInput');
  if(chipInput) chipInput.placeholder = chips.length > 0 ? '新增玩家…（輸入名稱按下 ↵）' : '輸入玩家名稱後按 Enter 新增';
  if(attendanceManagerOpen) renderAttendanceManager();
  syncPrizeDrawPlayers();
}

