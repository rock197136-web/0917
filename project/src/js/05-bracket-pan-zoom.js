/* =========================================================
   BRACKET TREE — pinch-zoom / drag-to-pan (for players on
   phones to comfortably view a large knockout bracket)
========================================================= */
let bracketZoom = 1;
const BRACKET_ZOOM_MIN = 0.5;
const BRACKET_ZOOM_MAX = 2.2;
const BRACKET_ZOOM_STEP = 0.15;

function applyBracketZoom(){
  const wrap = document.getElementById('bracketZoomWrap');
  const tree = document.getElementById('bracketTree');
  if(wrap){
    wrap.style.transform = `scale(${bracketZoom})`;
    // CSS transform only changes how the box is *painted* — it doesn't
    // shrink the space this inline-block reserves in normal flow, so at
    // any zoom other than 100% the scroll container was left reserving
    // room for the full-size (unscaled) tree, showing as blank space
    // below/right of the visibly smaller content. Sizing the wrapper's
    // real width/height to the scaled size keeps the reserved space (and
    // therefore the page height) matching what's actually drawn.
    // tree.offsetWidth/Height always report the tree's own natural,
    // unscaled size — transforms on this wrap (its ancestor) don't affect
    // a descendant's offset measurements, so this stays accurate at any
    // zoom level without needing a separately cached "natural size".
    if(tree){
      wrap.style.width = (tree.offsetWidth * bracketZoom) + 'px';
      wrap.style.height = (tree.offsetHeight * bracketZoom) + 'px';
    }
  }
  const label = document.getElementById('bracketZoomLabel');
  if(label) label.innerText = Math.round(bracketZoom * 100) + '%';
}
function bracketZoomIn(){
  bracketZoom = Math.min(BRACKET_ZOOM_MAX, +(bracketZoom + BRACKET_ZOOM_STEP).toFixed(2));
  applyBracketZoom();
}
function bracketZoomOut(){
  bracketZoom = Math.max(BRACKET_ZOOM_MIN, +(bracketZoom - BRACKET_ZOOM_STEP).toFixed(2));
  applyBracketZoom();
}
function bracketZoomReset(){
  bracketZoom = 1;
  applyBracketZoom();
  const scroll = document.getElementById('bracketScroll');
  if(scroll) scroll.scrollLeft = 0;
}

function jumpToCurrentBracketMatch(){
  const tree = document.getElementById('bracketTree');
  if(!tree) return;
  let target = tree.querySelector('.bracket-match.is-live') || tree.querySelector('.bracket-match.is-next');
  if(!target){
    const next = nextPlayableMatch();
    if(next) target = tree.querySelector(`.bracket-match[data-match-id="${next.id}"]`);
  }
  if(!target){
    showToast('目前沒有可進行的場次');
    return;
  }
  target.scrollIntoView({behavior:'smooth', block:'center', inline:'center'});
  target.classList.remove('search-hit');
  void target.offsetWidth;
  target.classList.add('search-hit');
  setTimeout(() => target.classList.remove('search-hit'), 2000);
}

function initBracketPanZoom(){
  const scroll = document.getElementById('bracketScroll');
  if(!scroll) return;

  applyBracketZoom();

  // --- Mouse drag-to-pan (desktop / trackpad) ---
  let isDown = false, startX = 0, scrollLeftStart = 0, dragged = false;
  scroll.addEventListener('mousedown', (e) => {
    isDown = true; dragged = false;
    scroll.classList.add('dragging');
    startX = e.pageX;
    scrollLeftStart = scroll.scrollLeft;
  });
  window.addEventListener('mouseup', () => { isDown = false; scroll.classList.remove('dragging'); });
  window.addEventListener('mouseleave', () => { isDown = false; scroll.classList.remove('dragging'); });
  scroll.addEventListener('mousemove', (e) => {
    if(!isDown) return;
    const dx = e.pageX - startX;
    if(Math.abs(dx) > 3) dragged = true;
    scroll.scrollLeft = scrollLeftStart - dx;
  });
  // Prevent an accidental click firing right after a drag.
  scroll.addEventListener('click', (e) => {
    if(dragged || touchDragged){ e.preventDefault(); e.stopPropagation(); dragged = false; touchDragged = false; }
  }, true);

  // --- Single-finger touch panning stays native (matches Challonge's feel: the
  // browser's own momentum scroll, both axes — horizontal pans the bracket,
  // vertical passes through to the page). We only watch it to suppress the
  // "ghost click" some in-app browsers (LINE, IG, etc.) fire after a swipe
  // that started on a match card. ---
  let touchStartX = 0, touchStartY = 0, touchDragged = false;
  scroll.addEventListener('touchstart', (e) => {
    if(e.touches.length === 1){
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchDragged = false;
    }
  }, { passive:true });
  scroll.addEventListener('touchmove', (e) => {
    if(e.touches.length === 1){
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if(Math.hypot(dx, dy) > 8) touchDragged = true;
    }
  }, { passive:true });

  // --- Two-finger pinch to zoom (touch) ---
  let pinchStartDist = null, pinchStartZoom = 1;
  function touchDist(touches){
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  scroll.addEventListener('touchstart', (e) => {
    if(e.touches.length === 2){
      pinchStartDist = touchDist(e.touches);
      pinchStartZoom = bracketZoom;
    }
  }, { passive:true });
  scroll.addEventListener('touchmove', (e) => {
    if(e.touches.length === 2 && pinchStartDist){
      e.preventDefault();
      const ratio = touchDist(e.touches) / pinchStartDist;
      bracketZoom = Math.min(BRACKET_ZOOM_MAX, Math.max(BRACKET_ZOOM_MIN, +(pinchStartZoom * ratio).toFixed(2)));
      applyBracketZoom();
    }
  }, { passive:false });
  scroll.addEventListener('touchend', (e) => {
    if(e.touches.length < 2) pinchStartDist = null;
  });

  // --- Ctrl/Cmd + scroll-wheel to zoom (desktop trackpads) ---
  scroll.addEventListener('wheel', (e) => {
    if(e.ctrlKey || e.metaKey){
      e.preventDefault();
      if(e.deltaY < 0) bracketZoomIn(); else bracketZoomOut();
    }
  }, { passive:false });
}

