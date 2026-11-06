// AI SHAHAR 2036 — city chat. Messages are written only through this function (filters + rate limit),
// everyone reads them from Supabase (realtime).
import crypto from 'node:crypto';
const SB_URL = 'https://doeqliwebntqzjqkaqrt.supabase.co';
const SITE = process.env.SITE_URL || 'https://ai-shahar-city.vercel.app';
const OWNER = 'otabeknazirov.aii';
const BAD = ['blyat', 'bljad', 'suka', 'pizd', 'xuy', 'xuj', 'hui', 'huy', 'eban', 'yeban', 'ebat', 'mudak', 'gandon', 'qotoq', 'qo\'toq', 'jalab', 'amingni', 'onangni', 'sikay', 'sikdim', 'skay', 'dalbayob', 'dolboyob', 'fuck', 'shit', 'bitch', 'бля', 'сука', 'пизд', 'хуй', 'хуе', 'еба', 'ёба', 'мудак', 'гандон', 'жалаб', 'қўтоқ'];
let residentsCache = { at: 0, set: null };
async function residents() {
  if (residentsCache.set && Date.now() - residentsCache.at < 120000) return residentsCache.set;
  try { const j = await fetch(SITE + '/residents.json', { cache: 'no-store' }).then((r) => r.json()); residentsCache = { at: Date.now(), set: new Set((Array.isArray(j) ? j : j.residents || []).map((s) => String(s).toLowerCase())) }; } catch (e) {}
  return residentsCache.set || new Set();
}
function headers() { const key = process.env.SUPABASE_SECRET_KEY || ''; const h = { 'content-type': 'application/json', apikey: key }; if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key; return h; }
function cleanText(t) {
  let s = String(t || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  s = s.replace(/(https?:\/\/|www\.)\S+/gi, '[havola]').replace(/\b\S+\.(com|ru|uz|net|org|me|io|xyz|link)\b\S*/gi, '[havola]');
  const low = s.toLowerCase().replace(/[^a-zа-яёқўғҳ']/gi, '');
  for (const w of BAD) if (low.includes(w)) { s = s.replace(new RegExp(w.split('').join('[^a-zа-яё]*'), 'gi'), (m) => m[0] + '*'.repeat(Math.max(2, m.length - 1))); }
  return s;
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!process.env.SUPABASE_SECRET_KEY) return res.status(500).json({ ok: false, error: 'not configured' });
  const b = req.body || {}; let nick = String(b.nick || '').toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '').slice(0, 30);
  const text = cleanText(b.text); if (!text) return res.status(400).json({ ok: false, error: 'empty' });
  let verified = false;
  if (nick === OWNER) { if (!b.admin || b.admin !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(403).json({ ok: false, error: 'owner' }); verified = true; }
  else if (!/^mehmon_\d{4}$/.test(nick) && !(await residents()).has(nick)) return res.status(400).json({ ok: false, error: 'nick' });
  // rate limit: 1 message / 4 s, 20 / 10 min per IP
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const ipHash = crypto.createHash('sha256').update(ip + (process.env.TELEGRAM_WEBHOOK_SECRET || '')).digest('hex').slice(0, 32);
  const now = Date.now();
  try {
    const r = await fetch(`${SB_URL}/rest/v1/chat_limits?ip_hash=eq.${ipHash}&select=last_at,win_at,n`, { headers: headers() }).then((x) => x.json());
    const row = Array.isArray(r) ? r[0] : null; let n = 1, win = new Date(now).toISOString();
    if (row) { const last = Date.parse(row.last_at), w = Date.parse(row.win_at); if (now - last < 4000) return res.status(429).json({ ok: false, error: 'slow' });
      if (now - w < 600000) { n = row.n + 1; win = row.win_at; if (n > 20) return res.status(429).json({ ok: false, error: 'limit' }); } }
    const up = await fetch(`${SB_URL}/rest/v1/chat_limits`, { method: 'POST', headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ ip_hash: ipHash, last_at: new Date(now).toISOString(), win_at: win, n }) });
    if (!up.ok) throw new Error('limits ' + up.status + ' ' + (await up.text()));
    if (b.dry) return res.status(200).json({ ok: true, dry: true, verified, text });
    const ins = await fetch(`${SB_URL}/rest/v1/chat`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify({ nick, text, verified }) });
    if (!ins.ok) throw new Error('insert ' + ins.status + ' ' + (await ins.text()));
    return res.status(200).json({ ok: true, text });
  } catch (e) { console.error(e); return res.status(500).json({ ok: false, error: 'server', detail: String(e.message || e).slice(0, 200) }); }
}
