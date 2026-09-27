const urls = [
  'https://www.rbc.ru/crypto/',
  'https://rssexport.rbc.ru/rbcnews/news/100/full.rss',
];

for (const url of urls) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
  });
  const text = await res.text();
  console.log(url, res.status, text.length);
  if (url.includes('rss')) {
    console.log('crypto kw', (text.match(/крипт|bitcoin|биткоин/gi) || []).length);
  } else {
    const links = [...text.matchAll(/href="(https:\/\/www\.rbc\.ru\/crypto\/[^"]+)"/g)].map((m) => m[1]);
    console.log('crypto article links', links.length, links.slice(0, 3));
  }
}
