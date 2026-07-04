// BELLONA Refactor v1.1 modular split
// Module: 07-reward-queue.js
// Scope: Reward queue admin/member/check/report/Firebase sync
// Source: js/bellona-app.js lines 2207-3033

function rewardQueueTypes() { return Object.keys(rewardQueueSettings || {}); }
function mergeRewardQueueSettings(saved) {
    const base = JSON.parse(JSON.stringify(rewardQueueSettings));
    Object.keys(base).forEach(k => { if (saved && saved[k]) base[k] = { ...base[k], ...saved[k] }; });
    return base;
}
function rewardQueuePageAmount(cfg) {
    const amount = Number(cfg?.amount);
    const limit = Math.max(1, Number(cfg?.limitPerPerson || 1));
    if (Number.isFinite(amount) && amount >= 0) return Math.ceil(Math.floor(amount) / limit);
    const start = Math.max(1, Number(cfg?.startPage || 1));
    const end = Math.max(start, Number(cfg?.endPage || start));
    const fallbackItems = cfg?.mode === 'page' ? (end - start + 1) : (end - start + 1) * Number(cfg?.perPage || 4);
    return Math.ceil(fallbackItems / limit);
}
function ensureRewardQueues() {
    const activeIds = players.map(p => String(p.id));
    rewardQueueTypes().forEach(type => {
        let q = Array.isArray(rewardQueues[type]) ? rewardQueues[type].map(String) : [];
        q = q.filter(id => activeIds.includes(id));
        activeIds.forEach(id => { if (!q.includes(id)) q.push(id); });
        rewardQueues[type] = q;
    });
}
function getRewardQueuePlayer(id) { return players.find(p => String(p.id) === String(id)); }
function rewardQueueSnapshot() { return JSON.stringify({ rewardQueueSettings, rewardQueues, rewardQueueAssignments, rewardQueueHistory, rewardQueueRoundActive, rewardQueueRoundItems, rewardQueueRoundPenalties }); }
function pushRewardQueueUndo(label) {
    rewardQueueUndoStack.push({ label, state: rewardQueueSnapshot() });
    rewardQueueUndoStack = rewardQueueUndoStack.slice(-20);
}
function markRewardQueueDirty() { rewardQueueDirty = true; }
function undoRewardQueueLastAction() {
    const last = rewardQueueUndoStack.pop();
    if (!last) return alert('ยังไม่มีรายการให้ Undo');
    const data = JSON.parse(last.state);
    rewardQueueSettings = mergeRewardQueueSettings(data.rewardQueueSettings || {});
    rewardQueues = data.rewardQueues || rewardQueues;
    rewardQueueAssignments = data.rewardQueueAssignments || {};
    rewardQueueHistory = Array.isArray(data.rewardQueueHistory) ? data.rewardQueueHistory : [];
    rewardQueueRoundActive = data.rewardQueueRoundActive && typeof data.rewardQueueRoundActive === 'object' ? data.rewardQueueRoundActive : rewardQueueRoundActive;
    rewardQueueRoundItems = data.rewardQueueRoundItems && typeof data.rewardQueueRoundItems === 'object' ? data.rewardQueueRoundItems : rewardQueueRoundItems;
    rewardQueueRoundPenalties = data.rewardQueueRoundPenalties && typeof data.rewardQueueRoundPenalties === 'object' ? data.rewardQueueRoundPenalties : rewardQueueRoundPenalties;
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}
function rewardQueueManualStatus(type, id) {
    return (rewardQueueAssignments[type] || []).find(a => String(a.playerId) === String(id))?.manualStatus || null;
}
function hasRewardQueueHistory(type, id) {
    return (rewardQueueHistory || []).some(h => h.rewardType === type && String(h.playerId) === String(id));
}

function rewardQueueTempIdsByManualStatus(type, status) {
    return (rewardQueueAssignments[type] || [])
        .filter(a => a && a.manualStatus === status)
        .map(a => String(a.playerId));
}
function rewardQueueTempSkippedIds(type) { return rewardQueueTempIdsByManualStatus(type, 'skipped'); }
function rewardQueueTempReceivedIds(type) { return rewardQueueTempIdsByManualStatus(type, 'received'); }

function buildRewardQueueRound(type) {
    const cfg = rewardQueueSettings[type];
    const amount = rewardQueuePageAmount(cfg);
    const q = (rewardQueues[type] || []).map(String);
    const awardIds = [];
    const penaltyIds = [];
    const skippedIds = rewardQueueTempSkippedIds(type);
    const skippedSet = new Set(skippedIds);
    const tempReceivedIds = rewardQueueTempReceivedIds(type);
    const tempReceivedSet = new Set(tempReceivedIds);

    if (!cfg || cfg.enabled === false || amount <= 0) {
        rewardQueueRoundItems[type] = [];
        rewardQueueRoundPenalties[type] = [];
        rewardQueueRoundActive[type] = false;
        return;
    }

    // PFQ Fill Slot Rule:
    // - คนที่ Admin กดข้ามรอบนี้ ไม่กินโควต้า และจะกลับมาอยู่ก่อนกลุ่มรอในรอบถัดไป
    // - คนลา/ขาด ไม่กินโควต้า และโดนย้ายไปหลังกลุ่มรอเมื่อบันทึกรอบ
    // - คนที่กดรับแล้วใน War Queue ปัจจุบัน ยังคงกินโควต้าเดิม ไม่เติมคนแทน
    // - เติมคนสถานะ "มา" จนครบจำนวนรางวัลจริง
    for (const id of q) {
        if (awardIds.length >= amount) break;
        if (hasRewardQueueHistory(type, id)) continue;
        const p = getRewardQueuePlayer(id);
        if (!p) continue;

        if (skippedSet.has(id)) continue;

        if (tempReceivedSet.has(id)) {
            awardIds.push(id);
            continue;
        }

        if (p.status === 'ลา' || p.status === 'ขาด') {
            if (!penaltyIds.includes(id)) penaltyIds.push(id);
            continue;
        }

        if (p.status !== 'มา') continue;
        awardIds.push(id);
    }

    rewardQueueRoundItems[type] = awardIds;
    rewardQueueRoundPenalties[type] = penaltyIds;
    rewardQueueRoundActive[type] = true;
}

