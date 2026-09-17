/* =========================================================
   PLAYER SETUP: 收合摘要 <-> 展開編輯
========================================================= */
function updatePlayerSetupVisibility(){
  const section = document.getElementById('playerSetupSection');
  const summary = document.getElementById('playerSetupSummary');
  if(!section || !summary) return;
  const collapse = state.tournament.status === 'running' && !playerSetupExpanded;
  section.classList.toggle('hidden', collapse);
  summary.classList.toggle('hidden', !collapse);
  if(collapse) updatePlayerSetupSummaryText();
}

function updatePlayerSetupSummaryText(){
  const el = document.getElementById('playerSetupSummaryText');
  if(!el) return;
  const total = state.players.length;
  const withdrawnCount = state.players.filter(p => p.withdrawn).length;
  el.innerHTML = withdrawnCount > 0
    ? `已登記 <b>${total}</b> 位選手・${withdrawnCount} 位棄權`
    : `已登記 <b>${total}</b> 位選手`;
}

function togglePlayerSetupSection(){
  playerSetupExpanded = !playerSetupExpanded;
  if(playerSetupExpanded){
    // 展開時把目前正式名單重新填入晶片清單，方便直接編輯後按「重新產生賽程」
    createPlayerInputs(0);
    const container = document.getElementById('playerInputs');
    state.players.forEach(p => appendPlayerRow(container, p.name));
  }
  updatePlayerSetupVisibility();
}

