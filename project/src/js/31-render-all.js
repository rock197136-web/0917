/* =========================================================
   RENDER ALL
========================================================= */
function renderAll(){
  renderStandings();
  renderMatches();
  standingsDirty = false;
  matchesDirty = false;
  renderStats();
  const setupHasFocus = applyingRemote && document.activeElement &&
    document.getElementById('tab-setup').contains(document.activeElement);
  if(!setupHasFocus) loadSetupInputs();
  syncPrizeDrawPlayers();
  if(!document.getElementById('tab-referee').classList.contains('hidden')) renderReferee();
}

