// BELLONA Refactor v1.1 modular split
// Module: 02-admin-auth-storage-backup.js
// Scope: Activity log, admin tools, login/session, localStorage, Firebase import/realtime
// Source: js/bellona-app.js lines 657-1156

/* ================= BACKUP / RESTORE / ACTIVITY LOG ================= */
function formatActivityTime(iso) {
    try {
        return new Intl.DateTimeFormat('th-TH', {
            timeZone: 'Asia/Bangkok',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(new Date(iso));
    } catch (e) {
        return iso || '-';
    }
}

function logActivity(action, detail = '', meta = {}) {
    const row = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(16).slice(2),
        action: String(action || 'SYSTEM'),
        detail: String(detail || ''),
        meta: meta || {},
        role: userRole || 'guest',
        at: new Date().toISOString()
    };
    activityLogs.unshift(row);
    activityLogs = activityLogs.slice(0, 120);
    saveToLocalStorage();
    renderActivityLogList();
}

function renderActivityLogList() {
    const box = safeEl('activity-log-list');
    if (!box) return;
    if (!activityLogs || activityLogs.length === 0) {
        box.innerHTML = '<div class="text-gray-500 text-xs text-center py-6">ยังไม่มี Activity Log</div>';
        return;
    }
    box.innerHTML = activityLogs.map(log => `
        <div class="activity-log-row">
            <div class="flex items-center justify-between gap-2 mb-1">
                <span class="activity-log-action">${escapeHtml(log.action)}</span>
                <span class="activity-log-time">${escapeHtml(formatActivityTime(log.at))}</span>
            </div>
            <div class="text-gray-200 text-xs leading-relaxed">${escapeHtml(log.detail || '-')}</div>
        </div>
    `).join('');
}

function openActivityLogModal() {
    renderActivityLogList();
    safeEl('activity-log-modal')?.classList.remove('hidden');
}

function closeActivityLogModal() {
    safeEl('activity-log-modal')?.classList.add('hidden');
}

function clearActivityLogs() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    activityLogs = [];
    saveToLocalStorage();
    renderActivityLogList();
}

function openAdminToolsModal() {
    safeEl('admin-tools-modal')?.classList.remove('hidden');
}

function closeAdminToolsModal() {
    safeEl('admin-tools-modal')?.classList.add('hidden');
}

function resetAttendanceFieldsForPlayer(player) {
    player.presentCount = 0;
    player.leaveCount = 0;
    player.absentCount = 0;
    player.status = 'ยังไม่เช็คชื่อ';
    player.lastAttendanceWarId = '';
    player.lastAttendanceStatus = '';
    player.lastAttendanceUpdatedAt = '';
    player.rewardClaimed = false;
    player.rewardName = '';
    return player;
}

function resetCurrentWarStatusForPlayer(player) {
    player.status = 'ยังไม่เช็คชื่อ';
    player.lastAttendanceWarId = '';
    player.lastAttendanceStatus = '';
    player.lastAttendanceUpdatedAt = '';
    player.rewardClaimed = false;
    player.rewardName = '';
    return player;
}

async function startNewWarRoundKeepStats() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const ok = window.confirm(
        'เริ่มวอร์ใหม่?\n\n' +
        '- ล้างเฉพาะสถานะเช็คชื่อปัจจุบัน\n' +
        '- ไม่ลบสถิติ มา/ลา/ขาด สะสม\n' +
        '- ไม่ลบคิวรับรางวัล\n' +
        '- ไม่ลบปาร์ตี้ สมาชิก อาชีพ และ Power\n\n' +
        'ใช้ปุ่มนี้ก่อนเริ่มเช็คชื่อวอร์รอบใหม่'
    );
    if (!ok) return;
    players = players.map(p => resetCurrentWarStatusForPlayer(p));
    saveToLocalStorage();
    renderAll();
    try {
        if (window.bellonaDB) {
            await saveSpecificPlayersToFirebaseSafe(players.map(p => p.id), false);
        }
        logActivity('NEW WAR ROUND', 'เริ่มวอร์ใหม่และรีเซ็ตสถานะเช็คชื่อปัจจุบัน');
        alert('เริ่มวอร์ใหม่เรียบร้อยแล้ว');
    } catch (err) {
        console.warn('startNewWarRoundKeepStats error:', err);
        alert('รีเซ็ตในเว็บแล้ว แต่บันทึก Firebase ไม่สำเร็จ: ' + (err.message || err));
    }
}