function rewardQueueRowFor(type, id, options = {}) {
    const cfg = rewardQueueSettings[type] || {};
    const p = getRewardQueuePlayer(id);
    if (!p) return null;
    const manual = rewardQueueManualStatus(type, id);
    const alreadyReceived = hasRewardQueueHistory(type, id);
    const index = Number(options.index || 0);
    if (alreadyReceived && manual !== 'received') {
        return { playerId: String(id), player: p, status: 'received', manualStatus: 'history', label: 'ได้รับแล้ว' };
    }
    if (manual === 'received') {
        const base = rewardQueueAwardLabel(cfg, index);
        return { playerId: String(id), player: p, status: 'received', manualStatus: 'received', page: base.page, slot: base.slot, label: base.label };
    }
    if (manual === 'skipped') {
        return { playerId: String(id), player: p, status: 'skipped', manualStatus: 'skipped', label: 'ข้ามคิว / รอวอร์รอบถัดไป' };
    }
    if (p.status === 'ลา') return { playerId: String(id), player: p, status: 'leave', label: 'ลาวอร์ / โดนโทษไปท้ายคิว' };
    if (p.status === 'ขาด') return { playerId: String(id), player: p, status: 'absent', label: 'ขาดวอร์ / โดนโทษไปท้ายคิว' };
    const base = rewardQueueAwardLabel(cfg, index);
    return { playerId: String(id), player: p, status: 'today', page: base.page, slot: base.slot, label: base.label };
}

function rewardQueueAwardLabel(cfg, index) {
    const perPage = Math.max(1, Number(cfg?.perPage || 4));
    const limit = Math.max(1, Number(cfg?.limitPerPerson || 1));
    const startPage = Math.max(1, Number(cfg?.startPage || 1));
    if (cfg?.mode === 'page') {
        const page = startPage + Math.floor(index / limit);
        const separatePage = Math.floor(index / limit) + 1;
        return { page, separatePage, label: `All Item หน้า ${page} · หน้าแยก ${separatePage}` };
    }
    const itemNo = Math.floor(index / limit);
    const page = startPage + Math.floor(itemNo / perPage);
    const slot = (itemNo % perPage) + 1;
    return { page, slot, label: `All Item หน้า ${page} · ${cfg?.unit || 'ชิ้น'} ${slot}` };
}

function calculateRewardQueueType(type) {
    const cfg = rewardQueueSettings[type];
    if (!cfg || cfg.enabled === false) { rewardQueueAssignments[type] = []; return; }
    const q = (rewardQueues[type] || []).map(String);
    const active = rewardQueueRoundActive[type] === true;
    const activeIds = new Set((rewardQueueRoundItems[type] || []).map(String));
    const penaltyIds = new Set((rewardQueueRoundPenalties[type] || []).map(String));
    const currentAssignments = rewardQueueAssignments[type] || [];
    const manualMap = new Map(currentAssignments.map(a => [String(a.playerId), a.manualStatus || null]));
    const result = [];
    let waitCount = 0;

    if (active) {
        const roundItems = (rewardQueueRoundItems[type] || []).map(String);
        q.forEach(id => {
            const p = getRewardQueuePlayer(id);
            if (!p) return;
            const manual = manualMap.get(String(id));

            // คนที่ Admin กดข้าม ต้องแสดงสถานะข้าม แต่ไม่กินโควต้าฝั่งซ้าย
            if (manual === 'skipped') {
                result.push({ playerId: String(id), player: p, status: 'skipped', manualStatus: 'skipped', label: 'ข้ามคิว / รอวอร์รอบถัดไป' });
                return;
            }

            if (activeIds.has(String(id))) {
                const roundIndex = roundItems.indexOf(String(id));
                const row = rewardQueueRowFor(type, id, { index: Math.max(0, roundIndex) });
                if (row) result.push(row);
                return;
            }

            if (penaltyIds.has(String(id))) {
                if (p.status === 'ลา') result.push({ playerId: String(id), player: p, status: 'leave', label: 'ลาวอร์ / โดนโทษไปท้ายคิว' });
                else if (p.status === 'ขาด') result.push({ playerId: String(id), player: p, status: 'absent', label: 'ขาดวอร์ / โดนโทษไปท้ายคิว' });
                return;
            }

            if (hasRewardQueueHistory(type, id)) {
                result.push({ playerId: String(id), player: p, status: 'received', manualStatus: 'history', label: 'ได้รับแล้ว' });
                return;
            }

            waitCount++;
            result.push({ playerId: String(id), player: p, status: 'wait', wait: waitCount, label: `อีก ${waitCount} คิว` });
        });
    } else {
        q.forEach(id => {
            const p = getRewardQueuePlayer(id);
            if (!p) return;
            if (hasRewardQueueHistory(type, id)) {
                result.push({ playerId: String(id), player: p, status: 'received', manualStatus: 'history', label: 'ได้รับแล้ว' });
                return;
            }
            waitCount++;
            result.push({ playerId: String(id), player: p, status: 'wait', wait: waitCount, label: `อีก ${waitCount} คิว` });
        });
    }
    rewardQueueAssignments[type] = result;
}

function calculateRewardQueues() { ensureRewardQueues(); rewardQueueTypes().forEach(calculateRewardQueueType); }
function rebuildActiveRewardQueueRound(type) {
    if (rewardQueueRoundActive[type] === true) {
        buildRewardQueueRound(type);
        calculateRewardQueueType(type);
    }
}

