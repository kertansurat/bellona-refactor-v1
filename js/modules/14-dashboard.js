/* BELLONA Dashboard v2.1 final - scoped */
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
function dashJobCode(job) {
  const key = dashNormalizeJob(job);
  const map = {
    'lord knight': 'LK',
    'paladin': 'PLD',
    'high priest': 'HP',
    'high wizard': 'HW',
    'wizard': 'WIZ',
    'sniper': 'SNP',
    'assassin cross': 'ASN',
    'assassin': 'ASN',
    'champion': 'CHP',
    'sage': 'SAG',
    'stalker': 'STK',
    'gypsy': 'GYP',
    'dancer': 'GYP',
    'mastersmith': 'MS',
    'blacksmith': 'MS',
    'biochemist': 'BIO',
    'creator': 'BIO',
    'summoner': 'SUM',
    'gunslinger': 'GUN'
  };
  return map[key] || String(job || '-').slice(0, 3).toUpperCase();
}
function dashJobColorClass(job) {
  const key = dashNormalizeJob(job);
  const map = {
    'lord knight': 'job-red-1',
    'paladin': 'job-red-2',
    'high priest': 'job-green-1',
    'high wizard': 'job-blue-1',
    'wizard': 'job-blue-1',
    'sniper': 'job-gold-1',
    'assassin cross': 'job-purple-1',
    'assassin': 'job-purple-1',
    'champion': 'job-green-2',
    'sage': 'job-blue-2',
    'stalker': 'job-purple-2',
    'gypsy': 'job-gold-2',
    'dancer': 'job-gold-2',
    'mastersmith': 'job-brown-1',
    'blacksmith': 'job-brown-1',
    'biochemist': 'job-brown-2',
    'creator': 'job-brown-2',
    'summoner': 'job-pink-1',
    'gunslinger': 'job-gun-1'
  };
  return map[key] || 'job-gold-1';
}
function dashThaiDate(date) {
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
}
function dashWarInfo(date = new Date()) {
  const day = date.getDay();
  if (day === 2 || day === 4) return { hasWar: true, title: 'Guild League', type: 'league', note: 'วอร์ประจำวันอังคาร / พฤหัสบดี' };
  if (day === 0) return { hasWar: true, title: 'Emperium Overrun', type: 'emperium', note: 'วอร์ใหญ่ประจำวันอาทิตย์' };
  return { hasWar: false, title: 'ไม่มีวอร์วันนี้', type: 'none', note: 'ใช้วันนี้เตรียมรายชื่อ ปาร์ตี้ และคิวรางวัล' };
}
function dashNextWars(limit = 2) {
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
function getDashboardGuildNotice() {
  return localStorage.getItem(DASH_NOTICE_KEY) || 'ประกาศจากกิลด์ BELLONA ROOC\n- ตรวจรายชื่อก่อนเริ่มวอร์\n- เตรียมปาร์ตี้และคิวรางวัลให้พร้อม';
}
function renderDashboardGuildNotice() {
  const notice = getDashboardGuildNotice();
  const view = document.getElementById('dash-guild-notice-view');
  const input = document.getElementById('dash-guild-notice-input');
  if (view) view.innerHTML = dashEscape(notice).replace(/\n/g, '<br>');
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
function renderDashboardWarCalendar(stats) {
  const box = document.getElementById('dash-war-calendar');
  if (!box) return;
  const today = new Date();
  const info = dashWarInfo(today);
  const next = dashNextWars(2);
  box.innerHTML = `
    <div class="dash-v21-war-main ${info.hasWar ? 'has-war' : 'no-war'}">
      <div class="dash-v21-war-date">${dashEscape(dashThaiDate(today))}</div>
      <div class="dash-v21-war-title">${dashEscape(info.title)}</div>
      <div class="dash-v21-war-note">${dashEscape(info.note)}</div>
      <div class="dash-v21-war-stats">
        <div><b>${stats.present}</b><span>มา</span></div>
        <div><b>${stats.leave}</b><span>ลา</span></div>
        <div><b>${stats.absent}</b><span>ขาด</span></div>
      </div>
    </div>
    <div class="dash-v21-war-next">
      ${next.map(w => `
        <div class="dash-v21-war-next-row">
          <span>${dashEscape(dashThaiDate(w.date))}</span>
          <b>${dashEscape(w.title)}</b>
        </div>
      `).join('')}
    </div>`;
}
function renderDashboard() {
  const list = Array.isArray(window.players) ? window.players : ((typeof players !== 'undefined' && Array.isArray(players)) ? players : []);
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
      <div class="dash-v21-top-row">
        <span class="rank">${i+1}</span>
        <img src="${dashEscape(dashJobIcon(p.job))}" onerror="this.src='./assets/logo-bellona.png'" alt="">
        <div class="info"><b>${dashEscape(p.name || '-')}</b><small>${dashEscape(p.job || '-')}</small></div>
        <strong>${dashEscape(dashPowerLabel(dashPower(p)))}</strong>
      </div>`).join('') : '<div class="dash-empty">ยังไม่มีข้อมูลสมาชิก</div>';
  }

  const jobBox = document.getElementById('dash-job-ranking');
  if (jobBox) {
    const map = new Map();
    list.forEach(p => {
      const job = p.job || 'ไม่ระบุอาชีพ';
      map.set(job, (map.get(job) || 0) + 1);
    });
    const jobs = [...map.entries()].sort((a,b) => b[1] - a[1]).slice(0,10);
    const max = jobs.length ? Math.max(...jobs.map(j => j[1])) : 0;
    jobBox.innerHTML = jobs.length ? jobs.map(([job,count]) => {
      const h = max ? Math.max(18, Math.round((count / max) * 100)) : 0;
      return `
        <div class="dash-v21-job-item ${dashJobColorClass(job)}" title="${dashEscape(job)} ${count} คน">
          <div class="dash-v21-job-count">${count}</div>
          <div class="dash-v21-job-bar" style="height:${h}%"><span class="dash-v21-job-vertical">${dashEscape(job)}</span></div>
          <img src="${dashEscape(dashJobIcon(job))}" onerror="this.src='./assets/logo-bellona.png'" alt="${dashEscape(job)}">
          <div class="dash-v21-job-code">${dashEscape(dashJobCode(job))}</div>
          <small>${dashEscape(job)}</small>
        </div>`;
    }).join('') : '<div class="dash-empty">ยังไม่มีข้อมูลอาชีพ</div>';
  }

  renderDashboardWarCalendar({present, leave, absent});
  renderDashboardGuildNotice();
}
window.renderDashboard = renderDashboard;
window.saveDashboardGuildNotice = saveDashboardGuildNotice;
