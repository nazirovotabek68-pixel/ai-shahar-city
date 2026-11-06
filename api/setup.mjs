// One-time setup: open https://ai-shahar-city.vercel.app/api/setup?s=<TELEGRAM_WEBHOOK_SECRET>
const SITE = process.env.SITE_URL || 'https://ai-shahar-city.vercel.app';
async function tg(method, body) { const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }
export default async function handler(req, res) {
  if (req.query.check) { const k = (process.env.SUPABASE_SECRET_KEY || '').replace(/[\s'"]+/g, ''); const shape = k.startsWith('sb_secret_') ? 'sb_secret' : k.startsWith('sb_publishable_') ? 'sb_publishable (NOTO\'G\'RI: bu ochiq kalit)' : k.startsWith('eyJ') ? 'jwt (service_role yoki anon)' : 'boshqa';
    const r = await fetch('https://doeqliwebntqzjqkaqrt.supabase.co/rest/v1/chat?select=id&limit=1', { headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + k }) } });
    return res.status(200).json({ keyShape: shape, keyLength: k.length, supabaseStatus: r.status }); }
  const missing = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'SUPABASE_SECRET_KEY'].filter((k) => !process.env[k]);
  if (missing.length) return res.status(500).json({ ok: false, missing });
  if (req.query.s !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(401).json({ ok: false, error: 'wrong s' });
  const hook = await tg('setWebhook', { url: SITE + '/api/telegram', secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message', 'pre_checkout_query'], drop_pending_updates: true });
  const cmds = await tg('setMyCommands', { commands: [{ command: 'start', description: 'Uyimni yaxshilash' }, { command: 'terms', description: 'Shartlar' }, { command: 'paysupport', description: "To'lov bo'yicha yordam" }] });
  const me = await tg('getMe', {});
  return res.status(200).json({ ok: hook.ok && me.ok, bot: me.result && me.result.username, webhook: hook, commands: cmds.ok });
}