function rewardQueueClass(st) { return st === 'today' ? 'today' : st === 'wait' ? 'next' : st === 'received' ? 'done' : (st === 'skipped' || st === 'leave' || st === 'absent' || st === 'unknown') ? 'skip' : ''; }
function rewardQueueBadge(a) {
    const map = { today:['🟡','รอรับ','text-amber-300'], wait:['🟡',a.label,'text-amber-300'], received:['🔵','รับแล้ว','text-cyan-300'], skipped:['🟠','ข้าม','text-orange-300'], leave:['🔴','ลา','text-red-300'], absent:['⚫','ขาด','text-gray-300'], unknown:['⚪','ยังไม่เช็คชื่อ','text-gray-400'] };
    const b = map[a.status] || ['⚪', a.label, 'text-gray-300'];
    return `<span class="${b[2]} font-black text-[11px]">${b[0]} ${b[1]}</span>`;
}
function rewardQueueTodayList(type) { return (rewardQueueAssignments[type] || []).filter(a => a.status === 'today'); }
function rewardQueueCurrentAwardList(type) {
    if (rewardQueueRoundActive[type] !== true) return [];
    const ids = new Set((rewardQueueRoundItems[type] || []).map(String));
    return (rewardQueueAssignments[type] || []).filter(a => ids.has(String(a.playerId)));
}
function rewardQueuePendingList(type) { return []; }
function rewardQueueReceivedList(type) { return []; }
function rewardQueueAdminList(type) {
    return rewardQueueCurrentAwardList(type);
}
function rewardQueueProgress(type) {
    const total = Math.max(1, players.length || 1);
    const unique = new Set((rewardQueueHistory || []).filter(h => h.rewardType === type).map(h => String(h.playerId))).size;
    const done = Math.min(unique, total);
    return { done, total, pct: Math.round((done / total) * 100) };
}
function renderRewardQueueTab() {
    calculateRewardQueues();
    renderRewardQueueAdminBoard();
    renderRewardQueueMemberTabs();
    renderRewardQueueMemberBoard();
    applyRolePermissions();
}
function renderRewardQueueProgressHtml(type) {
    const p = rewardQueueProgress(type);
    return `<div class="mt-1"><div class="rq-progress-wrap"><div class="rq-progress-bar" style="width:${p.pct}%"></div></div><div class="rq-mini-progress mt-1">${p.done} / ${p.total} คน ได้รับแล้ว</div></div>`;
}
function renderRewardQueueAdminBoard() {
    const box = safeEl('reward-queue-admin-board');
    if (!box) return;
    box.innerHTML = rewardQueueTypes().filter(type => rewardQueueSettings[type]?.enabled !== false).map(type => {
        const cfg = rewardQueueSettings[type];
        const list = rewardQueueAdminList(type);
        return `<div class="bg-[#111520] border border-[#1f2838] rounded-2xl p-3 flex flex-col min-h-[310px] max-h-[calc((100vh-290px)/2)]">
            <div class="flex items-center justify-between border-b border-[#1f2838] pb-2 mb-2">
                <div class="min-w-0 flex-1 pr-2">
                    <h3 class="font-black text-[#d4af37] text-sm truncate">${cfg.icon} ${escapeHtml(cfg.name)}</h3>
                    <div class="text-[10px] text-gray-500">${rewardQueuePageAmount(cfg)} ${escapeHtml(cfg.unit)} · หน้า ${Number(cfg.startPage || 1)}-${Number(cfg.endPage || cfg.startPage || 1)}</div>
                    ${renderRewardQueueProgressHtml(type)}
                </div>
                <div class="flex gap-1 shrink-0">
                    <button onclick="markRewardQueueAllReceived('${type}')" class="admin-only bg-green-900/30 text-green-300 border border-green-800/40 px-2 py-1 rounded text-[10px] font-bold">รับแล้วทั้งหมด</button>
                    <button onclick="unmarkRewardQueueAllReceived('${type}')" class="admin-only bg-[#141a24] text-amber-300 border border-amber-900/50 px-2 py-1 rounded text-[10px] font-bold">ยกเลิกทั้งหมด</button>
                    <button onclick="openRewardQueuePreview('${type}')" class="admin-only bg-[#141a24] text-cyan-300 border border-cyan-900/50 px-2 py-1 rounded text-[10px] font-bold">Preview</button>
                    <button onclick="resetRewardQueue('${type}')" class="admin-only bg-red-900/20 text-red-300 border border-red-800/40 px-2 py-1 rounded text-[10px] font-bold">Reset</button>
                </div>
            </div>
            <div class="space-y-1.5 overflow-y-auto pr-1">
                ${list.map(a => `<div class="rq-row ${rewardQueueClass(a.status)} rounded-lg p-2 flex items-center justify-between gap-2" draggable="true" ondragstart="rewardQueueDragStart(event,'${type}','${escapeInlineJs(a.playerId)}')" ondragover="rewardQueueDragOver(event)" ondrop="rewardQueueDropOn(event,'${type}','${escapeInlineJs(a.playerId)}')">
                    <div class="min-w-0">
                        <div class="font-black text-white truncate text-sm">${escapeHtml(a.player.name)}</div>
                        <div class="text-[11px] text-gray-400">${a.status === 'wait' ? escapeHtml(a.label) : a.status === 'received' ? 'ไปท้ายคิวแล้ว' : escapeHtml(a.label)}</div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">${rewardQueueBadge(a)}
                        <button onclick="openRewardQueueAction('${type}','${escapeInlineJs(a.playerId)}')" class="admin-only bg-[#141a24] text-[#d4af37] border border-[#2d374a] w-7 h-7 rounded-lg"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    </div>
                </div>`).join('') || '<div class="text-xs text-gray-500 text-center py-8">ไม่มีรายการ</div>'}
            </div>
        </div>`;
    }).join('');
}
function renderRewardQueueMemberTabs() {
    const box = safeEl('reward-queue-member-tabs');
    if (!box) return;
    const enabledTypes = rewardQueueTypes().filter(type => rewardQueueSettings[type]?.enabled !== false);
    if (!enabledTypes.includes(activeRewardQueueType)) activeRewardQueueType = enabledTypes[0] || 'cardBook';
    box.innerHTML = enabledTypes.map(type => {
        const cfg = rewardQueueSettings[type];
        const cls = activeRewardQueueType === type ? 'rq-active-tab' : 'bg-[#141a24] text-[#d4af37] border border-[#2d374a]';
        return `<button onclick="setActiveRewardQueueType('${type}')" class="${cls} px-3 py-2 rounded-lg text-xs font-black">${cfg.icon} ${escapeHtml(cfg.name)}</button>`;
    }).join('');
}
function renderRewardQueueMemberBoard() {
    const box = safeEl('reward-queue-member-board');
    if (!box) return;
    const cfg = rewardQueueSettings[activeRewardQueueType];
    const rawList = rewardQueueAssignments[activeRewardQueueType] || [];
    const list = [...rawList].sort((a, b) => {
        const ar = a.status === 'received' ? 1 : 0;
        const br = b.status === 'received' ? 1 : 0;
        return ar - br;
    });
    const progress = renderRewardQueueProgressHtml(activeRewardQueueType);
    box.innerHTML = `<div class="bg-[#0c0e14] border border-[#1f2838] rounded-lg p-2 mb-2">${progress}</div>` + list.map((a, i) => `<div class="rq-row ${rewardQueueClass(a.status)} rounded-lg p-2.5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
            <div class="w-7 h-7 rounded-full bg-[#181f2d] border border-[#2a3446] flex items-center justify-center text-[11px] font-black text-gray-300">${i+1}</div>
            <div class="min-w-0">
                <div class="font-black text-white truncate text-sm">${escapeHtml(a.player.name)}</div>
                <div class="text-[11px] text-gray-400 truncate">${a.status === 'today' ? escapeHtml(a.label) : escapeHtml(cfg?.name || '')}</div>
            </div>
        </div>
        <div class="text-right shrink-0 flex items-center gap-1.5">${rewardQueueBadge(a)}<button onclick="openRewardQueueAction('${activeRewardQueueType}','${escapeInlineJs(a.playerId)}')" class="admin-only bg-[#141a24] text-[#d4af37] border border-[#2d374a] w-7 h-7 rounded-lg" title="จัดการคิว"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>
    </div>`).join('');
}
function setActiveRewardQueueType(type) { activeRewardQueueType = type; renderRewardQueueMemberTabs(); renderRewardQueueMemberBoard(); renderRewardQueueCheckTabs(); renderRewardQueueCheckBoard(); }

