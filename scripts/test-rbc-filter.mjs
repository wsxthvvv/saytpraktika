const pattern = /крипт|криптовал|биткоин|bitcoin|btc\b|ethereum|блокчейн|blockchain|майнинг|mining|web3|defi|nft|\/crypto\//i;
const r = await fetch('https://rssexport.rbc.ru/rbcnews/news/100/full.rss');
const t = await r.text();
const items = [...t.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
const hits = items.filter((it) => {
  const title = (it.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || [])[1] || '';
  const desc = (it.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || [])[1] || '';
  const link = (it.match(/<link>(.*?)<\/link>/) || [])[1] || '';
  return pattern.test(`${title} ${desc} ${link}`);
});
console.log('items', items.length, 'crypto hits', hits.length);
hits.slice(0, 8).forEach((it) => {
  const title = (it.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || [])[1] || '';
  console.log('-', title);
});
