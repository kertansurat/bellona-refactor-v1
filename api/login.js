const crypto = require('crypto');

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    const adminUser = process.env.ADMIN_USERNAME || '';
    const adminPass = process.env.ADMIN_PASSWORD || '';

    if (!adminUser || !adminPass) {
      return res.status(500).json({ ok: false, message: 'ADMIN_USERNAME / ADMIN_PASSWORD ยังไม่ได้ตั้งค่าใน Vercel Environment Variables' });
    }

    const ok = safeEqual(username, adminUser) && safeEqual(password, adminPass);

    if (!ok) {
      return res.status(401).json({ ok: false, message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    return res.status(200).json({
      ok: true,
      role: 'admin',
      session: crypto.randomBytes(16).toString('hex')
    });
  } catch (err) {
    return res.status(400).json({ ok: false, message: 'Invalid request' });
  }
};
