/* =========================================================
   HELPERS
========================================================= */
function nameOf(id){
  if(!id) return '待定';
  if(id === 'BYE') return '輪空';
  const p = state.players.find(p=>p.id===id);
  return p ? p.name : id;
}
function escapeHtml(text){
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}
function escapeAttr(text){
  return String(text ?? '').replace(/"/g,'&quot;');
}
