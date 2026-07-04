// BELLONA Refactor v1.1 modular split
// Module: 01-normalize-attendance-firebase.js
// Scope: Player normalization, reward quota, attendance log, Firestore write helpers
// Source: js/bellona-app.js lines 361-656

function normalizePlayer(raw) {
    const status = raw.status || 'ยังไม่เช็คชื่อ';
    const base = {
        id: String(raw.id || raw.name || Date.now() + Math.random()),
        name: raw.name || 'ไม่ระบุชื่อ',
        job: raw.job || 'ไม่ระบุอาชีพ',
        power: normalizePowerLabel(raw.power || ''),
        powerValue: Number(raw.powerValue || parsePowerValue(raw.power || '') || 0),
        status,
        partyId: raw.partyId ?? null,
        slotIndex: raw.slotIndex ?? null,
        partyPlans: raw.partyPlans && typeof raw.partyPlans === 'object' ? raw.partyPlans : {},
        presentCount: Number(raw.presentCount || 0),
        leaveCount: Number(raw.leaveCount || 0),
        absentCount: Number(raw.absentCount || 0),
        hasQuota: (raw.hasQuota === false || raw.hasQuota === 'false') ? false : true,
        rewardName: raw.rewardName || '',
        rewardClaimed: raw.rewardClaimed || false,
        uid: raw.uid || raw.UID || '',
        discordId: raw.discordId || raw.DiscordID || '',
        discordLinked: raw.discordLinked === true || raw.discordLinked === 'true' || !!(raw.discordId || raw.DiscordID),
        discordUsername: raw.discordUsername || '',
        discordDisplayName: raw.discordDisplayName || '',
        lastAttendanceWarId: raw.lastAttendanceWarId || '',
        lastAttendanceStatus: raw.lastAttendanceStatus || '',
        lastAttendanceUpdatedAt: raw.lastAttendanceUpdatedAt || ''
    };
    ensurePlayerPartyPlans(base);
    return base;
}

function hasRewardQuota(player) {
    return player && player.hasQuota !== false && player.hasQuota !== 'false';
}

async function persistRewardQuotaChangesAndRender(reason = 'REWARD QUOTA') {
    isLocalRewardMutationInProgress = true;
    saveToLocalStorage();
    renderRewardsTab();
    renderHeaderCounts();

    try {
        if (typeof window.savePlayersToFirebaseSafe === 'function' && window.bellonaDB) {
            await window.savePlayersToFirebaseSafe(false);
        }
        if (typeof logActivity === 'function') {
            logActivity(reason, 'อัปเดตสิทธิ์สุ่มรางวัลสำเร็จ');
        }
    } catch (err) {
        alert('Reward Quota Save Error: ' + err.message);
    } finally {
        setTimeout(() => { isLocalRewardMutationInProgress = false; }, 900);
        scheduleRenderAll('reward quota updated', 250);
    }
}


/* ================= BELLONA PRODUCTION ATTENDANCE CORE =================
   ระบบเช็คชื่อแบบไม่นับซ้ำ: 1 รอบวอร์ / 1 ตัวละคร / 1 สถานะล่าสุด
   - รอบวอร์สร้างอัตโนมัติจากวันที่ประเทศไทย
   - กดผิดแก้ได้: ระบบลบสถิติเก่าออก แล้วบวกสถานะใหม่แทน
   - ใช้ Firebase collection: attendanceLogs
====================================================================== */
function getBangkokDateString(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
}

function getCurrentWarId() {
    return `gvg-${getBangkokDateString()}`;
}

function getCurrentWarLabel() {
    return getCurrentWarId().replace('gvg-', '');
}

function makeAttendanceLogId(warId, playerId) {
    return `${String(warId).replace(/[^a-zA-Z0-9_-]/g, '-')}_${String(playerId).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function statusToCounterKey(status) {
    if (status === 'มา') return 'presentCount';
    if (status === 'ลา') return 'leaveCount';
    if (status === 'ขาด') return 'absentCount';
    return null;
}

function adjustAttendanceCounter(player, status, delta) {
    const key = statusToCounterKey(status);
    if (!key || !player) return;
    player[key] = Math.max(0, Number(player[key] || 0) + delta);
}

function updateAttendanceRoundDisplay() {
    const el = safeEl('attendance-round-badge');
    if (el) el.innerText = getCurrentWarLabel();
}

async function fetchAttendanceLogFromFirebase(logId) {
    if (!window.bellonaDB) return null;
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        const ref = doc(window.bellonaDB, 'attendanceLogs', logId);
        const snap = await getDoc(ref);
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (err) {
        console.warn('fetchAttendanceLogFromFirebase error:', err);
        return null;
    }
}

async function saveAttendanceLogToFirebase(logId, logData, playerData) {
    if (!window.bellonaDB) return;
    return queueFirebaseWrite(async () => {
        const { doc, writeBatch } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        const batch = writeBatch(window.bellonaDB);
        batch.set(doc(window.bellonaDB, 'attendanceLogs', logId), logData, { merge: true });
        batch.set(doc(window.bellonaDB, 'players', String(playerData.id)), playerData, { merge: true });
        await batch.commit();
    });
}

function buildPlayerFirebasePayload(p) {
    ensurePlayerPartyPlans(p);
    return {
        name: p.name || '',
        job: p.job || '',
        power: normalizePowerLabel(p.power || ''),
        powerValue: Number(p.powerValue || parsePowerValue(p.power || '') || 0),
        status: p.status || 'ยังไม่เช็คชื่อ',
        partyId: p.partyPlans?.guild?.partyId ?? null,
        slotIndex: p.partyPlans?.guild?.slotIndex ?? null,
        partyPlans: p.partyPlans || { guild: { partyId: null, slotIndex: null }, overrun: { partyId: null, slotIndex: null } },
        presentCount: Number(p.presentCount || 0),
        leaveCount: Number(p.leaveCount || 0),
        absentCount: Number(p.absentCount || 0),
        hasQuota: p.hasQuota ?? true,
        rewardName: p.rewardName || '',
        rewardClaimed: p.rewardClaimed || false,
        uid: p.uid || '',
        discordId: p.discordId || '',
        discordLinked: !!(p.discordLinked || p.discordId),
        discordUsername: p.discordUsername || '',
        discordDisplayName: p.discordDisplayName || '',
        lastAttendanceWarId: p.lastAttendanceWarId || '',
        lastAttendanceStatus: p.lastAttendanceStatus || '',
        lastAttendanceUpdatedAt: p.lastAttendanceUpdatedAt || '',
        updatedAt: new Date().toISOString()
    };
}

/* ================= FIREBASE WRITE STABILITY v1.0.6 =================
   ลด Firestore 400 / write channel overload โดยใช้คิวเขียนทีละชุด
   - เพิ่มสมาชิก: เขียนเฉพาะคนใหม่
   - แก้ปาร์ตี้/อาชีพ/สิทธิ์: เขียนเฉพาะรายการที่เกี่ยวข้องเมื่อทำได้
   - Save ทั้งหมด: ใช้ writeBatch เป็นชุด ไม่ Promise.all ยิงถี่พร้อมกัน
====================================================================== */
function beginLocalFirebaseMutation() {
    isLocalFirebaseMutationInProgress = true;
    if (localFirebaseMutationReleaseTimer) clearTimeout(localFirebaseMutationReleaseTimer);
}

function endLocalFirebaseMutation(delay = 900) {
    if (localFirebaseMutationReleaseTimer) clearTimeout(localFirebaseMutationReleaseTimer);
    localFirebaseMutationReleaseTimer = setTimeout(() => {
        isLocalFirebaseMutationInProgress = false;
        localFirebaseMutationReleaseTimer = null;
    }, delay);
}

function queueFirebaseWrite(task) {
    const run = async () => {
        beginLocalFirebaseMutation();
        try {
            return await task();
        } finally {
            endLocalFirebaseMutation();
        }
    };
    firebaseWriteChain = firebaseWriteChain.then(run, run);
    return firebaseWriteChain;
}

function getPlayerById(playerId) {
    return players.find(p => String(p.id) === String(playerId)) || null;
}

async function saveSpecificPlayersToFirebaseSafe(playerIds, showMessage = false) {
    if (!window.bellonaDB) return;
    const ids = [...new Set((Array.isArray(playerIds) ? playerIds : [playerIds]).map(String).filter(Boolean))];
    const targets = ids.map(getPlayerById).filter(Boolean).map(normalizePlayer);
    if (!targets.length) return;

    return queueFirebaseWrite(async () => {
        const { doc, writeBatch } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        const chunkSize = 450;
        for (let i = 0; i < targets.length; i += chunkSize) {
            const batch = writeBatch(window.bellonaDB);
            targets.slice(i, i + chunkSize).forEach(p => {
                batch.set(doc(window.bellonaDB, 'players', String(p.id)), buildPlayerFirebasePayload(p), { merge: true });
            });
            await batch.commit();
        }
        if (showMessage) alert('บันทึกข้อมูลขึ้น Firebase สำเร็จ');
    });
}

async function saveSinglePlayerToFirebaseSafe(playerId, showMessage = false) {
    return saveSpecificPlayersToFirebaseSafe([playerId], showMessage);
}

async function setAttendanceStatusNoDuplicate(playerId, newStatus, options = {}) {
    if (!checkAdminAccess()) {
        if (!options.silent) alert('เฉพาะ Admin เท่านั้น');
        return false;
    }

    const p = players.find(x => String(x.id) === String(playerId));
    if (!p) {
        if (!options.silent) alert('ไม่พบสมาชิก');
        return false;
    }

    const warId = getCurrentWarId();
    const logId = makeAttendanceLogId(warId, p.id);

    let existingLog = attendanceLogs[logId] || null;
    if (!existingLog && window.bellonaDB) {
        existingLog = await fetchAttendanceLogFromFirebase(logId);
    }

    let oldStatus = existingLog?.status || null;

    // fallback สำหรับข้อมูลจาก players เดิม กรณีเพิ่งเริ่มใช้ระบบ attendanceLogs
    if (!oldStatus && p.lastAttendanceWarId === warId && p.lastAttendanceStatus) {
        oldStatus = p.lastAttendanceStatus;
    }

    if (oldStatus && oldStatus !== newStatus) {
        adjustAttendanceCounter(p, oldStatus, -1);
    }

    if (!oldStatus) {
        adjustAttendanceCounter(p, newStatus, +1);
    } else if (oldStatus !== newStatus) {
        adjustAttendanceCounter(p, newStatus, +1);
    }
    // ถ้า oldStatus === newStatus ไม่บวกซ้ำ

    const now = new Date().toISOString();
    p.status = newStatus;
    p.lastAttendanceWarId = warId;
    p.lastAttendanceStatus = newStatus;
    p.lastAttendanceUpdatedAt = now;

    const logData = {
        id: logId,
        warId,
        warDate: getCurrentWarLabel(),
        playerId: String(p.id),
        playerName: p.name || '',
        job: p.job || '',
        power: normalizePowerLabel(p.power || ''),
        powerValue: Number(p.powerValue || 0),
        status: newStatus,
        checkedBy: 'web-admin',
        source: 'web',
        createdAt: existingLog?.createdAt || now,
        updatedAt: now
    };

    attendanceLogs[logId] = logData;
    saveToLocalStorage();

    try {
        if (window.bellonaDB) {
            await saveAttendanceLogToFirebase(logId, logData, { id: p.id, ...buildPlayerFirebasePayload(p) });
        }
    } catch (err) {
        alert('Attendance Save Error: ' + err.message);
        return false;
    }

    if (!options.skipRender) renderAll();
    return true;
}


