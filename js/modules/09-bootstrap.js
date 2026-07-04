// BELLONA Refactor v1.1 modular split
// Module: 09-bootstrap.js
// Scope: Render bootstrap and global startup code
// Source: js/bellona-app.js lines 3320-3356


function getCurrentActiveTab() {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn && activeBtn.id) return activeBtn.id.replace('tab-btn-', '');
    const visible = ['dashboard','members','party','tactical','auction','queuecheck','rewards','stats'].find(tab => !safeEl(`tab-content-${tab}`)?.classList.contains('hidden'));
    return visible || 'dashboard';
}

function scheduleRenderAll(reason = '', delay = 150) {
    if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
        renderDebounceTimer = null;
        renderAll();
    }, delay);
}

function renderAll() {
    updateAttendanceRoundDisplay();
    populateDynamicJobSelectors();
    renderHeaderCounts();
    renderWaitingList();

    const activeTab = getCurrentActiveTab();
    if (activeTab === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
    if (activeTab === 'members') renderMemberManagerTab();
    if (activeTab === 'party') renderParties();
    if (activeTab === 'rewards') renderRewardsTab();
    if (activeTab === 'auction') renderRewardQueueTab();
    if (activeTab === 'queuecheck') renderRewardQueueCheckTab();
    if (activeTab === 'stats') renderStatsTab();
    if (activeTab === 'tactical') {
        renderMarkers();
        renderMarkersSettingList();
    }

    applyRolePermissions();
}
