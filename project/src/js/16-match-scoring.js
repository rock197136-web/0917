/* =========================================================
   MATCH SCORING
========================================================= */
const SCORE_INPUT_LOCK_MS = 360;
const SCORE_FEEDBACK_MS = 720;
const scoreInputLockedUntil = new Map();
const scoreTapFeedback = new Map();

function beginScoreInput(matchId, side, points){
  const now = Date.now();
  if((scoreInputLockedUntil.get(matchId) || 0) > now) return false;
  scoreInputLockedUntil.set(matchId, now + SCORE_INPUT_LOCK_MS);

  if(points){
    const token = `${now}-${Math.random()}`;
    scoreTapFeedback.set(matchId, { side, points, token, until:now + SCORE_FEEDBACK_MS });
    setTimeout(() => {
      document.querySelectorAll('.score-tap-feedback').forEach(el => {
        if(el.dataset.matchId === String(matchId)) el.classList.add('is-leaving');
      });
    }, SCORE_FEEDBACK_MS - 140);
    setTimeout(() => {
      const current = scoreTapFeedback.get(matchId);
      if(current && current.token === token) scoreTapFeedback.delete(matchId);
      document.querySelectorAll('.score-tap-feedback').forEach(el => {
        if(el.dataset.matchId === String(matchId)) el.remove();
      });
    }, SCORE_FEEDBACK_MS);
  }
  return true;
}

function recomputeMatch(match){
  match.pointsA = match.log.filter(l=>l.side==='A').reduce((s,l)=>s+l.points,0);
  match.pointsB = match.log.filter(l=>l.side==='B').reduce((s,l)=>s+l.points,0);
  const target = state.tournament.pointsToWin;
  if(match.pointsA >= target || match.pointsB >= target){
    match.status = 'completed';
    match.winner = match.pointsA >= target ? match.playerA : match.playerB;
    if(!match.completedAt) match.completedAt = Date.now();
  } else {
    match.status = 'pending';
    match.winner = null;
    match.completedAt = null;
  }
}

function recordFinish(matchId, side, finishKey){
  const match = state.matches.find(m=>m.id===matchId);
  if(!match || match.status==='completed') return;
  if(!match.playerA || !match.playerB) return;
  const finish = FINISH[finishKey];
  if(!finish || !beginScoreInput(matchId, side, finish.points)) return;
  match.log.push({ side, finish:finishKey, points:finish.points });
  recomputeMatch(match);
  markDirty(match.id);
  let structural = false;
  if(match.status === 'completed' && isElimination(state.tournament.format)){
    propagateKnockoutWinner(match);
    resolveByeCascade(state.matches);
    structural = true; // bracket reshuffled downstream matches — needs a full refresh
  }
  saveState(true);
  if(structural) renderAll();
  else refreshAfterScoreChange(matchId);
}

function undoLastPoint(matchId){
  const match = state.matches.find(m=>m.id===matchId);
  if(!match || match.log.length===0) return;
  if(match.bracket && match.status==='completed'){
    showConfirm('撤銷此分會清除所有受影響的後續場次結果，確定嗎？',()=>{
      match.log.pop(); recomputeMatch(match); markDirty(match.id);
      reconcileDoubleElimination(state.matches); saveState(true); renderAll();
    });
    return;
  }
  match.log.pop();
  recomputeMatch(match);
  markDirty(match.id);
  saveState();
  refreshAfterScoreChange(matchId);
}

// Quick mode: referee just taps who won — no points, no finish types, no
// battery. Used only when state.tournament.quickMode is on (knockout only).
function recordQuickWin(matchId, side){
  const match = state.matches.find(m=>m.id===matchId);
  if(!match || match.status==='completed') return;
  if(!match.playerA || !match.playerB) return;
  if(!beginScoreInput(matchId, side, null)) return;
  match.pointsA = 0;
  match.pointsB = 0;
  match.quickWin = true;
  match.status = 'completed';
  match.winner = side === 'A' ? match.playerA : match.playerB;
  match.completedAt = Date.now();
  markDirty(match.id);
  if(isElimination(state.tournament.format)){
    propagateKnockoutWinner(match);
    resolveByeCascade(state.matches);
  }
  saveState(true);
  renderAll();
}

function resetMatch(matchId){
  if(currentRole === 'viewer') return;
  const match = state.matches.find(m=>m.id===matchId);
  if(!match) return;
  showConfirm('確定要重新開始這場對戰嗎？目前紀錄與受影響的後續場次結果將被清除。', () => {
    refereePanels.filter(panel => panel.matchId === matchId).forEach(panel => delete panel.nextMatchId);
    performResetMatch(match);
    savePanels();
    saveState();
    renderAll();
  });
}

function performResetMatch(match){
  if(match.bracket){
    clearDoubleResult(match);
    reconcileDoubleElimination(state.matches);
    return;
  }
  const hadWinner = match.status === 'completed';
  const prevWinner = match.winner;
  const prevLoser = prevWinner === match.playerA ? match.playerB : match.playerA;
  match.log = [];
  match.quickWin = false;
  recomputeMatch(match);
  markDirty(match.id);

  if(isElimination(state.tournament.format) && hadWinner){
    if(match.nextMatchId){
      const next = state.matches.find(m => m.id === match.nextMatchId);
      if(next){
        if(match.nextSlot === 'A' && next.playerA === prevWinner){
          next.playerA = null;
          performResetMatch(next);
        } else if(match.nextSlot === 'B' && next.playerB === prevWinner){
          next.playerB = null;
          performResetMatch(next);
        }
      }
    }
    if(match.loserNextMatchId){
      const bronzeMatch = state.matches.find(m => m.id === match.loserNextMatchId);
      if(bronzeMatch){
        if(match.loserNextSlot === 'A' && bronzeMatch.playerA === prevLoser){
          bronzeMatch.playerA = null;
          performResetMatch(bronzeMatch);
        } else if(match.loserNextSlot === 'B' && bronzeMatch.playerB === prevLoser){
          bronzeMatch.playerB = null;
          performResetMatch(bronzeMatch);
        }
      }
    }
  }
}

function undoLastMatch(){
  const completed = state.matches.filter(m=>m.status==='completed' && m.completedAt);
  if(completed.length===0){ showAlert('目前沒有已完成的對戰可以撤銷。'); return; }
  completed.sort((a,b)=>b.completedAt-a.completedAt);
  const last = completed[0];
  showConfirm(`確定要撤銷「${nameOf(last.playerA)} vs ${nameOf(last.playerB)}」的結果嗎？`, () => {
    performResetMatch(last);
    saveState();
    renderAll();
  });
}

