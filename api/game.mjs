// AI SHAHAR 2036 — game server: daily crystals, streaks, shop, house likes.
// Writes only through here (secret key in env); everyone reads public columns from Supabase.
const SB = 'https://doeqliwebntqzjqkaqrt.supabase.co/rest/v1';
const SITE = process.env.SITE_URL || 'https://ai-shahar-city.vercel.app';
export const SHOP = {
  cap_red: { price: 15, kind: 'hat', color: '#e53935' }, cap_blue: { price: 15, kind: 'hat', color: '#1e88e5' }, cap_gold: { price: 30, kind: 'hat', color: '#ffc400' },
  shades: { price: 20, kind: 'glasses' }, neon_phones: { price: 25, kind: 'phones' },
  cape: { price: 40, kind: 'cape' }, halo: { price: 80, kind: 'halo' }, dog: { price: 60, kind: 'pet' }, cat: { price: 60, kind: 'pet' },
};
const CRYSTALS_PER_DAY = 20;
const crystalValue = (id) => (id % 5 === 0 ? 3 : 1);
const day = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
function week(d = new Date()) { const t = new Date(day(d) + 'T00:00:00Z'); const dn = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - dn + 3); const y = t.getUTCFullYear(); const w1 = new Date(Date.UTC(y, 0, 4)); return y + '-W' + String(1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getUTCDay() + 6) % 7)) / 7)).padStart(2, '0'); }
const clean = (s) => String(s || '').toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '').slice(0, 30);
function H(extra = {}) { const key = (process.env.SUPABASE_SECRET_KEY || '').replace(/[\s'"]+/g, ''); const h = { 'content-type': 'application/json', apikey: key, ...extra }; if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key; return h; }
async function sb(path, opt = {}) { const r = await fetch(SB + path, { ...opt, headers: H(opt.headers) }); const txt = await r.text(); if (!r.ok) throw new Error(path.split('?')[0] + ' ' + r.status + ' ' + txt.slice(0, 160)); return txt ? JSON.parse(txt) : null; }
let resCache = { at: 0, set: null };
async function isResident(n) { if (n === 'otabeknazirov.aii') return true; if (!resCache.set || Date.now() - resCache.at > 120000) { try { const j = await fetch(SITE + '/residents.json', { cache: 'no-store' }).then((r) => r.json()); resCache = { at: Date.now(), set: new Set((Array.isArray(j) ? j : j.residents || []).map(clean)) }; } catch (e) { return true; } } return resCache.set.has(n); }
const pub = (p) => ({ nick: p.nick, crystals: p.crystals, total: p.total, streak: p.streak, best_streak: p.best_streak, items: p.items || [], equipped: p.equipped || {}, col_mask: p.col_day === day() ? p.col_mask : 0, day: day() });
async function getPlayer(nick) { const r = await sb(`/players?nick=eq.${encodeURIComponent(nick)}&select=*`); return r[0] || null; }
async function patch(nick, body) { const r = await sb(`/players?nick=eq.${encodeURIComponent(nick)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body) }); return r[0]; }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const b = req.body || {}, action = b.action, uid = String(b.uid || '').replace(/[^a-z0-9]/gi, '').slice(0, 24);
  if (!uid || uid.length < 6) return res.status(400).json({ ok: false, error: 'uid' });
  try {
    if (action === 'like') {
      const target = clean(b.target); if (!target || !(await isResident(target))) return res.status(400).json({ ok: false, error: 'target' });
      const w = week(); await sb('/house_likes', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ uid, target, week: w }) });
      const c = await sb(`/house_likes_week?target=eq.${encodeURIComponent(target)}&week=eq.${w}&select=likes`); return res.status(200).json({ ok: true, likes: (c[0] && c[0].likes) || 1, week: w });
    }
    const nick = clean(b.nick); if (!nick || !(await isResident(nick))) return res.status(400).json({ ok: false, error: 'nick' });
    let p = await getPlayer(nick); const today = day();
    if (action === 'hello') {
      if (!p) { p = (await sb('/players', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ nick, uid, streak: 0, crystals: 0 }) }))[0]; }
      if (p.uid !== uid) return res.status(403).json({ ok: false, error: 'taken' });
      let bonus = 0;
      if (p.last_day !== today) { const y = day(new Date(Date.now() - 864e5)); const streak = p.last_day === y ? p.streak + 1 : 1; bonus = 5 * Math.min(streak, 7);
        p = await patch(nick, { streak, best_streak: Math.max(streak, p.best_streak || 0), last_day: today, crystals: p.crystals + bonus, total: p.total + bonus }); }
      return res.status(200).json({ ok: true, bonus, player: pub(p) });
    }
    if (!p || p.uid !== uid) return res.status(403).json({ ok: false, error: 'taken' });
    if (action === 'collect') {
      const id = Number(b.id); if (!Number.isInteger(id) || id < 0 || id >= CRYSTALS_PER_DAY) return res.status(400).json({ ok: false, error: 'id' });
      const mask = p.col_day === today ? p.col_mask : 0; if (mask & (1 << id)) return res.status(200).json({ ok: true, already: true, player: pub(p) });
      if (p.last_collect && Date.now() - Date.parse(p.last_collect) < 1200) return res.status(429).json({ ok: false, error: 'slow' });
      const v = crystalValue(id); p = await patch(nick, { col_day: today, col_mask: mask | (1 << id), crystals: p.crystals + v, total: p.total + v, last_collect: new Date().toISOString() });
      return res.status(200).json({ ok: true, value: v, player: pub(p) });
    }
    if (action === 'buy') {
      const item = String(b.item || ''), it = SHOP[item]; if (!it) return res.status(400).json({ ok: false, error: 'item' });
      const items = p.items || []; if (items.includes(item)) return res.status(200).json({ ok: true, player: pub(p) });
      if (p.crystals < it.price) return res.status(400).json({ ok: false, error: 'poor' });
      const eq = { ...(p.equipped || {}) }; eq[it.kind] = item;
      p = await patch(nick, { crystals: p.crystals - it.price, items: [...items, item], equipped: eq }); return res.status(200).json({ ok: true, player: pub(p) });
    }
    if (action === 'equip') {
      const item = String(b.item || ''), it = SHOP[item], kind = String(b.kind || (it && it.kind) || ''); const eq = { ...(p.equipped || {}) };
      if (it && (p.items || []).includes(item)) eq[it.kind] = item; else if (!it && kind) delete eq[kind]; else return res.status(400).json({ ok: false, error: 'item' });
      p = await patch(nick, { equipped: eq }); return res.status(200).json({ ok: true, player: pub(p) });
    }
    return res.status(400).json({ ok: false, error: 'action' });
  } catch (e) { console.error(e); return res.status(500).json({ ok: false, error: 'server', detail: String(e.message || e).slice(0, 200) }); }
}
