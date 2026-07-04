// BELLONA Refactor v1.1 modular split
// Module: 00-core-state.js
// Scope: Core constants, state, map definitions, party plan/view helpers
// Source: js/bellona-app.js lines 1-360

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

