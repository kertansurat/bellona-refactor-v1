// BELLONA Refactor v1.1 modular split
// Module: 05-members-manager-stats.js
// Scope: Bulk member actions, inline edit, member manager, stats rendering
// Source: js/bellona-app.js lines 1574-2016

function toggleSelectAllMembers(master) { document.querySelectorAll('.member-select-chk').forEach(c => c.checked = master.checked); }
async function deleteSelectedPlayers() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const chks = document.querySelectorAll('.member-select-chk:checked');
    if (chks.length === 0) return alert('กรุณาติ๊กเลือกสมาชิกก่อน');
    const ids = Array.from(chks).map(c => String(c.value));
    const names = players.filter(p => ids.includes(String(p.id))).map(p => p.name).join(', ');
    players = players.filter(p => !ids.includes(String(p.id)));
    selectedPlayerId = ids.includes(String(selectedPlayerId)) ? null : selectedPlayerId;
    hardClearPartySlotsDom();

    // ลบ attendanceLogs ของสมาชิกคนนั้นออกจาก local cache ด้วย เพื่อให้ถือว่าออกกิลด์แล้วเริ่มใหม่เมื่อกลับมา
    Object.keys(attendanceLogs || {}).forEach(logId => {
        const log = attendanceLogs[logId];
        if (ids.includes(String(log?.playerId))) delete attendanceLogs[logId];
    });

    saveToLocalStorage();
    isLocalPartyMutationInProgress = true;

    if (window.bellonaDB) {
        try {
            await queueFirebaseWrite(async () => {
                const { doc, deleteDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
                for (const id of ids) {
                    await deleteDoc(doc(window.bellonaDB, 'players', String(id)));
                }
                const logSnap = await getDocs(collection(window.bellonaDB, 'attendanceLogs'));
                for (const logDoc of logSnap.docs) {
                    const data = logDoc.data();
                    if (ids.includes(String(data.playerId))) {
                        await deleteDoc(doc(window.bellonaDB, 'attendanceLogs', logDoc.id));
                    }
                }
            });
        } catch (err) {
            alert('Delete Firebase Error: ' + err.message);
        }
    }

    isLocalPartyMutationInProgress = false;
    logActivity('DELETE MEMBER', `ลบสมาชิก ${ids.length} คน${names ? ': ' + names : ''}`);
    forceRenderPartyAndCurrentTab();
}


async function bulkSetAttendanceStatus(status) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const checked = document.querySelectorAll('.member-select-chk:checked');
    if (checked.length === 0) return alert('กรุณาติ๊กเลือกสมาชิกก่อน');
    const ids = Array.from(checked).map(chk => String(chk.value));

    // Performance v1.0.1: ปิดการ render ระหว่างวนทีละคน แล้ว render ครั้งเดียวท้ายสุด
    for (const id of ids) {
        await setAttendanceStatusNoDuplicate(id, status, { silent: true, skipRender: true });
    }
    saveToLocalStorage();
    logActivity('BULK ATTENDANCE', `เช็คชื่อ ${status} จำนวน ${ids.length} คน`);
    renderAll();
}

async function setSingleAttendanceStatus(playerId, status) {
    await setAttendanceStatusNoDuplicate(playerId, status, { silent: false, skipRender: false });
}


function renderPlayerJobSelector(p) {
    const jobs = [...new Set([...(availableJobsList || []), p.job].filter(Boolean))];
    const disabled = checkAdminAccess() ? '' : 'disabled';
    const options = jobs.map(job => {
        const selected = job === p.job ? 'selected' : '';
        return `<option value="${escapeHtml(job)}" ${selected}>${escapeHtml(job)}</option>`;
    }).join('');

    return `<select onchange="updatePlayerJob('${escapeInlineJs(p.id)}', this.value)" ${disabled}
        class="admin-only w-full min-w-[150px] bg-[#1c2331] text-gray-200 border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#d4af37]">
        ${options}
    </select>`;
}

