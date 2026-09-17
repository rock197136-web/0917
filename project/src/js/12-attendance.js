/* =========================================================
   OPTIONAL ATTENDANCE & ROSTER MANAGEMENT
   點名未開啟時完全不影響原開賽流程；標記「未到」才會被排除。
========================================================= */
function toggleAttendanceManager(){
  const chipInput = document.getElementById('playerChipInput');
  if(!attendanceManagerOpen && chipInput && chipInput.value.trim()){
    addPlayerChip(chipInput.value.trim());
    chipInput.value = '';
  }
  attendanceManagerOpen = !attendanceManagerOpen;
  if(!attendanceManagerOpen) clearAttendanceSearch();
  renderAttendanceManager();
}

function renderAttendanceManager(){
  const manager = document.getElementById('attendanceManager');
  const panel = document.getElementById('attendancePanel');
  const toggle = document.getElementById('attendanceToggleBtn');
  const list = document.getElementById('attendanceList');
  const counts = document.getElementById('attendanceCounts');
  if(!manager || !panel || !toggle || !list || !counts) return;

  manager.classList.toggle('open', attendanceManagerOpen);
  panel.classList.toggle('hidden', !attendanceManagerOpen);
  toggle.setAttribute('aria-expanded', attendanceManagerOpen ? 'true' : 'false');
  const toggleState = document.getElementById('attendanceToggleState');
  if(toggleState) toggleState.textContent = attendanceManagerOpen ? '收合' : '開啟';
  if(!attendanceManagerOpen) return;

  const chips = Array.from(document.querySelectorAll('#playerInputs .player-chip'));
  const arrived = chips.filter(chip => chip.dataset.attendance === 'arrived').length;
  const absent = chips.filter(chip => chip.dataset.attendance === 'absent').length;
  const pending = chips.length - arrived - absent;
  counts.innerHTML = `<span class="arrived">已到 ${arrived}</span> ／ <span class="absent">未到 ${absent}</span> ／ <span class="pending">待確認 ${pending}</span>`;
  const nextPendingBtn = document.getElementById('attendanceNextPendingBtn');
  if(nextPendingBtn){
    nextPendingBtn.disabled = pending === 0;
    nextPendingBtn.innerHTML = pending === 0 ? `${icon('check',13)} 已全部確認` : `下一位待確認 ${icon('arrow-right',13)}`;
  }

  if(chips.length === 0){
    list.innerHTML = '<div class="attendance-empty">請先在上方新增玩家名單</div>';
    return;
  }

  list.innerHTML = chips.map((chip, index) => {
    const status = chip.dataset.attendance || 'pending';
    const rowClass = status === 'arrived' ? ' is-arrived' : status === 'absent' ? ' is-absent' : '';
    return `<div class="attendance-row${rowClass}" data-player-index="${index}">
      <div class="attendance-player">
        <span class="attendance-index">${String(index + 1).padStart(2,'0')}</span>
        <span class="attendance-player-name">${escapeHtml(chip.dataset.name || '')}</span>
      </div>
      <div class="attendance-actions">
        <button type="button" class="attendance-action arrived${status === 'arrived' ? ' active' : ''}" onclick="setAttendanceStatus(${index},'arrived')" aria-pressed="${status === 'arrived'}" title="標記報到">${icon(status === 'arrived' ? 'check' : 'user-check',14)}<span>${status === 'arrived' ? '已報到' : '報到'}</span></button>
        <button type="button" class="attendance-action absent${status === 'absent' ? ' active' : ''}" onclick="setAttendanceStatus(${index},'absent')" aria-pressed="${status === 'absent'}" title="標記未到">${icon('user-x',14)}<span>未到</span></button>
        <details class="attendance-more">
          <summary class="attendance-action" aria-label="更多選手操作" title="更多操作">⋯</summary>
          <div class="attendance-more-menu">
            <button type="button" onclick="startAttendanceNameEdit(${index},this);this.closest('details').removeAttribute('open')">${icon('edit-3',14)}<span>編輯姓名</span></button>
            <button type="button" class="delete" onclick="this.closest('details').removeAttribute('open');deleteAttendancePlayer(${index})">${icon('trash-2',14)}<span>刪除選手</span></button>
          </div>
        </details>
      </div>
    </div>`;
  }).join('');

  const searchInput = document.getElementById('attendanceSearchInput');
  if(searchInput && searchInput.value.trim()) searchAttendancePlayers(searchInput.value);
}

function normalizeAttendanceSearch(text){
  return String(text || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\s\-_．。・·,，.]/g, '');
}

function fuzzyAttendanceScore(name, query){
  const source = normalizeAttendanceSearch(name);
  const target = normalizeAttendanceSearch(query);
  if(!target) return null;
  const exactIndex = source.indexOf(target);
  if(exactIndex !== -1) return exactIndex;

  let sourceIndex = 0;
  let gaps = 0;
  for(const char of target){
    const found = source.indexOf(char, sourceIndex);
    if(found === -1) return null;
    gaps += found - sourceIndex;
    sourceIndex = found + 1;
  }
  return 100 + gaps + (source.length - target.length);
}

