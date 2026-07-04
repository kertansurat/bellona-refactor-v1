// BELLONA Refactor v1.1 modular split
// Module: 04-party.js
// Scope: Party grid, drag/drop assignment, release, auto assign, clear party
// Source: js/bellona-app.js lines 1356-1573

function initPartiesGrid() {
    const pGrid = safeEl('parties-grid');
    if (pGrid) { pGrid.innerHTML = ''; for (let i=1; i<=8; i++) pGrid.appendChild(createPartyCardHTML(i, `party-${i}`, 'PARTY')); }
    const sGrid = safeEl('sub-parties-grid');
    if (sGrid) { sGrid.innerHTML = ''; for (let i=1; i<=8; i++) sGrid.appendChild(createPartyCardHTML(i, `subparty-${i}`, 'SUB-PARTY')); }
}

function createPartyCardHTML(index, partyId, prefix) {
    const card = document.createElement('div');
    const isSub = String(partyId).startsWith('subparty');
    card.className = `glass-panel bg-[#0c0e14] rounded-lg p-2.5 space-y-1.5 text-[11px] ${isSub ? 'party-card-sub' : 'party-card-main'}`;
    let slots = '';
    for (let slotIndex=0; slotIndex<5; slotIndex++) {
        slots += `<div class="party-slot bg-[#121620] px-2.5 py-2 rounded-md border border-[#1f2838] min-h-[48px] flex items-center cursor-pointer hover:border-[#d4af37]/50"
            onclick="handleSlotClick('${partyId}', ${slotIndex})"
            ondragover="handleSlotDragOver(event)"
            ondrop="handleSlotDrop(event, '${partyId}', ${slotIndex})">
            <div class="w-full min-w-0" id="slot-${partyId}-${slotIndex}-content"><span class="party-slot-empty text-gray-600 text-[11px]">ว่างเปล่า</span></div>
        </div>`;
    }
    const titleClass = isSub ? 'party-title-sub' : 'party-title-main';
    const label = isSub ? `SUB ${index}` : `MAIN ${index}`;
    card.innerHTML = `<div class="flex justify-between items-start gap-2 pb-1.5 border-b border-[#1f2838]">
        <span class="${titleClass} font-extrabold">${label}</span>
        <div class="party-power-summary">
            <span id="${partyId}-counter" class="party-count-pill party-partial"><i class="fa-solid fa-users"></i> 0/5</span>
            <span id="${partyId}-power" class="party-power-pill"><i class="fa-solid fa-bolt"></i> -</span>
        </div>
    </div><div class="slots space-y-1.5">${slots}</div>`;
    return card;
}

function handlePlayerDragStart(event, playerId) {
    if (!checkAdminAccess()) { event.preventDefault(); return; }
    const p = players.find(x => String(x.id) === String(playerId));
    if (!p || getSidebarPlayerState(p).locked) { event.preventDefault(); return; }
    event.dataTransfer.setData('text/plain', String(playerId));
}
function handleSlotDragOver(event) { event.preventDefault(); }
function handleSlotDrop(event, partyId, slotIndex) {
    event.preventDefault();
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const playerId = event.dataTransfer.getData('text/plain');
    assignPlayerToSlot(playerId, partyId, slotIndex);
}
function handleSlotClick(partyId, slotIndex) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    if (!selectedPlayerId) return alert('กรุณาเลือกสมาชิกก่อน');
    assignPlayerToSlot(selectedPlayerId, partyId, slotIndex);
    selectedPlayerId = null;
}
async function assignPlayerToSlot(playerId, partyId, slotIndex) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const p = players.find(x => String(x.id) === String(playerId));
    if (!p) return;
    if (p.status === 'ลา' || p.status === 'ขาด') return alert('สมาชิกที่ลา/ขาดวอร์ ไม่สามารถจัดเข้าปาร์ตี้ได้');

    const activePlan = normalizePartyPlanKey(currentPartyPlan);
    const occupant = players.find(x => {
        if (String(x.id) === String(playerId)) return false;
        const st = getPlayerPlanState(x, activePlan);
        return st.partyId === partyId && Number(st.slotIndex) === Number(slotIndex);
    });

    if (occupant) setPlayerPlanState(occupant, activePlan, null, null);
    setPlayerPlanState(p, activePlan, partyId, slotIndex);

    saveToLocalStorage();
    isLocalPartyMutationInProgress = true;
    try {
        const changedIds = [p.id];
        if (occupant) changedIds.push(occupant.id);
        if (typeof saveSpecificPlayersToFirebaseSafe === 'function') await saveSpecificPlayersToFirebaseSafe(changedIds, false);
    } finally {
        isLocalPartyMutationInProgress = false;
    }
    forceRenderPartyAndCurrentTab();
}


function hardClearPartySlotsDom() {
    document.querySelectorAll('[id^="slot-"][id$="-content"]').forEach(slot => {
        slot.innerHTML = '<span class="party-slot-empty text-gray-600 text-[11px]">ว่างเปล่า</span>';
    });
    for (let i = 1; i <= 8; i++) {
        const mainId = `party-${i}`;
        const subId = `subparty-${i}`;
        updatePartySummaryDisplay(mainId, 0, 0);
        updatePartySummaryDisplay(subId, 0, 0);
    }
    renderHeaderCounts();
}

