// BELLONA Refactor v1.1 modular split
// Module: 03-members.js
// Scope: Job icons, member CRUD, filters, waiting list
// Source: js/bellona-app.js lines 1157-1355

function getJobIcon(jobName) {
    const icons = {
        'Lord Knight':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/lordknight.webp',
        'Paladin':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/paladin.webp',
        'High Priest':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/highpriest.webp',
        'High Wizard':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/wizard.webp',
        'Sniper':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/sniper.webp',
        'Assassin Cross':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/assasin.webp',
        'Champion':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/champion.webp',
        'Sage':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/sage.webp',
        'Stalker':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/stalker.webp',
        'Gypsy':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/dance.webp',
        'Mastersmith':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/blacksmith.webp',
        'Biochemist':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/bio.webp',
        'Gunslinger':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/gunslinger.png',
        'Summoner':'https://raw.githubusercontent.com/kertansurat/bellona-gvg/main/assets/job/summoner.png'
    };
    const url = icons[jobName];
    if (url) return `<img src="${url}" class="w-8 h-8 rounded-full object-cover border border-[#d4af37]/50 shrink-0" onerror="this.style.display='none'">`;
    return '<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs bg-slate-700 font-bold shrink-0">🛡️</div>';
}

function populateDynamicJobSelectors() {
    const dropdown = safeEl('search-job-dropdown');
    const addSel = safeEl('manual-add-job');
    if (dropdown) {
        const current = dropdown.value || 'all';
        dropdown.innerHTML = '<option value="all">🔍 แสดงสายอาชีพทั้งหมด</option>' + availableJobsList.map(job => `<option value="${escapeHtml(job)}">${escapeHtml(job)}</option>`).join('');
        dropdown.value = [...availableJobsList, 'all'].includes(current) ? current : 'all';
    }
    if (addSel) {
        const current = addSel.value;
        addSel.innerHTML = availableJobsList.map(job => `<option value="${escapeHtml(job)}">${escapeHtml(job)}</option>`).join('');
        if (current && availableJobsList.includes(current)) addSel.value = current;
    }
}

function addNewJobToGuild() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const input = safeEl('new-job-input');
    const job = (input?.value || '').trim();
    if (!job) return alert('กรุณาพิมพ์ชื่ออาชีพ');
    if (!availableJobsList.includes(job)) availableJobsList.push(job);
    if (input) input.value = '';
    saveToLocalStorage();
    populateDynamicJobSelectors();
    renderAll();
}

function openGuildSettingsModal() { safeEl('guild-settings-modal')?.classList.remove('hidden'); }
function closeGuildSettingsModal() { safeEl('guild-settings-modal')?.classList.add('hidden'); }
function renderJobIconSettingsList() {}

function normalizeUidValue(value) {
    return String(value ?? '').trim();
}

function isDuplicateUid(uid, ignorePlayerId = null) {
    const clean = normalizeUidValue(uid);
    if (!clean) return false;
    return players.some(p => String(p.id) !== String(ignorePlayerId ?? '') && normalizeUidValue(p.uid) === clean);
}

function isDuplicatePlayerName(name, ignorePlayerId = null) {
    const clean = String(name ?? '').trim().toLowerCase();
    if (!clean) return false;
    return players.some(p => String(p.id) !== String(ignorePlayerId ?? '') && String(p.name || '').trim().toLowerCase() === clean);
}

function validateMemberRequired({ uid, name, job }, ignorePlayerId = null) {
    const cleanUid = normalizeUidValue(uid);
    const cleanName = String(name ?? '').trim();
    if (!cleanUid) return 'กรุณากรอก UID ตัวละคร';
    if (!cleanName) return 'กรุณากรอกชื่อตัวละคร';
    if (!String(job ?? '').trim()) return 'กรุณาเลือกอาชีพ';
    if (isDuplicateUid(cleanUid, ignorePlayerId)) return 'UID นี้มีอยู่แล้ว กรุณาใช้ UID อื่น';
    if (isDuplicatePlayerName(cleanName, ignorePlayerId)) return 'ชื่อตัวละครนี้มีอยู่แล้ว กรุณาตรวจสอบก่อนบันทึก';
    return '';
}

function manualAddMemberSubmit() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const uid = normalizeUidValue(safeEl('manual-add-uid')?.value || '');
    const name = (safeEl('manual-add-name')?.value || '').trim();
    const job = safeEl('manual-add-job')?.value || availableJobsList[0] || 'ไม่ระบุอาชีพ';
    const power = normalizePowerLabel(safeEl('manual-add-power')?.value || '');
    const validationMessage = validateMemberRequired({ uid, name, job });
    if (validationMessage) return alert(validationMessage);
    const status = 'ยังไม่เช็คชื่อ';
    const newPlayer = normalizePlayer({
        id: String(Date.now()),
        uid,
        name,
        job,
        status,
        power,
        powerValue: parsePowerValue(power),
        presentCount: 0,
        leaveCount: 0,
        absentCount: 0,
        hasQuota: true,
        discordId: '',
        discordLinked: false
    });
    players.push(newPlayer);
    logActivity('ADD MEMBER', `เพิ่มสมาชิก ${newPlayer.name} | UID ${newPlayer.uid} (${newPlayer.job})`);
    if (safeEl('manual-add-uid')) safeEl('manual-add-uid').value = '';
    if (safeEl('manual-add-name')) safeEl('manual-add-name').value = '';
    if (safeEl('manual-add-power')) safeEl('manual-add-power').value = '';
    saveToLocalStorage();
    if (typeof saveSinglePlayerToFirebaseSafe === 'function') {
        saveSinglePlayerToFirebaseSafe(newPlayer.id, false).catch(err => alert('Add Member Firebase Error: ' + err.message));
    }
    renderAll();
}

