// Latest posts of the public Telegram channel for the city billboard (cached 10 min at the edge)
const CH = 'otabek_ai_agent';
const unesc = (s) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  try {
    const html = await fetch(`https://t.me/s/${CH}`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; AiShaharBillboard/1.0)' } }).then((r) => r.text());
    const posts = [];
    for (const chunk of html.split('data-post="').slice(1)) { const id = chunk.slice(0, chunk.indexOf('"')); const tm = chunk.match(/<time datetime="([^"]+)"/);
      const i = chunk.indexOf('tgme_widget_message_text'); let text = ''; if (i > 0) { const st = chunk.indexOf('>', i) + 1; text = unesc(chunk.slice(st, chunk.indexOf('</div>', st))); }
      const img = chunk.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/);
      if (text || img) posts.push({ id, text: text.slice(0, 280), date: tm ? tm[1] : '', img: img ? img[1] : '' }); }
    return res.status(200).json({ ok: true, channel: CH, posts: posts.slice(-6).reverse() });
  } catch (e) { return res.status(200).json({ ok: false, channel: CH, posts: [] }); }
}
