// BELLONA Refactor v1.1 modular split
// Module: 06-rewards-wheel.js
// Scope: Reward quota, party capture, reward wheel, eligible popup
// Source: js/bellona-app.js lines 2017-2206

async function toggleRewardQuota(playerId) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const p = players.find(x => String(x.id) === String(playerId));
    if (!p) return;
    p.hasQuota = !hasRewardQuota(p);
    await persistRewardQuotaChangesAndRender('TOGGLE REWARD QUOTA');
}
function setAllRewardQuota(value) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    players.forEach(p => { p.hasQuota = !!value; });
    persistRewardQuotaChangesAndRender(value ? 'OPEN ALL REWARD QUOTA' : 'CLOSE ALL REWARD QUOTA');
}
function resetAllRewardQuota() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    players.forEach(p => { p.hasQuota = true; });
    persistRewardQuotaChangesAndRender('RESET ALL REWARD QUOTA');
}

async function captureParties() {
    return capturePartyElement('capture-party-combined-zone', `bellona-party-${currentPartyPlan}-all-${Date.now()}.png`);
}

async function captureMainParties() {
    return capturePartyElement('capture-main-zone', `bellona-party-${currentPartyPlan}-main-${Date.now()}.png`);
}

async function captureSubParties() {
    return capturePartyElement('capture-sub-zone', `bellona-party-${currentPartyPlan}-sub-${Date.now()}.png`);
}

async function capturePartyElement(elementId, filename) {
    const zone = safeEl(elementId);
    if (!zone) return alert('ไม่พบกล่องปาร์ตี้สำหรับแคปภาพ');
    if (!window.html2canvas) return alert('ไม่พบระบบ html2canvas สำหรับแคปภาพ');
    const combined = safeEl('capture-party-combined-zone');
    const wasCombined = zone === combined;
    zone.classList.add('capture-export-mode');
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
        const canvasShot = await html2canvas(zone, {
            backgroundColor: '#080a0f',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            width: zone.scrollWidth,
            height: zone.scrollHeight,
            windowWidth: zone.scrollWidth + 80,
            windowHeight: zone.scrollHeight + 80
        });
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvasShot.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.warn('capture error:', err);
        alert('แคปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
        zone.classList.remove('capture-export-mode');
        if (wasCombined && combined) combined.classList.remove('capture-export-mode');
    }
}

function getAttendanceBadge(status) {
    if (status === 'มา') return '<span class="text-green-400 font-bold">มาวอร์</span>';
    if (status === 'ลา') return '<span class="text-amber-400 font-bold">ลาวอร์</span>';
    if (status === 'ขาด') return '<span class="text-red-400 font-bold">ขาดวอร์</span>';
    return '<span class="text-gray-500 font-bold">ยังไม่เช็คชื่อ</span>';
}

function renderRewardsTab() {
    const tbody = safeEl('reward-quota-table-body');
    const grid = safeEl('reward-eligible-name-grid');
    if (grid) grid.innerHTML = '';
    const totalMembers = players.length;
    const activeMembers = players.filter(p => hasRewardQuota(p) && p.status === 'มา').length;
    const inactiveMembers = totalMembers - activeMembers;
    if (safeEl('reward-total-members')) safeEl('reward-total-members').innerText = totalMembers;
    if (safeEl('reward-active-members')) safeEl('reward-active-members').innerText = activeMembers;
    if (safeEl('reward-inactive-members')) safeEl('reward-inactive-members').innerText = inactiveMembers;
    if (tbody) {
        tbody.innerHTML = players.map(p => {
            const quotaLabel = hasRewardQuota(p) ? '<span class="text-green-400 font-bold">เปิดสิทธิ์</span>' : '<span class="text-red-400 font-bold">ปิดสิทธิ์</span>';
            return `<tr class="text-xs border-b border-[#1c2331]"><td class="p-3 font-bold text-white">${escapeHtml(p.name || '-')}</td><td class="p-3">${escapeHtml(p.rewardName || 'ยังไม่ระบุ')}</td><td class="p-3 text-center">${quotaLabel}</td><td class="p-3 text-center">${getAttendanceBadge(p.status)}</td><td class="p-3 text-right"><button onclick="toggleRewardQuota('${escapeInlineJs(p.id)}')" class="admin-only bg-[#1c2331] text-[#d4af37] border border-[#2d3748] px-3 py-1.5 rounded-lg text-xs font-bold">เปิด/ปิดสิทธิ์</button></td></tr>`;
        }).join('');
    }
    renderRewardWinnerHistory();
}

function renderRewardWinnerHistory() {
    const box = safeEl('reward-winner-history');
    if (!box) return;
    if (!rewardWinnerHistory.length) {
        box.innerHTML = '<div class="text-gray-500 text-xs font-normal">ยังไม่มีประวัติการสุ่ม</div>';
        return;
    }
    box.innerHTML = rewardWinnerHistory.slice(0, 5).map((w, i) => `<div class="flex justify-between items-center bg-[#111520] border border-[#1f2838] rounded px-2 py-1"><span>${i + 1}. ${escapeHtml(w.name)}</span><span class="text-[#d4af37] text-xs">${escapeHtml(w.job || '')}</span></div>`).join('');
}

