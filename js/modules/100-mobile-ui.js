/* BELLONA Mobile App Shell v2.6.3
   Safe add-on only. Does not change production logic or Firebase data. */
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

  function ensureMobileActionToggle() {
    const { header, brand } = getHeaderParts();
    if (!header || !brand) return;

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

  function setToggleState(open) {
    const btn = document.getElementById('bellona-mobile-action-toggle');
    document.body.classList.toggle('bellona-mobile-actions-open', open);
    if (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    }
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

  function closeActionsOnActionClick(event) {
    if (!isMobile()) return;
    const actionButton = event.target.closest && event.target.closest('.bellona-mobile-header-actions button');
    if (!actionButton) return;
    window.setTimeout(closeMobileActions, 90);
  }

  function closeOnEscape(event) {
    if (event.key === 'Escape') closeMobileActions();
  }

  function markMobileMode() {
    const mobile = isMobile();
    document.documentElement.classList.toggle('bellona-mobile-mode', mobile);
    if (mobile) {
      markHeaderParts();
      ensureBackdrop();
      ensureMobileActionToggle();
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
      '.map-scroll-container'
    ];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.webkitOverflowScrolling = 'touch';
        el.style.overscrollBehavior = 'contain';
      });
    });
  }

  function init() {
    markMobileMode();
    improveTouchScrolling();
    document.addEventListener('click', closeBottomNavAfterTabClick, { passive: true });
    document.addEventListener('click', closeActionsOnActionClick, { passive: true });
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('orientationchange', () => window.setTimeout(improveTouchScrolling, 260), { passive: true });

    if (mq.addEventListener) {
      mq.addEventListener('change', () => {
        markMobileMode();
        improveTouchScrolling();
      });
    } else if (mq.addListener) {
      mq.addListener(() => {
        markMobileMode();
        improveTouchScrolling();
      });
    }

    // Some modules render panels after login/tab switch. Refresh touch hints quietly.
    window.setTimeout(improveTouchScrolling, 500);
    window.setTimeout(improveTouchScrolling, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