async function resetWarHistoryKeepMembers() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');

    const ok = window.confirm(
        'ยืนยันรีเซ็ตประวัติวอร์ทั้งหมด?\n\n' +
        '- ล้าง attendanceLogs ทั้งหมด\n' +
        '- รีเซ็ต มา/ลา/ขาด ของสมาชิกทุกคนเป็น 0\n' +
        '- ไม่ลบสมาชิก อาชีพ Power สิทธิ์สุ่ม และปาร์ตี้\n\n' +
        'แนะนำให้ Export Backup ก่อนดำเนินการ'
    );
    if (!ok) return;

    const ok2 = window.confirm('ยืนยันอีกครั้ง: ต้องการรีเซ็ตประวัติวอร์จริง ๆ ใช่ไหม?');
    if (!ok2) return;

    players = players.map(p => resetAttendanceFieldsForPlayer(p));
    attendanceLogs = {};
    rewardWinnerHistory = [];
    rewardDrawnIds = [];

    saveToLocalStorage();
    renderAll();

    if (window.bellonaDB) {
        try {
            await queueFirebaseWrite(async () => {
                const { doc, collection, getDocs, writeBatch } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');

                const logSnap = await getDocs(collection(window.bellonaDB, 'attendanceLogs'));
                let batch = writeBatch(window.bellonaDB);
                let count = 0;
                for (const logDoc of logSnap.docs) {
                    batch.delete(logDoc.ref);
                    count++;
                    if (count >= 450) {
                        await batch.commit();
                        batch = writeBatch(window.bellonaDB);
                        count = 0;
                    }
                }
                if (count > 0) await batch.commit();

                const chunkSize = 450;
                for (let i = 0; i < players.length; i += chunkSize) {
                    const playerBatch = writeBatch(window.bellonaDB);
                    players.slice(i, i + chunkSize).forEach(raw => {
                        const p = normalizePlayer(raw);
                        playerBatch.set(doc(window.bellonaDB, 'players', String(p.id)), buildPlayerFirebasePayload(p), { merge: true });
                    });
                    await playerBatch.commit();
                }
            });
        } catch (err) {
            alert('Reset War History Error: ' + err.message);
            return;
        }
    }

    logActivity('RESET WAR HISTORY', 'รีเซ็ตประวัติวอร์และสถิติ มา/ลา/ขาด ทั้งหมด โดยคงข้อมูลสมาชิกไว้');
    saveToLocalStorage();
    renderAll();
}

function buildBellonaBackupPayload() {
    return {
        app: 'BELLONA ROOC',
        version: '1.0-production',
        exportedAt: new Date().toISOString(),
        storageKey: STORAGE_KEY,
        data: {
            players,
            googleSheetUrl,
            availableJobsList,
            globalMaps,
            selectedGlobalMapId,
            selectedMap,
            markers,
            drawingPaths,
            rewardWinnerHistory,
            rewardDrawnIds,
            attendanceLogs,
            activityLogs,
            rewardQueueSettings,
            rewardQueues,
            rewardQueueAssignments,
            rewardQueueHistory
        }
    };
}

function exportBellonaBackup() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const payload = buildBellonaBackupPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bellona_rooc_backup_${getBangkokDateString()}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logActivity('EXPORT BACKUP', 'ส่งออกไฟล์ Backup สำเร็จ');
}

function triggerBellonaBackupImport() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    safeEl('bellona-backup-file-input')?.click();
}

