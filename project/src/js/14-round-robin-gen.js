/* =========================================================
   ROUND ROBIN GENERATION (circle method, supports double)
========================================================= */
function generateRoundRobin(players, format){
  let list = [...players];
  if(list.length % 2 !== 0) list.push({ id:'BYE', name:'BYE' });

  const total = list.length;
  const rounds = total - 1;
  const half = total / 2;
  let rotation = [...list];
  const baseMatches = [];

  for(let round=1; round<=rounds; round++){
    for(let i=0;i<half;i++){
      const a = rotation[i];
      const b = rotation[total-1-i];
      if(a.id !== 'BYE' && b.id !== 'BYE'){
        baseMatches.push({ round, playerA:a.id, playerB:b.id });
      }
    }
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop());
    rotation = [fixed, ...rest];
  }

  let allPairings = [...baseMatches];
  if(format === 'double'){
    const second = baseMatches.map(m => ({
      round: m.round + rounds,
      playerA: m.playerB,
      playerB: m.playerA
    }));
    allPairings = allPairings.concat(second);
  }

  return allPairings.map((m, idx) => ({
    id: `M${String(idx+1).padStart(3,'0')}`,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
    log: [],
    pointsA: 0,
    pointsB: 0,
    status: 'pending',
    winner: null,
    completedAt: null
  }));
}

