/* BELLONA Mobile UI v2.6
   Safe add-on only. Does not change production logic or Firebase data. */
(function () {
    'use strict';

    const MOBILE_QUERY = '(max-width: 768px)';
    const mq = window.matchMedia(MOBILE_QUERY);

    function isMobile() {
        return mq.matches;
    }

    function closeBottomNavAfterTabClick(event) {
        if (!isMobile()) return;
        const target = event.target.closest && event.target.closest('#main-left-menu .tab-btn');
        if (!target) return;
        // Keep native switchTab behavior, only normalize scroll after tab switch.
        window.requestAnimationFrame(() => {
            const content = document.querySelector('main > section.flex-grow, main > section:last-child');
            if (content && typeof content.scrollTo === 'function') {
                content.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }
        });
    }

    function markMobileMode() {
        document.documentElement.classList.toggle('bellona-mobile-mode', isMobile());
    }

    function improveTouchScrolling() {
        if (!isMobile()) return;
        const scrollTargets = [
            '#waiting-list',
            '#main-left-menu',
            '#tab-content-stats',
            '#tab-content-rewards',
            '#tab-content-auction',
            '#tab-content-queuecheck'
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
