// src/components/CryptoMarquee.jsx
import React, { useState, useEffect } from 'react';

const CryptoMarquee = () => {
  const [prices, setPrices] = useState({
    btcUsd: null,
    btcEth: null,
    ethUsd: null,
  });
  const [change, setChange] = useState({
    btcUsd: 0,
    ethUsd: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
        );
        const data = await res.json();

        const btcUsd = data.bitcoin?.usd ?? null;
        const btcUsdChange = data.bitcoin?.usd_24h_change ?? 0;
        const ethUsd = data.ethereum?.usd ?? null;
        const ethUsdChange = data.ethereum?.usd_24h_change ?? 0;

        const btcEth = btcUsd && ethUsd ? (btcUsd / ethUsd).toFixed(4) : null;

        setPrices({ btcUsd, btcEth, ethUsd });
        setChange({ btcUsd: btcUsdChange, ethUsd: ethUsdChange });
        setLoading(false);
      } catch (err) {
        console.error('Не удалось загрузить курсы:', err);
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="crypto-marquee">
        <div className="crypto-marquee__content">
          <span>Загрузка курсов...</span>
        </div>
      </div>
    );
  }

  const items = [
    {
      label: 'BTC/USD',
      value: prices.btcUsd ? `$${prices.btcUsd.toLocaleString()}` : '—',
      change: change.btcUsd,
    },
    {
      label: 'ETH/USD',
      value: prices.ethUsd ? `$${prices.ethUsd.toLocaleString()}` : '—',
      change: change.ethUsd,
    },
    {
      label: 'BTC/ETH',
      value: prices.btcEth || '—',
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