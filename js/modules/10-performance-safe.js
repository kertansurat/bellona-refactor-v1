/* BELLONA v2.0 Latest Performance Patch
   Safe wrappers only: no Firebase schema/API/party logic changes. */
(function(){
  'use strict';
  const B = window.BellonaPerf = window.BellonaPerf || {};
  B.debounce = function(fn, wait){
    let t;
    return function(){
      const ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function(){ fn.apply(ctx, args); }, wait || 120);
    };
  };
  B.rafThrottle = function(fn){
    let ticking = false, lastArgs, lastThis;
    return function(){
      lastArgs = arguments; lastThis = this;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        ticking = false;
        fn && fn.apply(lastThis, lastArgs);
      });
    };
  };
  function patchSearchInputs(){
    const ids = ['search-name','search-job-dropdown'];
    ids.forEach(function(id){
      const el = document.getElementById(id);
      if (!el || el.dataset.bellonaPerfPatched) return;
      el.dataset.bellonaPerfPatched = '1';
      if (typeof window.filterPlayers === 'function') {
        const run = B.debounce(function(){ window.filterPlayers(); }, 120);
        el.addEventListener(id === 'search-name' ? 'input' : 'change', run, { passive: true });
        el.removeAttribute(id === 'search-name' ? 'oninput' : 'onchange');
      }
    });
  }
  function patchImages(){
    document.querySelectorAll('#waiting-list img, .dual-party-grid img, #dash-job-ranking img').forEach(function(img){
      if (!img.loading) img.loading = 'lazy';
      if (!img.decoding) img.decoding = 'async';
    });
  }
  function boot(){
    patchSearchInputs();
    patchImages();
    const waiting = document.getElementById('waiting-list');
    if (waiting && !waiting.dataset.bellonaObserver) {
      waiting.dataset.bellonaObserver = '1';
      new MutationObserver(B.rafThrottle(patchImages)).observe(waiting, { childList:true, subtree:true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', boot, { once:true });
})();
