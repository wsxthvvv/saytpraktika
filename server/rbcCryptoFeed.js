const RBC_RSS_URL = 'https://rssexport.rbc.ru/rbcnews/news/100/full.rss';
const RBC_CRYPTO_PAGE = 'https://www.rbc.ru/crypto/';

const CRYPTO_TOPIC_PATTERN = new RegExp(
  [
    'крипт',
    'криптовал',
    'биткоин',
    'bitcoin',
    'btc\\b',
    'ethereum',
    'эфир',
    'eth\\b',
    'блокчейн',
    'blockchain',
    'майнинг',
    'mining',
    'web3',
    'defi',
    'nft',
    'стейбл',
    'stablecoin',
    'usdt',
    'токен',
    'token',
    'цифров(?:ой|ые)\\s+актив',
    'криптобирж',
    'крипторын',
    'криптоактив',
    'альткоин',
    '/crypto/',
    'цифров(?:ой|ые)\\s+руб',
    'cbdc',
  ].join('|'),
  'i'
);

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; 01service-news-bot/1.0)',
  'Accept-Language': 'ru-RU,ru;q=0.9',
};

const decodeEntities = (value = '') => String(value)
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const stripTags = (value = '') => decodeEntities(String(value)
  .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim());

const truncate = (value, maxLength = 220) => (
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value
);

const isCryptoRelated = (item) => CRYPTO_TOPIC_PATTERN.test([
  item.title,
  item.excerpt,
  item.category,
  item.link,
].join(' '));

const parseRssItems = (xmlText) => {
  const chunks = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

  return chunks.map((chunk, index) => {
    const pick = (tag) => {
      const cdata = chunk.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
      if (cdata) return stripTags(cdata[1]);
      const plain = chunk.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return plain ? stripTags(plain[1]) : '';
    };

    const title = pick('title');
    const link = pick('link');
    const description = pick('description');
    const category = pick('category') || 'Новости';
    const date = pick('pubDate');

    if (!title || !link) return null;

    return {
      id: pick('guid') || link || `rbc-rss-${index}`,
      title,
      excerpt: truncate(description),
      category: /\/crypto\//i.test(link) ? 'Крипто' : category,
      date,
      link,
      source: 'РБК',
    };
  }).filter(Boolean);
};

const parseCryptoPage = (html) => {
  const found = new Map();

  const jsonTitlePairs = html.matchAll(
    /"(?:shortTitle|title|frontLineTitle)"\s*:\s*"([^"]+)"[\s\S]{0,220}?"(?:url|link)"\s*:\s*"(https:\\\/\\\/www\.rbc\.ru\\\/crypto\\\/[^"]+)"/g
  );
  for (const match of jsonTitlePairs) {
    const title = match[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
    const link = match[2].replace(/\\\//g, '/');
    if (title && link && !found.has(link)) {
      found.set(link, {
        id: link,
        title: stripTags(title),
        excerpt: '',
        category: 'Крипто',
        date: new Date().toISOString(),
        link,
        source: 'РБК',
      });
    }
  }

  const anchorRe = /<a[^>]+href="(https:\/\/www\.rbc\.ru\/crypto\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let anchorMatch = anchorRe.exec(html);
  while (anchorMatch) {
    const link = anchorMatch[1];
    const title = stripTags(anchorMatch[2]);
    if (link && title.length > 12 && !found.has(link)) {
      found.set(link, {
        id: link,
        title,
        excerpt: '',
        category: 'Крипто',
        date: new Date().toISOString(),
        link,
        source: 'РБК',
      });
    }
    anchorMatch = anchorRe.exec(html);
  }

  return [...found.values()];
};

const sortByDateDesc = (items) => [...items].sort((a, b) => {
  const ta = new Date(a.date).getTime();
  const tb = new Date(b.date).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return tb - ta;
});

const fetchRbcCryptoNews = async (limit = 24) => {
  const merged = new Map();

  try {
    const rssRes = await fetch(RBC_RSS_URL, { headers: FETCH_HEADERS });
    if (rssRes.ok) {
      const xml = await rssRes.text();
      parseRssItems(xml)
        .filter(isCryptoRelated)
        .forEach((item) => merged.set(item.link, item));
    }
  } catch {
    /* try page */
  }

  if (merged.size < limit) {
    try {
      const pageRes = await fetch(RBC_CRYPTO_PAGE, { headers: FETCH_HEADERS });
      if (pageRes.ok) {
        const html = await pageRes.text();
        parseCryptoPage(html).forEach((item) => {
          if (!merged.has(item.link)) merged.set(item.link, item);
        });
      }
    } catch {
      /* ignore */
    }
  }

  const items = sortByDateDesc([...merged.values()]);
  return {
    items: items.slice(0, limit),
    total: items.length,
    fromFallback: false,
  };
};

module.exports = { fetchRbcCryptoNews, RBC_RSS_URL, RBC_CRYPTO_PAGE };