function renderRewardQueueCheckTab() {
    calculateRewardQueues();
    renderRewardQueueCheckTabs();
    renderRewardQueueCheckBoard();
    applyRolePermissions();
}
function renderRewardQueueCheckTabs() {
    const box = safeEl('reward-queue-check-tabs');
    if (!box) return;
    const enabledTypes = rewardQueueTypes().filter(type => rewardQueueSettings[type]?.enabled !== false);
    if (!enabledTypes.includes(activeRewardQueueType)) activeRewardQueueType = enabledTypes[0] || 'cardBook';
    box.innerHTML = enabledTypes.map(type => {
        const cfg = rewardQueueSettings[type];
        const cls = activeRewardQueueType === type ? 'rq-active-tab' : 'bg-[#141a24] text-[#d4af37] border border-[#2d374a]';
        return `<button onclick="setActiveRewardQueueType('${type}')" class="${cls} px-3 py-2 rounded-lg text-xs font-black">${cfg.icon} ${escapeHtml(cfg.name)}</button>`;
    }).join('');
}
function renderRewardQueueCheckBoard() {
    const box = safeEl('reward-queue-check-board');
    if (!box) return;
    const cfg = rewardQueueSettings[activeRewardQueueType];
    const rawList = rewardQueueAssignments[activeRewardQueueType] || [];
    const list = [...rawList].sort((a, b) => {
        const ar = a.status === 'received' ? 1 : 0;
        const br = b.status === 'received' ? 1 : 0;
        return ar - br;
    });
    box.innerHTML = `<div class="bg-[#0c0e14] border border-[#1f2838] rounded-lg p-3 mb-3">${renderRewardQueueProgressHtml(activeRewardQueueType)}</div>` + list.map((a, i) => `<div class="rq-row ${rewardQueueClass(a.status)} rounded-lg p-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-full bg-[#181f2d] border border-[#2a3446] flex items-center justify-center text-[11px] font-black text-gray-300">${i+1}</div>
            <div class="min-w-0">
                <div class="font-black text-white truncate text-sm">${escapeHtml(a.player.name)}</div>
                <div class="text-[11px] text-gray-400 truncate">${a.status === 'today' ? escapeHtml(a.label) : escapeHtml(cfg?.name || '')}</div>
            </div>
        </div>
        <div class="text-right shrink-0">${rewardQueueBadge(a)}</div>
    </div>`).join('') || '<div class="text-xs text-gray-500 text-center py-8">ไม่มีรายการคิว</div>';
}

