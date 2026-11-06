// AI SHAHAR 2036 — Telegram bot (Stars donations → house upgrades)
// Env (set in Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, SUPABASE_SECRET_KEY
const SB_URL = 'https://doeqliwebntqzjqkaqrt.supabase.co';
const SITE = process.env.SITE_URL || 'https://ai-shahar-city.vercel.app';
const OWNER = 'otabeknazirov.aii';
export const TIERS = {
  1: { stars: 100, title: '🥈 Kumush villa', desc: "Uyingiz basseynli kumush villaga aylanadi, nikneymingiz kumush rangda yonadi." },
  2: { stars: 250, title: '🥇 Oltin qasr', desc: "Uyingiz oltin minorali qasrga aylanadi, nikneymingiz oltin rangda, Homiylar ro'yxatida." },
  3: { stars: 500, title: '💎 Olmos saroy', desc: "Shahardagi eng hashamatli saroy: gumbaz, osmonga yorug'lik ustuni va mushaklar. Homiylar ro'yxatida birinchi qatorda." },
};
const clean = (s) => String(s || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '').slice(0, 30);
const enc = (n) => n.replace(/\./g, '-'); const dec = (s) => s.replace(/-/g, '.');
async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
async function isResident(nick) {
  if (nick === OWNER) return true;
  try { const j = await fetch(SITE + '/residents.json', { cache: 'no-store' }).then((r) => r.json()); return (Array.isArray(j) ? j : j.residents || []).map(clean).includes(nick); } catch (e) { return true; }
}
async function saveUpgrade(row) {
  const key = (process.env.SUPABASE_SECRET_KEY || '').replace(/[\s'"]+/g, ''); const h = { 'content-type': 'application/json', apikey: key, Prefer: 'return=minimal' };
  if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key;
  const r = await fetch(SB_URL + '/rest/v1/upgrades', { method: 'POST', headers: h, body: JSON.stringify(row) });
  if (!r.ok && r.status !== 409) throw new Error('supabase ' + r.status + ' ' + (await r.text()));
}
async function sbFetch(path, opt = {}) {
  const key = (process.env.SUPABASE_SECRET_KEY || '').replace(/[\s'"]+/g, ''); const h = { 'content-type': 'application/json', apikey: key, Prefer: 'return=representation' }; if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key;
  const r = await fetch(SB_URL + '/rest/v1' + path, { ...opt, headers: h }); const t = await r.text(); if (!r.ok) throw new Error('supabase ' + r.status + ' ' + t.slice(0, 160)); return t ? JSON.parse(t) : null;
}
async function linkChat(chatId, code) {
  code = String(code || '').replace(/[^a-f0-9]/g, ''); if (code.length < 8) return;
  const rows = await sbFetch(`/players?tg_link=eq.${code}`, { method: 'PATCH', body: JSON.stringify({ tg_chat: chatId, tg_link: null, notify: true }) });
  if (!rows || !rows[0]) return tg('sendMessage', { chat_id: chatId, text: "Havola eskirgan 😕 Saytda «🔔 Telegram eslatmalari» tugmasini qayta bosing." });
  return tg('sendMessage', { chat_id: chatId, text: `✅ Ulandi! @${rows[0].nick} robotingiz endi sizga xabar beradi:\n\n🔥 streak yo'qolay deganda\n❤️ uyingizga layk bosishganda\n📖 mehmonlar daftaringizga yozishganda\n\nO'chirish: /stop\n\n🏙 ${SITE}/#${rows[0].nick}` });
}
async function offer(chatId, nick) {
  if (!(await isResident(nick))) return tg('sendMessage', { chat_id: chatId, text: `@${nick} hali AI SHAHAR aholisi emas 🤖\n\nAvval Instagramda @${OWNER} ga obuna bo'ling — yangi obunachilar muntazam shaharga ko'chiriladi. Keyin qaytib keling!` });
  const rows = [];
  for (const [t, v] of Object.entries(TIERS)) {
    const link = await tg('createInvoiceLink', { title: v.title, description: `@${nick}: ${v.desc}`.slice(0, 255), payload: `${nick}|${t}`, currency: 'XTR', prices: [{ label: v.title, amount: v.stars }] });
    if (link.ok) rows.push([{ text: `${v.title} — ${v.stars} ⭐`, url: link.result }]);
  }
  return tg('sendMessage', { chat_id: chatId, text: `🏙 AI SHAHAR 2036\n\n@${nick} uyini yaxshilash uchun darajani tanlang 👇\n\nTo'lovdan keyin uy saytda o'zi o'zgaradi (1 daqiqagacha).\n\nℹ️ Bu virtual bezak, to'lov qaytarilmaydi. Savollar: /paysupport`, reply_markup: { inline_keyboard: rows } });
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('ok');
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(401).send('unauthorized');
  const u = req.body || {};
  try {
    if (u.pre_checkout_query) {
      const q = u.pre_checkout_query, [nick, t] = String(q.invoice_payload || '').split('|'), tier = TIERS[t];
      const ok = !!tier && q.currency === 'XTR' && q.total_amount === tier.stars && clean(nick) === nick && nick.length > 0;
      await tg('answerPreCheckoutQuery', ok ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: "Xatolik yuz berdi, qaytadan urinib ko'ring." });
    }
    const m = u.message;
    if (m && m.successful_payment) {
      const p = m.successful_payment, [nick, t] = String(p.invoice_payload).split('|');
      await saveUpgrade({ nickname: nick, tier: Number(t), stars: p.total_amount, tg_user_id: m.from && m.from.id, charge_id: p.telegram_payment_charge_id });
      await tg('sendMessage', { chat_id: m.chat.id, text: `✅ Rahmat! @${nick} uyi endi ${TIERS[t].title} 🎉\n\nSaytda 1 daqiqada ko'rinadi:\n${SITE}/#${nick}\n\nStorisga joylab, do'stlaringizga ko'rsating 📲` });
    } else if (m && typeof m.text === 'string') {
      const text = m.text.trim();
      if (text.startsWith('/paysupport')) await tg('sendMessage', { chat_id: m.chat.id, text: `To'lov bo'yicha savol yoki muammo bo'lsa, Instagramda @${OWNER} ga yozing. To'lov cheki (Telegram'dagi xabar) va nikneymingizni ilova qiling.` });
      else if (text.startsWith('/terms')) await tg('sendMessage', { chat_id: m.chat.id, text: `Shartlar: AI SHAHAR 2036 dagi uy yaxshilanishi — virtual bezak. U faqat saytdagi uyingiz ko'rinishini o'zgartiradi, pul qaytarilmaydi. Texnik xato bo'lsa — /paysupport.` });
      else if (text.startsWith('/start link_')) await linkChat(m.chat.id, text.split(/\s+/)[1].slice(5));
      else if (text.startsWith('/stop')) { await sbFetch(`/players?tg_chat=eq.${m.chat.id}`, { method: 'PATCH', body: JSON.stringify({ notify: false }) }); await tg('sendMessage', { chat_id: m.chat.id, text: "🔕 Eslatmalar o'chirildi. Qayta yoqish uchun /notify" }); }
      else if (text.startsWith('/notify')) { await sbFetch(`/players?tg_chat=eq.${m.chat.id}`, { method: 'PATCH', body: JSON.stringify({ notify: true }) }); await tg('sendMessage', { chat_id: m.chat.id, text: '🔔 Eslatmalar yoqildi!' }); }
      else if (text.startsWith('/start')) { const arg = text.split(/\s+/)[1] || ''; const nick = clean(dec(arg.replace(/^up_/, ''))); if (nick) await offer(m.chat.id, nick); else await tg('sendMessage', { chat_id: m.chat.id, text: `🏙 AI SHAHAR 2036 ga xush kelibsiz!\n\nInstagram nikneymingizni yozing — uyingizni qasr yoki saroyga aylantirish mumkin 👇` }); }
      else { const nick = clean(text); if (nick) await offer(m.chat.id, nick); }
    }
  } catch (e) { console.error(e); }
  return res.status(200).send('ok');
}
