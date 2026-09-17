/* =========================================================
   RENDER: MATCHES TAB
========================================================= */
let matchStatusFilter = 'all';
const expandedMatchIds = new Set();

function setMatchStatusFilter(filter){
  matchStatusFilter = ['all','pending','completed'].includes(filter) ? filter : 'all';
  document.querySelectorAll('.match-filter-btn').forEach(btn => {
    const active = btn.dataset.filter === matchStatusFilter;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  renderMatches();
}

function toggleMatchDetails(matchId, button){
  const card = button && button.closest('.match');
  const details = card && card.querySelector('.match-collapsible');
  if(!card || !details) return;
  const willExpand = details.classList.contains('hidden');
  details.classList.toggle('hidden', !willExpand);
  card.classList.toggle('expanded', willExpand);
  button.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
  if(willExpand) expandedMatchIds.add(matchId); else expandedMatchIds.delete(matchId);
}

function realMatchNumber(match){
  return state.matches.filter(m => !m.isBye && !m.inactive).findIndex(m => m.id === match.id) + 1;
}

function renderMatches(){
  const matchList = document.getElementById('matchList');
  updateMatchSearchVisibility();

  // Bye "matches" are an automatic advance, not a real match played between
  // two people — they don't belong in 對戰紀錄 at all (no one actually
  // played), so they're excluded here entirely and don't consume a match
  // number either (numbering stays consecutive across only real matches).
  const realMatches = state.matches.filter(m => !m.isBye && !m.inactive);

  if(realMatches.length === 0){
    matchList.innerHTML = `<div class="referee-empty">尚未產生對戰紀錄，請先前往「賽事設定」開始比賽。</div>`;
    return;
  }

  const visibleMatches = realMatches.filter(m =>
    matchStatusFilter === 'all' ||
    (matchStatusFilter === 'completed' ? m.status === 'completed' : m.status !== 'completed')
  );
  document.querySelectorAll('.match-filter-btn').forEach(btn => {
    const active = btn.dataset.filter === matchStatusFilter;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if(visibleMatches.length === 0){
    matchList.innerHTML = `<div class="referee-empty">目前沒有${matchStatusFilter === 'completed' ? '已完成' : '未完成'}的對戰。</div>`;
    return;
  }

  const html = visibleMatches.map(m => {
    const pa = nameOf(m.playerA), pb = nameOf(m.playerB);
    const completed = m.status === 'completed';
    const expanded = !completed || expandedMatchIds.has(m.id);
    const matchNo = realMatchNumber(m);
    const chip = (l) => {
      const f = FINISH[l.finish];
      const hex = resolveColor(f.color);
      return `<span class="log-chip" style="background:${hex}22;color:${hex};border:1px solid ${hex}55;">${f.icon} ${f.label} +${f.points}</span>`;
    };
    const logAHtml = m.log.filter(l=>l.side==='A').map(chip).join('');
    const logBHtml = m.log.filter(l=>l.side==='B').map(chip).join('');
    const playerName = (id, name) => completed
      ? `<span class="mr-name ${m.winner === id ? 'match-winner' : 'match-loser'}" data-player-id="${escapeHtml(id || '')}">${m.winner === id ? '<span class="winner-check">✓</span>' : ''}${escapeHtml(name)}${m.winner === id ? '<span class="match-winner-label">勝利</span>' : ''}</span>`
      : `<span class="mr-name" data-player-id="${escapeHtml(id || '')}">${escapeHtml(name)}</span>`;
    const scoreHtml = completed && !m.quickWin && !m.forfeited
      ? `<span class="mr-score">${m.pointsA} : ${m.pointsB}</span>`
      : completed && m.forfeited ? `<span class="mr-score">棄權判負</span>` : '';

    return `
      <div class="match ${completed?'completed':''} ${expanded?'expanded':''}" data-match-id="${escapeHtml(m.id)}">
        ${completed ? `<div class="match-summary-toggle" role="button" tabindex="0" onclick="toggleMatchDetails('${m.id}',this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleMatchDetails('${m.id}',this)}" aria-expanded="${expanded}">` : ''}
          <div class="match-header">
            <span>第 ${matchNo} 場</span>
            <span><span class="status-pill ${completed?'done':'pending'}">${completed?'已完成':'尚未開始'}</span>${completed ? `<span class="match-toggle-icon">${icon('chevron-down',14)}</span>` : ''}</span>
          </div>
          <div class="match-result"><div class="mr-versus">${playerName(m.playerA,pa)}<span class="mr-vs">VS</span>${playerName(m.playerB,pb)}${scoreHtml}</div></div>
        ${completed ? '</div>' : ''}
        <div class="match-collapsible ${expanded ? '' : 'hidden'}">
          ${(logAHtml || logBHtml) ? `
          <div class="match-log">
            <div class="match-log-side"><div class="match-log-name" data-player-id="${escapeHtml(m.playerA || '')}">${escapeHtml(pa)}</div>${logAHtml}</div>
            <div class="match-log-side"><div class="match-log-name" data-player-id="${escapeHtml(m.playerB || '')}">${escapeHtml(pb)}</div>${logBHtml}</div>
          </div>` : ''}
          <div class="match-actions">
            <button class="btn btn-primary goto-referee-btn" onclick="goToReferee('${m.id}')">${completed ? '查看 / 修改' : '前往裁判台'}</button>
            ${completed ? `<details class="match-more referee-only-btn"><summary class="btn btn-ghost">更多 ⋯</summary><div class="match-more-menu"><button type="button" onclick="this.closest('details').removeAttribute('open');resetMatch('${m.id}')">重新這場</button></div></details>` : ''}
          </div>
        </div>
        </div>`;
  }).join('');

  matchList.innerHTML = html;
}

function jumpToNextPendingMatch(){
  if(matchStatusFilter === 'completed') matchStatusFilter = 'pending';
  if(matchesDirty || matchStatusFilter === 'pending'){ renderMatches(); matchesDirty = false; }
  const target = document.querySelector('#matchList .match:not(.completed)');
  if(!target){ showToast('目前沒有尚未開始的對戰'); return; }
  target.scrollIntoView({ behavior:'smooth', block:'center' });
  target.classList.remove('match-highlight');
  void target.offsetWidth; // restart animation if already used
  target.classList.add('match-highlight');
  setTimeout(()=>target.classList.remove('match-highlight'), 1600);
}

function goToReferee(matchId){
  if(refereePanels.length === 0) refereePanels.push({ id: genPanelId(), matchId:null, label:'' });
  refereePanels[0].matchId = matchId;
  savePanels();
  switchTab('referee');
}