function importBellonaBackupFile(event) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(String(e.target.result || '{}'));
            const data = parsed.data || parsed;
            if (!data || !Array.isArray(data.players)) {
                alert('ไฟล์ Backup ไม่ถูกต้อง');
                return;
            }
            players = (data.players || []).map(normalizePlayer);
            googleSheetUrl = data.googleSheetUrl || '';
            availableJobsList = Array.isArray(data.availableJobsList) && data.availableJobsList.length ? data.availableJobsList : [...defaultJobsList];
            globalMaps = Array.isArray(data.globalMaps) && data.globalMaps.length ? data.globalMaps : globalMaps;
            ensureDefaultMapsAvailable();
            selectedGlobalMapId = data.selectedGlobalMapId || 'vigrid';
            selectedMap = data.selectedMap || selectedGlobalMapId || 'vigrid';
            markers = Array.isArray(data.markers) ? data.markers : [];
            drawingPaths = Array.isArray(data.drawingPaths) ? data.drawingPaths : [];
            rewardWinnerHistory = Array.isArray(data.rewardWinnerHistory) ? data.rewardWinnerHistory : [];
            rewardDrawnIds = Array.isArray(data.rewardDrawnIds) ? data.rewardDrawnIds.map(String) : [];
            attendanceLogs = data.attendanceLogs && typeof data.attendanceLogs === 'object' ? data.attendanceLogs : {};
            activityLogs = Array.isArray(data.activityLogs) ? data.activityLogs : [];
            rewardQueueSettings = data.rewardQueueSettings && typeof data.rewardQueueSettings === 'object' ? mergeRewardQueueSettings(data.rewardQueueSettings) : rewardQueueSettings;
            rewardQueues = data.rewardQueues && typeof data.rewardQueues === 'object' ? data.rewardQueues : rewardQueues;
            rewardQueueAssignments = data.rewardQueueAssignments && typeof data.rewardQueueAssignments === 'object' ? data.rewardQueueAssignments : {};
            rewardQueueHistory = Array.isArray(data.rewardQueueHistory) ? data.rewardQueueHistory : [];
            logActivity('IMPORT BACKUP', `นำเข้า Backup จากไฟล์ ${file.name}`);
            saveToLocalStorage();
            initPartiesGrid();
            updateMapDropdownOptions();
            displayGlobalMap(selectedGlobalMapId || 'vigrid');
            renderAll();
            if (typeof window.savePlayersToFirebaseSafe === 'function') window.savePlayersToFirebaseSafe(false);
        } catch (err) {
            alert('Import Backup Error: ' + err.message);
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsText(file);
}

window.onload = function() {
    checkLoginSession();
    loadFromLocalStorage();
    initPartiesGrid();
    initDrawingCanvas();
    loadBellonaMapsJson();
    updateMapDropdownOptions();
    displayGlobalMap(selectedGlobalMapId || 'vigrid');
    updateAttendanceRoundDisplay();
    renderAll();
    switchTab('dashboard');
    // Performance v1.0.1: เปิด Realtime แบบหน่วงเวลาและใช้ debounced render เพื่อลดอาการค้างเมื่อสมาชิกเยอะ
    setTimeout(() => {
        if (typeof window.startPlayersRealtimeSync === 'function') window.startPlayersRealtimeSync(false);
        if (typeof window.importRewardQueueFromFirebaseSafe === 'function') window.importRewardQueueFromFirebaseSafe().then(() => renderAll());
        if (typeof window.startRewardQueueRealtimeSync === 'function') window.startRewardQueueRealtimeSync();
    }, 1800);
};

function checkLoginSession() {
    const savedRole = sessionStorage.getItem('bellona_role');
    if (sessionStorage.getItem('bellona_is_logged_in') === 'true' && savedRole) {
        userRole = savedRole;
        const overlay = safeEl('login-overlay-screen');
        if (overlay) overlay.classList.add('hidden');
    }
    applyRolePermissions();
}

async function attemptAdminLogin() {
    try {
        const userInp = (safeEl('login-username')?.value || '').trim();
        const passInp = (safeEl('login-password')?.value || '').trim();
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userInp, password: passInp })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok === true) {
            userRole = 'admin';
            sessionStorage.setItem('bellona_role', 'admin');
            sessionStorage.setItem('bellona_is_logged_in', 'true');
            sessionStorage.setItem('bellona_admin_session', data.session || 'vercel-api');
            safeEl('login-overlay-screen')?.classList.add('hidden');
            applyRolePermissions();
            logActivity('ADMIN LOGIN', 'เข้าสู่ระบบด้วย Vercel API Login');
            renderAll();
        } else {
            alert(data.message || 'รหัสผ่านไม่ถูกต้อง');
        }
    } catch (err) {
        alert('Login API Error: ตรวจสอบว่าเพิ่มไฟล์ /api/login.js และตั้งค่า Environment Variables ใน Vercel แล้ว');
    }
}


function toggleLoginPasswordVisibility() {
    const input = safeEl('login-password');
    const icon = safeEl('login-password-eye-icon');
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    if (icon) icon.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
}

