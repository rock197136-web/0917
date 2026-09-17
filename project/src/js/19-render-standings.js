/* =========================================================
   RENDER: STANDINGS
========================================================= */
function renderStandings(){
  const isKnockout = isElimination(state.tournament.format);
  document.getElementById('bracketSection').classList.toggle('hidden', !isKnockout);
  document.getElementById('bracketThemeRow').classList.toggle('hidden', !isKnockout);
  document.getElementById('standingsSection').classList.toggle('hidden', isKnockout);

  if(isKnockout){
    renderBracketPodium();
    renderBracket();
    applyBracketZoom(); // re-sync the zoom wrapper's size to the freshly rendered tree
    return;
  }

  const body = document.getElementById('standingsBody');
  const podiumContainer = document.getElementById('podiumContainer');
  const standings = calculateStandings();

  document.getElementById('rulesSummary').innerText =
    `先取得 ${state.tournament.pointsToWin || 4} 分獲勝・排序依：勝場 → 得失分 → 總得分`;

  const isTournamentComplete = state.matches.length > 0 && state.matches.every(m => m.status === 'completed');

  if(isTournamentComplete && standings.length > 0){
    const titles = ['冠軍','亞軍','季軍'];
    podiumContainer.innerHTML = `
      <div class="podium">
        ${standings.slice(0,3).map((p,i) => `
          <div class="podium-item podium-${i+1}">
            <div class="podium-medal">${TROPHY_ICONS[i+1]}</div>
            <div class="podium-title">${titles[i]}</div>
            <div class="podium-name">${escapeHtml(p.name)}</div>
            <div class="podium-record">${p.wins}勝${p.losses}負・${p.pointsFor}分</div>
          </div>
        `).join('')}
      </div>`;
    podiumContainer.classList.remove('hidden');
  } else {
    podiumContainer.innerHTML = '';
    podiumContainer.classList.add('hidden');
  }

  if(standings.length === 0){
    body.innerHTML = `<tr class="empty-row"><td colspan="9">尚未有玩家，請前往「賽事設定」開始比賽。</td></tr>`;
    return;
  }

  body.innerHTML = standings.map((p, i) => {
    const rank = i+1;
    let rc = '';
    if(rank===1) rc='rank-1'; else if(rank===2) rc='rank-2'; else if(rank===3) rc='rank-3';
    return `
      <tr>
        <td class="rank-cell ${rc}">${rank}</td>
        <td class="name">${escapeHtml(p.name)}${p.withdrawn ? ' <span class="status-pill pending" style="margin-left:4px;">已棄權</span>' : ''}</td>
        <td>${p.played}</td>
        <td>${p.wins}</td>
        <td>${p.losses}</td>
        <td>${p.pointsFor}</td>
        <td>${p.pointsAgainst}</td>
        <td>${p.diff > 0 ? '+'+p.diff : p.diff}</td>
        <td class="points-cell">${p.pointsFor}</td>
      </tr>`;
  }).join('');
}

