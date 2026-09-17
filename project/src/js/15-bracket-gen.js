/* =========================================================
   SINGLE-ELIMINATION BRACKET GENERATION
========================================================= */
function isElimination(format){
  return format === 'knockout' || format === 'double_elimination';
}

// Every slot has an immutable source. null means unresolved; BYE means empty.
// Replaying in dependency order also invalidates all affected downstream results.
function clearDoubleResult(m){
  m.log = []; m.pointsA = 0; m.pointsB = 0; m.winner = null;
  m.status = 'pending'; m.completedAt = null;
  m.quickWin = false; m.isBye = false; m.forfeited = false;
  markDirty(m.id);
}

function generateDoubleElimination(players){
  const wb = generateKnockoutBracket(players).filter(m => !m.thirdPlace);
  const k = Math.max(...wb.map(m => m.round));
  const groups = {};
  wb.forEach(m => {
    m.bracket = 'winners'; m.bracketRound = m.round;
    (groups[m.round] ||= []).push(m);
    m.nextMatchId = m.nextSlot = m.loserNextMatchId = m.loserNextSlot = null;
    if(m.round === 1){ m.sourceA = {player:m.playerA}; m.sourceB = {player:m.playerB}; }
    clearDoubleResult(m);
  });
  const source = (m, result='winner') => ({matchId:m.id, result});
  for(let r=2;r<=k;r++) groups[r].forEach((m,i) => {
    m.sourceA = source(groups[r-1][i*2]); m.sourceB = source(groups[r-1][i*2+1]);
  });
  const lower = {};
  function make(id, bracket, bracketRound, a, b){
    return {id, bracket, bracketRound, round:0, sourceA:a, sourceB:b,
      playerA:null, playerB:null, log:[], pointsA:0, pointsB:0,
      status:'pending', winner:null, completedAt:null, isBye:false, thirdPlace:false};
  }
  if(k >= 2){
    lower[1] = Array.from({length:groups[1].length/2},(_,i) =>
      make(`L1-${i+1}`,'losers',1,source(groups[1][2*i],'loser'),source(groups[1][2*i+1],'loser')));
    for(let r=2;r<=k;r++){
      const lr=2*r-2, previous=lower[lr-1];
      lower[lr] = groups[r].map((m,i) => make(`L${lr}-${i+1}`,'losers',lr,
        source(previous[i]), source(groups[r][groups[r].length-1-i],'loser')));
      if(r<k) lower[lr+1] = Array.from({length:lower[lr].length/2},(_,i) =>
        make(`L${lr+1}-${i+1}`,'losers',lr+1,source(lower[lr][i*2]),source(lower[lr][i*2+1])));
    }
  }
  const wf=groups[k][0];
  const gf=make('GF1','final',1,source(wf),k===1?source(wf,'loser'):source(lower[2*k-2][0]));
  const reset=make('GF2','final',2,source(gf),source(gf,'loser'));
  reset.inactive=true;
  const ordered=[...groups[1]];
  if(k>=2) ordered.push(...lower[1]);
  for(let r=2;r<=k;r++){
    ordered.push(...groups[r],...lower[2*r-2]);
    if(r<k) ordered.push(...lower[2*r-1]);
  }
  ordered.push(gf,reset);
  let round=0, last='';
  ordered.forEach(m => {
    const key=m.bracket+':'+m.bracketRound;
    if(key!==last){round++;last=key;} m.round=round;
    ['A','B'].forEach(slot => {
      const s=m['source'+slot]; if(!s.matchId) return;
      const parent=ordered.find(x=>x.id===s.matchId);
      const prefix=s.result==='loser'?'loserNext':'next';
      parent[prefix+'MatchId']=m.id; parent[prefix+'Slot']=slot;
    });
  });
  reconcileDoubleElimination(ordered);
  return ordered;
}

function reconcileDoubleElimination(list){
  const index=new Map(list.map(m=>[m.id,m]));
  function value(s){
    if(s.player) return s.player;
    const p=index.get(s.matchId);
    if(!p || p.status!=='completed') return null;
    if(s.result==='winner') return p.winner;
    return p.winner===p.playerA?p.playerB:p.playerA;
  }
  list.forEach(m => {
    if(!m.bracket) return;
    let a=value(m.sourceA), b=value(m.sourceB);
    if(m.id==='GF2'){
      const gf=index.get('GF1');
      const inactive=!(gf.status==='completed' && gf.winner===gf.playerB && !gf.forfeited && !gf.isBye);
      if(m.inactive!==inactive){m.inactive=inactive;markDirty(m.id);}
      if(inactive) a=b=null;
    }
    if(m.playerA!==a || m.playerB!==b){
      clearDoubleResult(m); m.playerA=a; m.playerB=b;
    }
    if(!a || !b || m.inactive || m.status==='completed') return;
    const aOut=a==='BYE'||isWithdrawn(a), bOut=b==='BYE'||isWithdrawn(b);
    if(aOut||bOut){
      m.winner=aOut?(bOut?'BYE':b):a;
      m.status='completed';m.completedAt=Date.now();
      m.isBye=a==='BYE'||b==='BYE';m.forfeited=!m.isBye;
      markDirty(m.id);
    }
  });
  refreshDoubleDisplayNumbers(list);
}

