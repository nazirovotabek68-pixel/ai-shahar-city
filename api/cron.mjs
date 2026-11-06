// Daily reminders via the Telegram bot (Vercel Cron, once a day at 19:00 Tashkent)
const SB = 'https://doeqliwebntqzjqkaqrt.supabase.co/rest/v1';
const SITE = process.env.SITE_URL || 'https://ai-shahar-city.vercel.app';
const day = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
function H() { const key = (process.env.SUPABASE_SECRET_KEY || '').replace(/[\s'"]+/g, ''); const h = { 'content-type': 'application/json', apikey: key }; if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key; return h; }
const sb = (path, opt = {}) => fetch(SB + path, { ...opt, headers: { ...H(), ...(opt.headers || {}) } }).then(async (r) => { const t = await r.text(); if (!r.ok) throw new Error(r.status + ' ' + t.slice(0, 120)); return t ? JSON.parse(t) : null; });
const tg = (chat_id, text) => fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id, text, disable_web_page_preview: true }) }).then((r) => r.json());
export default async function handler(req, res) {
  const auth = req.headers.authorization || '', ua = req.headers['user-agent'] || '';
  const ok = process.env.CRON_SECRET ? auth === 'Bearer ' + process.env.CRON_SECRET : /vercel-cron/i.test(ua);
  if (!ok) return res.status(401).json({ ok: false });
  const today = day(), yest = day(new Date(Date.now() - 864e5)); let sent = 0;
  try {
    const players = await sb(`/players?tg_chat=not.is.null&notify=eq.true&or=(notified_day.is.null,notified_day.lt.${today})&select=nick,tg_chat,streak,last_day,seen_likes,seen_guest`);
    const likes = await sb('/house_likes?select=target'); const lc = {}; for (const l of likes || []) lc[l.target] = (lc[l.target] || 0) + 1;
    for (const p of players || []) {
      const lines = []; const L = lc[p.nick] || 0;
      if (p.streak > 0 && p.last_day === yest) lines.push(`🔥 ${p.streak} kunlik seriyangiz bugun yarim tunda yo'qoladi! Kirib bonusni oling.`);
      else if (p.last_day && p.last_day < yest) lines.push(`🤖 Robotingiz sizni sog'indi! Bugun 20 ta yangi kristall va 3 ta vazifa kutyapti.`);
      if (L > p.seen_likes) lines.push(`❤️ Uyingizga ${L - p.seen_likes} ta yangi layk bosishdi (jami ${L}).`);
      const g = await sb(`/guestbook?target=eq.${encodeURIComponent(p.nick)}&id=gt.${p.seen_guest}&select=id,author&order=id.desc`);
      if (g && g.length) lines.push(`📖 Mehmonlar daftaringizga ${g.length} ta yangi xabar: ${[...new Set(g.map((x) => '@' + x.author))].slice(0, 3).join(', ')}`);
      if (!lines.length) continue;
      const r = await tg(p.tg_chat, `🏙 AI SHAHAR 2036\n\n${lines.join('\n')}\n\n👉 ${SITE}/?ref=bot#${p.nick}\n\n(o'chirish: /stop)`);
      if (r.ok) sent++; else if (r.error_code === 403) await sb(`/players?nick=eq.${encodeURIComponent(p.nick)}`, { method: 'PATCH', body: JSON.stringify({ notify: false }) });
      await sb(`/players?nick=eq.${encodeURIComponent(p.nick)}`, { method: 'PATCH', body: JSON.stringify({ notified_day: today, seen_likes: L, seen_guest: g && g.length ? g[0].id : p.seen_guest }) });
    }
    return res.status(200).json({ ok: true, sent });
  } catch (e) { console.error(e); return res.status(500).json({ ok: false, error: String(e.message || e).slice(0, 200) }); }
}