function clearRewardWheelHistory() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    rewardWinnerHistory = [];
    rewardDrawnIds = [];
    if (safeEl('lucky-winner-name')) safeEl('lucky-winner-name').innerText = '???';
    if (safeEl('lucky-winner-job')) safeEl('lucky-winner-job').innerText = 'พร้อมรับรางวัล';
    logActivity('CLEAR REWARD WHEEL', 'ล้างรายชื่อสุ่มวงล้อและประวัติผู้ชนะล่าสุด');
    saveToLocalStorage();
    renderRewardWinnerHistory();
}
function spinEligibleReward() {
    // สุ่มจากคนที่เปิดสิทธิ์ + มาวอร์เท่านั้น และไม่ซ้ำจนกว่าจะกดล้างรายชื่อสุ่มวงล้อ
    spinRewardWheel(players.filter(p => hasRewardQuota(p) && p.status === 'มา'));
}
function spinAllReward() {
    // สุ่มจากรายชื่อมาวอร์ทั้งหมดเท่านั้น และไม่ซ้ำจนกว่าจะกดล้างรายชื่อสุ่มวงล้อ
    spinRewardWheel(players.filter(p => p.status === 'มา'));
}
function spinRewardWheel(pool) {
    if (rewardSpinLock) return;
    const availablePool = (pool || []).filter(p => !rewardDrawnIds.includes(String(p.id)));
    if (!pool || pool.length === 0) return alert('ไม่มีรายชื่อสำหรับสุ่ม');
    if (availablePool.length === 0) return alert('รายชื่อในชุดนี้ถูกสุ่มครบแล้ว กรุณากด “ล้างรายชื่อสุ่มวงล้อ” เพื่อเริ่มสุ่มใหม่');

    const winnerName = safeEl('lucky-winner-name');
    const winnerJob = safeEl('lucky-winner-job');
    const glow = safeEl('raffle-glow');
    rewardSpinLock = true;
    let elapsed = 0;
    const timer = setInterval(() => {
        const current = availablePool[Math.floor(Math.random() * availablePool.length)];
        if (winnerName) winnerName.innerText = current.name;
        if (winnerJob) winnerJob.innerText = current.job || '-';
        if (glow) glow.style.transform = `rotate(${elapsed * 2}deg)`;
        elapsed += 100;
        if (elapsed >= 3000) {
            clearInterval(timer);
            const winner = availablePool[Math.floor(Math.random() * availablePool.length)];
            if (winnerName) winnerName.innerText = winner.name;
            if (winnerJob) winnerJob.innerText = '🎉 ผู้ชนะ';
            rewardDrawnIds.push(String(winner.id));
            rewardWinnerHistory.unshift({ id: String(winner.id), name: winner.name || '-', job: winner.job || '-', time: new Date().toISOString() });
            rewardWinnerHistory = rewardWinnerHistory.slice(0, 20);
            logActivity('REWARD WINNER', `สุ่มได้ ${winner.name || '-'} (${winner.job || '-'})`);
            saveToLocalStorage();
            renderRewardWinnerHistory();
            rewardSpinLock = false;
        }
    }, 100);
}
async function copyTextToClipboard(text) {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
}
function copyRewardEligibleNames() {
    const names = players.filter(p => hasRewardQuota(p) && p.status === 'มา').map(p => p.name).filter(Boolean).join('\n');
    if (!names) return alert('ไม่มีรายชื่อคนมีสิทธิ์ที่มาวอร์');
    copyTextToClipboard(names); alert('คัดลอกรายชื่อคนมีสิทธิ์ที่มาวอร์แล้ว');
}

function getRewardEligiblePlayers() {
    return players.filter(p => hasRewardQuota(p));
}
function openRewardEligiblePopup() {
    const popup = safeEl('reward-eligible-popup');
    const list = safeEl('reward-eligible-popup-list');
    const count = safeEl('reward-eligible-popup-count');
    if (!popup || !list) return;
    const eligible = getRewardEligiblePlayers();
    if (count) count.innerText = `ทั้งหมด ${eligible.length} คน`;
    list.innerHTML = eligible.length
        ? eligible.map((p, i) => `<div class="bg-[#0c0e14] border border-[#1f2838] rounded-lg px-3 py-2 font-bold text-white truncate">${i + 1}. ${escapeHtml(p.name || '-')}</div>`).join('')
        : '<div class="text-gray-500 text-sm">ไม่มีรายชื่อผู้มีสิทธิ์สุ่ม</div>';
    popup.classList.remove('hidden');
}
function closeRewardEligiblePopup() {
    safeEl('reward-eligible-popup')?.classList.add('hidden');
}



/* ================= REWARD QUEUE SYSTEM v113 PRODUCTION FINAL =================
   Fair Queue Logic:
   - คิวแยก 4 รางวัล
   - คนมาวอร์และได้รับของ: ไปท้ายคิว
   - คนลา/ขาดที่อยู่ในช่วงคิวของรอบนี้: ไปท้าย "กลุ่มคนที่ยังไม่ได้รับ" ก่อนกลุ่มรับแล้ว
   - คนยังไม่ถึงคิว: คงตำแหน่งเดิม
   - Realtime read + Manual save เมื่อกด "บันทึกรอบวันนี้"
============================================================================ */