async function updatePlayerJob(playerId, newJob) {
    if (!checkAdminAccess()) {
        alert('เฉพาะ Admin เท่านั้น');
        return;
    }

    const p = players.find(x => String(x.id) === String(playerId));
    if (!p) {
        alert('ไม่พบสมาชิก');
        return;
    }

    const cleanJob = String(newJob || '').trim();
    if (!cleanJob) {
        alert('กรุณาเลือกอาชีพ');
        renderAll();
        return;
    }

    if (p.job === cleanJob) return;

    const oldJob = p.job || '-';
    p.job = cleanJob;
    if (!availableJobsList.includes(cleanJob)) {
        availableJobsList.push(cleanJob);
    }

    const currentLogId = makeAttendanceLogId(getCurrentWarId(), p.id);
    if (attendanceLogs[currentLogId]) {
        attendanceLogs[currentLogId].job = cleanJob;
        attendanceLogs[currentLogId].updatedAt = new Date().toISOString();
    }

    saveToLocalStorage();

    if (window.bellonaDB) {
        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            await setDoc(doc(window.bellonaDB, 'players', String(p.id)), buildPlayerFirebasePayload(p), { merge: true });

            if (attendanceLogs[currentLogId]) {
                await setDoc(doc(window.bellonaDB, 'attendanceLogs', currentLogId), attendanceLogs[currentLogId], { merge: true });
            }
        } catch (err) {
            alert('Update Job Firebase Error: ' + err.message);
        }
    }

    logActivity('UPDATE JOB', `${p.name} เปลี่ยนอาชีพ ${oldJob} → ${cleanJob}`);
    renderAll();
}

async function updatePlayerName(playerId, newName) {
    if (!checkAdminAccess()) {
        alert('เฉพาะ Admin เท่านั้น');
        renderAll();
        return;
    }

    const p = players.find(x => String(x.id) === String(playerId));
    if (!p) {
        alert('ไม่พบสมาชิก');
        return;
    }

    const cleanName = String(newName || '').trim();
    if (!cleanName) {
        alert('ชื่อตัวละครห้ามว่าง');
        renderAll();
        return;
    }

    if (p.name === cleanName) return;

    const oldName = p.name || '-';
    p.name = cleanName;

    Object.keys(attendanceLogs || {}).forEach(key => {
        const log = attendanceLogs[key];
        if (log && String(log.playerId) === String(p.id)) {
            log.playerName = cleanName;
            log.updatedAt = new Date().toISOString();
        }
    });

    saveToLocalStorage();

    try {
        if (typeof saveSinglePlayerToFirebaseSafe === 'function') {
            await saveSinglePlayerToFirebaseSafe(p.id, false);
        }
        const currentLogId = makeAttendanceLogId(getCurrentWarId(), p.id);
        if (window.bellonaDB && attendanceLogs[currentLogId]) {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            await setDoc(doc(window.bellonaDB, 'attendanceLogs', currentLogId), attendanceLogs[currentLogId], { merge: true });
        }
    } catch (err) {
        alert('Update Name Firebase Error: ' + err.message);
    }

    logActivity('UPDATE NAME', `${oldName} เปลี่ยนชื่อเป็น ${cleanName}`);
    renderAll();
}

async function updatePlayerPower(playerId, newPower) {
    if (!checkAdminAccess()) {
        alert('เฉพาะ Admin เท่านั้น');
        renderAll();
        return;
    }

    const p = players.find(x => String(x.id) === String(playerId));
    if (!p) {
        alert('ไม่พบสมาชิก');
        return;
    }

    const cleanPower = normalizePowerLabel(newPower);
    const nextPowerValue = parsePowerValue(cleanPower);
    const oldPower = p.power || '-';

    if ((p.power || '') === cleanPower && Number(p.powerValue || 0) === nextPowerValue) return;

    p.power = cleanPower;
    p.powerValue = nextPowerValue;

    const currentLogId = makeAttendanceLogId(getCurrentWarId(), p.id);
    if (attendanceLogs[currentLogId]) {
        attendanceLogs[currentLogId].power = cleanPower;
        attendanceLogs[currentLogId].powerValue = nextPowerValue;
        attendanceLogs[currentLogId].updatedAt = new Date().toISOString();
    }

    saveToLocalStorage();

    try {
        if (typeof saveSinglePlayerToFirebaseSafe === 'function') {
            await saveSinglePlayerToFirebaseSafe(p.id, false);
        }
        if (window.bellonaDB && attendanceLogs[currentLogId]) {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            await setDoc(doc(window.bellonaDB, 'attendanceLogs', currentLogId), attendanceLogs[currentLogId], { merge: true });
        }
    } catch (err) {
        alert('Update Power Firebase Error: ' + err.message);
    }

    logActivity('UPDATE POWER', `${p.name} Power ${oldPower} → ${cleanPower || '-'}`);
    renderAll();
}

function handleInlineEditKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.blur();
    }
}




function openMemberEditModal(playerId) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const p = players.find(x => String(x.id) === String(playerId));
    if (!p) return alert('ไม่พบสมาชิก');
    safeEl('member-edit-id').value = p.id;
    safeEl('member-edit-uid').value = p.uid || '';
    safeEl('member-edit-name').value = p.name || '';
    safeEl('member-edit-power').value = p.power || '';
    const jobSel = safeEl('member-edit-job');
    if (jobSel) {
        const jobs = [...new Set([...(availableJobsList || []), p.job].filter(Boolean))];
        jobSel.innerHTML = jobs.map(job => `<option value="${escapeHtml(job)}" ${job === p.job ? 'selected' : ''}>${escapeHtml(job)}</option>`).join('');
    }
    const ds = safeEl('member-edit-discord-status');
    if (ds) ds.innerHTML = (p.discordLinked || p.discordId)
        ? `<span class="text-green-400 font-black">● Linked</span><span class="text-gray-500 ml-2">${escapeHtml(p.discordId || '')}</span>`
        : `<span class="text-gray-500 font-black">○ Not Linked</span>`;
    safeEl('member-edit-subtitle').innerText = p.name || 'แก้ไขสมาชิก';
    safeEl('member-edit-modal')?.classList.remove('hidden');
}

function closeMemberEditModal() { safeEl('member-edit-modal')?.classList.add('hidden'); }

async function saveMemberEditModal() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const id = String(safeEl('member-edit-id')?.value || '');
    const p = players.find(x => String(x.id) === id);
    if (!p) return alert('ไม่พบสมาชิก');
    const uid = String(safeEl('member-edit-uid')?.value || '').trim();
    const name = String(safeEl('member-edit-name')?.value || '').trim();
    const power = normalizePowerLabel(safeEl('member-edit-power')?.value || '');
    const job = String(safeEl('member-edit-job')?.value || '').trim();
    const validationMessage = validateMemberRequired({ uid, name, job }, id);
    if (validationMessage) return alert(validationMessage);
    const oldName = p.name || '-';
    const oldUid = p.uid || '-';
    const oldJob = p.job || '-';
    const oldPower = p.power || '-';
    p.uid = uid;
    p.name = name;
    p.power = power;
    p.powerValue = parsePowerValue(power);
    p.job = job || p.job;
    if (p.job && !availableJobsList.includes(p.job)) availableJobsList.push(p.job);
    Object.keys(attendanceLogs || {}).forEach(key => {
        const log = attendanceLogs[key];
        if (log && String(log.playerId) === String(p.id)) {
            log.playerName = p.name;
            log.job = p.job;
            log.updatedAt = new Date().toISOString();
        }
    });
    saveToLocalStorage();
    try {
        if (typeof saveSinglePlayerToFirebaseSafe === 'function') await saveSinglePlayerToFirebaseSafe(p.id, false);
    } catch (err) {
        alert('Save Member Firebase Error: ' + err.message);
    }
    logActivity('UPDATE MEMBER', `${oldName} → ${p.name} | UID ${oldUid} → ${p.uid || '-'} | Power ${oldPower} → ${p.power || '-'} | Job ${oldJob} → ${p.job || '-'}`);
    closeMemberEditModal();
    renderAll();
}

