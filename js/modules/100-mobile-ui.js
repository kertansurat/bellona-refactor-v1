/* BELLONA Mobile App UI v2.7
   Safe add-on only. Desktop is untouched. No Firebase/API/logic schema changes. */
(function () {
  'use strict';

  const MOBILE_QUERY = '(max-width: 1023px)';
  const mq = window.matchMedia(MOBILE_QUERY);

  function isMobile() {
    return mq.matches;
  }

  function getHeaderParts() {
    const header = document.querySelector('header');
    if (!header) return {};
    const divs = Array.from(header.children).filter((el) => el.tagName === 'DIV');
    return {
      header,
      brand: divs[0] || null,
      stats: divs[1] || null,
      actions: divs[2] || null
    };
  }

  function markHeaderParts() {
    const { stats, actions } = getHeaderParts();
    if (stats) stats.classList.add('bellona-mobile-header-stats');
    if (actions) actions.classList.add('bellona-mobile-header-actions');
  }

  function ensureBackdrop() {
    let backdrop = document.getElementById('bellona-mobile-drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'bellona-mobile-drawer-backdrop';
      backdrop.className = 'bellona-mobile-drawer-backdrop';
      backdrop.addEventListener('click', closeMobileActions, { passive: true });
      document.body.appendChild(backdrop);
    }
    return backdrop;
  }

  function ensureDrawer() {
    let drawer = document.getElementById('bellona-mobile-app-drawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.id = 'bellona-mobile-app-drawer';
      drawer.className = 'bellona-mobile-app-drawer';
      drawer.setAttribute('aria-hidden', 'true');
      drawer.innerHTML = [
        '<div class="bellona-mobile-drawer-head">',
        '<div class="bellona-mobile-drawer-title"><i class="fa-solid fa-screwdriver-wrench"></i> System Tools</div>',
        '<button type="button" class="bellona-mobile-drawer-close" aria-label="ปิดเมนู"><i class="fa-solid fa-xmark"></i></button>',
        '</div>',
        '<div class="bellona-mobile-action-list" id="bellona-mobile-action-list"></div>'
      ].join('');
      document.body.appendChild(drawer);
      drawer.querySelector('.bellona-mobile-drawer-close')?.addEventListener('click', closeMobileActions);
    }
    return drawer;
  }

  function ensureMobileActionToggle() {
    const { header } = getHeaderParts();
    if (!header) return;

    let btn = document.getElementById('bellona-mobile-action-toggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'bellona-mobile-action-toggle';
      btn.type = 'button';
      btn.className = 'bellona-mobile-action-toggle';
      btn.setAttribute('aria-label', 'เปิดเมนูเครื่องมือ');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      header.appendChild(btn);
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleMobileActions();
      });
    }
  }

  function cloneActionButtons() {
    const { actions } = getHeaderParts();
    const list = document.getElementById('bellona-mobile-action-list');
    if (!actions || !list) return;

    list.innerHTML = '';
    const buttons = Array.from(actions.querySelectorAll('button'));
    buttons.forEach((original, index) => {
      const clone = document.createElement('button');
      clone.type = 'button';
      clone.className = original.className || '';
      clone.innerHTML = original.innerHTML;
      clone.dataset.mobileActionIndex = String(index);
      clone.addEventListener('click', function (event) {
        event.preventDefault();
        closeMobileActions();
        window.setTimeout(() => original.click(), 80);
      });
      list.appendChild(clone);
    });
  }

  function setToggleState(open) {
    const btn = document.getElementById('bellona-mobile-action-toggle');
    const drawer = document.getElementById('bellona-mobile-app-drawer');
    document.body.classList.toggle('bellona-mobile-actions-open', open);
    if (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    }
    if (drawer) drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) cloneActionButtons();
  }

  function toggleMobileActions() {
    setToggleState(!document.body.classList.contains('bellona-mobile-actions-open'));
  }

  function closeMobileActions() {
    setToggleState(false);
  }

  function closeBottomNavAfterTabClick(event) {
    if (!isMobile()) return;
    const target = event.target.closest && event.target.closest('#main-left-menu .tab-btn');
    if (!target) return;
    closeMobileActions();
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }

  function closeOnEscape(event) {
    if (event.key === 'Escape') closeMobileActions();
  }

  function refreshMobileMode() {
    const mobile = isMobile();
    document.documentElement.classList.toggle('bellona-mobile-mode', mobile);
    markHeaderParts();
    if (mobile) {
      ensureBackdrop();
      ensureDrawer();
      ensureMobileActionToggle();
      cloneActionButtons();
      improveTouchScrolling();
    } else {
      closeMobileActions();
    }
  }

  function improveTouchScrolling() {
    if (!isMobile()) return;
    const selectors = [
      '#waiting-list',
      '#main-left-menu',
      '#tab-content-stats .overflow-x-auto',
      '#tab-content-rewards .overflow-x-auto',
      '#tab-content-auction .overflow-x-auto',
      '#tab-content-queuecheck .overflow-x-auto',
      '#tab-content-members .overflow-x-auto',
      '#dash-job-ranking',
      '.dash-v21-job-chart',
      '.map-scroll-container',
      '.bellona-mobile-app-drawer'
    ];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.webkitOverflowScrolling = 'touch';
        el.style.overscrollBehavior = 'contain';
      });
    });
  }

  function patchTabSwitchForMobile() {
    // Keep original switchTab behavior untouched. This only refreshes mobile scroll hints after tabs render.
    if (window.__bellonaMobileTabPatch) return;
    window.__bellonaMobileTabPatch = true;
    document.addEventListener('click', function (event) {
      const tabBtn = event.target.closest && event.target.closest('#main-left-menu .tab-btn');
      if (!tabBtn || !isMobile()) return;
      window.setTimeout(improveTouchScrolling, 160);
      window.setTimeout(improveTouchScrolling, 420);
    }, { passive: true });
  }

  function init() {
    refreshMobileMode();
    patchTabSwitchForMobile();
    document.addEventListener('click', closeBottomNavAfterTabClick, { passive: true });
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('orientationchange', () => window.setTimeout(refreshMobileMode, 260), { passive: true });

    if (mq.addEventListener) {
      mq.addEventListener('change', refreshMobileMode);
    } else if (mq.addListener) {
      mq.addListener(refreshMobileMode);
    }

    // Some modules render after login/Firebase sync. Refresh quietly.
    window.setTimeout(refreshMobileMode, 500);
    window.setTimeout(refreshMobileMode, 1500);
    window.setTimeout(improveTouchScrolling, 2600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* =========================================================
   BELLONA Mobile App Layout v2.7.1 enhancer
   Scope: mobile only. No Firebase/API/logic changes.
   ========================================================= */
(function () {
  'use strict';
  const mq = window.matchMedia('(max-width: 767px)');

  function isMobile() { return mq.matches; }

  function getActiveTabName() {
    const active = document.querySelector('#main-left-menu .tab-btn.active');
    if (!active || !active.id) return '';
    return active.id.replace('tab-btn-', '').trim();
  }

  function syncMobileTabClass() {
    const body = document.body;
    if (!body) return;
    Array.from(body.classList).forEach((cls) => {
      if (cls.indexOf('bellona-mobile-tab-') === 0) body.classList.remove(cls);
    });
    if (isMobile()) {
      const tab = getActiveTabName() || 'dashboard';
      body.classList.add('bellona-mobile-tab-' + tab);
      document.documentElement.classList.add('bellona-mobile-mode');
    }
  }

  function compactBottomNavText() {
    if (!isMobile()) return;
    const labels = {
      dashboard: 'หน้าแรก',
      members: 'สมาชิก',
      party: 'ปาร์ตี้',
      tactical: 'แผน',
      auction: 'คิว',
      queuecheck: 'เช็คคิว',
      rewards: 'สุ่ม',
      stats: 'สถิติ'
    };
    Object.keys(labels).forEach((key) => {
      const btn = document.getElementById('tab-btn-' + key);
      if (!btn || btn.dataset.mobileShortReady === '1') return;
      const icon = btn.querySelector('i');
      btn.innerHTML = '';
      if (icon) btn.appendChild(icon);
      const span = document.createElement('span');
      span.className = 'bellona-mobile-nav-label';
      span.textContent = labels[key];
      btn.appendChild(span);
      btn.dataset.mobileShortReady = '1';
    });
  }

  function makePartyCardsTouchFriendly() {
    if (!isMobile()) return;
    document.querySelectorAll('#tab-content-party .dual-party-grid .glass-panel').forEach((card) => {
      if (card.dataset.mobilePartyReady === '1') return;
      card.dataset.mobilePartyReady = '1';
      card.classList.add('bellona-mobile-party-card');
    });
  }

  function refreshMobileEnhancements() {
    syncMobileTabClass();
    compactBottomNavText();
    makePartyCardsTouchFriendly();
  }

  document.addEventListener('click', function (event) {
    if (!isMobile()) return;
    if (event.target.closest && event.target.closest('#main-left-menu .tab-btn')) {
      window.setTimeout(refreshMobileEnhancements, 80);
      window.setTimeout(refreshMobileEnhancements, 260);
    }
  }, { passive: true });

  window.addEventListener('resize', function () {
    window.setTimeout(refreshMobileEnhancements, 120);
  }, { passive: true });
  window.addEventListener('orientationchange', function () {
    window.setTimeout(refreshMobileEnhancements, 280);
  }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshMobileEnhancements, { once: true });
  } else {
    refreshMobileEnhancements();
  }
  window.setTimeout(refreshMobileEnhancements, 500);
  window.setTimeout(refreshMobileEnhancements, 1500);
})();
