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
export const PACKS = { 1: { stars: 50, gems: 300, title: '💎 300 kristall' }, 2: { stars: 150, gems: 1000, title: '💎 1 000 kristall' }, 3: { stars: 400, gems: 3000, title: '💎 3 000 kristall' } };
const SHOUT = { stars: 50, hours: 2 };
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
async function offerGems(chatId, nick) {
  if (!(await isResident(nick))) return tg('sendMessage', { chat_id: chatId, text: `@${nick} hali AI SHAHAR aholisi emas 🤖 Avval Instagramda @${OWNER} ga obuna bo'ling.` });
  const rows = []; for (const [k, v] of Object.entries(PACKS)) { const link = await tg('createInvoiceLink', { title: v.title, description: `@${nick} hisobiga ${v.gems} kristall: do'kondan kiyim, uy hayvoni va bezaklar oling.`, payload: `g|${nick}|${k}`, currency: 'XTR', prices: [{ label: v.title, amount: v.stars }] }); if (link.ok) rows.push([{ text: `${v.title} — ${v.stars} ⭐`, url: link.result }]); }
  return tg('sendMessage', { chat_id: chatId, text: `💎 @${nick} uchun kristall paketini tanlang 👇\n\nTo'lovdan keyin kristallar saytda darrov paydo bo'ladi.\nℹ️ Virtual mahsulot, to'lov qaytarilmaydi.`, reply_markup: { inline_keyboard: rows } });
}
async function offerShout(chatId, id) {
  const r = await sbFetch(`/shouts?id=eq.${Number(id)}&paid=eq.false&select=id,nick,text`); const s = r && r[0]; if (!s) return tg('sendMessage', { chat_id: chatId, text: "Xabar topilmadi 😕 Saytda qaytadan yozing." });
  const link = await tg('createInvoiceLink', { title: '📣 Katta ekranga xabar', description: `«${s.text}» — @${s.nick}. Shahar markazidagi ekranda ${SHOUT.hours} soat ko'rinadi.`.slice(0, 255), payload: `s|${s.id}`, currency: 'XTR', prices: [{ label: 'Ekranda xabar', amount: SHOUT.stars }] });
  return tg('sendMessage', { chat_id: chatId, text: `📣 Xabaringiz:\n«${s.text}»\n\nTo'lovdan keyin u shahar markazidagi katta ekranda ${SHOUT.hours} soat ko'rinadi.`, reply_markup: { inline_keyboard: [[{ text: `To'lash — ${SHOUT.stars} ⭐`, url: link.result }]] } });
}
async function addSale(row) { try { await sbFetch('/purchases', { method: 'POST', body: JSON.stringify(row) }); return true; } catch (e) { if (/409|23505/.test(String(e.message))) return false; throw e; } }
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
const APP_URL = SITE + '/?ref=tgapp&tg=1';
const openBtn = (text = '🏙 Shaharni ochish') => ({ inline_keyboard: [[{ text, web_app: { url: APP_URL } }]] });
let menuSet = false;
async function ensureMenu() { if (menuSet) return; menuSet = true; try { await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: '🏙 Shahar', web_app: { url: APP_URL } } }); } catch (e) {} }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('ok');
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(401).send('unauthorized');
  const u = req.body || {}; await ensureMenu();
  try {
    if (u.pre_checkout_query) {
      const q = u.pre_checkout_query, parts = String(q.invoice_payload || '').split('|'); let ok = false;
      if (parts[0] === 'g') ok = !!PACKS[parts[2]] && q.total_amount === PACKS[parts[2]].stars && clean(parts[1]) === parts[1];
      else if (parts[0] === 's') ok = q.total_amount === SHOUT.stars && Number(parts[1]) > 0;
      else { const [nick, t] = parts, tier = TIERS[t]; ok = !!tier && q.total_amount === tier.stars && clean(nick) === nick && nick.length > 0; }
      ok = ok && q.currency === 'XTR';
      await tg('answerPreCheckoutQuery', ok ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: "Xatolik yuz berdi, qaytadan urinib ko'ring." });
    }
    const m = u.message;
    if (m && m.successful_payment && /^[gs]\|/.test(m.successful_payment.invoice_payload)) {
      const p = m.successful_payment, parts = p.invoice_payload.split('|'), base = { stars: p.total_amount, tg_user_id: m.from && m.from.id, charge_id: p.telegram_payment_charge_id };
      if (parts[0] === 'g') { const nick = parts[1], pk = PACKS[parts[2]];
        if (await addSale({ ...base, kind: 'gems', nick, amount: pk.gems })) { const cur = await sbFetch(`/players?nick=eq.${encodeURIComponent(nick)}&select=crystals,total`);
          if (cur && cur[0]) await sbFetch(`/players?nick=eq.${encodeURIComponent(nick)}`, { method: 'PATCH', body: JSON.stringify({ crystals: cur[0].crystals + pk.gems, total: cur[0].total + pk.gems }) });
          else await sbFetch('/players', { method: 'POST', body: JSON.stringify({ nick, uid: 'unlinked', crystals: pk.gems, total: pk.gems }) }); }
        await tg('sendMessage', { chat_id: m.chat.id, text: `✅ Rahmat! @${nick} hisobiga ${pk.gems} 💎 qo'shildi.\n\nDo'konga kiring: ${SITE}/#${nick}` }); }
      else { const id = Number(parts[1]);
        if (await addSale({ ...base, kind: 'shout', amount: id })) { const last = await sbFetch(`/shouts?paid=eq.true&end_at=gt.${new Date().toISOString()}&select=end_at&order=end_at.desc&limit=1`);
          const st = last && last[0] ? new Date(last[0].end_at) : new Date(); const en = new Date(st.getTime() + SHOUT.hours * 3600e3);
          await sbFetch(`/shouts?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ paid: true, start_at: st.toISOString(), end_at: en.toISOString() }) });
          await tg('sendMessage', { chat_id: m.chat.id, text: `✅ Xabaringiz katta ekranga chiqdi! 📣\n\n${SITE}/?ref=shout` }); } }
    } else if (m && m.successful_payment) {
      const p = m.successful_payment, [nick, t] = String(p.invoice_payload).split('|');
      await saveUpgrade({ nickname: nick, tier: Number(t), stars: p.total_amount, tg_user_id: m.from && m.from.id, charge_id: p.telegram_payment_charge_id });
      await tg('sendMessage', { chat_id: m.chat.id, text: `✅ Rahmat! @${nick} uyi endi ${TIERS[t].title} 🎉\n\nSaytda 1 daqiqada ko'rinadi:\n${SITE}/#${nick}\n\nStorisga joylab, do'stlaringizga ko'rsating 📲` });
    } else if (m && typeof m.text === 'string') {
      const text = m.text.trim();
      if (text.startsWith('/paysupport')) await tg('sendMessage', { chat_id: m.chat.id, text: `To'lov bo'yicha savol yoki muammo bo'lsa, Instagramda @${OWNER} ga yozing. To'lov cheki (Telegram'dagi xabar) va nikneymingizni ilova qiling.` });
      else if (text.startsWith('/terms')) await tg('sendMessage', { chat_id: m.chat.id, text: `Shartlar: AI SHAHAR 2036 dagi uy yaxshilanishi — virtual bezak. U faqat saytdagi uyingiz ko'rinishini o'zgartiradi, pul qaytarilmaydi. Texnik xato bo'lsa — /paysupport.` });
      else if (text.startsWith('/app')) await tg('sendMessage', { chat_id: m.chat.id, text: '🏙 AI SHAHAR 2036', reply_markup: openBtn() });
      else if (text.startsWith('/start gems_')) await offerGems(m.chat.id, clean(dec(text.split(/\s+/)[1].slice(5))));
      else if (text.startsWith('/start sh_')) await offerShout(m.chat.id, text.split(/\s+/)[1].slice(3));
      else if (text.startsWith('/start link_')) await linkChat(m.chat.id, text.split(/\s+/)[1].slice(5));
      else if (text.startsWith('/stop')) { await sbFetch(`/players?tg_chat=eq.${m.chat.id}`, { method: 'PATCH', body: JSON.stringify({ notify: false }) }); await tg('sendMessage', { chat_id: m.chat.id, text: "🔕 Eslatmalar o'chirildi. Qayta yoqish uchun /notify" }); }
      else if (text.startsWith('/notify')) { await sbFetch(`/players?tg_chat=eq.${m.chat.id}`, { method: 'PATCH', body: JSON.stringify({ notify: true }) }); await tg('sendMessage', { chat_id: m.chat.id, text: '🔔 Eslatmalar yoqildi!' }); }
      else if (text.startsWith('/start')) { const arg = text.split(/\s+/)[1] || ''; const nick = clean(dec(arg.replace(/^up_/, ''))); if (nick) await offer(m.chat.id, nick); else await tg('sendMessage', { chat_id: m.chat.id, text: `🏙 AI SHAHAR 2036 ga xush kelibsiz!\n\n🤖 Shaharni shu yerning o'zida oching — pastdagi tugmani bosing.\n\n💎 Uyingizni qasr yoki saroyga aylantirish uchun Instagram nikneymingizni yozing.`, reply_markup: openBtn() }); }
      else { const nick = clean(text); if (nick) await offer(m.chat.id, nick); }
    }
  } catch (e) { console.error(e); }
  return res.status(200).send('ok');
}
