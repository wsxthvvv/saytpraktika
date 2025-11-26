import React, { useState, useEffect } from 'react';

const CryptoTicker = () => {
  const [prices, setPrices] = useState({
    btcUsd: null,
    btcEth: null,
  });
  const [change, setChange] = useState({
    btcUsd: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Запрос к CoinGecko (публичный API, без ключа)
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
        );
        const data = await res.json();

        const btcUsd = data.bitcoin.usd;
        const btcUsdChange = data.bitcoin.usd_24h_change;
        const ethUsd = data.ethereum.usd;

        const btcEth = (btcUsd / ethUsd).toFixed(4);

        setPrices({
          btcUsd,
          btcEth,
        });
        setChange({
          btcUsd: btcUsdChange,
        });
        setLoading(false);
      } catch (err) {
        console.error('Не удалось загрузить курсы:', err);
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // обновляем раз в минуту
    return () => clearInterval(interval);
  }, []);

  if (loading) return <span className="crypto-ticker">Загрузка...</span>;

  return (
    <div className="crypto-ticker">
      <span className="crypto-item">
        BTC/USD: <span className="crypto-price">${prices.btcUsd.toLocaleString()}</span>
        <span className={`crypto-change ${change.btcUsd >= 0 ? 'positive' : 'negative'}`}>
          {change.btcUsd >= 0 ? '↑' : '↓'} {Math.abs(change.btcUsd).toFixed(2)}%
        </span>
      </span>
      <span className="crypto-item">
        BTC/ETH: <span className="crypto-price">{prices.btcEth}</span>
      </span>
    </div>
  );
};

export default CryptoTicker;