// UI 場次從 1 重新編排，只計入該輪真正需要上場的對戰。
// K1-5、K1-8 等代碼只供內部晉級使用，不得顯示成第 5、8 場。
function refreshDoubleDisplayNumbers(list){
  const groups = new Map();
  list.filter(m => m.bracket && !m.inactive && !m.isBye).forEach(m => {
    const key = `${m.bracket}:${m.bracketRound}`;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  });
  groups.forEach(matches => matches.forEach((m, index) => {
    m.displayMatchNo = index + 1;
  }));
}

function doubleFinalMatch(){
  const reset=state.matches.find(m=>m.id==='GF2');
  return reset && !reset.inactive ? reset : state.matches.find(m=>m.id==='GF1');
}
function doubleThirdId(){
  const m=state.matches.filter(m=>m.bracket==='losers').slice(-1)[0];
  if(!m || m.status!=='completed') return null;
  const loser=m.winner===m.playerA?m.playerB:m.playerA;
  return loser==='BYE'?null:loser;
}
function doubleRoundLabel(m){
  return m.bracket==='final' ? (m.id==='GF2'?'加賽':'總決賽') :
    `${m.bracket==='winners'?'勝部':'敗部'} 第 ${m.bracketRound} 輪`;
}

function doubleMatchLabel(m){
  if(m.bracket === 'final') return m.id === 'GF2' ? '加賽' : '冠軍決賽';
  const side = m.bracket === 'winners' ? '勝部' : '敗部';
  const matchNo = m.displayMatchNo || 1;
  return `${side}第 ${m.bracketRound} 輪・第 ${matchNo} 場`;
}

function doubleMatchLabelHtml(m){
  if(m.bracket === 'final') return `<span class="de-side">${escapeHtml(doubleMatchLabel(m))}</span>`;
  const side = m.bracket === 'winners' ? '勝部' : '敗部';
  return `<span class="de-side">${side}</span><span class="de-divider">·</span><span class="de-round">第 ${m.bracketRound} 輪</span><span class="de-divider">·</span><span class="de-match">第 ${m.displayMatchNo || 1} 場</span>`;
}

function layoutDoubleBracketSection(matches, rounds){
  const STEP = 124;
  const positions = new Map();
  const visibleAt = r => matches.filter(m => m.bracketRound === r && !m.isBye);
  const counts = rounds.map(r => visibleAt(r).length);
  const anchorIndex = counts.indexOf(Math.max(...counts));

  // 先排列對戰最多的一輪，作為整個區塊的垂直基準。
  visibleAt(rounds[anchorIndex]).forEach((m, i) => positions.set(m.id, {y:(i+.5)*STEP}));

  // 後續輪次置於其來源場次的中間。
  for(let col=anchorIndex+1; col<rounds.length; col++){
    visibleAt(rounds[col]).forEach((m, i) => {
      const feeders = matches.filter(f => f.nextMatchId === m.id && positions.has(f.id));
      const y = feeders.length
        ? feeders.reduce((sum,f)=>sum+positions.get(f.id).y,0)/feeders.length
        : (i+.5)*STEP;
      positions.set(m.id,{y});
    });
  }

  // 較早輪次依照「會晉級到哪一場」定位。若另一側是輪空，
  // 唯一需要上場的來源賽就會與目標賽對齊。
  for(let col=anchorIndex-1; col>=0; col--){
    const visible = visibleAt(rounds[col]);
    const byTarget = new Map();
    visible.forEach(m => {
      const key = m.nextMatchId || `free:${m.id}`;
      if(!byTarget.has(key)) byTarget.set(key,[]);
      byTarget.get(key).push(m);
    });
    byTarget.forEach((feeders,key) => {
      const target = positions.get(key);
      feeders.forEach((m,i) => {
        const offset = (i-(feeders.length-1)/2)*STEP;
        positions.set(m.id,{y:(target ? target.y : (visible.indexOf(m)+.5)*STEP)+offset});
      });
    });
  }

  rounds.forEach((r,col)=>visibleAt(r).forEach(m=>{
    const p=positions.get(m.id); p.x=col*240;
  }));
  const H = Math.max(STEP, ...Array.from(positions.values(),p=>p.y+STEP/2));
  return {positions,H};
}

