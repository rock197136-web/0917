/* =========================================================
   RENDER: KNOCKOUT PODIUM (champion only — runner-up/3rd
   place aren't well defined without a 3rd-place playoff)
========================================================= */
function renderBracketPodium(){
  const podiumContainer = document.getElementById('podiumContainer');
  if(state.matches.length === 0){
    podiumContainer.innerHTML = '';
    podiumContainer.classList.add('hidden');
    return;
  }
  const finalRound = Math.max(...state.matches.filter(m=>!m.thirdPlace).map(m=>m.round));
  const finalMatch = state.tournament.format === 'double_elimination' ? doubleFinalMatch() : state.matches.find(m=>m.round===finalRound && !m.thirdPlace);
  if(!finalMatch || finalMatch.status !== 'completed'){
    podiumContainer.innerHTML = '';
    podiumContainer.classList.add('hidden');
    return;
  }
  const champId = finalMatch.winner;
  const runnerUpId = champId === finalMatch.playerA ? finalMatch.playerB : finalMatch.playerA;
  const bronzeMatch = state.matches.find(m=>m.thirdPlace);
  const thirdId = state.tournament.format === 'double_elimination' ? doubleThirdId() : (bronzeMatch && bronzeMatch.status === 'completed') ? bronzeMatch.winner : null;
  podiumContainer.innerHTML = `
    <div class="podium">
      <div class="podium-item podium-2">
        <div class="podium-medal">${TROPHY_ICONS[2]}</div>
        <div class="podium-title">亞軍</div>
        <div class="podium-name">${escapeHtml(nameOf(runnerUpId))}</div>
      </div>
      <div class="podium-item podium-1">
        <div class="podium-medal">${TROPHY_ICONS[1]}</div>
        <div class="podium-title">冠軍</div>
        <div class="podium-name">${escapeHtml(nameOf(champId))}</div>
      </div>
      <div class="podium-item podium-3">
        <div class="podium-medal">${TROPHY_ICONS[3]}</div>
        <div class="podium-title">季軍</div>
        <div class="podium-name">${thirdId ? escapeHtml(nameOf(thirdId)) : (bronzeMatch ? '對戰中' : '－')}</div>
      </div>
    </div>`;
  podiumContainer.classList.remove('hidden');
}

