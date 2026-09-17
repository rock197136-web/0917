/* =========================================================
   AWARD REPORT (賽後頒獎戰報)
   Reuses the same champion/runner-up/3rd logic already used by
   renderBracketPodium() (knockout) and renderStandings() (round-
   robin/double), just returning data instead of rendering, so it
   never drifts out of sync with what's shown on the 即時戰況 tab.
========================================================= */
function getAwardPodiumData(){
  const playerCount = state.players.filter(p => !p.withdrawn).length;
  // 與「即時戰況／總場次」使用完全相同的計算口徑，不把輪空列入場次。
  const totalMatches = state.matches.filter(m => !m.isBye && !m.inactive).length;
  const base = { playerCount, totalMatches, tournamentName: state.tournament.name || '未命名賽事' };

  if(isElimination(state.tournament.format)){
    if(state.matches.length === 0) return { ready:false };
    const finalRound = Math.max(...state.matches.filter(m=>!m.thirdPlace).map(m=>m.round));
    const finalMatch = state.tournament.format === 'double_elimination' ? doubleFinalMatch() : state.matches.find(m=>m.round===finalRound && !m.thirdPlace);
    if(!finalMatch || finalMatch.status !== 'completed') return { ready:false };
    const champId = finalMatch.winner;
    const runnerUpId = champId === finalMatch.playerA ? finalMatch.playerB : finalMatch.playerA;
    const bronzeMatch = state.matches.find(m => m.thirdPlace);
    const thirdId = state.tournament.format === 'double_elimination' ? doubleThirdId() : (bronzeMatch && bronzeMatch.status === 'completed') ? bronzeMatch.winner : null;
    return Object.assign(base, {
      ready:true,
      champion: nameOf(champId),
      silver: nameOf(runnerUpId),
      bronze: thirdId ? nameOf(thirdId) : null
    });
  }

  const standings = calculateStandings();
  const isComplete = state.matches.length > 0 && state.matches.every(m => m.status === 'completed');
  if(!isComplete || standings.length === 0) return { ready:false };
  return Object.assign(base, {
    ready:true,
    champion: standings[0] ? standings[0].name : null,
    silver: standings[1] ? standings[1].name : null,
    bronze: standings[2] ? standings[2].name : null
  });
}

function openAwardReport(){
  const data = getAwardPodiumData();
  if(!data.ready || !data.champion){
    showToast('賽事尚未產生冠軍，還無法產生頒獎戰報');
    return;
  }

  document.getElementById('awardChampName').textContent = data.champion;
  document.getElementById('awardSilverName').textContent = data.silver || '－';
  document.getElementById('awardBronzeName').textContent = data.bronze || '－';
  document.getElementById('awardSilverCard').style.display = data.silver ? '' : 'none';
  document.getElementById('awardBronzeCard').style.display = data.bronze ? '' : 'none';
  document.getElementById('awardPlayerCount').textContent = data.playerCount;
  document.getElementById('awardMatchCount').textContent = data.totalMatches;
  document.getElementById('awardTournamentName').textContent = data.tournamentName;

  const d = new Date();
  document.getElementById('awardDate').textContent =
    `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;

  document.getElementById('awardModal').classList.add('show');
  fitAwardStage();
}

function hideAwardModal(){
  document.getElementById('awardModal').classList.remove('show');
}

// Scales the fixed 1080x1600 poster down to fit the modal on screen.
// downloadAwardImage() temporarily resets this to capture full-res.
function fitAwardStage(){
  const stage = document.getElementById('awardStage');
  const wrap = document.getElementById('awardStageWrap');
  if(!stage || !wrap) return;
  const maxW = Math.min(wrap.clientWidth || 420, 420);
  const scale = maxW / 1080;
  stage.style.transform = `scale(${scale})`;
  wrap.style.height = (1600 * scale) + 'px';
}
window.addEventListener('resize', () => {
  if(document.getElementById('awardModal').classList.contains('show')) fitAwardStage();
});

async function downloadAwardImage(){
  const stage = document.getElementById('awardStage');
  const btn = document.getElementById('awardDownloadBtn');
  if(!stage) return;
  if(typeof html2canvas === 'undefined'){
    showToast('圖片產生元件載入失敗，請檢查網路連線後重試');
    return;
  }

  const originalTransform = stage.style.transform;
  stage.style.transform = 'none'; // capture at full 1080x1600 resolution, not the scaled-down preview
  const originalHTML = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerText = '產生圖片中…'; }

  try{
    const canvas = await html2canvas(stage, { backgroundColor:null, scale:2, useCORS:true });
    const safeName = (document.getElementById('awardTournamentName').textContent || 'beyblade-x')
      .replace(/[\\/:*?"<>|]/g, '_').trim() || 'beyblade-x';
    const link = document.createElement('a');
    link.download = `${safeName}_頒獎戰報.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }catch(e){
    console.error('產生頒獎戰報圖片失敗', e);
    showToast('產生圖片失敗，請重試一次');
  }finally{
    stage.style.transform = originalTransform;
    if(btn){ btn.disabled = false; btn.innerHTML = originalHTML || `${icon('download',14)} 下載圖片`; }
  }
}

async function copyShareLink(code, btnEl){
  code = (code || '').trim().toUpperCase();
  if(code.length !== 3) return;
  const link = buildShareLink(code);
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(link);
    } else {
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast('連結已複製到剪貼簿');
    if(btnEl){
      const original = btnEl.innerHTML;
      btnEl.classList.add('copied');
      btnEl.innerHTML = `${icon('check-circle',14)} 已複製`;
      clearTimeout(btnEl._resetTimer);
      btnEl._resetTimer = setTimeout(() => {
        btnEl.classList.remove('copied');
        btnEl.innerHTML = original;
      }, 1600);
    }
  }catch(e){
    console.error('複製連結失敗', e);
    showToast('複製失敗，請手動複製連結');
  }
}