function openRewardQueueSettings() {
    const grid = safeEl('reward-queue-settings-grid');
    if (!grid) return;
    grid.innerHTML = rewardQueueTypes().map(type => {
        const cfg = rewardQueueSettings[type];
        return `<div class="bg-[#0c0e14] border border-[#1f2838] rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between gap-3">
                <h4 class="font-black text-[#d4af37]">${cfg.icon} ${escapeHtml(cfg.name)}</h4>
                <label class="flex items-center gap-2 text-xs font-bold text-gray-300"><input id="rq-set-${type}-enabled" type="checkbox" ${cfg.enabled !== false ? 'checked' : ''} class="accent-[#d4af37]"> มี</label>
            </div>
            <div class="grid grid-cols-4 gap-2 text-xs">
                <label><span class="text-gray-400 font-bold block mb-1">จำนวน</span><input id="rq-set-${type}-amount" type="number" value="${Number(cfg.amount || 0)}" class="w-full bg-[#111622] border border-[#2a3446] rounded-lg px-3 py-2"></label>
                <label><span class="text-gray-400 font-bold block mb-1">ลิมิต/คน</span><input id="rq-set-${type}-limit" type="number" value="${Number(cfg.limitPerPerson || 1)}" class="w-full bg-[#111622] border border-[#2a3446] rounded-lg px-3 py-2"></label>
                <label><span class="text-gray-400 font-bold block mb-1">เริ่มหน้า</span><input id="rq-set-${type}-start" type="number" value="${Number(cfg.startPage || 1)}" class="w-full bg-[#111622] border border-[#2a3446] rounded-lg px-3 py-2"></label>
                <label><span class="text-gray-400 font-bold block mb-1">หน้าสิ้นสุด</span><input id="rq-set-${type}-end" type="number" value="${Number(cfg.endPage || cfg.startPage || 1)}" class="w-full bg-[#111622] border border-[#2a3446] rounded-lg px-3 py-2"></label>
            </div>
            <div class="text-[11px] text-gray-500">${cfg.mode === 'page' ? 'ขนนก: แสดงเลขหน้าอย่างเดียว' : 'สมุด/กล่อง: เลข 1-4 รีเซ็ตทุกหน้า'}</div>
        </div>`;
    }).join('');
    safeEl('reward-queue-settings-modal')?.classList.remove('hidden');
    applyRolePermissions();
}
function closeRewardQueueSettings() { safeEl('reward-queue-settings-modal')?.classList.add('hidden'); }
function saveRewardQueueSettings() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    pushRewardQueueUndo('settings');
    rewardQueueTypes().forEach(type => {
        const cfg = rewardQueueSettings[type];
        cfg.enabled = !!safeEl(`rq-set-${type}-enabled`)?.checked;
        cfg.amount = Math.max(0, Number(safeEl(`rq-set-${type}-amount`)?.value || 0));
        cfg.limitPerPerson = Math.max(1, Number(safeEl(`rq-set-${type}-limit`)?.value || 1));
        const start = Math.max(1, Number(safeEl(`rq-set-${type}-start`)?.value || 1));
        const end = Math.max(start, Number(safeEl(`rq-set-${type}-end`)?.value || start));
        cfg.startPage = start;
        cfg.endPage = end;
        cfg.perPage = 4;
        if (cfg.enabled !== false) buildRewardQueueRound(type); else { rewardQueueRoundActive[type] = false; rewardQueueRoundItems[type] = []; rewardQueueRoundPenalties[type] = []; }
    });
    closeRewardQueueSettings();
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}
function openRewardQueueAction(type, playerId) {
    activeRewardQueueAction = { type, playerId: String(playerId) };
    const p = getRewardQueuePlayer(playerId);
    safeEl('reward-queue-action-title').innerText = p ? p.name : 'จัดการคิว';
    safeEl('reward-queue-action-sub').innerText = rewardQueueSettings[type]?.name || '';
    const sel = safeEl('reward-queue-swap-target');
    if (sel) sel.innerHTML = (rewardQueues[type] || []).filter(id => String(id) !== String(playerId)).map(id => `<option value="${escapeHtml(id)}">${escapeHtml(getRewardQueuePlayer(id)?.name || id)}</option>`).join('');
    safeEl('reward-queue-action-modal')?.classList.remove('hidden');
    applyRolePermissions();
}
function closeRewardQueueAction() { safeEl('reward-queue-action-modal')?.classList.add('hidden'); activeRewardQueueAction = null; }
function markRewardQueueReceived() {
    if (!activeRewardQueueAction || !checkAdminAccess()) return;
    pushRewardQueueUndo('received');
    const { type, playerId } = activeRewardQueueAction;
    rewardQueueAssignments[type] = (rewardQueueAssignments[type] || []).map(a => String(a.playerId) === String(playerId) ? { ...a, manualStatus: 'received', status: 'received', label: a.label || 'ได้รับแล้ว' } : a);
    closeRewardQueueAction();
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}
function undoRewardQueueReceivedForPlayer() {
    if (!activeRewardQueueAction || !checkAdminAccess()) return;
    pushRewardQueueUndo('undo received');
    const { type, playerId } = activeRewardQueueAction;
    rewardQueueAssignments[type] = (rewardQueueAssignments[type] || []).map(a => String(a.playerId) === String(playerId) ? { ...a, manualStatus: null } : a);
    closeRewardQueueAction();
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}
function skipRewardQueuePlayer() {
    if (!activeRewardQueueAction || !checkAdminAccess()) return;
    pushRewardQueueUndo('skip');
    const { type, playerId } = activeRewardQueueAction;
    const existing = rewardQueueAssignments[type] || [];
    const exists = existing.some(a => String(a.playerId) === String(playerId));
    rewardQueueAssignments[type] = exists
        ? existing.map(a => String(a.playerId) === String(playerId) ? { ...a, manualStatus: 'skipped', status: 'skipped', label: 'ข้ามคิว / รอวอร์รอบถัดไป' } : a)
        : [...existing, { playerId: String(playerId), player: getRewardQueuePlayer(playerId), manualStatus: 'skipped', status: 'skipped', label: 'ข้ามคิว / รอวอร์รอบถัดไป' }];
    rebuildActiveRewardQueueRound(type);
    closeRewardQueueAction();
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}
function moveRewardQueue(delta) {
    if (!activeRewardQueueAction || !checkAdminAccess()) return;
    pushRewardQueueUndo('move');
    const { type, playerId } = activeRewardQueueAction;
    const q = rewardQueues[type] || [];
    const i = q.indexOf(playerId), j = i + delta;
    if (i >= 0 && j >= 0 && j < q.length) [q[i], q[j]] = [q[j], q[i]];
    rebuildActiveRewardQueueRound(type);
    closeRewardQueueAction();
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}
function swapRewardQueue() {
    if (!activeRewardQueueAction || !checkAdminAccess()) return;
    pushRewardQueueUndo('swap');
    const target = safeEl('reward-queue-swap-target')?.value;
    const { type, playerId } = activeRewardQueueAction;
    const q = rewardQueues[type] || [];
    const a = q.indexOf(playerId), b = q.indexOf(target);
    if (a >= 0 && b >= 0) [q[a], q[b]] = [q[b], q[a]];
    rebuildActiveRewardQueueRound(type);
    closeRewardQueueAction();
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}
function rewardQueueDragStart(e, type, playerId) { rewardQueueDragData = { type, playerId: String(playerId) }; e.currentTarget.classList.add('rq-dragging'); }
function rewardQueueDragOver(e) { e.preventDefault(); }
function rewardQueueDropOn(e, type, targetId) {
    e.preventDefault();
    if (!rewardQueueDragData || rewardQueueDragData.type !== type || rewardQueueDragData.playerId === String(targetId)) return;
    pushRewardQueueUndo('drag');
    const q = rewardQueues[type] || [];
    const from = q.indexOf(rewardQueueDragData.playerId), to = q.indexOf(String(targetId));
    if (from >= 0 && to >= 0) { const [m] = q.splice(from, 1); q.splice(to, 0, m); }
    rebuildActiveRewardQueueRound(type);
    rewardQueueDragData = null;
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}

