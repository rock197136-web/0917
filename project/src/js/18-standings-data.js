/* =========================================================
   STANDINGS
========================================================= */
function calculateStandings(){
  const table = {};
  state.players.forEach(p=>{
    table[p.id] = { id:p.id, name:p.name, withdrawn:!!p.withdrawn, played:0, wins:0, losses:0, pointsFor:0, pointsAgainst:0, diff:0 };
  });

  state.matches.filter(m=>m.status==='completed').forEach(m=>{
    const A = table[m.playerA], B = table[m.playerB];
    if(!A || !B) return;
    A.played++; B.played++;
    A.pointsFor += m.pointsA; A.pointsAgainst += m.pointsB;
    B.pointsFor += m.pointsB; B.pointsAgainst += m.pointsA;
    if(m.winner === m.playerA){ A.wins++; B.losses++; } else { B.wins++; A.losses++; }
  });

  Object.values(table).forEach(p => p.diff = p.pointsFor - p.pointsAgainst);

  return Object.values(table).sort((a,b)=>{
    if(b.wins !== a.wins) return b.wins - a.wins;
    if(b.diff !== a.diff) return b.diff - a.diff;
    if(b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return a.name.localeCompare(b.name);
  });
}

