/* =========================================================
   RENDER: KNOCKOUT BRACKET TREE
========================================================= */
function bracketMatchesByRound(){
  const byRound = {};
  state.matches.filter(m => !m.thirdPlace).forEach(m=>{
    (byRound[m.round] = byRound[m.round] || []).push(m);
  });
  const rounds = Object.keys(byRound).map(Number).sort((a,b)=>a-b);
  rounds.forEach(r=>{
    byRound[r].sort((a,b)=>{
      const ai = parseInt(String(a.id).split('-')[1] || 0, 10);
      const bi = parseInt(String(b.id).split('-')[1] || 0, 10);
      return ai - bi;
    });
  });
  return { rounds, byRound };
}

// A match is the true final only for single-elimination (knockout) brackets,
// on the last round, and never the third-place (bronze) match sharing that round.
function isFinalMatch(match){
  if(match && match.bracket) return match.bracket === 'final';
  if(!match || match.thirdPlace) return false;
  if(!state.tournament || state.tournament.format !== 'knockout') return false;
  if(!state.matches || state.matches.length === 0) return false;
  const maxRound = Math.max(...state.matches.map(m => m.round));
  return match.round === maxRound;
}

function bracketRoundLabel(r, totalRounds){
  const fromEnd = totalRounds - r;
  if(fromEnd === 0) return '決賽';
  if(fromEnd === 1) return '準決賽';
  if(fromEnd === 2) return '八強賽';
  if(fromEnd === 3) return '十六強賽';
  return `第 ${r} 輪`;
}

function bracketMatchBoxHtml(m, top, liveIds, nextIds, isFinal){
  const aWd = isWithdrawn(m.playerA);
  const bWd = isWithdrawn(m.playerB);
  const aName = escapeHtml(nameOf(m.playerA)) + (aWd ? '（棄權）' : '');
  const bName = escapeHtml(nameOf(m.playerB)) + (bWd ? '（棄權）' : '');
  const aWin = m.status === 'completed' && m.winner === m.playerA;
  const bWin = m.status === 'completed' && m.winner === m.playerB;
  const aBye = m.playerA === 'BYE';
  const bBye = m.playerB === 'BYE';
  const aLose = m.status === 'completed' && !aWin && !aBye && !aWd;
  const bLose = m.status === 'completed' && !bWin && !bBye && !bWd;
  const showPts = !m.quickWin && !state.tournament.quickMode;

  const status = m.status === 'completed' ? null
    : (liveIds && liveIds.has(m.id)) ? 'live'
    : (nextIds && nextIds.has(m.id)) ? 'next'
    : null;
  const statusClass = status === 'live' ? 'is-live' : status === 'next' ? 'is-next' : '';
  const statusBadge = status === 'live'
    ? `<div class="bracket-status-badge live ${isFinal ? 'with-final' : ''}"><span class="bracket-status-dot"></span>進行中</div>`
    : status === 'next'
      ? `<div class="bracket-status-badge next ${isFinal ? 'with-final' : ''}"><span class="bracket-status-dot"></span>即將上場</div>`
      : '';
  const finalClass = isFinal ? 'final-match' : '';
  const sparkles = isFinal
    ? [0,1,2].map(i => `<span class="final-sparkle" style="animation-delay:${(i*0.7).toFixed(1)}s;"></span>`).join('')
    : '';

  return `
    <div class="bracket-match ${m.status==='completed' ? 'done':''} ${statusClass} ${finalClass}" style="top:${top}px;" data-match-id="${m.id}">
      ${sparkles}
      ${statusBadge}
      <div class="bracket-slot ${aWin?'winner':''} ${aLose?'loser':''} ${(aBye||aWd)?'bye':''}" data-player-id="${(m.playerA && !aBye) ? m.playerA : ''}">
        <span class="bslot-pts">${(m.playerA && !aBye && showPts) ? m.pointsA : ''}</span>
        <span class="bslot-name">${aName}</span>
        ${aWin ? `<span class="bslot-check">${icon('check',12)}</span>` : ''}
      </div>
      <div class="bracket-slot ${bWin?'winner':''} ${bLose?'loser':''} ${(bBye||bWd)?'bye':''}" data-player-id="${(m.playerB && !bBye) ? m.playerB : ''}">
        <span class="bslot-pts">${(m.playerB && !bBye && showPts) ? m.pointsB : ''}</span>
        <span class="bslot-name">${bName}</span>
        ${bWin ? `<span class="bslot-check">${icon('check',12)}</span>` : ''}
      </div>
    </div>`;
}

