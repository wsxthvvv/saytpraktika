const { query, pool } = require('./db');

const CACHE_SECONDS = 60;
const ASSET_CACHE_MS = 60 * 1000;
const CHART_CACHE_MS = 2 * 60 * 1000;
const SUPPORTED_ASSETS = new Set(['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano', 'ripple', 'dogecoin', 'litecoin']);
const SUPPORTED_CURRENCIES = new Set(['usd', 'rub', 'btc', 'eth']);
const SUPPORTED_PERIODS = new Set([0.0417, 0.25, 1, 7, 30, 90]);
const assetCache = new Map();
const chartCache = new Map();
let fiatCache = null;
let marketsRefreshPromise = null;
const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h';

const fromRows = (rows) => {
  const markets = rows.map((row) => ({
    id: row.asset_id,
    symbol: row.symbol,
    name: row.name,
    current_price: row.price_usd == null ? null : Number(row.price_usd),
    price_change_percentage_24h: row.change_24h == null ? null : Number(row.change_24h),
    market_cap: row.market_cap == null ? null : Number(row.market_cap),
    total_volume: row.volume_24h == null ? null : Number(row.volume_24h),
  }));
  const byId = Object.fromEntries(markets.map((market) => [market.id, market]));
  const toSimple = (market) => market ? {
    usd: market.current_price,
    usd_24h_change: market.price_change_percentage_24h,
  } : null;
  const btc = byId.bitcoin;
  const eth = byId.ethereum;
  return {
    markets,
    simple: {
      bitcoin: toSimple(btc),
      ethereum: toSimple(eth),
    },
    btcEth: btc?.current_price && eth?.current_price ? btc.current_price / eth.current_price : null,
    updatedAt: rows[0]?.fetched_at || null,
  };
};

