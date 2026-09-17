/* =========================================================
   RESET
========================================================= */
function resetTournament(){
  showConfirm('確定要刪除目前所有比賽資料嗎？此動作無法復原。', async () => {
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    try{ localStorage.removeItem(ROSTER_DRAFT_KEY); }catch(e){}
    if(window.storage){ try{ await window.storage.delete(STORAGE_KEY, false); }catch(e){} }
    if(window.cloudSync && window.cloudSync.ready && currentEventCode){
      try{ await window.cloudSync.clearMatches(); }catch(e){}
    }
    state = {
      tournament:{ name:'', pointsToWin:4, format:'knockout', quickMode:true, status:'registration' },
      players:[], matches:[], currentRound:1
    };
    refereePanels = [{ id: genPanelId(), matchId:null, label:'' }];
    savePanels();
    playerSetupExpanded = false;
    attendanceManagerOpen = false;
    createPlayerInputs(2);
    renderAll();
    if(currentEventCode) saveState();
  });
}