// Builds the render-time layout for the bracket tree, WITHOUT touching the
// underlying tournament data (state.matches / bracketMatchesByRound output).
//
// A round-1 BYE remains a layout anchor so the tree keeps its correct shape,
// but it is never rendered. This cleanly hides all "輪空" UI without
// changing the match graph or automatic advancement.
//
// Position rule (bottom-up):
//   - Round-1 boxes are stacked top-to-bottom with a small fixed gap
//     between them, each reserving only its own height (BYE_H for a bye,
//     BOX_H for a real match) — not a uniform slot — so byes don't waste
//     vertical space.
//   - Every round r>1 match centers on the average Y of its two round r-1
//     feeders (found via nextMatchId, not array index, to stay correct
//     regardless of sort order).
// Returns { visibleByRound, pos, H, boxHeight } where pos maps matchId ->
// centerY, and boxHeight maps matchId -> its rendered height in px.
// (visibleByRound keeps its old name for compatibility with renderBracket;
// nothing is filtered out — every match gets an entry.)
const BRACKET_BOX_H = 74;   // px height of a normal match card
const BRACKET_BYE_H = 30;   // invisible layout anchor; intentionally not rendered
const BRACKET_ROW_GAP = 30; // px gap: reserves room for the small match-number label
const BRACKET_TAG_H = 18;

function computeBracketLayout(rounds, byRound){
  const visibleByRound = {};
  rounds.forEach(r => { visibleByRound[r] = byRound[r]; });

  const pos = {};
  const boxHeight = {};

  const round1 = visibleByRound[rounds[0]];
  let cursor = BRACKET_TAG_H;
  round1.forEach(m => {
    const h = m.isBye ? BRACKET_BYE_H : BRACKET_BOX_H;
    boxHeight[m.id] = h;
    pos[m.id] = cursor + h / 2;
    cursor += h + BRACKET_ROW_GAP;
  });
  let H = Math.max(BRACKET_BOX_H, cursor - BRACKET_ROW_GAP);

  for(let ri = 1; ri < rounds.length; ri++){
    const r = rounds[ri];
    const prevMatches = byRound[rounds[ri-1]];
    const list = visibleByRound[r];

    list.forEach(m => {
      boxHeight[m.id] = BRACKET_BOX_H; // byes never occur past round 1
      const feederYs = prevMatches
        .filter(f => f.nextMatchId === m.id)
        .map(f => pos[f.id])
        .filter(y => y !== undefined);
      pos[m.id] = feederYs.length
        ? feederYs.reduce((a,b) => a+b, 0) / feederYs.length
        : (H / (list.length + 1)) * (list.indexOf(m) + 1); // no feeders found — even fallback
    });
  }

  // Guard against float/edge-case drift pushing anything outside [0, H].
  const allEntries = Object.keys(pos).map(id => ({ id, y: pos[id], half: boxHeight[id] / 2 }));
  if(allEntries.length){
    const minTop = Math.min(...allEntries.map(e => e.y - e.half));
    if(minTop < 0){
      const shift = -minTop;
      Object.keys(pos).forEach(id => { pos[id] += shift; });
    }
    const maxBottom = Math.max(...allEntries.map(e => (pos[e.id] !== undefined ? pos[e.id] : e.y) + e.half));
    if(maxBottom > H) H = maxBottom;
  }

  return { visibleByRound, pos, H, boxHeight };
}