function filterPlayers() {
    renderWaitingList();
    const tab = (typeof getCurrentActiveTab === 'function') ? getCurrentActiveTab() : 'members';
    if (tab === 'members') renderMemberManagerTab();
    if (tab === 'rewards' && typeof renderRewardsTab === 'function') renderRewardsTab();
}

function renderHeaderCounts() {
    const active = (typeof getCurrentActiveTab === 'function') ? getCurrentActiveTab() : 'party';
    const assignedList = active === 'party' ? getPartyAssignedPlayers(currentPartyPlan) : players.filter(p => p.partyId !== null && p.partyId !== undefined);
    const assignedCount = assignedList.length;
    const waitCount = Math.max(players.length - assignedCount, 0);
    if (safeEl('waitlist-badge')) safeEl('waitlist-badge').innerText = waitCount;
    if (safeEl('count-waitlist')) safeEl('count-waitlist').innerText = waitCount;
    if (safeEl('count-total')) safeEl('count-total').innerText = players.length;
    if (safeEl('count-assigned')) safeEl('count-assigned').innerText = assignedCount;
}


function getFilteredWaitingPlayers() {
    const keyword = (safeEl('search-name')?.value || '').trim().toLowerCase();
    const job = safeEl('search-job-dropdown')?.value || 'all';
    const active = getCurrentActiveTab ? getCurrentActiveTab() : 'party';
    return players.filter(p => {
        const hay = [p.name, p.uid, p.id, p.job, p.discordId].map(v => String(v || '').toLowerCase()).join(' ');
        const byKeyword = !keyword || hay.includes(keyword);
        const byJob = job === 'all' || p.job === job;
        if (!byKeyword || !byJob) return false;
        if (active === 'members' || active === 'party') return true;
        return p.partyId === null || p.partyId === undefined;
    });
}

function getSidebarPlayerState(p) {
    if (p.status === 'ขาด') return { text: 'ขาดวอร์', cls: 'border-red-900/60 bg-red-950/25 text-red-300', locked: true };
    if (p.status === 'ลา') return { text: 'ลาวอร์', cls: 'border-amber-900/60 bg-amber-950/25 text-amber-300', locked: true };
    const active = (typeof getCurrentActiveTab === 'function') ? getCurrentActiveTab() : 'party';
    const st = active === 'party' ? getPlayerPlanState(p, currentPartyPlan) : { partyId: p.partyId, slotIndex: p.slotIndex };
    if (st.partyId !== null && st.partyId !== undefined) return { text: 'อยู่ในปาร์ตี้แล้ว', cls: 'border-slate-700 bg-slate-900/40 text-slate-400 opacity-70', locked: true };
    return { text: 'พร้อมจัดปาร์ตี้', cls: 'border-[#1f2838] bg-[#121620] text-green-300', locked: false };
}

function renderWaitingList() {
    const container = safeEl('waiting-list');
    if (!container) return;
    const list = getFilteredWaitingPlayers();
    if (list.length === 0) {
        container.innerHTML = '<div class="text-xs text-gray-500 text-center py-4">ไม่พบรายชื่อที่ตรงกับตัวกรอง</div>';
    } else {
        container.innerHTML = list.map(p => {
            const st = getSidebarPlayerState(p);
            const active = String(selectedPlayerId) === String(p.id);
            const draggable = checkAdminAccess() && !st.locked;
            return `<div class="flex items-center gap-3 border p-2.5 rounded-lg ${st.cls} ${active ? 'ring-1 ring-[#d4af37]' : ''} ${st.locked ? 'cursor-not-allowed' : 'cursor-pointer hover:border-[#d4af37]/50'}"
                 onclick="selectPlayer('${escapeInlineJs(p.id)}')"
                 draggable="${draggable ? 'true' : 'false'}"
                 data-id="${escapeHtml(p.id)}"
                 ondragstart="handlePlayerDragStart(event, '${escapeInlineJs(p.id)}')">
                ${getJobIcon(p.job)}
                <div class="min-w-0 flex-1">
                    <div class="text-sm font-bold text-white truncate">${escapeHtml(p.name)} <span class="text-xs text-gray-500 font-normal">(${escapeHtml(p.job)})</span></div>
                    <div class="text-[10px] font-black ${st.locked ? '' : 'text-green-400'}">${st.text}${p.uid ? ' · UID ' + escapeHtml(p.uid) : ''}</div>
                </div>
            </div>`;
        }).join('');
    }
    renderHeaderCounts();
}

function selectPlayer(id) {
    const p = players.find(x => String(x.id) === String(id));
    if (!p) return;
    const active = getCurrentActiveTab ? getCurrentActiveTab() : 'party';
    const st = getSidebarPlayerState(p);
    if (active === 'party' && st.locked) {
        selectedPlayerId = null;
        renderWaitingList();
        return;
    }
    selectedPlayerId = String(id);
    renderWaitingList();
}