function searchAttendancePlayers(query){
  const results = document.getElementById('attendanceSearchResults');
  if(!results) return;
  const value = String(query || '').trim();
  if(!value){
    results.classList.add('hidden');
    results.innerHTML = '';
    return;
  }

  const chips = Array.from(document.querySelectorAll('#playerInputs .player-chip'));
  const matches = chips
    .map((chip, index) => ({ index, name:chip.dataset.name || '', score:fuzzyAttendanceScore(chip.dataset.name || '', value) }))
    .filter(item => item.score !== null)
    .sort((a,b) => a.score - b.score || a.index - b.index)
    .slice(0, 8);

  results.innerHTML = matches.length
    ? matches.map(item => `<li role="option">
        <button type="button" class="attendance-search-result" onclick="jumpToAttendancePlayer(${item.index})">
          <span class="attendance-search-result-index">${String(item.index + 1).padStart(2,'0')}</span>
          <span>${escapeHtml(item.name)}</span>
        </button>
      </li>`).join('')
    : '<li class="attendance-search-empty">找不到符合的選手</li>';
  results.classList.remove('hidden');
}

function onAttendanceSearchKeydown(event){
  const results = document.getElementById('attendanceSearchResults');
  if(event.key === 'Escape'){
    if(results) results.classList.add('hidden');
    event.currentTarget.blur();
    return;
  }
  if(event.key === 'Enter'){
    const first = results && results.querySelector('.attendance-search-result');
    if(first){
      event.preventDefault();
      first.click();
    }
  }
}

function jumpToAttendancePlayer(index){
  const row = document.querySelector(`.attendance-row[data-player-index="${index}"]`);
  const results = document.getElementById('attendanceSearchResults');
  if(results) results.classList.add('hidden');
  if(!row) return;
  row.classList.remove('search-target');
  void row.offsetWidth;
  row.classList.add('search-target');
  row.scrollIntoView({ behavior:'smooth', block:'center' });
  window.setTimeout(() => row.classList.remove('search-target'), 1900);
}

function clearAttendanceSearch(){
  const input = document.getElementById('attendanceSearchInput');
  const results = document.getElementById('attendanceSearchResults');
  if(input) input.value = '';
  if(results){
    results.innerHTML = '';
    results.classList.add('hidden');
  }
}

function setAttendanceStatus(index, status){
  const chips = document.querySelectorAll('#playerInputs .player-chip');
  const chip = chips[index];
  if(!chip) return;
  chip.dataset.attendance = status;
  renderAttendanceManager();
  saveRosterDraft();
}

function jumpToNextPendingAttendance(){
  const chips = Array.from(document.querySelectorAll('#playerInputs .player-chip'));
  const pendingIndexes = chips
    .map((chip, index) => chip.dataset.attendance === 'pending' ? index : -1)
    .filter(index => index !== -1);

  if(pendingIndexes.length === 0){
    showToast('所有選手皆已完成點名');
    return;
  }

  const nextIndex = pendingIndexes.find(index => index > attendancePendingCursor) ?? pendingIndexes[0];
  attendancePendingCursor = nextIndex;
  jumpToAttendancePlayer(nextIndex);
}

function startAttendanceNameEdit(index, button){
  const chips = document.querySelectorAll('#playerInputs .player-chip');
  const chip = chips[index];
  const row = button && button.closest('.attendance-row');
  const nameEl = row && row.querySelector('.attendance-player-name');
  if(!chip || !nameEl) return;

  const original = chip.dataset.name || '';
  const input = document.createElement('input');
  input.className = 'attendance-name-input';
  input.value = original;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  let committed = false;
  const commit = (restore) => {
    if(committed) return;
    committed = true;
    const value = restore ? original : input.value.trim().replace(/\s+/g, ' ');
    if(value){
      if(!restore && findDuplicatePlayerChip(value, chip)){
        showAlert(`「${value}」已在參賽名單內，請使用不同姓名或加上辨識碼。`);
        renderAttendanceManager();
        return;
      }
      chip.dataset.name = value;
      const chipName = chip.querySelector('.chip-name');
      if(chipName) chipName.textContent = value;
    }
    renderAttendanceManager();
    saveRosterDraft();
  };
  input.addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); commit(false); }
    if(e.key === 'Escape'){ e.preventDefault(); commit(true); }
  });
  input.addEventListener('blur', () => commit(false));
}

function deleteAttendancePlayer(index){
  const chips = document.querySelectorAll('#playerInputs .player-chip');
  const chip = chips[index];
  if(!chip) return;
  const name = chip.dataset.name || '這位玩家';
  showConfirm(`確定要刪除「${name}」嗎？`, () => {
    if(chip.isConnected) chip.remove();
    renumberPlayerRows();
    renderAttendanceManager();
    saveRosterDraft();
  });
}

/* Kept for backward compatibility with previously saved tournaments that
   may already contain withdrawn player flags. The management UI is removed. */
function isWithdrawn(playerId){
  const p = state.players.find(x => x.id === playerId);
  return !!(p && p.withdrawn);
}