function bypassAsGuest() {
    userRole = 'guest';
    sessionStorage.setItem('bellona_role', 'guest');
    sessionStorage.setItem('bellona_is_logged_in', 'true');
    safeEl('login-overlay-screen')?.classList.add('hidden');
    applyRolePermissions();
    renderAll();
}

function logoutSession() {
    sessionStorage.removeItem('bellona_role');
    sessionStorage.removeItem('bellona_is_logged_in');
    userRole = 'guest';
    safeEl('login-overlay-screen')?.classList.remove('hidden');
    applyRolePermissions();
}

function checkAdminAccess() { return userRole === 'admin'; }

function applyRolePermissions() {
    const badge = safeEl('role-status-badge');
    if (!badge) return;
    if (userRole === 'admin') {
        badge.className = 'px-3.5 py-1.5 rounded text-[11px] font-extrabold text-[#d4af37] border border-[#d4af37]/30 bg-[#232c3f]';
        badge.innerHTML = '<i class="fa-solid fa-lock-open"></i> ADMIN MODE';
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('opacity-40','pointer-events-none'));
    } else {
        badge.className = 'px-3.5 py-1.5 rounded text-[11px] font-extrabold text-gray-400 border border-[#2d3748] bg-[#181f2d]';
        badge.innerHTML = '<i class="fa-solid fa-lock"></i> GUEST MODE';
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('opacity-40','pointer-events-none'));
    }
}

function loadFromLocalStorage() {
    const rawData = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!rawData) return;
    try {
        const data = JSON.parse(rawData);
        players = Array.isArray(data.players) ? data.players.map(normalizePlayer) : [];
        googleSheetUrl = data.googleSheetUrl || '';
        availableJobsList = Array.isArray(data.availableJobsList) && data.availableJobsList.length ? data.availableJobsList : [...defaultJobsList];
        markers = Array.isArray(data.markers) ? data.markers : [];
        drawingPaths = Array.isArray(data.drawingPaths) ? data.drawingPaths : [];
        rewardWinnerHistory = Array.isArray(data.rewardWinnerHistory) ? data.rewardWinnerHistory : [];
        rewardDrawnIds = Array.isArray(data.rewardDrawnIds) ? data.rewardDrawnIds.map(String) : [];
        attendanceLogs = data.attendanceLogs && typeof data.attendanceLogs === 'object' ? data.attendanceLogs : {};
        activityLogs = Array.isArray(data.activityLogs) ? data.activityLogs : [];
        rewardQueueSettings = data.rewardQueueSettings && typeof data.rewardQueueSettings === 'object' ? mergeRewardQueueSettings(data.rewardQueueSettings) : rewardQueueSettings;
        rewardQueues = data.rewardQueues && typeof data.rewardQueues === 'object' ? data.rewardQueues : rewardQueues;
        rewardQueueAssignments = data.rewardQueueAssignments && typeof data.rewardQueueAssignments === 'object' ? data.rewardQueueAssignments : {};
        rewardQueueHistory = Array.isArray(data.rewardQueueHistory) ? data.rewardQueueHistory : [];
        rewardQueueRoundActive = data.rewardQueueRoundActive && typeof data.rewardQueueRoundActive === 'object' ? data.rewardQueueRoundActive : {};
        rewardQueueRoundItems = data.rewardQueueRoundItems && typeof data.rewardQueueRoundItems === 'object' ? data.rewardQueueRoundItems : {};
        rewardQueueRoundPenalties = data.rewardQueueRoundPenalties && typeof data.rewardQueueRoundPenalties === 'object' ? data.rewardQueueRoundPenalties : {};
        selectedGlobalMapId = data.selectedGlobalMapId || 'vigrid';
        selectedMap = data.selectedMap || selectedGlobalMapId || 'vigrid';
        const logoData = localStorage.getItem('bellona_custom_logo_data');
        if (logoData) displayGuildLogo(logoData);
        ensureDefaultMapsAvailable();
    } catch(e) {
        console.error('loadFromLocalStorage error:', e);
    }
}

