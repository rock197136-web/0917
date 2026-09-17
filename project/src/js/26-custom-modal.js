/* =========================================================
   CUSTOM MODAL (replaces window.confirm/alert, which are
   blocked/auto-dismissed inside the sandboxed artifact preview)
========================================================= */
function showModal(message, buttons){
  document.getElementById('customModalMessage').innerText = message;
  const container = document.getElementById('customModalButtons');
  container.innerHTML = '';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + b.className;
    btn.innerText = b.label;
    btn.onclick = () => { hideModal(); if(b.action) b.action(); };
    container.appendChild(btn);
  });
  document.getElementById('customModal').classList.add('show');
}

function hideModal(){
  document.getElementById('customModal').classList.remove('show');
}


function openUpdateNotes(){
  showModal('目前版本：V3.9\n更新日期：2026/09/17\n\n更新摘要\n\n• 放大手機觸控區域並提升小字可讀性。\n• 重整樹狀圖工具列，新增狀態圖例與目前場次定位。\n• 隨機刷新與主題選擇移入更多設定。\n• 計分加入 360ms 防連點及短暫加分回饋。\n• 降低非必要光效，修正文案並清理舊版頁首結構。', [{label:'知道了',className:'btn-primary'}]);
}

function showAlert(message){
  showModal(message, [{ label:'知道了', className:'btn-primary' }]);
}

function showConfirm(message, onConfirm){
  showModal(message, [
    { label:'取消', className:'btn-dark' },
    { label: /清除|刪除|撤銷|重置|重新開始/.test(message) ? '確定變更' : '繼續', className: /清除|刪除|撤銷|重置|重新開始/.test(message) ? 'btn-danger' : 'btn-primary', action:onConfirm }
  ]);
}

function buildBattery(points, target){
  const capped = Math.min(points, target);
  const isFull = points >= target;
  const sevenMode = target > 4;

  let cellsHtml = '';
  for(let i=1; i<=target; i++){
    cellsHtml += `<div class="battery-cell ${i<=capped ? 'lit':''}"></div>`;
  }

  const bodyClasses = [
    sevenMode ? 'battery-seven' : '',
    isFull ? 'battery-full' : ''
  ].filter(Boolean).join(' ');

  return `
    <div class="battery-outer">
      <div class="battery-cap"></div>
      <div class="battery-body ${bodyClasses}">
        ${cellsHtml}
      </div>
    </div>`;
}

function advanceReferee(panelId){
  const panel = refereePanels.find(p => p.id === panelId);
  if(!panel) return;
  const next = computeNextMatchForPanel(panelId);
  panel.matchId = next ? next.id : panel.matchId;
  delete panel.nextMatchId;
  savePanels();
  renderReferee();
}

function hasPendingMatches(){
  return !!nextPlayableMatch();
}

function showFinalResults(){
  switchTab('standings');
}

