/* =========================================================
   INIT
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  createPlayerInputs(2);
  loadRefereePanels();
  loadMasterMode();
  await loadLocalCache();
  renderAll();
  initCloud();
  initBracketPanZoom();
  initBracketTheme();
  initStaticIcons();
  initDrawTool();
  initPrizeDraw();
});

// Fills in the icons for elements that exist as static markup (tabs,
// header buttons, search box) rather than being built by a render
// function — keeps the icon set defined in one place (ICONS above)
// instead of duplicating SVG strings inline in the HTML.
function initStaticIcons(){
  const map = {
    tabIconStandings: 'activity',
    tabIconMatches: 'git-branch',
    tabIconReferee: 'gavel',
    tabIconSetup: 'settings',
    tabIconTools: 'toolbox',
    toolboxHeadingIcon: 'toolbox',
    drawClearIcon: 'trash-2',
    drawActionIcon: 'shuffle',
    drawResultIcon: 'user',
    drawCopyIcon: 'copy',
    prizeHeadingIcon: 'gift',
    prizeResetIcon: 'rotate-ccw',
    prizeDrawIcon: 'shuffle',
    prizeResultIcon: 'user',
    cloudStatusIcon: 'sync',
    awardReportIcon: 'share-2',
    bracketSearchIconSlot: 'search',
    bracketSearchClearIcon: 'x',
    matchSearchIconSlot: 'search',
    matchSearchClearIcon: 'x',
    attendanceSearchIcon: 'search',
    actionToastIcon: 'check-circle',
    cloudModalIcon: 'radio',
    cloudCreatedIcon: 'check-circle',
    qrModalIcon: 'qr-code',
    awardModalIcon: 'trophy'
  };
  Object.entries(map).forEach(([id, name]) => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = icon(name, 16);
  });

  // Buttons/spans whose visible text must stay alongside the icon.
  setIconLabel('shuffleScheduleBtn', 'shuffle', '隨機刷新賽程');
  setIconLabel('bracketZoomHint', 'lightbulb', '可用手指縮放、左右滑動查看對戰樹', 14);
  setIconLabel('playerSetupSummaryAction', 'edit-3', '編輯名單', 14);
  setIconLabel('cloudResultRefShareBtn', 'link', '複製裁判連結', 14);
  setIconLabel('cloudResultViewerShareBtn', 'link', '複製選手連結', 14);
  setIconLabel('cloudResultQrBtn', 'qr-code', '生成QR碼', 14);
  setIconLabel('qrCopyBtn', 'link', '複製連結', 14);
  setIconLabel('awardDownloadBtn', 'download', '下載圖片', 14);
  const attendanceIcon = document.getElementById('attendanceToggleIcon');
  if(attendanceIcon) attendanceIcon.innerHTML = icon('clipboard-check', 18);
  const attendanceArrow = document.getElementById('attendanceToggleArrow');
  if(attendanceArrow) attendanceArrow.innerHTML = icon('chevron-down', 16);
}