function saveToLocalStorage() {
    const data = { players, googleSheetUrl, availableJobsList, globalMaps, selectedGlobalMapId, selectedMap, markers, drawingPaths, rewardWinnerHistory, rewardDrawnIds, attendanceLogs, activityLogs, rewardQueueSettings, rewardQueues, rewardQueueAssignments, rewardQueueHistory, rewardQueueRoundActive, rewardQueueRoundItems, rewardQueueRoundPenalties };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function saveToLocalStorageManual() { saveToLocalStorage(); alert('💾 บันทึกฐานข้อมูลกิลด์สำเร็จ!'); }

async function importPlayersFromFirebaseSafe() {
    if (!window.bellonaDB) return alert('Firebase ยังไม่พร้อม');
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        const playerSnap = await getDocs(collection(window.bellonaDB, 'players'));
        players = playerSnap.docs.map(doc => normalizePlayer({ id: doc.id, ...doc.data() }));

        const logSnap = await getDocs(collection(window.bellonaDB, 'attendanceLogs'));
        attendanceLogs = {};
        logSnap.docs.forEach(docSnap => {
            attendanceLogs[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
        });

        logActivity('IMPORT FIREBASE', `ดึงข้อมูลจาก Firebase สำเร็จ: ${players.length} คน`);
        saveToLocalStorage();
        updateAttendanceRoundDisplay();
        renderAll();
    } catch (err) { alert('Firebase Import Error: ' + err.message); }
}

window.savePlayersToFirebaseSafe = async function(showMessage = false) {
    if (!window.bellonaDB) return alert('Firebase ยังไม่พร้อม');
    if (!Array.isArray(players) || players.length === 0) return alert('ยังไม่มีรายชื่อให้บันทึก');

    return queueFirebaseWrite(async () => {
        try {
            const { doc, writeBatch } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            const chunkSize = 450;
            for (let i = 0; i < players.length; i += chunkSize) {
                const batch = writeBatch(window.bellonaDB);
                players.slice(i, i + chunkSize).forEach(raw => {
                    const p = normalizePlayer(raw);
                    batch.set(doc(window.bellonaDB, 'players', String(p.id)), buildPlayerFirebasePayload(p), { merge: true });
                });
                await batch.commit();
            }
            if (showMessage) alert('บันทึกข้อมูลขึ้น Firebase สำเร็จ');
        } catch (err) {
            alert('Firebase Save Error: ' + err.message);
            throw err;
        }
    });
};

window.startPlayersRealtimeSync = async function(showMessage = true) {
    if (!window.bellonaDB) return alert('Firebase ยังไม่พร้อม');
    try {
        const { collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        if (typeof unsubPlayersRealtime === 'function') unsubPlayersRealtime();
        if (typeof unsubAttendanceRealtime === 'function') unsubAttendanceRealtime();
        isRealtimeSyncEnabled = true;

        unsubPlayersRealtime = onSnapshot(collection(window.bellonaDB, 'players'), snapshot => {
            if (isLocalFirebaseMutationInProgress || isLocalPartyMutationInProgress || isLocalRewardMutationInProgress) {
                setTimeout(() => scheduleRenderAll('skip realtime during local mutation', 500), 500);
                return;
            }
            players = snapshot.docs.map(doc => normalizePlayer({ id: doc.id, ...doc.data() }));
            lastFirebaseSyncAt = new Date().toISOString();
            saveToLocalStorage();
            updateAttendanceRoundDisplay();
            scheduleRenderAll('players realtime', 250);
            console.log('Realtime players synced:', players.length);
        });

        unsubAttendanceRealtime = onSnapshot(collection(window.bellonaDB, 'attendanceLogs'), snapshot => {
            attendanceLogs = {};
            snapshot.docs.forEach(docSnap => {
                attendanceLogs[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
            });
            lastFirebaseSyncAt = new Date().toISOString();
            saveToLocalStorage();
            updateAttendanceRoundDisplay();
            scheduleRenderAll('attendance realtime', 350);
            console.log('Realtime attendance logs synced:', Object.keys(attendanceLogs).length);
        });

        if (showMessage) alert('Realtime Sync Started');
    } catch (err) { alert('Realtime Sync Error: ' + err.message); }
};

function stopPlayersRealtimeSync() {
    if (typeof unsubPlayersRealtime === 'function') unsubPlayersRealtime();
    if (typeof unsubAttendanceRealtime === 'function') unsubAttendanceRealtime();
    unsubPlayersRealtime = null;
    unsubAttendanceRealtime = null;
    isRealtimeSyncEnabled = false;
}

