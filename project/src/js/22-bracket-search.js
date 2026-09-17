/* =========================================================
   BRACKET: PLAYER SEARCH
   Surfaced for every elimination bracket so players can quickly
   locate themselves without manually scanning the tree. The point isn't the dropdown list —
   it's landing the user on their current match card as fast as
   possible: type → pick → tree scrolls & centers → card glows.
========================================================= */
let bracketSearchActiveIndex = -1;
let bracketSearchResults = [];
let bracketSearchHighlightTimer = null;

function updateBracketSearchVisibility(){
  const wrap = document.getElementById('bracketSearchWrap');
  if(!wrap) return;
  const isKnockout = state.tournament && isElimination(state.tournament.format);
  const playerCount = Array.isArray(state.players) ? state.players.length : 0;
  const show = isKnockout && playerCount > 0 && state.matches.length > 0;
  wrap.classList.toggle('hidden', !show);
  if(!show) clearBracketSearch();
}

function onBracketSearchInput(rawQuery){
  const query = (rawQuery || '').trim();
  const listEl = document.getElementById('bracketSearchList');
  const clearBtn = document.getElementById('bracketSearchClearBtn');
  if(clearBtn) clearBtn.classList.toggle('hidden', query.length === 0);

  if(query.length === 0){
    bracketSearchResults = [];
    bracketSearchActiveIndex = -1;
    if(listEl){ listEl.innerHTML = ''; listEl.classList.add('hidden'); }
    return;
  }

  const q = query.toLowerCase();
  const pool = Array.isArray(state.players) ? state.players : [];
  bracketSearchResults = pool.filter(p => p && p.name && p.name.toLowerCase().includes(q));
  bracketSearchActiveIndex = bracketSearchResults.length ? 0 : -1;
  renderBracketSearchList(query);
}

function renderBracketSearchList(query){
  const listEl = document.getElementById('bracketSearchList');
  if(!listEl) return;

  if(bracketSearchResults.length === 0){
    listEl.innerHTML = `<li class="bracket-search-empty">找不到符合「${escapeHtml(query)}」的選手</li>`;
    listEl.classList.remove('hidden');
    return;
  }

  listEl.innerHTML = bracketSearchResults.map((p, i) => `
    <li class="bracket-search-item ${i === bracketSearchActiveIndex ? 'active' : ''}"
        role="option" data-index="${i}"
        onmousedown="event.preventDefault(); selectBracketSearchResult(${i});">
      <span class="bsi-mark">${icon('target',12)}</span><span>${escapeHtml(p.name)}</span>
    </li>
  `).join('');
  listEl.classList.remove('hidden');
}

function onBracketSearchKeydown(e){
  const listEl = document.getElementById('bracketSearchList');
  if(e.key === 'Escape'){
    e.preventDefault();
    clearBracketSearch();
    e.target.blur();
    return;
  }
  if(e.key === 'Enter'){
    e.preventDefault();
    if(bracketSearchResults.length > 0){
      const idx = bracketSearchActiveIndex >= 0 ? bracketSearchActiveIndex : 0;
      selectBracketSearchResult(idx);
    }
    return;
  }
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    if(bracketSearchResults.length === 0) return;
    e.preventDefault();
    const dir = e.key === 'ArrowDown' ? 1 : -1;
    bracketSearchActiveIndex = (bracketSearchActiveIndex + dir + bracketSearchResults.length) % bracketSearchResults.length;
    if(listEl){
      Array.from(listEl.children).forEach((li, i) => li.classList.toggle('active', i === bracketSearchActiveIndex));
    }
  }
}

function clearBracketSearch(){
  const input = document.getElementById('bracketSearchInput');
  const listEl = document.getElementById('bracketSearchList');
  const clearBtn = document.getElementById('bracketSearchClearBtn');
  if(input) input.value = '';
  if(listEl){ listEl.innerHTML = ''; listEl.classList.add('hidden'); }
  if(clearBtn) clearBtn.classList.add('hidden');
  bracketSearchResults = [];
  bracketSearchActiveIndex = -1;
}

function selectBracketSearchResult(index){
  const player = bracketSearchResults[index];
  if(!player) return;
  const input = document.getElementById('bracketSearchInput');
  if(input) input.value = player.name;
  const listEl = document.getElementById('bracketSearchList');
  if(listEl){ listEl.innerHTML = ''; listEl.classList.add('hidden'); }
  locateBracketPlayer(player.id);
}

// Finds every match this player has appeared in, jumps to their current
// (furthest-advanced) card, centers it on screen, and glows both that
// card and every earlier card + connector along their advancement path.
function locateBracketPlayer(playerId){
  const wrap = document.getElementById('bracketTree');
  if(!wrap) return;

  const playerMatches = state.matches
    .filter(m => m.playerA === playerId || m.playerB === playerId)
    .sort((a, b) => a.round - b.round);
  if(playerMatches.length === 0) return;

  const currentMatch = playerMatches[playerMatches.length - 1];
  const cardEl = wrap.querySelector(`[data-match-id="${cssEscapeId(currentMatch.id)}"]`);
  if(!cardEl) return;

  cardEl.scrollIntoView({ behavior:'smooth', block:'center', inline:'center' });

  clearTimeout(bracketSearchHighlightTimer);
  wrap.querySelectorAll('.search-hit').forEach(el => el.classList.remove('search-hit'));
  wrap.querySelectorAll('.search-hit-name').forEach(el => el.classList.remove('search-hit-name'));
  wrap.querySelectorAll('.search-hit-path').forEach(el => el.classList.remove('search-hit-path'));

  // Highlight the player's name (and box glow for the current card) in
  // every match box they've passed through — the full advancement route.
  playerMatches.forEach(m => {
    const box = wrap.querySelector(`[data-match-id="${cssEscapeId(m.id)}"]`);
    if(!box) return;
    if(m.id === currentMatch.id) box.classList.add('search-hit');
    const nameEl = box.querySelector(`[data-player-id="${cssEscapeId(playerId)}"] .bslot-name`)
      || box.querySelector(`.bye-compact-name[data-player-id="${cssEscapeId(playerId)}"]`);
    if(nameEl) nameEl.classList.add('search-hit-name');
    if(m.nextMatchId){
      const path = wrap.querySelector(`.conn-path[data-from-match="${cssEscapeId(m.id)}"]`);
      if(path) path.classList.add('search-hit-path');
    }
  });

  bracketSearchHighlightTimer = setTimeout(() => {
    wrap.querySelectorAll('.search-hit').forEach(el => el.classList.remove('search-hit'));
  }, 2000);
}

function cssEscapeId(id){
  return (window.CSS && CSS.escape) ? CSS.escape(String(id)) : String(id).replace(/["\\]/g, '\\$&');
}

function closeBracketSearchOnOutsideClick(e){
  const wrap = document.getElementById('bracketSearchWrap');
  if(wrap && !wrap.contains(e.target)){
    const listEl = document.getElementById('bracketSearchList');
    if(listEl){ listEl.innerHTML = ''; listEl.classList.add('hidden'); }
  }
}
document.addEventListener('click', closeBracketSearchOnOutsideClick);