function renderDoubleBracket(){
  const wrap=document.getElementById('bracketTree');
  wrap.classList.add('double-tree');
  document.getElementById('bracketRulesSummary').textContent='雙敗淘汰・敗部冠軍須連勝兩場總決賽';
  refreshDoubleDisplayNumbers(state.matches);
  const live=new Set(
    refereePanels.map(p=>p.matchId).filter(id=>{
      const match=state.matches.find(m=>m.id===id);
      return match && match.status!=='completed' && match.playerA && match.playerB && !match.isBye && !match.inactive;
    })
  );
  const assignedUpcoming=Object.values(computeNextMatchAssignments()).filter(Boolean);
  const nextIds=new Set(
    assignedUpcoming.length
      ? assignedUpcoming.map(match=>match.id)
      : (refereePanels.length===0 ? [nextPlayableMatch([...live])?.id].filter(Boolean) : [])
  );
  let html='';
  ['winners','losers','final'].forEach(bracket=>{
    const ms=state.matches.filter(m=>m.bracket===bracket && !m.inactive);
    if(!ms.length) return;
    const rounds=[...new Set(ms.map(m=>m.bracketRound))];
    const {positions,H}=layoutDoubleBracketSection(ms,rounds);
    let paths='';
    ms.forEach(m=>{
      const p=positions.get(m.id), q=positions.get(m.nextMatchId);
      if(!p||!q) return;
      paths+=`<path class="conn-path ${m.status==='completed'?'active':''}" data-from-match="${m.id}" d="M${p.x+190},${p.y} H${p.x+215} V${q.y} H${q.x}"/>`;
    });
    html+=`<section style="margin-bottom:30px"><h3 style="font-size:16px;margin:0 0 14px;color:var(--text)">${bracket==='winners'?'勝部':bracket==='losers'?'敗部':'總決賽'}</h3><div style="position:relative;width:${rounds.length*240-50}px"><svg style="position:absolute;top:32px;left:0;pointer-events:none" width="${rounds.length*240-50}" height="${H}">${paths}</svg><div style="display:flex;gap:50px">`;
    rounds.forEach(r=>{
      const group=ms.filter(m=>m.bracketRound===r);
      html+=`<div class="bracket-col" style="width:190px;flex-shrink:0"><div class="bracket-round-label" style="height:32px;margin:0">${doubleRoundLabel(group[0])}</div><div class="bracket-round-body" style="height:${H}px">`;
      group.filter(m=>!m.isBye).forEach(m=>{
        const p=positions.get(m.id);
        // 顯示編號只計算真正需要上場的對戰；隱藏的輪空籤位不占號碼。
        const matchLabel = doubleMatchLabel(m);
        const sourceLabel = bracket === 'final'
          ? `${icon('trophy',14)}<span>${escapeHtml(matchLabel)}</span>`
          : doubleMatchLabelHtml(m);
        html+=`<div class="de-source ${bracket === 'final' ? 'final-match-heading' : ''}" style="top:${p.y-55}px" title="${escapeHtml(matchLabel)}">${sourceLabel}</div>`;
        html+=bracketMatchBoxHtml(m,p.y-37,live,nextIds,bracket==='final');
      });
      html+='</div></div>';
    });
    html+='</div></div></section>';
  });
  wrap.innerHTML=html;
  updateBracketSearchVisibility();
}

function standardSeedOrder(size){
  let order = [0,1];
  while(order.length < size){
    const len = order.length * 2;
    const next = [];
    order.forEach(x => {
      next.push(x);
      next.push(len - 1 - x);
    });
    order = next;
  }
  return order;
}