function markRewardQueueAllReceived(type) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    pushRewardQueueUndo('mark all received ' + type);
    calculateRewardQueueType(type);
    const currentIds = rewardQueueCurrentAwardList(type).filter(a => a.status === 'today').map(a => String(a.playerId));
    if (!currentIds.length) return alert('ไม่มีรายชื่อรอรับในรางวัลนี้');
    const currentSet = new Set(currentIds);
    rewardQueueAssignments[type] = (rewardQueueAssignments[type] || []).map(a => currentSet.has(String(a.playerId)) ? { ...a, manualStatus: 'received', status: 'received', label: a.label || 'ได้รับแล้ว' } : a);
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}
function unmarkRewardQueueAllReceived(type) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    pushRewardQueueUndo('unmark all received ' + type);
    rewardQueueAssignments[type] = (rewardQueueAssignments[type] || []).map(a => a.manualStatus === 'received' ? { ...a, manualStatus: null } : a);
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}

function rewardQueueCommitPlan(type) {
    calculateRewardQueueType(type);
    const q = (rewardQueues[type] || []).map(String);
    const assignments = rewardQueueAssignments[type] || [];
    const byId = new Map(assignments.map(a => [String(a.playerId), a]));
    const roundIds = new Set((rewardQueueRoundItems[type] || []).map(String));
    const penaltyIds = (rewardQueueRoundPenalties[type] || []).map(String);

    const awardedIds = [];
    const skippedIds = [];
    const unresolvedRows = [];

    // รับแล้วต้องเรียงตามลำดับที่ Admin กดรับ/สถานะที่ถูกบันทึกใน assignments
    assignments.forEach(a => {
        const id = String(a.playerId);
        if (a.manualStatus === 'received' || (roundIds.has(id) && a.status === 'received')) {
            if (!awardedIds.includes(id)) awardedIds.push(id);
        }
        if (a.manualStatus === 'skipped' || a.status === 'skipped') {
            if (!skippedIds.includes(id)) skippedIds.push(id);
        }
    });

    (rewardQueueRoundItems[type] || []).map(String).forEach(id => {
        const a = byId.get(id);
        if (!a) return;
        if (a.manualStatus === 'received' || a.status === 'received') return;
        if (a.manualStatus === 'skipped' || a.status === 'skipped') return;
        unresolvedRows.push(a);
    });

    const awardedSet = new Set(awardedIds);
    const skippedSet = new Set(skippedIds);
    const penaltySet = new Set(penaltyIds);
    const oldReceivedIds = q.filter(id => hasRewardQueueHistory(type, id) && !awardedSet.has(id));
    const oldReceivedSet = new Set(oldReceivedIds);
    const unpaidIds = q.filter(id => !awardedSet.has(id) && !skippedSet.has(id) && !penaltySet.has(id) && !oldReceivedSet.has(id));

    // PFQ final order:
    // 1) Skip รอบนี้: ได้คิวก่อนกลุ่มรอในวอร์ถัดไป
    // 2) กลุ่มยังไม่ได้รับ
    // 3) ลา/ขาด: โดนโทษไปหลังกลุ่มรอ
    // 4) กลุ่มรับแล้วเดิม
    // 5) กลุ่มรับแล้วรอบนี้ ตามลำดับที่กดรับ
    const nextQueue = [...skippedIds, ...unpaidIds, ...penaltyIds, ...oldReceivedIds, ...awardedIds];
    return { awardedIds, skippedIds, penaltyIds, unresolvedRows, nextQueue, assignments };
}

