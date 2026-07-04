// BELLONA Refactor v1.2 Performance Pass
// Safe overrides only: reduce unnecessary DOM work, debounce filters, cache sidebar render.
// UI/Function target: same as v1.1 / Production reference.

(function bellonaPerformancePass(){
    const PERF = window.BELLONA_PERF = {
        version: 'v1.2-performance-pass',
        waitingListSignature: '',
        waitingListHtml: '',
        filterTimer: null,
        renderTimer: null,
        lastRenderReason: ''
    };

    function activeTabSafe() {
        try { return (typeof getCurrentActiveTab === 'function') ? getCurrentActiveTab() : 'dashboard'; }
        catch (_) { return 'dashboard'; }
    }

    function shouldRenderSidebar(tab) {
        return tab === 'party' || tab === 'members';
    }

    function makeWaitingSignature(list) {
        const keyword = (safeEl('search-name')?.value || '').trim().toLowerCase();
        const job = safeEl('search-job-dropdown')?.value || 'all';
        const active = activeTabSafe();
        const role = (typeof userRole !== 'undefined') ? userRole : 'guest';
        const plan = (typeof currentPartyPlan !== 'undefined') ? currentPartyPlan : 'guild';
        const selected = String(typeof selectedPlayerId !== 'undefined' ? selectedPlayerId : '');
        const playerState = list.map(p => {
            const st = (typeof getSidebarPlayerState === 'function') ? getSidebarPlayerState(p) : { text: '', locked: false };
            const pst = (active === 'party' && typeof getPlayerPlanState === 'function') ? getPlayerPlanState(p, plan) : { partyId: p.partyId, slotIndex: p.slotIndex };
            return [p.id, p.uid, p.name, p.job, p.status, pst.partyId ?? '', pst.slotIndex ?? '', st.text, st.locked ? 1 : 0].join(':');
        }).join('|');
        return [active, role, plan, selected, keyword, job, playerState].join('@@');
    }

    const originalRenderWaitingList = window.renderWaitingList || (typeof renderWaitingList === 'function' ? renderWaitingList : null);
    window.renderWaitingList = renderWaitingList = function renderWaitingListOptimized() {
        const container = safeEl('waiting-list');
        if (!container) return;
        const active = activeTabSafe();
        if (!shouldRenderSidebar(active)) {
            if (typeof renderHeaderCounts === 'function') renderHeaderCounts();
            return;
        }

        const list = (typeof getFilteredWaitingPlayers === 'function') ? getFilteredWaitingPlayers() : [];
        const signature = makeWaitingSignature(list);
        if (PERF.waitingListSignature === signature && container.innerHTML === PERF.waitingListHtml) {
            if (typeof renderHeaderCounts === 'function') renderHeaderCounts();
            return;
        }

        let html = '';
        if (list.length === 0) {
            html = '<div class="text-xs text-gray-500 text-center py-4">ไม่พบรายชื่อที่ตรงกับตัวกรอง</div>';
        } else {
            html = list.map(p => {
                const st = getSidebarPlayerState(p);
                const selected = String(selectedPlayerId) === String(p.id);
                const draggable = checkAdminAccess() && !st.locked;
                const icon = getJobIcon(p.job).replace('<img ', '<img loading="lazy" decoding="async" ');
                return `<div class="flex items-center gap-3 border p-2.5 rounded-lg ${st.cls} ${selected ? 'ring-1 ring-[#d4af37]' : ''} ${st.locked ? 'cursor-not-allowed' : 'cursor-pointer hover:border-[#d4af37]/50'}"
                     onclick="selectPlayer('${escapeInlineJs(p.id)}')"
                     draggable="${draggable ? 'true' : 'false'}"
                     data-id="${escapeHtml(p.id)}"
                     ondragstart="handlePlayerDragStart(event, '${escapeInlineJs(p.id)}')">
                    ${icon}
                    <div class="min-w-0 flex-1">
                        <div class="text-sm font-bold text-white truncate">${escapeHtml(p.name)} <span class="text-xs text-gray-500 font-normal">(${escapeHtml(p.job)})</span></div>
                        <div class="text-[10px] font-black ${st.locked ? '' : 'text-green-400'}">${st.text}${p.uid ? ' · UID ' + escapeHtml(p.uid) : ''}</div>
                    </div>
                </div>`;
            }).join('');
        }
        container.innerHTML = html;
        PERF.waitingListSignature = signature;
        PERF.waitingListHtml = html;
        if (typeof renderHeaderCounts === 'function') renderHeaderCounts();
    };

    window.invalidateWaitingListCache = function invalidateWaitingListCache(){
        PERF.waitingListSignature = '';
        PERF.waitingListHtml = '';
    };

    const originalFilterPlayers = window.filterPlayers || (typeof filterPlayers === 'function' ? filterPlayers : null);
    window.filterPlayers = filterPlayers = function filterPlayersDebounced() {
        if (PERF.filterTimer) clearTimeout(PERF.filterTimer);
        PERF.filterTimer = setTimeout(() => {
            PERF.filterTimer = null;
            window.invalidateWaitingListCache?.();
            window.renderWaitingList?.();
            const tab = activeTabSafe();
            if (tab === 'members' && typeof renderMemberManagerTab === 'function') renderMemberManagerTab();
            if (tab === 'rewards' && typeof renderRewardsTab === 'function') renderRewardsTab();
        }, 120);
    };

    window.scheduleRenderAll = scheduleRenderAll = function scheduleRenderAllOptimized(reason = '', delay = 120) {
        PERF.lastRenderReason = reason;
        if (PERF.renderTimer) clearTimeout(PERF.renderTimer);
        const run = () => {
            PERF.renderTimer = null;
            if (window.invalidateWaitingListCache) window.invalidateWaitingListCache();
            window.renderAll?.();
        };
        PERF.renderTimer = setTimeout(() => {
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
            else run();
        }, Math.max(60, delay));
    };

    window.renderAll = renderAll = function renderAllOptimized() {
        const activeTab = activeTabSafe();

        if (typeof updateAttendanceRoundDisplay === 'function') updateAttendanceRoundDisplay();
        if (shouldRenderSidebar(activeTab) && typeof populateDynamicJobSelectors === 'function') populateDynamicJobSelectors();
        if (typeof renderHeaderCounts === 'function') renderHeaderCounts();
        if (shouldRenderSidebar(activeTab)) window.renderWaitingList?.();

        if (activeTab === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
        if (activeTab === 'members' && typeof renderMemberManagerTab === 'function') renderMemberManagerTab();
        if (activeTab === 'party' && typeof renderParties === 'function') renderParties();
        if (activeTab === 'rewards' && typeof renderRewardsTab === 'function') renderRewardsTab();
        if (activeTab === 'auction' && typeof renderRewardQueueTab === 'function') renderRewardQueueTab();
        if (activeTab === 'queuecheck' && typeof renderRewardQueueCheckTab === 'function') renderRewardQueueCheckTab();
        if (activeTab === 'stats' && typeof renderStatsTab === 'function') renderStatsTab();
        if (activeTab === 'tactical') {
            if (typeof renderMarkers === 'function') renderMarkers();
            if (typeof renderMarkersSettingList === 'function') renderMarkersSettingList();
        }
        if (typeof applyRolePermissions === 'function') applyRolePermissions();
    };

    const originalSwitchTab = window.switchTab || (typeof switchTab === 'function' ? switchTab : null);
    if (originalSwitchTab) {
        window.switchTab = switchTab = function switchTabOptimized(t) {
            window.invalidateWaitingListCache?.();
            return originalSwitchTab(t);
        };
    }

    console.info('BELLONA Performance Pass loaded:', PERF.version);
})();