function forceRenderPartyAndCurrentTab() {
    hardClearPartySlotsDom();
    renderParties();
    renderWaitingList();
    const activeTab = getCurrentActiveTab();
    if (activeTab === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
    if (activeTab === 'members') renderMemberManagerTab();
    if (activeTab === 'rewards') renderRewardsTab();
    if (activeTab === 'auction') renderRewardQueueTab();
    if (activeTab === 'queuecheck') renderRewardQueueCheckTab();
    if (activeTab === 'stats') renderStatsTab();
    applyRolePermissions();
}


function updatePartySummaryDisplay(partyId, count, totalPower) {
    const counterEl = safeEl(`${partyId}-counter`);
    const powerEl = safeEl(`${partyId}-power`);
    if (counterEl) {
        counterEl.innerHTML = `<i class="fa-solid fa-users"></i> ${count}/5`;
        counterEl.classList.toggle('party-full', Number(count) >= 5);
        counterEl.classList.toggle('party-partial', Number(count) < 5);
    }
    if (powerEl) {
        powerEl.innerHTML = `<i class="fa-solid fa-bolt"></i> ${formatCompactPower(totalPower)}`;
        powerEl.title = `Power รวม: ${formatCompactPower(totalPower)}`;
    }
}

function renderParties() {
    updatePartyPlanUI();
    document.querySelectorAll('[id^="slot-"][id$="-content"]').forEach(slot => {
        slot.innerHTML = '<span class="party-slot-empty text-gray-600 text-[11px]">ว่างเปล่า</span>';
    });
    const counters = {};
    const powerTotals = {};
    const activePlan = normalizePartyPlanKey(currentPartyPlan);
    const assigned = players.filter(p => {
        const st = getPlayerPlanState(p, activePlan);
        return st.partyId !== null && st.partyId !== undefined;
    });
    assigned.forEach(p => {
        const st = getPlayerPlanState(p, activePlan);
        const slot = safeEl(`slot-${st.partyId}-${st.slotIndex}-content`);
        if (!slot) return;
        counters[st.partyId] = (counters[st.partyId] || 0) + 1;
        powerTotals[st.partyId] = (powerTotals[st.partyId] || 0) + getPlayerPowerValue(p);
        slot.innerHTML = `<div class="party-player-row">
            <div class="party-player-info">${getJobIcon(p.job)}<div class="party-player-name text-white font-extrabold text-[15px] truncate">${escapeHtml(p.name)}</div></div>
            <button onclick="event.stopPropagation(); releasePlayer('${escapeInlineJs(p.id)}')" class="party-remove-btn admin-only text-red-400 text-lg px-1 shrink-0">✕</button>
        </div>`;
    });
    for (let i=1; i<=8; i++) {
        const mainId = `party-${i}`;
        const subId = `subparty-${i}`;
        updatePartySummaryDisplay(mainId, counters[mainId] || 0, powerTotals[mainId] || 0);
        updatePartySummaryDisplay(subId, counters[subId] || 0, powerTotals[subId] || 0);
    }
    renderHeaderCounts();
}

async function releasePlayer(id) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const p = players.find(pl => String(pl.id) === String(id));
    if (!p) return;
    setPlayerPlanState(p, currentPartyPlan, null, null);
    saveToLocalStorage();
    isLocalPartyMutationInProgress = true;
    try {
        if (typeof saveSinglePlayerToFirebaseSafe === 'function') await saveSinglePlayerToFirebaseSafe(p.id, false);
    } finally {
        isLocalPartyMutationInProgress = false;
    }
    forceRenderPartyAndCurrentTab();
}

async function autoAssign() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    players.forEach(p => { p.partyId = null; p.slotIndex = null; });
    let partyIdx = 1;
    let slotIdx = 0;
    players.filter(p => p.status === 'มา').forEach(p => {
        const isSub = partyIdx > 8;
        const visualIndex = isSub ? partyIdx - 8 : partyIdx;
        if (visualIndex > 8) return;
        p.partyId = `${isSub ? 'subparty' : 'party'}-${visualIndex}`;
        p.slotIndex = slotIdx;
        slotIdx++;
        if (slotIdx >= 5) { slotIdx = 0; partyIdx++; }
    });
    saveToLocalStorage();
    isLocalPartyMutationInProgress = true;
    try {
        if (typeof window.savePlayersToFirebaseSafe === 'function') await window.savePlayersToFirebaseSafe(false);
    } finally {
        isLocalPartyMutationInProgress = false;
    }
    forceRenderPartyAndCurrentTab();
}

async function triggerClearPartiesConfirmation() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const activePlan = normalizePartyPlanKey(currentPartyPlan);
    const changedIds = [];
    players.forEach(p => {
        const st = getPlayerPlanState(p, activePlan);
        if (st.partyId !== null && st.partyId !== undefined) changedIds.push(p.id);
        setPlayerPlanState(p, activePlan, null, null);
    });
    saveToLocalStorage();
    hardClearPartySlotsDom();
    isLocalPartyMutationInProgress = true;
    try {
        if (changedIds.length && typeof saveSpecificPlayersToFirebaseSafe === 'function') {
            await saveSpecificPlayersToFirebaseSafe(changedIds, false);
        } else if (typeof window.savePlayersToFirebaseSafe === 'function') {
            await window.savePlayersToFirebaseSafe(false);
        }
    } finally {
        isLocalPartyMutationInProgress = false;
    }
    forceRenderPartyAndCurrentTab();
    logActivity('CLEAR PARTY PLAN', `ล้างตำแหน่งปาร์ตี้เฉพาะแผน ${getActivePartyPlanLabel()}`);
}