function rewardQueuePreviewAfter(types) {
    const out = {};
    types.forEach(type => { out[type] = rewardQueueCommitPlan(type).nextQueue; });
    return out;
}
function openRewardQueuePreview(type = null) {
    calculateRewardQueues();
    const types = type ? [type] : rewardQueueTypes().filter(t => rewardQueueSettings[t]?.enabled !== false);
    const preview = rewardQueuePreviewAfter(types);
    const body = safeEl('reward-queue-preview-body');
    if (body) body.innerHTML = types.map(t => {
        const cfg = rewardQueueSettings[t];
        return `<div class="bg-[#0c0e14] border border-[#1f2838] rounded-xl p-4">
            <h4 class="font-black text-[#d4af37] mb-3">${cfg.icon} ${escapeHtml(cfg.name)}</h4>
            <div class="grid grid-cols-2 gap-3 text-xs">
                <div><div class="text-gray-400 font-bold mb-2">ก่อน</div>${(rewardQueues[t] || []).slice(0,10).map((id,i)=>`<div class="py-1 border-b border-[#1f2838]">${i+1}. ${escapeHtml(getRewardQueuePlayer(id)?.name || id)}</div>`).join('')}</div>
                <div><div class="text-gray-400 font-bold mb-2">หลัง</div>${(preview[t] || []).slice(0,10).map((id,i)=>`<div class="py-1 border-b border-[#1f2838]">${i+1}. ${escapeHtml(getRewardQueuePlayer(id)?.name || id)}</div>`).join('')}</div>
            </div>
        </div>`;
    }).join('');
    safeEl('reward-queue-preview-modal')?.classList.remove('hidden');
}
function closeRewardQueuePreview() { safeEl('reward-queue-preview-modal')?.classList.add('hidden'); }
function saveRewardQueueTodayRound() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    calculateRewardQueues();
    const enabledTypes = rewardQueueTypes().filter(type => rewardQueueSettings[type]?.enabled !== false);
    const plans = {};
    const unresolved = [];
    enabledTypes.forEach(type => {
        const plan = rewardQueueCommitPlan(type);
        plans[type] = plan;
        plan.unresolvedRows.forEach(a => unresolved.push(`${rewardQueueSettings[type]?.name || type}: ${a.player?.name || a.playerId}`));
    });
    if (unresolved.length) {
        const ok = confirm('ยังมีรายชื่อที่ยังเป็นสถานะ “รอรับ”\n\n' + unresolved.slice(0, 20).join('\n') + '\n\nกด OK = ถือว่ารายชื่อเหล่านี้ “ข้ามคิว” แล้วบันทึกต่อ\nกด Cancel = กลับไปจัดการก่อน');
        if (!ok) return;
        // v114.1 STABILITY: ถ้า Admin ยืนยัน ให้เปลี่ยนคนรอรับทั้งหมดเป็นข้ามคิวก่อนบันทึก
        enabledTypes.forEach(type => {
            const unresolvedIds = new Set((plans[type]?.unresolvedRows || []).map(a => String(a.playerId)));
            if (!unresolvedIds.size) return;
            rewardQueueAssignments[type] = (rewardQueueAssignments[type] || []).map(a => unresolvedIds.has(String(a.playerId)) ? { ...a, manualStatus: 'skipped', status: 'skipped', label: 'ข้ามคิว' } : a);
        });
        enabledTypes.forEach(type => { plans[type] = rewardQueueCommitPlan(type); });
    }
    pushRewardQueueUndo('save today');
    const roundId = getCurrentWarId() + '_' + new Date().getTime();
    const roundRewards = {};
    enabledTypes.forEach(type => {
        const plan = plans[type];
        const cfg = rewardQueueSettings[type];
        const awardedRows = plan.assignments.filter(a => plan.awardedIds.includes(String(a.playerId)));
        const skippedRows = plan.assignments.filter(a => plan.skippedIds.includes(String(a.playerId)));
        roundRewards[type] = {
            settings: { ...cfg },
            awarded: awardedRows.map(a => ({ playerId: String(a.playerId), playerName: a.player?.name || '', label: a.label || '', status: a.status || '' })),
            skipped: skippedRows.map(a => ({ playerId: String(a.playerId), playerName: a.player?.name || '', status: a.status || a.manualStatus || '', label: a.label || '' })),
            beforeQueue: [...(rewardQueues[type] || [])],
            afterQueue: [...plan.nextQueue]
        };
        // v113.6: อัปเดตคิวถาวรในเครื่องทันที เพื่อให้ฝั่ง Admin ขยับทันทีหลังบันทึก
        rewardQueues[type] = plan.nextQueue;
        rewardQueueRoundActive[type] = false;
        rewardQueueRoundItems[type] = [];
        rewardQueueRoundPenalties[type] = [];
        awardedRows.forEach(a => {
            rewardQueueHistory.unshift({ id: 'rqh_' + Date.now() + '_' + type + '_' + a.playerId, roundId, playerId: String(a.playerId), playerName: a.player?.name || String(a.playerId), rewardType: type, rewardName: cfg?.name || type, label: a.label || '', at: new Date().toISOString() });
        });
    });
    // ล้างสถานะชั่วคราวของรอบนี้ แล้วคำนวณใหม่จากคิวถาวรที่ขยับแล้ว
    rewardQueueAssignments = {};
    enabledTypes.forEach(type => { rewardQueueRoundActive[type] = false; rewardQueueRoundItems[type] = []; rewardQueueRoundPenalties[type] = []; });
    rewardQueueDirty = false;
    logActivity('REWARD QUEUE SAVE ROUND', 'บันทึกรอบคิวรับรางวัลวันนี้');
    calculateRewardQueues();
    saveToLocalStorage();
    renderAll();
    // เซฟ Firebase หลัง UI ขยับแล้ว ลดอาการเหมือนปุ่มไม่ทำงาน
    saveRewardQueueToFirebaseSafe(true, { roundId, rewards: roundRewards });
}
function resetRewardQueue(type) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    if (!confirm('ยืนยันรีเซ็ตคิว ' + (rewardQueueSettings[type]?.name || type) + ' ?')) return;
    pushRewardQueueUndo('reset ' + type);
    rewardQueues[type] = players.map(p => String(p.id));
    rewardQueueAssignments[type] = [];
    rewardQueueRoundActive[type] = false;
    rewardQueueRoundItems[type] = [];
    rewardQueueRoundPenalties[type] = [];
    rewardQueueHistory = rewardQueueHistory.filter(h => h.rewardType !== type);
    rewardQueueDirty = true;
    saveToLocalStorage();
    renderAll();
}
function copyRewardQueueSummary() {
    calculateRewardQueues();
    const lines = [];
    rewardQueueTypes().filter(type => rewardQueueSettings[type]?.enabled !== false).forEach(type => {
        const cfg = rewardQueueSettings[type];
        lines.push(`${cfg.icon} ${cfg.name}`);
        rewardQueueTodayList(type).forEach(a => lines.push(`- ${a.player.name}: ${a.label}`));
        lines.push('');
    });
    copyTextToClipboard(lines.join('\n'));
    alert('Copy สรุปคิวรับรางวัลแล้ว');
}

function buildRewardQueueReportText() {
    calculateRewardQueues();
    const today = new Date().toLocaleDateString('th-TH');
    const lines = [`📋 รายงาน GVG Rewards รอบนี้`, `วันที่: ${today}`, ''];

    rewardQueueTypes().filter(type => rewardQueueSettings[type]?.enabled !== false).forEach(type => {
        const cfg = rewardQueueSettings[type];
        const rows = (rewardQueueAssignments[type] || []).filter(a => {
            return a.status === 'today' || a.status === 'received' || a.manualStatus === 'received' || a.manualStatus === 'skipped' || a.status === 'skipped';
        });

        lines.push(`${cfg.icon} ${cfg.name}`);
        if (!rows.length) {
            lines.push('- ยังไม่มีรายการในรอบนี้');
        } else {
            rows.forEach(a => {
                const playerName = a.player?.name || a.playerName || a.playerId || '-';
                const statusText = (a.manualStatus === 'received' || a.status === 'received') ? 'รับแล้ว' :
                    (a.manualStatus === 'skipped' || a.status === 'skipped') ? 'ข้าม' : 'รอรับ';
                lines.push(`- ${playerName}: ${a.label || ''} (${statusText})`.trim());
            });
        }
        lines.push('');
    });

    return lines.join('\n');
}

function openRewardQueueReport() {
    const modal = document.getElementById('reward-queue-report-modal');
    const textarea = document.getElementById('reward-queue-report-text');
    if (!modal || !textarea) {
        const text = buildRewardQueueReportText();
        copyTextToClipboard(text);
        alert('Copy รายงานรอบนี้แล้ว');
        return;
    }
    textarea.value = buildRewardQueueReportText();
    modal.classList.remove('hidden');
}