function renderBracket(){
  if(state.tournament.format === 'double_elimination') { renderDoubleBracket(); return; }
  document.getElementById('bracketRulesSummary').textContent='單淘汰賽';
  const wrap = document.getElementById('bracketTree');
  wrap.classList.remove('double-tree');
  if(state.matches.length === 0){
    wrap.innerHTML = `<div class="bracket-empty">尚未產生賽事，請先前往「賽事設定」建立賽事。</div>`;
    return;
  }

  const { rounds, byRound } = bracketMatchesByRound();
  const { visibleByRound, pos, H, boxHeight } = computeBracketLayout(rounds, byRound);
  const GAP = 42;       // px width of connector gap between columns
  const COLW = 190;     // px width of each round column
  const HALF = 37;      // half of .bracket-match height (74px)

  // Matches currently loaded into a referee panel (being judged right now).
  const liveIds = new Set(
    refereePanels
      .filter(p => p.matchId)
      .map(p => p.matchId)
      .filter(id => {
        const mm = state.matches.find(x => x.id === id);
        return mm && mm.status !== 'completed' && mm.playerA && mm.playerB && !mm.isBye;
      })
  );
  // Use exactly the same per-table assignments as the referee winner panel.
  // A manually switched preview therefore removes "即將上場" from the old
  // card and applies it to the newly selected card on every connected device.
  const assignedUpcoming = Object.values(computeNextMatchAssignments()).filter(Boolean);
  const nextIds = new Set(
    assignedUpcoming.length
      ? assignedUpcoming.map(match => match.id)
      : (refereePanels.length === 0 ? [nextPlayableMatch(Array.from(liveIds))?.id].filter(Boolean) : [])
  );
  const bronzeMatch = state.matches.find(m => m.thirdPlace);
  // 使用與「對戰紀錄」相同的實際場次順序；輪空不占編號。
  const singleMatchNumbers = new Map(
    state.matches.filter(m => !m.isBye && !m.inactive).map((m,i) => [m.id, i+1])
  );

  let html = `<div class="bracket-inner">`;

  rounds.forEach((r, ridx) => {
    const matches = visibleByRound[r]; // BYEs keep layout positions but have no visible card
    const isFinalRound = ridx === rounds.length - 1;

    html += `<div class="bracket-col" style="width:${COLW}px;">
      <div class="bracket-round-label">${bracketRoundLabel(r, rounds.length)}</div>
      <div class="bracket-round-body" style="height:${H}px;">`;
    matches.forEach(m => {
      const centerY = pos[m.id];
      if(!m.isBye){
        html += isFinalRound
          ? `<div class="single-match-tag final-match-heading" style="top:${centerY - HALF - BRACKET_TAG_H}px;">${icon('trophy',14)}<span>決賽・第 ${singleMatchNumbers.get(m.id)} 場</span></div>`
          : `<div class="single-match-tag" style="top:${centerY - HALF - BRACKET_TAG_H}px;">第 ${singleMatchNumbers.get(m.id)} 場</div>`;
        html += bracketMatchBoxHtml(m, centerY - HALF, liveIds, nextIds, isFinalRound);
      }
    });
    html += `</div>`;

    // 季軍戰 sits directly under the final match, in the final round's own
    // column, rather than centered under the whole tree — so it always
    // lines up with the last (rightmost) column regardless of round count.
    if(isFinalRound && bronzeMatch){
      html += `
        <div class="bracket-bronze">
          <div class="bracket-round-label">${icon('medal',14)} 季軍戰・第 ${singleMatchNumbers.get(bronzeMatch.id)} 場</div>
          <div class="bracket-bronze-body">${bracketMatchBoxHtml(bronzeMatch, 0, liveIds, nextIds)}</div>
        </div>`;
    }
    html += `</div>`;

    if(ridx < rounds.length - 1){
      // Connectors are derived from the actual match graph (nextMatchId),
      // not array position, so they stay correct regardless of sort order.
      // BYE matches remain in the data graph, but their hidden anchor does not
      // draw a visible connector. The auto-advanced player appears next round.
      const nextMatches = visibleByRound[rounds[ridx+1]];
      let paths = '';
      nextMatches.forEach(nm => {
        const feeders = byRound[r].filter(f => f.nextMatchId === nm.id);
        feeders.filter(f => !f.isBye).forEach(f => {
          const yFrom = pos[f.id];
          const yTo = pos[nm.id];
          const done = f.status === 'completed';
          // Square elbow connector: flat out of the box, a right-angle bend,
          // then flat into the next one.
          paths += `<path class="conn-path ${done?'active':''}" data-from-match="${f.id}" data-to-match="${nm.id}" d="M0,${yFrom} H${GAP/2} V${yTo} H${GAP}"></path>`;
        });
      });
      html += `<div class="bracket-conn-col" style="width:${GAP}px;">
        <div class="bracket-round-label" style="visibility:hidden;">·</div>
        <div class="bracket-conn" style="height:${H}px;">
          <svg class="bracket-conn-svg" width="${GAP}" height="${H}" viewBox="0 0 ${GAP} ${H}" preserveAspectRatio="none">${paths}</svg>
        </div>
      </div>`;
    }
    // Final round (決賽) is now the last visible column — no trailing
    // champion column/connector is drawn after it anymore.
  });

  html += `</div>`;

  wrap.innerHTML = html;

  // Set up the final-match sparkles: each one fades in at a random spot
  // around the frame, fades out, then jumps to a new random spot for the
  // next cycle (rather than blinking in a fixed position).
  wrap.querySelectorAll('.final-sparkle').forEach(el => {
    randomizeSparklePosition(el);
    el.addEventListener('animationiteration', () => randomizeSparklePosition(el));
  });

  updateBracketSearchVisibility();
}

function randomizeSparklePosition(el){
  const box = el.parentElement;
  const w = (box && box.offsetWidth) || 186;
  const h = (box && box.offsetHeight) || 74;
  const pad = 6;
  const edge = Math.floor(Math.random() * 4);
  let top, left;
  if(edge === 0){ left = Math.random() * w; top = -pad; }
  else if(edge === 1){ left = w + pad; top = Math.random() * h; }
  else if(edge === 2){ left = Math.random() * w; top = h + pad; }
  else { left = -pad; top = Math.random() * h; }
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