function getFilteredMemberRows() {
    const keyword = (safeEl('search-name')?.value || '').trim().toLowerCase();
    const job = safeEl('search-job-dropdown')?.value || 'all';
    return players.filter(p => {
        const hay = [p.name, p.uid, p.id, p.job, p.discordId].map(v => String(v || '').toLowerCase()).join(' ');
        const byKeyword = !keyword || hay.includes(keyword);
        const byJob = job === 'all' || p.job === job;
        return byKeyword && byJob;
    });
}

function renderMemberManagerTab() {
    const tbody = safeEl('member-manager-table-body');
    if (!tbody) return;
    const isAdminMode = checkAdminAccess();
    const list = getFilteredMemberRows();
    tbody.innerHTML = list.map(p => {
        const statusBadge = p.status === 'มา'
            ? '<span class="text-green-400 font-bold">มาวอร์</span>'
            : p.status === 'ลา'
                ? '<span class="text-amber-400 font-bold">ลา</span>'
                : p.status === 'ขาด'
                    ? '<span class="text-red-400 font-bold">ขาด</span>'
                    : '<span class="text-gray-400">-</span>';
        const discordBadge = (p.discordLinked || p.discordId)
            ? '<span class="text-green-400 font-black">● Linked</span>'
            : '<span class="text-gray-500 font-black">○ Not Linked</span>';
        return `<tr class="border-b border-[#1c2331] text-xs">
            <td class="p-3 text-center"><input type="checkbox" value="${escapeHtml(p.id)}" class="member-select-chk accent-[#d4af37]" ${isAdminMode ? '' : 'disabled'}></td>
            <td class="p-3 font-bold text-white min-w-[260px]">
                <div class="flex items-center gap-3">
                    <div class="shrink-0">${getJobIcon(p.job)}</div>
                    <div class="min-w-0">
                        <div class="text-sm truncate">${escapeHtml(p.name)}</div>
                        <div class="member-id-label">UID: ${escapeHtml(p.uid || '-')}</div>
                    </div>
                </div>
            </td>
            <td class="p-3 text-center min-w-[100px]"><span class="text-[#facc15] font-black">${escapeHtml(p.power || '-')}</span></td>
            <td class="p-3 min-w-[150px] text-gray-300 font-bold">${escapeHtml(p.job || '-')}</td>
            <td class="p-3 min-w-[120px]">${discordBadge}</td>
            <td class="p-3">${statusBadge}</td>
            <td class="p-3 text-center">
                <div class="flex justify-center gap-1.5 flex-wrap">
                    <button onclick="setSingleAttendanceStatus('${escapeInlineJs(p.id)}','มา')" class="admin-only bg-green-950/40 text-green-400 border border-green-900/40 px-2.5 py-1.5 rounded text-[11px] font-bold">มา</button>
                    <button onclick="setSingleAttendanceStatus('${escapeInlineJs(p.id)}','ลา')" class="admin-only bg-amber-950/40 text-amber-400 border border-amber-900/40 px-2.5 py-1.5 rounded text-[11px] font-bold">ลา</button>
                    <button onclick="setSingleAttendanceStatus('${escapeInlineJs(p.id)}','ขาด')" class="admin-only bg-red-950/40 text-red-400 border border-red-900/40 px-2.5 py-1.5 rounded text-[11px] font-bold">ขาด</button>
                </div>
            </td>
            <td class="p-3 text-center">
                <button onclick="openMemberEditModal('${escapeInlineJs(p.id)}')" class="admin-only bg-[#141a24] text-[#d4af37] border border-[#2d374a] w-8 h-8 rounded-lg"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="8" class="p-6 text-center text-gray-500 text-xs">ไม่พบสมาชิกตามตัวกรอง</td></tr>';
}

function getAttendanceLogSortKey(log) {
    return String(log?.warId || log?.warDate || log?.updatedAt || log?.id || '');
}

function getPlayerAttendanceHistory(playerId) {
    return Object.values(attendanceLogs || {})
        .filter(log => String(log.playerId) === String(playerId))
        .sort((a, b) => getAttendanceLogSortKey(b).localeCompare(getAttendanceLogSortKey(a)));
}

function getConsecutiveAbsentCount(playerId) {
    const history = getPlayerAttendanceHistory(playerId);
    let count = 0;

    for (const log of history) {
        if (log.status === 'ขาด') {
            count++;
            continue;
        }
        if (log.status === 'มา' || log.status === 'ลา') {
            break;
        }
    }

    if (history.length === 0) {
        const p = players.find(x => String(x.id) === String(playerId));
        return p && p.status === 'ขาด' ? 1 : 0;
    }

    return count;
}

function buildConsecutiveAbsentMap() {
    const grouped = {};
    Object.values(attendanceLogs || {}).forEach(log => {
        if (!log || !log.playerId) return;
        const pid = String(log.playerId);
        if (!grouped[pid]) grouped[pid] = [];
        grouped[pid].push(log);
    });
    const result = {};
    Object.keys(grouped).forEach(pid => {
        grouped[pid].sort((a, b) => getAttendanceLogSortKey(b).localeCompare(getAttendanceLogSortKey(a)));
        let count = 0;
        for (const log of grouped[pid]) {
            if (log.status === 'ขาด') { count++; continue; }
            if (log.status === 'มา' || log.status === 'ลา') break;
        }
        result[pid] = count;
    });
    return result;
}

function renderStatsTab() {
    const tbody = safeEl('stats-table-body');
    if (!tbody) return;
    let totalP=0, totalL=0, totalA=0;
    const absentMap = buildConsecutiveAbsentMap();
    tbody.innerHTML = players.map(p => {
        totalP += p.presentCount || 0;
        totalL += p.leaveCount || 0;
        totalA += p.absentCount || 0;
        const consecutiveAbsent = absentMap[String(p.id)] ?? ((p.status === 'ขาด') ? 1 : 0);
        const consecutiveClass = consecutiveAbsent >= 3 ? 'text-red-300 font-extrabold' : consecutiveAbsent > 0 ? 'text-red-400 font-bold' : 'text-gray-500';
        return `<tr><td class="p-3 font-bold">${escapeHtml(p.name)}</td><td class="p-3 text-gray-400">${escapeHtml(p.job)}</td><td class="p-3 text-center text-green-400">${p.presentCount || 0}</td><td class="p-3 text-center text-amber-400">${p.leaveCount || 0}</td><td class="p-3 text-center text-red-400">${p.absentCount || 0}</td><td class="p-3 text-center ${consecutiveClass}">${consecutiveAbsent} ครั้ง</td></tr>`;
    }).join('');
    if (safeEl('stat-avg-present')) safeEl('stat-avg-present').innerText = totalP + ' ครั้ง';
    if (safeEl('stat-avg-leave')) safeEl('stat-avg-leave').innerText = totalL + ' ครั้ง';
    if (safeEl('stat-avg-absent')) safeEl('stat-avg-absent').innerText = totalA + ' ครั้ง';
    renderTopStatList('top-leave-list', 'leaveCount', 'ลา');
    renderTopStatList('top-absent-list', 'absentCount', 'ขาด');
}
function renderTopStatList(elementId, key, label) {
    const box = safeEl(elementId);
    if (!box) return;
    const top = [...players].sort((a,b) => (b[key] || 0) - (a[key] || 0)).filter(p => (p[key] || 0) > 0).slice(0,5);
    if (!top.length) {
        box.innerHTML = `<div class="text-xs text-gray-500">ยังไม่มีข้อมูล${label}วอร์</div>`;
        return;
    }
    box.innerHTML = top.map((p,i) => `<div class="flex justify-between items-center bg-[#111520] border border-[#1f2838] rounded-lg px-3 py-2"><span class="font-bold text-white">${i+1}. ${escapeHtml(p.name || '-')}</span><span class="font-extrabold ${key === 'absentCount' ? 'text-red-400' : 'text-amber-400'}">${p[key] || 0} ครั้ง</span></div>`).join('');
}

