// src/components/ChartsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Компонент одного графика
const PriceChart = ({ coinId, symbol }) => {
  const canvasRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1&interval=hourly`
        );
        const json = await res.json();
        setData(json.prices || []);
        setLoading(false);
      } catch (err) {
        console.error(`Ошибка загрузки графика ${symbol}:`, err);
        setLoading(false);
      }
    };

    fetchHistoricalData();
    const interval = setInterval(fetchHistoricalData, 60000);
    return () => clearInterval(interval);
  }, [coinId, symbol]);

  // Рисуем график на canvas
  useEffect(() => {
    if (loading || data.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Очистка
    ctx.clearRect(0, 0, width, height);

    // Нормализация данных
    const prices = data.map(d => d[1]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    // Масштабирование Y
    const scaleY = (price) => height - ((price - min) / range) * height;

    // Рисуем линию
    ctx.beginPath();
    ctx.moveTo(0, scaleY(prices[0]));
    const step = width / (prices.length - 1);
    for (let i = 1; i < prices.length; i++) {
      const x = i * step;
      const y = scaleY(prices[i]);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data, loading]);

  if (loading) {
    return <div className="chart-loading">Загрузка графика...</div>;
  }

  return <canvas ref={canvasRef} className="price-canvas" />;
};

// Основной компонент
const ChartsPage = () => {
  const [coins, setCoins] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const navigate = useNavigate();
  const coinIds = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'dogecoin'];

  useEffect(() => {
    const fetchCoinData = async () => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await res.json();
        const formatted = coinIds.map(id => {
          const symbol = {
            bitcoin: 'BTC',
            ethereum: 'ETH',
            binancecoin: 'BNB',
            solana: 'SOL',
            dogecoin: 'DOGE'
          }[id];
          const price = data[id].usd;
          const change = data[id].usd_24h_change;
          return {
            id,
            symbol,
            price,
            change,
            satoshi: id === 'bitcoin' ? (100_000_000 / price).toFixed(2) : null
          };
        });
        setCoins(formatted);
        setLoadingPrices(false);
      } catch (err) {
        console.error('Ошибка загрузки курсов:', err);
        setLoadingPrices(false);
      }
    };

    fetchCoinData();
    const interval = setInterval(fetchCoinData, 60000);
    return () => clearInterval(interval);
  }, []); // ✅ coinIds вынесены в константу внутри useEffect — зависимость не нужна

  if (loadingPrices) {
    return (
      <div className="charts-page">
        <h2>Загрузка крипто-данных...</h2>
      </div>
    );
  }

  return (
    <div className="charts-page">
      <div className="charts-header">
        <h2>📈 Графики криптовалют</h2>
        <button onClick={() => navigate(-1)} className="btn-outline">
          Назад
        </button>
      </div>
      <div className="charts-container">
        {/* Левая часть — реальные графики */}
        <div className="charts-left">
          {coins.slice(0, 3).map(coin => (
            <div key={coin.id} className="chart-box">
              <h3>{coin.symbol}/USD</h3>
              <PriceChart coinId={coin.id} symbol={coin.symbol} />
            </div>
          ))}
        </div>
        {/* Правая часть — курсы */}
        <div className="charts-right">
          <div className="price-card">
            <h3>Текущие курсы</h3>
            {coins.map(coin => (
              <div key={coin.id} className="price-item">
                <div>
                  <strong>{coin.symbol}</strong>
                </div>
                <div className="price-values">
                  <span className="price-value">${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className={`change ${coin.change >= 0 ? 'positive' : 'negative'}`}>
                    {coin.change >= 0 ? '↑' : '↓'} {Math.abs(coin.change).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
            <div className="price-item satoshi-item">
              <div>
                <strong>SATS</strong>
                <span className="sub-label"> (1 BTC = 100M SATS)</span>
              </div>
              <div className="price-values">
                <span className="price-value">${coins.find(c => c.id === 'bitcoin')?.satoshi || '0.00'} USD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsPage;