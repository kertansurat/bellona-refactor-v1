
/* =========================================================
   BELLONA ULTIMATE SUITE - CLEAN FUNCTION CORE
   รวมฟังก์ชันหลักจากชุดสุดท้าย + แก้ syntax/function ซ้ำ/ตัวแปรหาย
========================================================= */

const STORAGE_KEY = 'bellona_gvg_v14_clean';
const LEGACY_STORAGE_KEY = 'bellona_gvg_v13_final';

/* v1.0.8: ไม่เก็บรหัส Admin แบบ plaintext ใน HTML
   หมายเหตุ: ฝั่ง Browser ซ่อนความลับ 100% ไม่ได้ แต่ Hash ช่วยไม่ให้เห็นรหัสจริงในโค้ด
   สำหรับ Production Security จริง ควรอัปเกรดเป็น Firebase Authentication + Firestore Rules */
const ADMIN_LOGIN_USER_HASH = 'cf2de8a9c92433954ccf446b112f5330e0a937e7743f05c04720f166e628930a';
const ADMIN_LOGIN_PASS_HASH = '0f8eb4b72b6e0c9e88b388eb967b49e067ef1004bf07bffc22c3acb13b43580a';

// v114.1 STABILITY: ใช้ native alert/popup จริง ไม่ส่งข้อความไป Console เฉย ๆ
// ห้าม override window.alert เพราะจะทำให้ Popup ยืนยัน/เตือนใน GVG Rewards ไม่แสดง

const defaultJobsList = [
    'Lord Knight','Paladin','High Priest','High Wizard','Sniper','Assassin Cross','Champion',
    'Sage','Stalker','Gypsy','Mastersmith','Biochemist','Summoner','Gunslinger'
];

let availableJobsList = [...defaultJobsList];
/* v114 MAP ENGINE
   - ค่าเริ่มต้นยังอยู่ในโค้ดเพื่อกันกรณี maps.json โหลดไม่ได้
   - ถ้ามีไฟล์ ./maps.json ระบบจะโหลดรายการแผนที่จากไฟล์นั้นอัตโนมัติ
   - เพิ่มแผนที่ใหม่ในอนาคต: วางรูปไว้ assets/maps/ แล้วเพิ่มรายการใน maps.json โดยไม่ต้องแก้ index.html */
let globalMaps = [
    {
        id: 'vigrid',
        name: 'Vigrid',
        file: 'vigrid.png',
        image: './assets/maps/vigrid.png'
    },
    {
        id: 'valeofclash',
        name: 'Vale of Clash',
        file: 'valeofclash.png',
        image: './assets/maps/valeofclash.png'
    }
];

const BELLONA_DEFAULT_MAPS = [
    {
        id: 'vigrid',
        name: 'Vigrid',
        file: 'vigrid.png',
        image: './assets/maps/vigrid.png'
    },
    {
        id: 'valeofclash',
        name: 'Vale of Clash',
        file: 'valeofclash.png',
        image: './assets/maps/valeofclash.png'
    }
];
let bellonaMapsJsonLoaded = false;

function ensureDefaultMapsAvailable() {
    if (!Array.isArray(globalMaps)) globalMaps = [];
    BELLONA_DEFAULT_MAPS.forEach(defaultMap => {
        const existing = globalMaps.find(m => m && m.id === defaultMap.id);
        if (existing) {
            existing.name = existing.name || defaultMap.name;
            existing.image = existing.image || defaultMap.image;
        } else {
            globalMaps.push({ ...defaultMap });
        }
    });
}

function isExternalOrRootMapPath(path) {
    const value = String(path || '').trim();
    return /^https?:\/\//i.test(value) || value.startsWith('./') || value.startsWith('/') || value.startsWith('data:') || value.includes('/');
}

function buildMapImagePath(rawMap) {
    const explicitImage = String(rawMap.image || rawMap.path || '').trim();
    const fileOnly = String(rawMap.file || '').trim();
    const raw = explicitImage || fileOnly;
    if (!raw) return '';
    // v114.1 STABILITY: รองรับทั้ง 3 แบบ
    // 1) file: "vigrid.png" => ./assets/maps/vigrid.png
    // 2) image: "assets/maps/vigrid.png" => ./assets/maps/vigrid.png
    // 3) image: "https://..." => ใช้ URL เดิม
    if (isExternalOrRootMapPath(raw)) return raw.startsWith('assets/') ? `./${raw}` : raw;
    return `./assets/maps/${raw}`;
}

function normalizeMapDefinition(rawMap, index = 0) {
    if (!rawMap || typeof rawMap !== 'object') return null;
    const rawFile = String(rawMap.image || rawMap.path || rawMap.file || '').trim();
    const idSource = String(rawMap.id || rawMap.name || rawMap.file || rawFile || `map-${index + 1}`).trim();
    const id = idSource.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `map-${index + 1}`;
    const name = String(rawMap.name || idSource).replace(/\.[a-z0-9]+$/i, '').trim() || id;
    const image = buildMapImagePath(rawMap);
    if (!image) return null;
    return { id, name, file: rawMap.file || '', image };
}

function mergeMapsFromDefinitions(mapDefinitions) {
    if (!Array.isArray(mapDefinitions)) return false;
    const normalized = mapDefinitions.map(normalizeMapDefinition).filter(Boolean);
    if (!normalized.length) return false;
    normalized.forEach(newMap => {
        const existing = globalMaps.find(m => m && m.id === newMap.id);
        if (existing) {
            existing.name = newMap.name;
            existing.image = newMap.image;
        } else {
            globalMaps.push(newMap);
        }
    });
    bellonaMapsJsonLoaded = true;
    ensureDefaultMapsAvailable();
    return true;
}

async function loadBellonaMapsJson() {
    const candidates = ['./maps.json', './assets/maps/maps.json'];
    for (const url of candidates) {
        try {
            const res = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) continue;
            const data = await res.json();
            const maps = Array.isArray(data) ? data : (Array.isArray(data.maps) ? data.maps : []);
            if (mergeMapsFromDefinitions(maps)) {
                console.log(`BELLONA Map Engine: loaded ${maps.length} map definitions from ${url}`);
                saveToLocalStorage();
                updateMapDropdownOptions();
                if (selectedGlobalMapId && selectedGlobalMapId !== 'default') displayGlobalMap(selectedGlobalMapId);
                return true;
            }
        } catch (err) {
            console.warn(`BELLONA Map Engine: cannot load ${url}`, err.message);
        }
    }
    ensureDefaultMapsAvailable();
    updateMapDropdownOptions();
    return false;
}
let selectedGlobalMapId = 'vigrid';
let selectedMap = 'vigrid';
let googleSheetUrl = '';
let userRole = 'guest';
let players = [];
let markers = [];
let selectedPlayerId = null;
let currentPartyPlan = localStorage.getItem('bellona_current_party_plan') || 'guild';

let canvas = null;
let ctx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let drawMode = 'move';
let drawColor = '#ff4d4d';
let brushSize = 4;
let drawingPaths = [];
let shapeStartX = 0, shapeStartY = 0;
let previewSnapshot = null;
let rewardWinnerHistory = [];
let rewardDrawnIds = [];
let rewardSpinLock = false;
let attendanceLogs = {};
let activityLogs = [];
let unsubPlayersRealtime = null;
let unsubAttendanceRealtime = null;
let firebaseWriteChain = Promise.resolve();
let isLocalFirebaseMutationInProgress = false;
let localFirebaseMutationReleaseTimer = null;
let renderDebounceTimer = null;
let lastFirebaseSyncAt = null;
let isRealtimeSyncEnabled = false;
let isLocalPartyMutationInProgress = false;
let isLocalRewardMutationInProgress = false;

let rewardQueueSettings = {
    cardBook: { enabled: true, icon: '📘', name: 'สมุดการ์ด', unit: 'เล่ม', amount: 8, startPage: 1, endPage: 2, perPage: 4, mode: 'slot' },
    goldBox: { enabled: true, icon: '📦', name: 'กล่องเศษการ์ด', unit: 'กล่อง', amount: 8, startPage: 3, endPage: 4, perPage: 4, mode: 'slot' },
    whiteFeather: { enabled: true, icon: '🪶', name: 'ขนนกขาว', unit: 'หน้า', amount: 5, startPage: 5, endPage: 9, perPage: 4, mode: 'page' },
    redFeather: { enabled: true, icon: '🔴', name: 'ขนนกแดง', unit: 'หน้า', amount: 5, startPage: 10, endPage: 14, perPage: 4, mode: 'page' }
};
let rewardQueues = { cardBook: [], goldBox: [], whiteFeather: [], redFeather: [] };
let rewardQueueAssignments = {};
let rewardQueueHistory = [];
let rewardQueueUndoStack = [];
let activeRewardQueueType = 'cardBook';
let activeRewardQueueAction = null;
let rewardQueueDragData = null;
let rewardQueueDirty = false;
let unsubRewardQueueRealtime = null;
let rewardQueueRoundActive = {};
let rewardQueueRoundItems = {};
let rewardQueueRoundPenalties = {};

function safeEl(id) { return document.getElementById(id); }
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}
function escapeInlineJs(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
}

async function sha256Text(value) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับ Secure Hash กรุณาเปิดผ่าน HTTPS หรือ Vercel');
    }
    const data = new TextEncoder().encode(String(value || ''));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function parsePowerValue(value) {
    const raw = String(value ?? '').trim().toUpperCase().replace(/,/g, '');
    if (!raw) return 0;
    const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)([KMB])?$/);
    if (!match) {
        const numeric = Number(raw.replace(/[^0-9.]/g, ''));
        return Number.isFinite(numeric) ? Math.round(numeric) : 0;
    }
    const num = Number(match[1]);
    const unit = match[2] || '';
    const multiplier = unit === 'K' ? 1000 : unit === 'M' ? 1000000 : unit === 'B' ? 1000000000 : 1;
    return Math.round(num * multiplier);
}

function normalizePowerLabel(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    if (!raw) return '';
    return raw.replace(/\s+/g, '');
}



function formatCompactPower(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num) || num <= 0) return '-';
    if (num >= 1000000000) return (num / 1000000000).toFixed(num >= 10000000000 ? 1 : 2).replace(/\.0+$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(num >= 10000000 ? 1 : 2).replace(/\.0+$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(num >= 100000 ? 0 : 1).replace(/\.0+$/, '') + 'K';
    return String(Math.round(num));
}

function getPlayerPowerValue(player) {
    if (!player) return 0;
    return Number(player.powerValue || parsePowerValue(player.power || '') || 0);
}


const PARTY_PLAN_LABELS = {
    guild: 'Guild League',
    overrun: 'Emperium Overrun'
};

function normalizePartyPlanKey(plan) {
    return plan === 'overrun' ? 'overrun' : 'guild';
}

function ensurePlayerPartyPlans(player) {
    if (!player) return {};
    const plans = (player.partyPlans && typeof player.partyPlans === 'object') ? { ...player.partyPlans } : {};
    plans.guild = plans.guild && typeof plans.guild === 'object' ? plans.guild : {};
    plans.overrun = plans.overrun && typeof plans.overrun === 'object' ? plans.overrun : {};
    if ((player.partyId !== null && player.partyId !== undefined) && !plans.guild.partyId) {
        plans.guild.partyId = player.partyId;
        plans.guild.slotIndex = player.slotIndex ?? null;
    }
    ['guild', 'overrun'].forEach(plan => {
        const state = plans[plan] || {};
        plans[plan] = {
            partyId: state.partyId ?? null,
            slotIndex: state.slotIndex ?? null
        };
    });
    player.partyPlans = plans;
    player.partyId = plans.guild.partyId ?? null;
    player.slotIndex = plans.guild.slotIndex ?? null;
    return plans;
}

function getPlayerPlanState(player, plan = currentPartyPlan) {
    const plans = ensurePlayerPartyPlans(player);
    return plans[normalizePartyPlanKey(plan)] || { partyId: null, slotIndex: null };
}

function setPlayerPlanState(player, plan, partyId, slotIndex) {
    const plans = ensurePlayerPartyPlans(player);
    const key = normalizePartyPlanKey(plan);
    plans[key] = { partyId: partyId ?? null, slotIndex: slotIndex ?? null };
    if (key === 'guild') {
        player.partyId = plans.guild.partyId ?? null;
        player.slotIndex = plans.guild.slotIndex ?? null;
    }
}

function getActivePartyPlanLabel() {
    return PARTY_PLAN_LABELS[normalizePartyPlanKey(currentPartyPlan)] || PARTY_PLAN_LABELS.guild;
}


let currentPartyView = localStorage.getItem('bellona_current_party_view') || 'main';
function normalizePartyView(view) {
    return view === 'sub' ? 'sub' : 'main';
}
function updatePartyViewUI() {
    currentPartyView = normalizePartyView(currentPartyView);
    const mainBtn = safeEl('party-view-btn-main');
    const subBtn = safeEl('party-view-btn-sub');
    const zone = safeEl('capture-party-combined-zone');
    if (mainBtn) mainBtn.classList.toggle('active', currentPartyView === 'main');
    if (subBtn) subBtn.classList.toggle('active', currentPartyView === 'sub');
    if (zone) {
        zone.classList.toggle('party-view-main', currentPartyView === 'main');
        zone.classList.toggle('party-view-sub', currentPartyView === 'sub');
    }
}
function switchPartyView(view) {
    currentPartyView = normalizePartyView(view);
    localStorage.setItem('bellona_current_party_view', currentPartyView);
    selectedPlayerId = null;
    updatePartyViewUI();
    renderWaitingList();
    renderParties();
}

function updatePartyPlanUI() {
    currentPartyPlan = normalizePartyPlanKey(currentPartyPlan);
    const guildBtn = safeEl('party-plan-btn-guild');
    const overrunBtn = safeEl('party-plan-btn-overrun');
    if (guildBtn) guildBtn.classList.toggle('active', currentPartyPlan === 'guild');
    if (overrunBtn) overrunBtn.classList.toggle('active', currentPartyPlan === 'overrun');
    const label = getActivePartyPlanLabel();
    if (safeEl('main-plan-label')) safeEl('main-plan-label').innerText = label;
    if (safeEl('sub-plan-label')) safeEl('sub-plan-label').innerText = label;
    updatePartyViewUI();
}

function switchPartyPlan(plan) {
    currentPartyPlan = normalizePartyPlanKey(plan);
    localStorage.setItem('bellona_current_party_plan', currentPartyPlan);
    selectedPlayerId = null;
    updatePartyPlanUI();
    renderWaitingList();
    renderParties();
    renderHeaderCounts();
}

function getPartyAssignedPlayers(plan = currentPartyPlan) {
    const key = normalizePartyPlanKey(plan);
    return players.filter(p => {
        const st = getPlayerPlanState(p, key);
        return st.partyId !== null && st.partyId !== undefined;
    });
}

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
    const statusFilter = safeEl('search-status-dropdown')?.value || 'all';
    const active = getCurrentActiveTab ? getCurrentActiveTab() : 'party';
    return players.filter(p => {
        const hay = [p.name, p.uid, p.id, p.job, p.discordId].map(v => String(v || '').toLowerCase()).join(' ');
        const byKeyword = !keyword || hay.includes(keyword);
        const byJob = job === 'all' || p.job === job;
        if (!byKeyword || !byJob) return false;
        if (statusFilter !== 'all') {
            const sidebarState = getSidebarPlayerState(p);
            const hasParty = sidebarState.text === 'อยู่ในปาร์ตี้แล้ว';
            const isLeave = p.status === 'ลา';
            const isAbsent = p.status === 'ขาด';
            const isReady = sidebarState.text === 'พร้อมจัดปาร์ตี้';
            if (statusFilter === 'ready' && !isReady) return false;
            if (statusFilter === 'assigned' && !hasParty) return false;
            if (statusFilter === 'waiting' && !isReady) return false;
            if (statusFilter === 'leave' && !isLeave) return false;
            if (statusFilter === 'absent' && !isAbsent) return false;
        }
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

let statsSearchQuery = '';
let statsSearchDebounceTimer = null;

function normalizeStatsSearchText(value) {
    return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function getPlayerSearchBlob(player) {
    return normalizeStatsSearchText([
        player?.name,
        player?.job,
        player?.uid,
        player?.UID,
        player?.discordId,
        player?.DiscordID,
        player?.id
    ].filter(Boolean).join(' '));
}

function handleStatsSearchInput(value) {
    clearTimeout(statsSearchDebounceTimer);
    statsSearchDebounceTimer = setTimeout(() => {
        statsSearchQuery = normalizeStatsSearchText(value);
        renderStatsTab();
    }, 180);
}

function renderStatsMemberSummary(matches, absentMap) {
    const box = safeEl('stats-member-summary');
    if (!box) return;
    const query = normalizeStatsSearchText(statsSearchQuery);
    if (!query) {
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
    }
    box.classList.remove('hidden');
    if (!matches.length) {
        box.innerHTML = `<div class="stats-empty-result"><i class="fa-solid fa-circle-info"></i> ไม่พบสมาชิกที่ตรงกับคำค้นหา</div>`;
        return;
    }
    const p = matches[0];
    const total = (p.presentCount || 0) + (p.leaveCount || 0) + (p.absentCount || 0);
    const rate = total > 0 ? Math.round(((p.presentCount || 0) / total) * 100) : 0;
    const consecutiveAbsent = absentMap[String(p.id)] ?? ((p.status === 'ขาด') ? 1 : 0);
    const more = matches.length > 1 ? `<span class="stats-more-match">พบ ${matches.length} รายการ แสดงสรุปรายการแรก</span>` : '';
    box.innerHTML = `
        <div class="stats-summary-card">
            <div class="stats-summary-main">
                <div class="stats-summary-avatar">${escapeHtml(String(p.name || '?').slice(0,1).toUpperCase())}</div>
                <div>
                    <div class="stats-summary-name">${escapeHtml(p.name || '-')}</div>
                    <div class="stats-summary-meta">${escapeHtml(p.job || '-')} ${p.uid ? '• UID ' + escapeHtml(p.uid) : ''}</div>
                    ${more}
                </div>
            </div>
            <div class="stats-summary-grid">
                <div><b class="text-green-400">${p.presentCount || 0}</b><span>มาวอร์</span></div>
                <div><b class="text-amber-400">${p.leaveCount || 0}</b><span>ลา</span></div>
                <div><b class="text-red-400">${p.absentCount || 0}</b><span>ขาด</span></div>
                <div><b class="${consecutiveAbsent >= 3 ? 'text-red-300' : 'text-gray-200'}">${consecutiveAbsent}</b><span>ขาดติดกัน</span></div>
                <div><b class="text-[#d4af37]">${rate}%</b><span>Attendance</span></div>
            </div>
        </div>`;
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
    const query = normalizeStatsSearchText(statsSearchQuery || safeEl('stats-member-search')?.value || '');
    const visiblePlayers = query ? players.filter(p => getPlayerSearchBlob(p).includes(query)) : players;
    renderStatsMemberSummary(visiblePlayers, absentMap);
    const statsRowsHtml = visiblePlayers.map(p => {
        totalP += p.presentCount || 0;
        totalL += p.leaveCount || 0;
        totalA += p.absentCount || 0;
        const consecutiveAbsent = absentMap[String(p.id)] ?? ((p.status === 'ขาด') ? 1 : 0);
        const consecutiveClass = consecutiveAbsent >= 3 ? 'text-red-300 font-extrabold' : consecutiveAbsent > 0 ? 'text-red-400 font-bold' : 'text-gray-500';
        return `<tr><td class="p-3 font-bold">${escapeHtml(p.name)}</td><td class="p-3 text-gray-400">${escapeHtml(p.job)}</td><td class="p-3 text-center text-green-400">${p.presentCount || 0}</td><td class="p-3 text-center text-amber-400">${p.leaveCount || 0}</td><td class="p-3 text-center text-red-400">${p.absentCount || 0}</td><td class="p-3 text-center ${consecutiveClass}">${consecutiveAbsent} ครั้ง</td></tr>`;
    }).join('');
    tbody.innerHTML = statsRowsHtml
        ? statsRowsHtml + `<tr class="stats-table-spacer" aria-hidden="true"><td colspan="6"></td></tr>`
        : `<tr><td colspan="6" class="p-8 text-center text-gray-500 font-bold">ไม่พบข้อมูลสมาชิกที่ค้นหา</td></tr>`;
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

function switchTab(t) {
    ['dashboard','members','party','tactical','auction','queuecheck','rewards','stats'].forEach(tab => safeEl(`tab-content-${tab}`)?.classList.add('hidden'));
    safeEl(`tab-content-${t}`)?.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    safeEl(`tab-btn-${t}`)?.classList.add('active');
    const sidebar = safeEl('player-sidebar');
    if (sidebar) sidebar.classList.toggle('sidebar-hidden', !(t === 'party' || t === 'members'));
    if (t === 'tactical') setTimeout(resizeCanvas, 50);
    renderAll();
}

function addMapViaUrlManual() {}
function updateMapDropdownOptions() {
    const selector = safeEl('map-selector');
    if (!selector) return;
    selector.innerHTML = '<option value="default">🖥️ พื้นหลังบอร์ดมาตรฐานกิลด์ BELLONA</option>' + globalMaps.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('');
    selector.value = selectedMap || 'default';
    renderGlobalMapsList();
}
function renderGlobalMapsList() {
    const list = safeEl('saved-maps-list');
    if (!list) return;
    list.innerHTML = '';
    globalMaps.forEach(m => {
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-2 rounded text-xs border ${selectedGlobalMapId === m.id ? 'bg-amber-950/20 border-[#d4af37]' : 'bg-[#181f2d] border-[#222b3c]'}`;
        item.innerHTML = `<span class="cursor-pointer font-bold" onclick="displayGlobalMap('${escapeHtml(m.id)}')">🗺️ ${escapeHtml(m.name)}</span><div class="flex items-center gap-2"><button onclick="editMapName('${escapeHtml(m.id)}')" class="text-gray-400 hover:text-[#d4af37] admin-only"><i class="fa-solid fa-pencil text-[10px]"></i></button><button onclick="deleteGlobalMap('${escapeHtml(m.id)}')" class="text-red-400 admin-only">✕</button></div>`;
        list.appendChild(item);
    });
    applyRolePermissions();
}
function editMapName(id) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const map = globalMaps.find(m => m.id === id);
    if (!map) return;
    const newName = prompt('ระบุชื่อแผนที่ใหม่:', map.name);
    if (newName && newName.trim()) { map.name = newName.trim().substring(0, 20); saveToLocalStorage(); updateMapDropdownOptions(); }
}
function displayGlobalMap(id) {
    const map = globalMaps.find(m => m.id === id) || globalMaps[0];
    if (!map) return changeBattleMap('default');
    const bgImg = safeEl('battle-map-bg');
    const placeholder = safeEl('battle-map-placeholder');
    if (bgImg) {
        bgImg.crossOrigin = 'anonymous';
        bgImg.onerror = function() {
            console.warn('BELLONA Map Engine: map image failed:', map.image);
            // fallback กรณีกรอก image เป็น assets/maps/name.png แต่ path แปลกจาก browser cache
            if (map.file && bgImg.src.indexOf('/assets/maps/' + map.file) === -1) {
                bgImg.src = './assets/maps/' + map.file;
                return;
            }
            bgImg.classList.add('hidden');
            if (placeholder) placeholder.classList.remove('hidden');
        };
        bgImg.onload = function() {
            bgImg.classList.remove('hidden');
            if (placeholder) placeholder.classList.add('hidden');
            setTimeout(resizeCanvas, 50);
        };
        bgImg.src = map.image;
        bgImg.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    selectedGlobalMapId = map.id; selectedMap = map.id;
    if (safeEl('map-selector')) safeEl('map-selector').value = map.id;
    saveToLocalStorage(); renderGlobalMapsList(); setTimeout(resizeCanvas, 50);
}
function deleteGlobalMap(id) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    globalMaps = globalMaps.filter(m => m.id !== id);
    ensureDefaultMapsAvailable();
    changeBattleMap(globalMaps[0].id);
}
function changeBattleMap(val) {
    selectedMap = val;
    const bgImg = safeEl('battle-map-bg');
    const placeholder = safeEl('battle-map-placeholder');
    if (val && val !== 'default') return displayGlobalMap(val);
    selectedGlobalMapId = null;
    if (bgImg) bgImg.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (safeEl('map-selector')) safeEl('map-selector').value = 'default';
    saveToLocalStorage(); renderGlobalMapsList();
}
function updateGuildLogoViaUrl() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const url = (safeEl('guild-logo-url-input')?.value || '').trim();
    if (!url) return;
    localStorage.setItem('bellona_custom_logo_data', url);
    displayGuildLogo(url);
}
function displayGuildLogo(url) {
    ['login-logo','header-logo','fallback-watermark-logo'].forEach(id => { const img = safeEl(id); if (img) img.src = url; });
}

function initDrawingCanvas() {
    canvas = safeEl('drawing-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.addEventListener('mousedown', e => {
        if (!['draw','line','rect','circle'].includes(drawMode) || !checkAdminAccess()) return;
        isDrawing = true;
        [lastX,lastY] = getCanvasMousePos(e);
        [shapeStartX, shapeStartY] = [lastX, lastY];
        previewSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    });
    canvas.addEventListener('mousemove', e => {
        if (!isDrawing) return;
        const [x,y] = getCanvasMousePos(e);
        if (drawMode === 'draw') {
            ctx.strokeStyle = drawColor; ctx.lineWidth = brushSize; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke();
            drawingPaths.push({ type:'free', x1:lastX, y1:lastY, x2:x, y2:y, color:drawColor, size:brushSize });
            [lastX,lastY] = [x,y];
        } else {
            if (previewSnapshot) ctx.putImageData(previewSnapshot, 0, 0);
            drawShapeOnContext(ctx, { type: drawMode, x1: shapeStartX, y1: shapeStartY, x2: x, y2: y, color: drawColor, size: brushSize });
        }
    });
    const finish = e => {
        if (!isDrawing) return;
        const [x,y] = getCanvasMousePos(e);
        if (drawMode !== 'draw') {
            if (previewSnapshot) ctx.putImageData(previewSnapshot, 0, 0);
            const shape = { type: drawMode, x1: shapeStartX, y1: shapeStartY, x2: x, y2: y, color: drawColor, size: brushSize };
            drawingPaths.push(shape);
            drawShapeOnContext(ctx, shape);
        }
        isDrawing = false;
        previewSnapshot = null;
        saveToLocalStorage();
    };
    canvas.addEventListener('mouseup', finish);
    canvas.addEventListener('mouseleave', () => { if (isDrawing) { isDrawing = false; previewSnapshot = null; redrawCanvasPaths(); saveToLocalStorage(); } });
    setTimeout(resizeCanvas, 100);
}
function getCanvasMousePos(e) { const rect = canvas.getBoundingClientRect(); return [((e.clientX - rect.left) / rect.width) * canvas.width, ((e.clientY - rect.top) / rect.height) * canvas.height]; }
function resizeCanvas() { if (!canvas) return; canvas.width = 1500; canvas.height = 1500; redrawCanvasPaths(); }
function setDrawMode(mode) {
    drawMode = mode;
    document.querySelectorAll('.draw-tool').forEach(b => {
        b.classList.remove('bg-[#d4af37]','text-black');
        b.classList.add('bg-[#1c2331]','text-gray-300');
    });
    const btn = safeEl(`tool-${mode}`);
    if (btn) {
        btn.classList.remove('bg-[#1c2331]','text-gray-300');
        btn.classList.add('bg-[#d4af37]','text-black');
    }
}
function setDrawColor(color) { drawColor = color; }
function updateBrushSize(value) { brushSize = Number(value) || 4; }
function clearDrawing() { if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น'); drawingPaths = []; redrawCanvasPaths(); saveToLocalStorage(); }
function undoDrawing() { if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น'); drawingPaths.splice(-1); redrawCanvasPaths(); saveToLocalStorage(); }
function drawShapeOnContext(targetCtx, p) {
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.strokeStyle = p.color || drawColor;
    targetCtx.lineWidth = p.size || brushSize;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    if ((p.type || 'free') === 'rect') {
        targetCtx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1);
    } else if (p.type === 'circle') {
        const cx = (p.x1 + p.x2) / 2;
        const cy = (p.y1 + p.y2) / 2;
        const rx = Math.abs(p.x2 - p.x1) / 2;
        const ry = Math.abs(p.y2 - p.y1) / 2;
        targetCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        targetCtx.stroke();
    } else {
        targetCtx.moveTo(p.x1, p.y1);
        targetCtx.lineTo(p.x2, p.y2);
        targetCtx.stroke();
    }
    targetCtx.restore();
}
function redrawCanvasPaths() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawingPaths.forEach(p => drawShapeOnContext(ctx, p));
}
function exportTacticalMap() {
    exportTacticalMapManualFallback();
}
function exportTacticalMapManualFallback() {
    if (!canvas) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1500;
    exportCanvas.height = 1500;
    const exCtx = exportCanvas.getContext('2d');
    const bgImg = safeEl('battle-map-bg');
    try {
        if (bgImg && bgImg.src && !bgImg.classList.contains('hidden') && bgImg.complete) exCtx.drawImage(bgImg,0,0,exportCanvas.width,exportCanvas.height);
        else { exCtx.fillStyle = '#0c0e14'; exCtx.fillRect(0,0,exportCanvas.width,exportCanvas.height); }
        exCtx.drawImage(canvas,0,0);
        markers.forEach(m => drawMarkerOnContext(exCtx, m, exportCanvas.width, exportCanvas.height));
        const link = document.createElement('a');
        link.download = `bellona-tactical-map-${Date.now()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.warn('manual tactical export error:', err);
        alert('เซฟรูปภาพไม่สำเร็จ อาจเกิดจากรูปแผนที่ภายนอกไม่อนุญาตให้บันทึก');
    }
}
function drawMarkerOnContext(targetCtx, m, width, height) {
    const posX = (m.posX/100) * width;
    const posY = (m.posY/100) * height;
    const color = m.color || '#dc2626';
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(posX,posY,26,0,2*Math.PI);
    targetCtx.fillStyle = color;
    targetCtx.strokeStyle = '#ffffff';
    targetCtx.lineWidth = 4;
    targetCtx.fill();
    targetCtx.stroke();
    targetCtx.fillStyle = '#ffffff';
    targetCtx.font = '900 15px Inter, sans-serif';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText(String(m.name || '').substring(0,3), posX, posY);
    targetCtx.restore();
}

function addNewMarker() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const inputName = (safeEl('new-marker-name')?.value || '').trim();
    const promptName = inputName || prompt('ระบุชื่อสัญลักษณ์หมุดปักใหม่:', 'หมากรบ');
    if (!promptName || !promptName.trim()) return;
    markers.push({ id:'m_'+Date.now(), name:promptName.trim(), posX:15, posY:15, color:(safeEl('new-marker-color')?.value || '#dc2626') });
    if (safeEl('new-marker-name')) safeEl('new-marker-name').value = '';
    saveToLocalStorage(); renderMarkers(); renderMarkersSettingList();
}
function renderMarkers() {
    const overlay = safeEl('markers-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    markers.forEach(m => {
        const el = document.createElement('div');
        el.className = 'absolute z-30 pointer-events-auto cursor-move select-none';
        el.style.left = `${m.posX}%`; el.style.top = `${m.posY}%`; el.style.transform = 'translate(-50%, -50%)';
        el.innerHTML = `<div class="marker-token" style="background:${escapeHtml(m.color || '#dc2626')}">${escapeHtml(String(m.name || '').substring(0,3))}</div>`;
        el.onmousedown = event => startMarkerDrag(event, m.id);
        overlay.appendChild(el);
    });
}
function startMarkerDrag(event, markerId) {
    if (!checkAdminAccess() || drawMode !== 'move') return;
    event.preventDefault(); event.stopPropagation();
    const wrapper = safeEl('tactical-board-wrapper');
    const move = e => {
        const rect = wrapper.getBoundingClientRect();
        const marker = markers.find(m => m.id === markerId);
        if (!marker) return;
        marker.posX = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        marker.posY = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
        renderMarkers();
    };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); saveToLocalStorage(); renderMarkersSettingList(); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
}
function renderMarkersSettingList() {
    const list = safeEl('markers-setting-list');
    if (!list) return;
    list.innerHTML = '';
    markers.forEach(m => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between gap-2 bg-[#181f2d] border border-[#222b3c] rounded p-2 text-xs';
        row.innerHTML = `<div class="flex items-center gap-2 min-w-0"><span class="w-4 h-4 rounded-full border border-white/60 shrink-0" style="background:${escapeHtml(m.color || '#dc2626')}"></span><span class="font-bold text-gray-200 truncate">${escapeHtml(m.name)}</span></div><button onclick="deleteMarker('${escapeHtml(m.id)}')" class="admin-only text-red-400">ลบ</button>`;
        list.appendChild(row);
    });
    applyRolePermissions();
}
function deleteMarker(id) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    markers = markers.filter(m => m.id !== id);
    saveToLocalStorage(); renderMarkers(); renderMarkersSettingList();
}
function resetMarkersToDefault() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    markers = [];
    saveToLocalStorage(); renderMarkers(); renderMarkersSettingList();
}

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