function generateKnockoutBracket(players){
  const n = players.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const byeCount = bracketSize - n;
  const matchCount1 = bracketSize / 2;

  // Fully random draw: not just "which player plays whom" but also "which
  // bracket box any bye lands in". A fixed seeding template (e.g. always
  // pairing seed 1 with the lowest seed) would keep putting byes in the
  // same handful of match slots every single time, even though the players
  // occupying those slots change — so 隨機刷新賽程 could look identical in
  // shape every refresh. Instead: pick byeCount DISTINCT round-1 matches at
  // random to receive a bye (guaranteed distinct, so two byes never collide
  // in the same match — byeCount is always < matchCount1), randomize which
  // side (A/B) the bye sits on, then shuffle every real player into all the
  // remaining slots.
  const matchIdxs = shuffleArray(Array.from({ length: matchCount1 }, (_, i) => i));
  const byeMatchIdxs = new Set(matchIdxs.slice(0, byeCount));

  const shuffledPlayers = shuffleArray(players);
  let cursor = 0;
  const ordered = new Array(bracketSize);
  for(let i = 0; i < matchCount1; i++){
    if(byeMatchIdxs.has(i)){
      const real = shuffledPlayers[cursor++];
      const bye = { id: 'BYE', name: '輪空' };
      if(Math.random() < 0.5){ ordered[i*2] = real; ordered[i*2+1] = bye; }
      else { ordered[i*2] = bye; ordered[i*2+1] = real; }
    } else {
      ordered[i*2] = shuffledPlayers[cursor++];
      ordered[i*2+1] = shuffledPlayers[cursor++];
    }
  }

  const numRounds = Math.log2(bracketSize);
  const rounds = [];

  for(let r=1; r<=numRounds; r++){
    const matchCount = bracketSize / Math.pow(2, r);
    const roundMatches = [];
    for(let i=0; i<matchCount; i++){
      roundMatches.push({
        id: `K${r}-${i+1}`,
        round: r,
        playerA: r === 1 ? ordered[i*2].id : null,
        playerB: r === 1 ? ordered[i*2+1].id : null,
        log: [],
        pointsA: 0,
        pointsB: 0,
        status: 'pending',
        winner: null,
        completedAt: null,
        nextMatchId: null,
        nextSlot: null,
        loserNextMatchId: null,
        loserNextSlot: null,
        isBye: false,
        thirdPlace: false
      });
    }
    rounds.push(roundMatches);
  }

  for(let r=1; r<numRounds; r++){
    rounds[r-1].forEach((m, i) => {
      const nextMatch = rounds[r][Math.floor(i/2)];
      m.nextMatchId = nextMatch.id;
      m.nextSlot = i % 2 === 0 ? 'A' : 'B';
    });
  }

  // Third-place (bronze) match: the two semifinal losers play each other.
  // Only exists when there's an actual semifinal round (bracketSize >= 4).
  let bronze = null;
  if(numRounds >= 2){
    bronze = {
      id: 'BRONZE',
      round: numRounds,
      playerA: null,
      playerB: null,
      log: [],
      pointsA: 0,
      pointsB: 0,
      status: 'pending',
      winner: null,
      completedAt: null,
      nextMatchId: null,
      nextSlot: null,
      loserNextMatchId: null,
      loserNextSlot: null,
      isBye: false,
      thirdPlace: true
    };
    const semifinals = rounds[numRounds - 2];
    semifinals.forEach((m, i) => {
      m.loserNextMatchId = bronze.id;
      m.loserNextSlot = i === 0 ? 'A' : 'B';
    });
  }

  // Order the flat match list so the bronze (third-place) match is scheduled
  // right before the final, and the final is always the very last match.
  const finalRoundMatches = rounds[numRounds - 1];
  const earlierRoundsFlat = rounds.slice(0, numRounds - 1).flat();
  const flat = [...earlierRoundsFlat];
  if(bronze) flat.push(bronze);
  flat.push(...finalRoundMatches);

  // Auto-resolve any match where one side is a BYE placeholder, cascading
  // forward (winner into the next round, and now also loser into the
  // bronze/third-place match) until nothing changes.
  resolveByeCascade(flat);

  return flat;
}

function resolveByeCascade(list){
  if(list.some(m => m.bracket)) { reconcileDoubleElimination(list); return; }
  let changed = true;
  while(changed){
    changed = false;
    list.forEach(m => {
      if(m.status !== 'completed' && m.playerA && m.playerB){
        const aOut = m.playerA === 'BYE' || isWithdrawn(m.playerA);
        const bOut = m.playerB === 'BYE' || isWithdrawn(m.playerB);
        if(aOut && bOut) return; // both sides unavailable — needs a referee's manual call
        if(aOut || bOut){
          m.status = 'completed';
          m.winner = aOut ? m.playerB : m.playerA;
          m.completedAt = Date.now();
          if(m.playerA === 'BYE' || m.playerB === 'BYE') m.isBye = true;
          else m.forfeited = true;
          markDirty(m.id);
          propagateKnockoutWinner(m, list);
          changed = true;
        }
      }
    });
  }
}

function propagateKnockoutWinner(match, matchList){
  const list = matchList || state.matches;
  if(match.bracket) { reconcileDoubleElimination(list); return; }

  if(match.nextMatchId){
    const next = list.find(m => m.id === match.nextMatchId);
    if(next){
      if(match.nextSlot === 'A') next.playerA = match.winner;
      else next.playerB = match.winner;
      markDirty(next.id);
    }
  }

  if(match.loserNextMatchId){
    const loser = match.winner === match.playerA ? match.playerB : match.playerA;
    const bronzeMatch = list.find(m => m.id === match.loserNextMatchId);
    if(bronzeMatch){
      if(match.loserNextSlot === 'A') bronzeMatch.playerA = loser;
      else bronzeMatch.playerB = loser;
      markDirty(bronzeMatch.id);
    }
  }
}