const refreshCryptoMarkets = async (cached) => {
  try {
    const response = await fetch(API_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`CoinGecko вернул HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || !data.some((item) => item.id === 'bitcoin') || !data.some((item) => item.id === 'ethereum')) {
      throw new Error('Источник вернул неполный список курсов');
    }
    const fetchedAt = new Date();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of data.slice(0, 10)) {
        await client.query(
          `INSERT INTO crypto_cache(asset_id,symbol,name,price_usd,change_24h,market_cap,volume_24h,fetched_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (asset_id) DO UPDATE SET symbol=EXCLUDED.symbol,name=EXCLUDED.name,
            price_usd=EXCLUDED.price_usd,change_24h=EXCLUDED.change_24h,market_cap=EXCLUDED.market_cap,
            volume_24h=EXCLUDED.volume_24h,fetched_at=EXCLUDED.fetched_at`,
          [item.id, String(item.symbol || '').toUpperCase(), item.name || '', item.current_price,
            item.price_change_percentage_24h, item.market_cap, item.total_volume, fetchedAt],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    const refreshed = await query('SELECT * FROM crypto_cache ORDER BY market_cap DESC NULLS LAST LIMIT 10');
    return { ...fromRows(refreshed.rows), stale: false, error: null, source: 'coingecko' };
  } catch (error) {
    return {
      ...fromRows(cached), stale: true,
      error: String(error.message || 'Источник курсов временно недоступен').slice(0, 160),
      source: cached.length ? 'cache' : 'unavailable',
    };
  }
};

const getCryptoMarkets = async () => {
  const cachedResult = await query('SELECT * FROM crypto_cache ORDER BY market_cap DESC NULLS LAST LIMIT 10');
  const cached = cachedResult.rows;
  const newest = cached.reduce((max, row) => Math.max(max, new Date(row.fetched_at).getTime()), 0);
  if (cached.length && Date.now() - newest < CACHE_SECONDS * 1000) {
    return { ...fromRows(cached), stale: false, error: null, source: 'cache' };
  }
  if (!marketsRefreshPromise) {
    marketsRefreshPromise = refreshCryptoMarkets(cached).finally(() => { marketsRefreshPromise = null; });
  }
  return marketsRefreshPromise;
};

const getCoinMetrics = async (assetId, currency) => {
  if (!SUPPORTED_ASSETS.has(assetId) || !SUPPORTED_CURRENCIES.has(currency)) {
    throw Object.assign(new Error('Неподдерживаемая монета или валюта'), { statusCode: 400 });
  }
  const key = `${assetId}:${currency}`;
  let cached = assetCache.get(key);
  if (!cached) {
    const stored = await query('SELECT payload,fetched_at FROM crypto_asset_cache WHERE asset_id=$1 AND currency=$2', [assetId, currency]);
    if (stored.rowCount) {
      cached = { data: stored.rows[0].payload, fetchedAt: new Date(stored.rows[0].fetched_at).getTime() };
      assetCache.set(key, cached);
    }
  }
  if (cached && Date.now() - cached.fetchedAt < ASSET_CACHE_MS) return { ...cached.data, stale: false };
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${assetId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`CoinGecko вернул HTTP ${response.status}`);
    const json = await response.json();
    const market = json.market_data;
    if (!market?.current_price || market.current_price[currency] == null) throw new Error('Источник не вернул данные выбранной монеты');
    const data = {
      asset: assetId,
      currency,
      price: Number(market.current_price[currency]),
      change24h: Number(market.price_change_percentage_24h || 0),
      volume: Number(market.total_volume?.[currency] || 0),
      marketCap: Number(market.market_cap?.[currency] || 0),
      updatedAt: new Date().toISOString(),
    };
    assetCache.set(key, { data, fetchedAt: Date.now() });
    await query(
      `INSERT INTO crypto_asset_cache(asset_id,currency,payload,fetched_at) VALUES ($1,$2,$3,NOW())
       ON CONFLICT (asset_id,currency) DO UPDATE SET payload=EXCLUDED.payload,fetched_at=EXCLUDED.fetched_at`,
      [assetId, currency, JSON.stringify(data)],
    );
    return { ...data, stale: false };
  } catch (error) {
    if (cached) return { ...cached.data, stale: true, error: String(error.message || 'Курсы временно недоступны').slice(0, 160) };
    throw error;
  }
};

const getHistoricalPrices = async (assetId, currency, days) => {
  if (!SUPPORTED_ASSETS.has(assetId) || !SUPPORTED_CURRENCIES.has(currency)) {
    throw Object.assign(new Error('Неподдерживаемая монета или валюта'), { statusCode: 400 });
  }
  const numericDays = Number(days);
  if (!SUPPORTED_PERIODS.has(numericDays)) {
    throw Object.assign(new Error('Некорректный период графика'), { statusCode: 400 });
  }
  const key = `${assetId}:${currency}:${numericDays}`;
  let cached = chartCache.get(key);
  if (!cached) {
    const stored = await query('SELECT prices,fetched_at FROM crypto_chart_cache WHERE asset_id=$1 AND currency=$2 AND days=$3', [assetId, currency, numericDays]);
    if (stored.rowCount) {
      cached = { data: { prices: stored.rows[0].prices, updatedAt: stored.rows[0].fetched_at }, fetchedAt: new Date(stored.rows[0].fetched_at).getTime() };
      chartCache.set(key, cached);
    }
  }
  if (cached && Date.now() - cached.fetchedAt < CHART_CACHE_MS) return { ...cached.data, stale: false };
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${assetId}/market_chart?vs_currency=${currency}&days=${numericDays}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`CoinGecko вернул HTTP ${response.status}`);
    const json = await response.json();
    if (!Array.isArray(json.prices) || !json.prices.length) throw new Error('Источник не вернул данные графика');
    const data = { prices: json.prices, updatedAt: new Date().toISOString() };
    chartCache.set(key, { data, fetchedAt: Date.now() });
    await query(
      `INSERT INTO crypto_chart_cache(asset_id,currency,days,prices,fetched_at) VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (asset_id,currency,days) DO UPDATE SET prices=EXCLUDED.prices,fetched_at=EXCLUDED.fetched_at`,
      [assetId, currency, numericDays, JSON.stringify(json.prices)],
    );
    return { ...data, stale: false };
  } catch (error) {
    if (cached) return { ...cached.data, stale: true, error: String(error.message || 'График временно недоступен').slice(0, 160) };
    throw error;
  }
};

const getUsdRubRate = async () => {
  if (fiatCache && Date.now() - fiatCache.fetchedAt < ASSET_CACHE_MS) return { ...fiatCache.data, stale: false };
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Источник курса USD/RUB вернул HTTP ${response.status}`);
    const json = await response.json();
    const rate = Number(json.rates?.RUB);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Источник не вернул курс USD/RUB');
    fiatCache = { data: { base: 'USD', quote: 'RUB', rate, updatedAt: json.time_last_update_utc || new Date().toISOString() }, fetchedAt: Date.now() };
    return { ...fiatCache.data, stale: false };
  } catch (error) {
    if (fiatCache) return { ...fiatCache.data, stale: true, error: String(error.message || 'Курс временно недоступен').slice(0, 160) };
    throw error;
  }
};

module.exports = { getCoinMetrics, getCryptoMarkets, getHistoricalPrices, getUsdRubRate };
