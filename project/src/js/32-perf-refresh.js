/* =========================================================
   PERF: lightweight refresh path for scoring taps
   (see standingsDirty/matchesDirty comment above)
========================================================= */
function isTabVisible(tab){
  const el = document.getElementById(`tab-${tab}`);
  return !!el && !el.classList.contains('hidden');
}

function updateRefereePanelsForMatch(matchId){
  const match = state.matches.find(m => m.id === matchId);
  if(!match) return;
  refereePanels.forEach(panel => {
    if(panel.matchId === matchId) renderRefereeMatch(match, panel.id);
  });
}

// Called after a single match's score/log changes (point added/undone). Avoids
// tearing down and rebuilding the whole page — which was restarting every
// battery/spark/glow animation on every tap — by only touching the referee
// panel(s) actually showing this match, plus whichever other tab is currently
// on screen. Tabs that aren't visible are marked dirty and catch up in
// switchTab() once the user actually looks at them.
function refreshAfterScoreChange(matchId){
  renderStats();
  if(isTabVisible('standings')){ renderStandings(); standingsDirty = false; }
  else standingsDirty = true;
  if(isTabVisible('matches')){ renderMatches(); matchesDirty = false; }
  else matchesDirty = true;
  if(isTabVisible('referee')) updateRefereePanelsForMatch(matchId);
}

