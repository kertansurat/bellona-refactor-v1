/* BELLONA Dashboard v3.4 */
const DASH_NOTICE_KEY = 'bellona_dashboard_guild_notice_v1';

function dashSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function dashEscape(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}
function dashPower(player) {
  try {
    if (typeof getPlayerPowerValue === 'function') return getPlayerPowerValue(player);
    if (typeof parsePowerValue === 'function') return parsePowerValue(player.power || '');
  } catch (_) {}
  return Number(player?.powerValue || 0) || 0;
}
function dashPowerLabel(value) {
  try { if (typeof formatCompactPower === 'function') return formatCompactPower(value); } catch (_) {}
  const n = Number(value || 0);
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n || '-');
}

function dashNormalizeJob(job) {
  return String(job || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function dashJobIcon(job) {
  const key = dashNormalizeJob(job);
  const map = {
    'lord knight': 'lordknight.webp',
    'paladin': 'paladin.webp',
    'high priest': 'highpriest.webp',
    'high wizard': 'wizard.webp',
    'wizard': 'wizard.webp',
    'sniper': 'sniper.webp',
    'assassin cross': 'assasin.webp',
    'assassin': 'assasin.webp',
    'champion': 'champion.webp',
    'sage': 'sage.webp',
    'stalker': 'stalker.webp',
    'gypsy': 'dance.webp',
    'dancer': 'dance.webp',
    'mastersmith': 'blacksmith.webp',
    'blacksmith': 'blacksmith.webp',
    'biochemist': 'bio.webp',
    'creator': 'bio.webp',
    'summoner': 'summoner.png',
    'gunslinger': 'gunslinger.png'
  };
  return map[key] ? `./assets/job/${map[key]}` : './assets/logo-bellona.png';
}

function dashThaiDate(date) {
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
}
function dashWarInfo(date = new Date()) {
  const day = date.getDay(); // 0 Sun, 2 Tue, 4 Thu
  if (day === 2 || day === 4) return { hasWar: true, title: 'Guild League', type: 'league', note: 'วอร์ประจำวันอังคาร / พฤหัสบดี' };
  if (day === 0) return { hasWar: true, title: 'Emperium Overrun', type: 'emperium', note: 'วอร์ใหญ่ประจำวันอาทิตย์' };
  return { hasWar: false, title: 'ไม่มีวอร์วันนี้', type: 'none', note: 'ใช้วันนี้เตรียมรายชื่อ ปาร์ตี้ และคิวรางวัล' };
}
function dashNextWars(limit = 3) {
  const result = [];
  const base = new Date();
  for (let i = 1; result.length < limit && i <= 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const info = dashWarInfo(d);
    if (info.hasWar) result.push({ date: d, ...info });
  }
  return result;
}
function renderDashboardWarCalendar() {
  const box = document.getElementById('dash-war-calendar');
  if (!box) return;
  const today = new Date();
  const info = dashWarInfo(today);
  const next = dashNextWars(3);
  box.innerHTML = `
    <div class="dash-war-today ${info.hasWar ? 'has-war' : 'no-war'}">
      <div class="dash-war-date">${dashEscape(dashThaiDate(today))}</div>
      <div class="dash-war-title">${info.hasWar ? '<i class="fa-solid fa-fire"></i>' : '<i class="fa-regular fa-circle-check"></i>'} ${dashEscape(info.title)}</div>
      <div class="dash-war-note">${dashEscape(info.note)}</div>
    </div>
    <div class="dash-war-next-title">วอร์รอบถัดไป</div>
    <div class="dash-war-next-list">
      ${next.map(w => `
        <div class="dash-war-next-row">
          <span>${dashEscape(dashThaiDate(w.date))}</span>
          <b>${dashEscape(w.title)}</b>
        </div>
      `).join('')}
    </div>
  `;
}

function getDashboardGuildNotice() {
  return localStorage.getItem(DASH_NOTICE_KEY) || 'ประกาศจากกิลด์ BELLONA ROOC\n- ตรวจรายชื่อก่อนเริ่มวอร์\n- เตรียมปาร์ตี้และคิวรางวัลให้พร้อม';
}
function renderDashboardGuildNotice() {
  const notice = getDashboardGuildNotice();
  const view = document.getElementById('dash-guild-notice-view');
  const input = document.getElementById('dash-guild-notice-input');
  if (view) {
    view.innerHTML = dashEscape(notice).replace(/\n/g, '<br>');
  }
  if (input && input.value !== notice) input.value = notice;
}
function saveDashboardGuildNotice() {
  try {
    if (typeof checkAdminAccess === 'function' && !checkAdminAccess()) {
      alert('เฉพาะ Admin เท่านั้นที่แก้ประกาศได้');
      return;
    }
  } catch (_) {}
  const input = document.getElementById('dash-guild-notice-input');
  const value = (input?.value || '').trim();
  localStorage.setItem(DASH_NOTICE_KEY, value || '');
  renderDashboardGuildNotice();
  try { if (typeof addActivityLog === 'function') addActivityLog('แก้ประกาศ Dashboard', 'อัปเดต Guild Notice'); } catch (_) {}
  alert('บันทึกประกาศกิลด์แล้ว');
}

function renderDashboard() {
  const list = Array.isArray(players) ? players : [];
  const total = list.length;
  const present = list.filter(p => p.status === 'มา').length;
  const leave = list.filter(p => p.status === 'ลา').length;
  const absent = list.filter(p => p.status === 'ขาด').length;
  const assigned = list.filter(p => p.partyId !== null && p.partyId !== undefined).length;
  const waiting = Math.max(total - assigned, 0);
  const reward = list.filter(p => {
    try { return typeof hasRewardQuota === 'function' ? hasRewardQuota(p) : p.hasQuota !== false && p.hasQuota !== 'false'; }
    catch (_) { return p.hasQuota !== false && p.hasQuota !== 'false'; }
  }).length;
  const rate = total ? Math.round((present / total) * 100) : 0;

  dashSetText('dash-total-members', total);
  dashSetText('dash-present-members', present);
  dashSetText('dash-assigned-members', assigned);
  dashSetText('dash-reward-members', reward);
  dashSetText('dash-leave-members', leave);
  dashSetText('dash-absent-members', absent);
  dashSetText('dash-waiting-members', waiting);
  dashSetText('dash-attendance-rate', `${rate}% ของสมาชิกทั้งหมด`);
  const bar = document.getElementById('dash-present-bar');
  if (bar) bar.style.width = `${rate}%`;
  const round = document.getElementById('attendance-round-badge')?.textContent || '-';
  dashSetText('dash-round-label', `รอบวันนี้: ${round}`);

  const topBox = document.getElementById('dash-top-power');
  if (topBox) {
    const top = [...list].sort((a,b) => dashPower(b) - dashPower(a)).slice(0,5);
    topBox.innerHTML = top.length ? top.map((p,i) => `
      <div class="dash-list-row">
        <div class="min-w-0"><div class="name">${i+1}. ${dashEscape(p.name || '-')}</div><div class="meta">${dashEscape(p.job || '-')}</div></div>
        <span class="dash-pill">${dashEscape(dashPowerLabel(dashPower(p)))}</span>
      </div>`).join('') : '<div class="text-gray-500 text-sm">ยังไม่มีข้อมูลสมาชิก</div>';
  }

  const jobBox = document.getElementById('dash-job-ranking') || document.getElementById('dash-job-summary');
  if (jobBox) {
    const map = new Map();
    list.forEach(p => {
      const job = p.job || 'ไม่ระบุอาชีพ';
      map.set(job, (map.get(job) || 0) + 1);
    });
    const jobs = [...map.entries()].sort((a,b) => b[1] - a[1]);
    const max = jobs.length ? Math.max(...jobs.map(j => j[1])) : 0;
    jobBox.innerHTML = jobs.length ? jobs.map(([job,count], i) => {
      const pct = max ? Math.max(6, Math.round((count / max) * 100)) : 0;
      return `
        <div class="dash-job-row">
          <div class="dash-job-main">
            <img src="${dashEscape(dashJobIcon(job))}" onerror="this.src='./assets/logo-bellona.png'" alt="${dashEscape(job)}">
            <div class="dash-job-text">
              <div class="dash-job-name">${i + 1}. ${dashEscape(job)}</div>
              <div class="dash-job-bar-wrap"><div class="dash-job-bar" style="width:${pct}%"></div></div>
            </div>
          </div>
          <div class="dash-job-count">${count}</div>
        </div>`;
    }).join('') : '<div class="text-gray-500 text-sm">ยังไม่มีข้อมูลอาชีพ</div>';
  }

  renderDashboardWarCalendar();
  renderDashboardGuildNotice();
}
