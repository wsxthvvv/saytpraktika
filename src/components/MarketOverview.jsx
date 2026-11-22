import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCryptoRates } from '../contexts/CryptoRatesContext';

const assets = [
  { id: 'bitcoin', code: 'BTC', name: 'Bitcoin', gradient: 'market-line--btc' },
  { id: 'ethereum', code: 'ETH', name: 'Ethereum', gradient: 'market-line--eth' },
];

const pointsFor = (prices) => {
  if (!Array.isArray(prices) || prices.length < 2) return '';
  const values = prices.map((item) => Number(item[1])).filter(Number.isFinite);
  const low = Math.min(...values);
  const range = Math.max(...values) - low || 1;
  return values.map((value, index) => `${(index / (values.length - 1)) * 100},${92 - ((value - low) / range) * 82}`).join(' ');
};

const MarketOverview = () => {
  const { markets, updatedAt, stale } = useCryptoRates();
  const [history, setHistory] = useState({});
  const [historyError, setHistoryError] = useState(false);
  const marketById = useMemo(() => new Map(markets.map((market) => [market.id, market])), [markets]);

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      try {
        const responses = await Promise.all(assets.map(async (asset) => {
          const response = await fetch(`/api/crypto/chart?asset=${asset.id}&currency=usd&days=7`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ok || !Array.isArray(data.prices)) throw new Error('История временно недоступна');
          return [asset.id, data.prices];
        }));
        if (active) {
          setHistory(Object.fromEntries(responses));
          setHistoryError(false);
        }
      } catch {
        if (active) setHistoryError(true);
      }
    };
    loadHistory();
    const timer = window.setInterval(loadHistory, 5 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <section className="market-overview" aria-labelledby="market-overview-title">
      <div className="market-overview__heading">
        <div>
          <p className="section-eyebrow">РЫНОК В РЕАЛЬНОМ ВРЕМЕНИ</p>
          <h2 id="market-overview-title" className="section-title">Курсы и история</h2>
          <p>Семидневный график и текущая цена обновляются автоматически.</p>
        </div>
        <Link to="/charts" className="btn-outline">Открыть графики</Link>
      </div>
      <div className="market-overview__grid">
        {assets.map((asset) => {
          const market = marketById.get(asset.id);
          const prices = history[asset.id] || [];
          const polyline = pointsFor(prices);
          const first = Number(prices[0]?.[1]);
          const last = Number(prices[prices.length - 1]?.[1]);
          const change = first > 0 && Number.isFinite(last) ? ((last - first) / first) * 100 : null;
          const currentPrice = Number(market?.current_price);
          return (
            <article className="market-overview__card" key={asset.id}>
              <header className="market-overview__card-head">
                <div><span className="market-overview__code">{asset.code}</span><span className="market-overview__name">{asset.name}</span></div>
                {change == null ? <span className="market-overview__change">7 дней</span> : (
                  <span className={`market-overview__change ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}% за 7 дней</span>
                )}
              </header>
              <strong className="market-overview__price">{Number.isFinite(currentPrice) ? `$${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}</strong>
              {polyline ? (
                <svg className={`market-overview__chart ${asset.gradient}`} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${asset.name}: история курса за 7 дней`}>
                  <polyline points={polyline} />
                </svg>
              ) : <div className="market-overview__chart-empty">{historyError ? 'История временно недоступна' : 'Загружаем историю…'}</div>}
              <footer className="market-overview__card-foot"><span>7 дней</span><span>Курс в USD</span></footer>
            </article>
          );
        })}
      </div>
      <p className="market-overview__note" role="status">{stale ? 'Показаны последние сохранённые курсы.' : updatedAt ? `Курсы обновлены ${new Date(updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.` : 'Курсы загружаются.'} Справочная информация, не является инвестиционной рекомендацией.</p>
    </section>
  );
};

export default MarketOverview;
