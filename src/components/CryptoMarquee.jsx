import { useCryptoRates } from '../contexts/CryptoRatesContext';

const CryptoMarquee = () => {
  const { simple, loading } = useCryptoRates();

  if (loading && !simple) {
    return (
      <div className="crypto-marquee">
        <div className="crypto-marquee__content">
          <span>Загрузка курсов...</span>
        </div>
      </div>
    );
  }

  const btcUsd = simple?.bitcoin?.usd ?? null;
  const ethUsd = simple?.ethereum?.usd ?? null;
  const btcChange = simple?.bitcoin?.usd_24h_change ?? 0;
  const ethChange = simple?.ethereum?.usd_24h_change ?? 0;
  const btcEth = btcUsd && ethUsd ? (btcUsd / ethUsd).toFixed(4) : null;

  const items = [
    {
      label: 'BTC/USD',
      value: btcUsd ? `$${btcUsd.toLocaleString()}` : '—',
      change: btcChange,
    },
    {
      label: 'ETH/USD',
      value: ethUsd ? `$${ethUsd.toLocaleString()}` : '—',
      change: ethChange,
    },
    {
      label: 'BTC/ETH',
      value: btcEth || '—',
      change: null,
    },
  ];

  const marqueeItems = [...items, ...items, ...items];

  return (
    <div className="crypto-marquee">
      <div className="crypto-marquee__content">
        {marqueeItems.map((item, index) => (
          <span key={index} className="crypto-marquee__item">
            <strong>{item.label}:</strong> {item.value}
            {item.change !== null && (
              <span className={`crypto-marquee__change ${item.change >= 0 ? 'positive' : 'negative'}`}>
                {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change).toFixed(2)}%
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CryptoMarquee;
