// AI SHAHAR 2036 — paid extras: billboard shout drafts (paid in the Telegram bot) + business ads (admin)
const SB = 'https://doeqliwebntqzjqkaqrt.supabase.co/rest/v1';
const isAdmin = (pw) => { const a = (process.env.ADMIN_PASSWORD || '').trim(); return !!a && String(pw || '').trim() === a; };
const clean = (s) => String(s || '').toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '').slice(0, 30);
function H(extra = {}) { const key = (process.env.SUPABASE_SECRET_KEY || '').replace(/[\s'"]+/g, ''); const h = { 'content-type': 'application/json', apikey: key, ...extra }; if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key; return h; }
async function sb(path, opt = {}) { const r = await fetch(SB + path, { ...opt, headers: H(opt.headers) }); const t = await r.text(); if (!r.ok) throw new Error(path.split('?')[0] + ' ' + r.status + ' ' + t.slice(0, 160)); return t ? JSON.parse(t) : null; }
const BAD = /(https?:\/\/|www\.|t\.me\/|@\w+\.(com|ru|uz)|\.(com|ru|uz|net|org)\b)/i;
const RUDE = /\b(blya|bля|сука|хуй|пизд|ебан|qotoq|jalab|ske|dalbayob|onangni)\w*/i;
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const b = req.body || {};
  try {
    if (b.action === 'shout') { // draft; becomes visible only after the Stars payment in the bot
      const nick = clean(b.nick), text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 90);
      if (!nick || !text) return res.status(400).json({ ok: false, error: 'text' });
      if (BAD.test(text)) return res.status(400).json({ ok: false, error: 'link' }); if (RUDE.test(text)) return res.status(400).json({ ok: false, error: 'rude' });
      const r = await sb('/shouts', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ nick, text }) }); return res.status(200).json({ ok: true, id: r[0].id });
    }
    if (!isAdmin(b.admin)) return res.status(403).json({ ok: false, error: 'owner' });
    if (b.action === 'ads') { const ads = await sb('/ads?select=*&order=id.desc&limit=30'); const shouts = await sb('/shouts?paid=eq.true&select=id,nick,text,end_at&order=id.desc&limit=20'); const sales = await sb('/purchases?select=kind,stars,created_at&order=id.desc&limit=200'); return res.status(200).json({ ok: true, ads, shouts, sales }); }
    if (b.action === 'adadd') { const title = String(b.title || '').trim().slice(0, 60), text = String(b.text || '').trim().slice(0, 200), link = String(b.link || '').trim().slice(0, 300), days = Math.min(365, Math.max(1, Number(b.days) || 7));
      if (!title) return res.status(400).json({ ok: false, error: 'title' }); if (link && !/^https:\/\//.test(link)) return res.status(400).json({ ok: false, error: 'link' });
      const until = new Date(Date.now() + days * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' }); await sb('/ads', { method: 'POST', body: JSON.stringify({ title, text, link, until }) }); return res.status(200).json({ ok: true }); }
    if (b.action === 'addel') { await sb(`/ads?id=eq.${Number(b.id)}`, { method: 'DELETE' }); return res.status(200).json({ ok: true }); }
    if (b.action === 'shoutdel') { await sb(`/shouts?id=eq.${Number(b.id)}`, { method: 'PATCH', body: JSON.stringify({ paid: false }) }); return res.status(200).json({ ok: true }); }
    return res.status(400).json({ ok: false, error: 'action' });
  } catch (e) { console.error(e); return res.status(500).json({ ok: false, error: 'server', detail: String(e.message || e).slice(0, 200) }); }
}