function closeRewardQueueReportModal() {
    document.getElementById('reward-queue-report-modal')?.classList.add('hidden');
}

function copyRewardQueueReportFromModal() {
    const text = document.getElementById('reward-queue-report-text')?.value || buildRewardQueueReportText();
    copyTextToClipboard(text);
    alert('Copy รายงานรอบนี้แล้ว');
}

function downloadRewardQueueReportTxt() {
    const text = document.getElementById('reward-queue-report-text')?.value || buildRewardQueueReportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bellona-gvg-reward-report-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}


function sanitizeForFirestore(value) {
    if (value === undefined) return null;
    if (value === null) return null;
    if (Array.isArray(value)) return value.map(sanitizeForFirestore);
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
        const out = {};
        Object.keys(value).forEach(k => {
            const v = sanitizeForFirestore(value[k]);
            out[k] = v === undefined ? null : v;
        });
        return out;
    }
    return value;
}

async function saveRewardQueueToFirebaseSafe(showAlert = false, roundSnapshot = null) {
    if (!window.bellonaDB) return;
    try {
        await queueFirebaseWrite(async () => {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            const queuePayload = sanitizeForFirestore({
                rewardQueueSettings,
                rewardQueues,
                rewardQueueAssignments,
                rewardQueueRoundActive,
                rewardQueueRoundItems,
                rewardQueueRoundPenalties,
                rewardQueueHistory: rewardQueueHistory.slice(0, 300),
                updatedAt: new Date().toISOString()
            });
            await setDoc(doc(window.bellonaDB, 'rewardQueue', 'main'), queuePayload, { merge: true });
            await setDoc(doc(window.bellonaDB, 'rewardQueueStates', 'main'), queuePayload, { merge: true });
            if (roundSnapshot && roundSnapshot.roundId) {
                await setDoc(doc(window.bellonaDB, 'rewardRounds', String(roundSnapshot.roundId)), sanitizeForFirestore({
                    id: String(roundSnapshot.roundId),
                    warId: getCurrentWarId(),
                    warDate: getCurrentWarLabel(),
                    rewards: roundSnapshot.rewards || {},
                    createdAt: new Date().toISOString(),
                    source: 'web-admin'
                }), { merge: true });
            }
        });
        rewardQueueDirty = false;
        if (showAlert) alert('บันทึก GVG Rewards เข้า Firebase แล้ว');
    } catch (err) {
        console.warn('saveRewardQueueToFirebaseSafe error:', err.message);
        alert('บันทึก GVG Rewards ไม่สำเร็จ: ' + (err.message || err));
    }
}
async function importRewardQueueFromFirebaseSafe() {
    if (!window.bellonaDB || rewardQueueDirty) return;
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        let snap = await getDoc(doc(window.bellonaDB, 'rewardQueue', 'main'));
        if (!snap.exists()) snap = await getDoc(doc(window.bellonaDB, 'rewardQueueStates', 'main'));
        if (snap.exists()) {
            const data = snap.data();
            rewardQueueSettings = data.rewardQueueSettings ? mergeRewardQueueSettings(data.rewardQueueSettings) : rewardQueueSettings;
            rewardQueues = data.rewardQueues || rewardQueues;
            rewardQueueAssignments = data.rewardQueueAssignments || {};
            rewardQueueHistory = Array.isArray(data.rewardQueueHistory) ? data.rewardQueueHistory : [];
            rewardQueueRoundActive = data.rewardQueueRoundActive && typeof data.rewardQueueRoundActive === 'object' ? data.rewardQueueRoundActive : {};
            rewardQueueRoundItems = data.rewardQueueRoundItems && typeof data.rewardQueueRoundItems === 'object' ? data.rewardQueueRoundItems : {};
            rewardQueueRoundPenalties = data.rewardQueueRoundPenalties && typeof data.rewardQueueRoundPenalties === 'object' ? data.rewardQueueRoundPenalties : {};
            saveToLocalStorage();
        }
    } catch (err) { console.warn('importRewardQueueFromFirebaseSafe error:', err.message); }
}
function startRewardQueueRealtimeSync() {
    if (!window.bellonaDB || unsubRewardQueueRealtime) return;
    import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js').then(({ doc, onSnapshot }) => {
        unsubRewardQueueRealtime = onSnapshot(doc(window.bellonaDB, 'rewardQueue', 'main'), snap => {
            if (!snap.exists() || rewardQueueDirty) return;
            const data = snap.data() || {};
            rewardQueueSettings = data.rewardQueueSettings ? mergeRewardQueueSettings(data.rewardQueueSettings) : rewardQueueSettings;
            rewardQueues = data.rewardQueues || rewardQueues;
            rewardQueueAssignments = data.rewardQueueAssignments || {};
            rewardQueueHistory = Array.isArray(data.rewardQueueHistory) ? data.rewardQueueHistory : [];
            rewardQueueRoundActive = data.rewardQueueRoundActive && typeof data.rewardQueueRoundActive === 'object' ? data.rewardQueueRoundActive : {};
            rewardQueueRoundItems = data.rewardQueueRoundItems && typeof data.rewardQueueRoundItems === 'object' ? data.rewardQueueRoundItems : {};
            rewardQueueRoundPenalties = data.rewardQueueRoundPenalties && typeof data.rewardQueueRoundPenalties === 'object' ? data.rewardQueueRoundPenalties : {};
            saveToLocalStorage();
            if (typeof scheduleRenderAll === 'function') scheduleRenderAll(); else renderAll();
        }, err => console.warn('RewardQueue realtime error:', err.message));
    }).catch(err => console.warn('RewardQueue realtime import error:', err.message));
}

function copyRewardAllNames() {
    const names = players.filter(p => p.status === 'มา').map(p => p.name).filter(Boolean).join('\n');
    if (!names) return alert('ไม่มีรายชื่อมาวอร์');
    copyTextToClipboard(names); alert('คัดลอกรายชื่อมาวอร์ทั้งหมดแล้ว');
}

