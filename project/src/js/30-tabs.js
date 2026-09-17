/* =========================================================
   TABS
========================================================= */
function switchTab(tab){
  if(currentRole === 'viewer' && (tab === 'referee' || tab === 'setup' || tab === 'tools')) return;
  const tabs = ['standings','matches','referee','setup','tools'];
  tabs.forEach(name => {
    document.getElementById(`tab-${name}`).classList.toggle('hidden', name !== tab);
  });
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.body.classList.toggle('referee-view', tab === 'referee');
  document.querySelectorAll('.tab').forEach(btn => {
    if(btn.dataset.tab === tab) btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');
  });
  if(tab === 'referee') renderReferee();
  if(tab === 'standings' && standingsDirty){ renderStandings(); standingsDirty = false; }
  if(tab === 'matches' && matchesDirty){ renderMatches(); matchesDirty = false; }
}

