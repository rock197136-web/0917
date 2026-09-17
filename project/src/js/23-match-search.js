/* =========================================================
   MATCH RECORDS: PLAYER SEARCH
   Uses the same type-ahead interaction as the bracket search,
   then highlights every recorded match involving that player.
========================================================= */
let matchSearchActiveIndex = -1;
let matchSearchResults = [];
let matchSearchHighlightTimer = null;

function updateMatchSearchVisibility(){
  const wrap = document.getElementById('matchSearchWrap');
  if(!wrap) return;
  const show = Array.isArray(state.players) && state.players.length > 0 &&
    Array.isArray(state.matches) && state.matches.some(m => !m.isBye && !m.inactive);
  wrap.classList.toggle('hidden', !show);
  if(!show) clearMatchSearch();
}

function onMatchSearchInput(rawQuery){
  const query = String(rawQuery || '').trim();
  const listEl = document.getElementById('matchSearchList');
  const clearBtn = document.getElementById('matchSearchClearBtn');
  if(clearBtn) clearBtn.classList.toggle('hidden', query.length === 0);

  if(!query){
    matchSearchResults = [];
    matchSearchActiveIndex = -1;
    if(listEl){ listEl.innerHTML = ''; listEl.classList.add('hidden'); }
    clearMatchSearchHighlights();
    return;
  }

  const normalizedQuery = query.normalize('NFKC').toLocaleLowerCase('zh-Hant');
  matchSearchResults = (Array.isArray(state.players) ? state.players : [])
    .filter(p => p && p.name && p.name.normalize('NFKC').toLocaleLowerCase('zh-Hant').includes(normalizedQuery));
  matchSearchActiveIndex = matchSearchResults.length ? 0 : -1;
  renderMatchSearchList(query);
}

function renderMatchSearchList(query){
  const listEl = document.getElementById('matchSearchList');
  if(!listEl) return;
  listEl.innerHTML = matchSearchResults.length
    ? matchSearchResults.map((p, i) => `
      <li class="bracket-search-item ${i === matchSearchActiveIndex ? 'active' : ''}"
          role="option" data-index="${i}"
          onmousedown="event.preventDefault(); selectMatchSearchResult(${i});">
        <span class="bsi-mark">${icon('target',12)}</span><span>${escapeHtml(p.name)}</span>
      </li>`).join('')
    : `<li class="bracket-search-empty">找不到符合「${escapeHtml(query)}」的選手</li>`;
  listEl.classList.remove('hidden');
}

function onMatchSearchKeydown(e){
  if(e.key === 'Escape'){
    e.preventDefault();
    clearMatchSearch();
    e.target.blur();
    return;
  }
  if(e.key === 'Enter'){
    e.preventDefault();
    if(matchSearchResults.length){
      selectMatchSearchResult(matchSearchActiveIndex >= 0 ? matchSearchActiveIndex : 0);
    }
    return;
  }
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    if(!matchSearchResults.length) return;
    e.preventDefault();
    const direction = e.key === 'ArrowDown' ? 1 : -1;
    matchSearchActiveIndex = (matchSearchActiveIndex + direction + matchSearchResults.length) % matchSearchResults.length;
    const listEl = document.getElementById('matchSearchList');
    if(listEl){
      Array.from(listEl.children).forEach((li, i) => li.classList.toggle('active', i === matchSearchActiveIndex));
    }
  }
}

function clearMatchSearchHighlights(){
  clearTimeout(matchSearchHighlightTimer);
  document.querySelectorAll('#matchList .match-search-hit').forEach(el => el.classList.remove('match-search-hit'));
  document.querySelectorAll('#matchList .match-search-hit-name').forEach(el => el.classList.remove('match-search-hit-name'));
}

function clearMatchSearch(){
  const input = document.getElementById('matchSearchInput');
  const listEl = document.getElementById('matchSearchList');
  const clearBtn = document.getElementById('matchSearchClearBtn');
  if(input) input.value = '';
  if(listEl){ listEl.innerHTML = ''; listEl.classList.add('hidden'); }
  if(clearBtn) clearBtn.classList.add('hidden');
  matchSearchResults = [];
  matchSearchActiveIndex = -1;
  clearMatchSearchHighlights();
}

function selectMatchSearchResult(index){
  const player = matchSearchResults[index];
  if(!player) return;
  const input = document.getElementById('matchSearchInput');
  const listEl = document.getElementById('matchSearchList');
  if(input) input.value = player.name;
  if(listEl){ listEl.innerHTML = ''; listEl.classList.add('hidden'); }
  locatePlayerMatchRecords(player.id);
}

function locatePlayerMatchRecords(playerId){
  const playerMatches = state.matches.filter(m =>
    !m.isBye && !m.inactive && (m.playerA === playerId || m.playerB === playerId)
  );
  if(!playerMatches.length){
    showToast('目前沒有這位選手的對戰紀錄');
    return;
  }

  clearMatchSearchHighlights();
  matchStatusFilter = 'all';
  playerMatches.filter(m => m.status === 'completed').forEach(m => expandedMatchIds.add(m.id));
  renderMatches();
  const cards = playerMatches.map(m =>
    document.querySelector(`#matchList .match[data-match-id="${cssEscapeId(m.id)}"]`)
  ).filter(Boolean);
  cards.forEach(card => {
    card.classList.add('match-search-hit');
    card.querySelectorAll(`[data-player-id="${cssEscapeId(playerId)}"]`).forEach(name => name.classList.add('match-search-hit-name'));
  });

  const pendingMatch = playerMatches.find(m => m.status !== 'completed');
  const targetMatch = pendingMatch || playerMatches[playerMatches.length - 1];
  const target = document.querySelector(`#matchList .match[data-match-id="${cssEscapeId(targetMatch.id)}"]`);
  if(target) target.scrollIntoView({ behavior:'smooth', block:'center' });
  matchSearchHighlightTimer = setTimeout(clearMatchSearchHighlights, 2100);
}

function closeMatchSearchOnOutsideClick(e){
  const wrap = document.getElementById('matchSearchWrap');
  if(wrap && !wrap.contains(e.target)){
    const listEl = document.getElementById('matchSearchList');
    if(listEl){ listEl.innerHTML = ''; listEl.classList.add('hidden'); }
  }
}
document.addEventListener('click', closeMatchSearchOnOutsideClick);

