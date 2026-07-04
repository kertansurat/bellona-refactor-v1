/* BELLONA Refactor v2.0 Performance Pass
   Safe runtime optimizations only. No Firebase schema/API/logic changes. */
(function () {
  'use strict';

  // 1) Render scheduler: coalesce burst renderAll() calls into one animation frame.
  // Keeps the original renderAll implementation intact and preserves all side effects.
  function installRenderScheduler() {
    if (typeof window.renderAll !== 'function' || window.__bellonaRenderSchedulerInstalled) return;
    const originalRenderAll = window.renderAll;
    let queued = false;
    let lastArgs = null;
    window.renderAll = function bellonaScheduledRenderAll() {
      lastArgs = arguments;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        originalRenderAll.apply(window, lastArgs || []);
        lastArgs = null;
      });
    };
    window.__bellonaRenderSchedulerInstalled = true;
  }

  // 2) Debounce only typing events in the search box. Button/dropdown/manual calls still execute normally.
  function installSearchDebounce() {
    const input = document.getElementById('search-name');
    if (!input || input.__bellonaDebounced) return;
    input.__bellonaDebounced = true;
    let timer = null;
    input.removeAttribute('oninput');
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (typeof window.filterPlayers === 'function') window.filterPlayers();
      }, 120);
    }, { passive: true });
  }

  // 3) Make static images cheaper for the browser without changing visible UI.
  function installImageHints() {
    document.querySelectorAll('img').forEach(function (img) {
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('loading') && img.id !== 'login-logo' && img.id !== 'header-logo') {
        img.setAttribute('loading', 'lazy');
      }
    });
  }

  function bootPerformancePass() {
    installRenderScheduler();
    installSearchDebounce();
    installImageHints();
    console.log('BELLONA Refactor v2.0 Performance Pass loaded ✅');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPerformancePass, { once: true });
  } else {
    bootPerformancePass();
  }
})();
