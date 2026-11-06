// AI SHAHAR 2036 — simple privacy-friendly visit counter (one row per visitor per day) + admin stats
const SB = 'https://doeqliwebntqzjqkaqrt.supabase.co/rest/v1';
const isAdmin = (pw) => { const a = (process.env.ADMIN_PASSWORD || process.env.TELEGRAM_WEBHOOK_SECRET || '').trim(); return !!a && String(pw || '').trim() === a; };
function H(extra = {}) { const key = (process.env.SUPABASE_SECRET_KEY || '').replace(/[\s'"]+/g, ''); const h = { 'content-type': 'application/json', apikey: key, ...extra }; if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key; return h; }
const day = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const b = req.body || {};
  try {
    if (b.action === 'stats') {
      if (!isAdmin(b.admin)) return res.status(403).json({ ok: false, error: 'owner' });
      const since = day(new Date(Date.now() - 13 * 864e5));
      const [daily, refs, players, chat] = await Promise.all([
        fetch(`${SB}/visits_daily?day=gte.${since}&order=day.asc`, { headers: H() }).then((r) => r.json()),
        fetch(`${SB}/visits_refs?select=ref,visits&order=visits.desc&limit=8`, { headers: H() }).then((r) => r.json()),
        fetch(`${SB}/players?select=nick`, { headers: H({ Prefer: 'count=exact', Range: '0-0' }) }).then((r) => r.headers.get('content-range')),
        fetch(`${SB}/chat?select=id`, { headers: H({ Prefer: 'count=exact', Range: '0-0' }) }).then((r) => r.headers.get('content-range')),
      ]);
      const total = (cr) => Number(String(cr || '').split('/')[1]) || 0;
      return res.status(200).json({ ok: true, daily, refs, players: total(players), chat: total(chat) });
    }
    const uid = String(b.uid || '').replace(/[^a-z0-9]/gi, '').slice(0, 24); if (uid.length < 6) return res.status(400).json({ ok: false });
    const ref = String(b.ref || 'direct').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'direct';
    await fetch(`${SB}/visits`, { method: 'POST', headers: H({ Prefer: 'resolution=ignore-duplicates,return=minimal' }), body: JSON.stringify({ day: day(), uid, ref, mobile: !!b.m }) });
    return res.status(200).json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ ok: false }); }
}
