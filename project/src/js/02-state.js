/* =========================================================
   STATE
========================================================= */
let state = {
  tournament:{ name:'', pointsToWin:4, format:'knockout', quickMode:true, status:'registration' },
  players:[],
  matches:[],
  currentRound:1
};

let saveTimer = null;

// Perf: when the referee panel is the active tab, scoring taps shouldn't force
// a full rebuild of the standings/bracket/match-list DOM (they're hidden anyway,
// and rebuilding them just to throw the result away caused visible jank). Instead
// we mark them "dirty" and only actually re-render once the user switches to
// that tab. See refreshAfterScoreChange() / switchTab().
let standingsDirty = false;
let matchesDirty = false;
let playerSetupExpanded = false; // 開賽後「參賽玩家」預設收合成摘要，展開後可編輯名單重新產生賽程
let attendanceManagerOpen = false; // 選用：不開啟點名也可直接開賽
let attendancePendingCursor = -1; // 連續跳轉到下一位未標記選手

