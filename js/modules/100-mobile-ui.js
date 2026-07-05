/* BELLONA Mobile UI v2.6.2
   Safe add-on only. Does not change production logic or Firebase data. */
(function () {
    'use strict';

    const MOBILE_QUERY = '(max-width: 1023px)';
    const mq = window.matchMedia(MOBILE_QUERY);

    function isMobile() {
        return mq.matches;
    }

    function getHeaderActionGroup() {
        const header = document.querySelector('header');
        if (!header) return null;
        return header.querySelector(':scope > div:last-child');
    }

    function ensureMobileActionToggle() {
        const header = document.querySelector('header');
        const headLeft = header && header.querySelector(':scope > div:first-child');
        const actions = getHeaderActionGroup();
        if (!header || !headLeft || !actions) return;

        let btn = document.getElementById('bellona-mobile-action-toggle');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'bellona-mobile-action-toggle';
            btn.type = 'button';
            btn.className = 'bellona-mobile-action-toggle';
            btn.setAttribute('aria-label', 'เปิดเมนูเครื่องมือ');
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
            headLeft.appendChild(btn);
            btn.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                const open = !document.body.classList.contains('bellona-mobile-actions-open');
                document.body.classList.toggle('bellona-mobile-actions-open', open);
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                btn.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
            });
        }
    }

    function closeMobileActions() {
        const btn = document.getElementById('bellona-mobile-action-toggle');
        document.body.classList.remove('bellona-mobile-actions-open');
        if (btn) {
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        }
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

    function closeActionsOnOutsideClick(event) {
        if (!isMobile() || !document.body.classList.contains('bellona-mobile-actions-open')) return;
        const inHeader = event.target.closest && event.target.closest('header');
        if (!inHeader) closeMobileActions();
    }

    function closeActionsOnActionClick(event) {
        if (!isMobile()) return;
        const actionButton = event.target.closest && event.target.closest('header > div:last-child button');
        if (!actionButton) return;
        window.setTimeout(closeMobileActions, 80);
    }

    function markMobileMode() {
        const mobile = isMobile();
        document.documentElement.classList.toggle('bellona-mobile-mode', mobile);
        if (mobile) ensureMobileActionToggle();
        else closeMobileActions();
    }

    function improveTouchScrolling() {
        if (!isMobile()) return;
        const scrollTargets = [
            '#waiting-list',
            '#main-left-menu',
            '#tab-content-stats',
            '#tab-content-rewards',
            '#tab-content-auction',
            '#tab-content-queuecheck',
            '#dash-job-ranking',
            '.dash-v21-job-chart',
            '.overflow-x-auto'
        ];
        scrollTargets.forEach((selector) => {
            document.querySelectorAll(selector).forEach((el) => {
                el.style.webkitOverflowScrolling = 'touch';
            });
        });
    }

    function init() {
        markMobileMode();
        improveTouchScrolling();
        document.addEventListener('click', closeBottomNavAfterTabClick, { passive: true });
        document.addEventListener('click', closeActionsOnOutsideClick, { passive: true });
        document.addEventListener('click', closeActionsOnActionClick, { passive: true });
        window.addEventListener('orientationchange', () => window.setTimeout(improveTouchScrolling, 250), { passive: true });
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
