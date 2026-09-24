// src/components/ChartsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const PriceChart = ({ coinId, vsCurrency, days }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const requestSeqRef = useRef(0);
  const hasDataRef = useRef(false);
  const dataCacheRef = useRef(new Map());
  const inFlightRef = useRef(new Map());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const formatAxisValue = (value) => {
    const num = Number(value || 0);
    if (vsCurrency === 'usd') return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (vsCurrency === 'rub') return `${num.toLocaleString(undefined, { maximumFractionDigits: 0 })} RUB`;
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${vsCurrency.toUpperCase()}`;
  };

  useEffect(() => {
    let isMounted = true;
    let debounceTimer = null;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchHistoricalData = async (isRefresh = false, params = { coinId, vsCurrency, days }) => {
      const currentSeq = ++requestSeqRef.current;

      try {
        const d = parseFloat(params.days);
        const actualDays = (isNaN(d) || d <= 0) ? 7 : d;
        const cacheKey = `${params.coinId}|${params.vsCurrency}|${actualDays}`;
        const url = `https://api.coingecko.com/api/v3/coins/${params.coinId}/market_chart?vs_currency=${params.vsCurrency}&days=${actualDays}`;
        const now = Date.now();
        const cached = dataCacheRef.current.get(cacheKey);
        const hasFreshCache = Boolean(cached && now - cached.timestamp < 120000);

        if (!isRefresh) {
          setError(null);
          // Если кэша для нового выбора нет, очищаем старый график, чтобы не было ощущения "залипания".
          if (!hasFreshCache) {
            hasDataRef.current = false;
            setData([]);
          }
        }
        setLoading(true);

        // При быстрых переключениях сразу показываем недавний кэш.
        if (!isRefresh && hasFreshCache) {
          if (!isMounted || currentSeq !== requestSeqRef.current) return;
          setData(cached.prices);
          hasDataRef.current = true;
          setError(null);
          setLoading(false);
          return;
        }

        const maxAttempts = 3;
        const runFetch = async () => {
          let lastRes = null;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const res = await fetch(url, { cache: 'no-store' });
            lastRes = res;
            if (res.ok) {
              const json = await res.json();
              return json;
            }

            const shouldRetry = [429, 500, 502, 503, 504].includes(res.status);
            if (!shouldRetry || attempt === maxAttempts) break;
            await sleep(600 * attempt);
          }
          throw new Error(`Ошибка ${lastRes?.status ?? 'network'}`);
        };

        const pending = inFlightRef.current.get(cacheKey);
        const json = pending || runFetch();
        if (!pending) inFlightRef.current.set(cacheKey, json);
        const result = await json;
        inFlightRef.current.delete(cacheKey);

        if (!isMounted || currentSeq !== requestSeqRef.current) return;
        if (!result?.prices?.length) {
          if (!isRefresh && !hasDataRef.current) setError('Нет данных');
          setLoading(false);
          return;
        }

        dataCacheRef.current.set(cacheKey, { prices: result.prices, timestamp: now });
        setData(result.prices);
        hasDataRef.current = true;
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка:', err);
        inFlightRef.current.clear();
        if (!isMounted || currentSeq !== requestSeqRef.current) return;
        // На автообновлении не затираем рабочий график из-за временных сбоев API.
        if (!isRefresh || !hasDataRef.current) {
          setError('Не загружено');
        }
        setLoading(false);
      }
    };

    // Debounce: при быстром переключении загружаем только последний выбранный вариант.
    debounceTimer = setTimeout(() => {
      fetchHistoricalData(false, { coinId, vsCurrency, days });
    }, 220);

    const interval = setInterval(() => fetchHistoricalData(true), 180000);
    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(interval);
    };
  }, [coinId, vsCurrency, days]);

  // Отслеживание размера контейнера (контейнер рендерится только при успешной загрузке)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w > 0 && h > 0) {
        setContainerSize({ width: w, height: h });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [loading, error, data.length]);

  // Рендеринг canvas с корректными размерами
  useEffect(() => {
    if (loading || error || !data.length || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    let width = containerSize.width;
    let height = containerSize.height;
    if (width <= 0 || height <= 0) {
      const rect = containerRef.current.getBoundingClientRect();
      width = Math.max(800, Math.floor(rect.width));
      height = Math.max(360, Math.floor(rect.height));
    }
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const prices = data.map(d => d[1]).filter(p => p != null && !isNaN(p));
    if (prices.length === 0) return;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const padding = { top: 16, right: 16, bottom: 24, left: 106 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const scaleY = (price) => padding.top + (1 - (price - min) / range) * plotHeight;
    const stepX = plotWidth / Math.max(1, prices.length - 1);
    const axisSteps = 5;

    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= axisSteps; i++) {
      const y = padding.top + (plotHeight * i) / axisSteps;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const value = max - ((max - min) * i) / axisSteps;
      ctx.fillStyle = '#777';
      ctx.font = '12px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatAxisValue(value), 8, y);
    }

    ctx.beginPath();
    ctx.moveTo(padding.left, scaleY(prices[0]));
    for (let i = 1; i < prices.length; i++) {
      const x = padding.left + i * stepX;
      const y = scaleY(prices[i]);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#e10600';
    ctx.lineWidth = 2;
    ctx.stroke();

    const lastX = padding.left + (prices.length - 1) * stepX;
    const lastY = scaleY(prices[prices.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#e10600';
    ctx.fill();
  }, [data, loading, error, containerSize]);

  if (loading && !data.length) return <div className="chart-loading">Загрузка...</div>;
  if (error && !data.length) return <div className="chart-error">{error}</div>;
  return (
    <div ref={containerRef} className="chart-canvas-container">
      <canvas ref={canvasRef} className="price-canvas" />
      {loading && data.length > 0 && <div className="chart-loading-overlay">Обновляем график...</div>}
    </div>
  );
};

const ChartsPage = () => {
  const navigate = useNavigate();

  const [baseAsset, setBaseAsset] = useState('bitcoin');
  const [vsCurrency, setVsCurrency] = useState('usd');
  const [timeRange, setTimeRange] = useState('7');

  const [mainMetrics, setMainMetrics] = useState(null);
  const [topCoins, setTopCoins] = useState([]);
  const [loadingTop, setLoadingTop] = useState(true);

  // Опции времени: для всех валют одинаковые (API поддерживает дробные дни)
  const timeOptions = [
    { label: '1H', value: '0.0417' },
    { label: '6H', value: '0.25' },
    { label: '1D', value: '1' },
    { label: '7D', value: '7' },
    { label: '30D', value: '30' },
    { label: '90D', value: '90' },
  ];

  const baseAssets = [
    { id: 'bitcoin', name: 'BTC' },
    { id: 'ethereum', name: 'ETH' },
    { id: 'binancecoin', name: 'BNB' },
    { id: 'solana', name: 'SOL' },
    { id: 'cardano', name: 'ADA' },
    { id: 'ripple', name: 'XRP' },
    { id: 'dogecoin', name: 'DOGE' },
    { id: 'litecoin', name: 'LTC' },
  ];

  const vsCurrencies = ['usd', 'rub', 'btc', 'eth'];

  // === Загрузка метрик и топа — без изменений ===
  useEffect(() => {
    const fetchMainMetrics = async () => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${baseAsset}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
        );
        if (!res.ok) return;
        const data = await res.json();
        setMainMetrics({
          price: data.market_data?.current_price?.[vsCurrency] || 0,
          change24h: data.market_data?.price_change_percentage_24h || 0,
          volume: data.market_data?.total_volume?.[vsCurrency] || 0,
          marketCap: data.market_data?.market_cap?.[vsCurrency] || 0,
        });
      } catch (err) {
        console.error('Ошибка метрик:', err);
      }
    };
    fetchMainMetrics();
  }, [baseAsset, vsCurrency]);

  useEffect(() => {
    const fetchTopCoins = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h'
        );
        if (!res.ok) return;
        const coins = await res.json();
        setTopCoins(coins);
        setLoadingTop(false);
      } catch (err) {
        console.error('Ошибка топа:', err);
        setLoadingTop(false);
      }
    };
    fetchTopCoins();
    const interval = setInterval(fetchTopCoins, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="charts-page">
      <div className="container">
        <div className="charts-header">
          <h2 className="section-title">Анализ криптовалют</h2>
          <button onClick={() => navigate(-1)} className="btn-outline">
            Назад
          </button>
        </div>

        <div className="charts-main-layout">
          <div className="chart-main-section">
            <div className="chart-controls">
              <div className="chart-control-group">
                <label>Актив</label>
                <select value={baseAsset} onChange={(e) => setBaseAsset(e.target.value)} className="chart-select">
                  {baseAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="chart-control-group">
                <label>Относительно</label>
                <select value={vsCurrency} onChange={(e) => setVsCurrency(e.target.value)} className="chart-select">
                  {vsCurrencies.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="chart-time-buttons">
                {timeOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`chart-time-btn ${timeRange === opt.value ? 'active' : ''}`}
                    onClick={() => setTimeRange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="chart-wrapper">
              <div className="chart-current-selection">
                {baseAssets.find((a) => a.id === baseAsset)?.name}/{vsCurrency.toUpperCase()} • {timeOptions.find((t) => t.value === timeRange)?.label}
              </div>
              <PriceChart
                coinId={baseAsset}
                vsCurrency={vsCurrency}
                days={timeRange}
              />
            </div>

            {mainMetrics && (
              <div className="chart-metrics">
                <div className="metric-item">
                  <span>Цена:</span>
                  <span className="metric-value">
                    {vsCurrency === 'usd'
                      ? `$${mainMetrics.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `${mainMetrics.price.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${vsCurrency.toUpperCase()}`}
                  </span>
                </div>
                <div className="metric-item">
                  <span>Изменение 24ч:</span>
                  <span className={`metric-change ${mainMetrics.change24h >= 0 ? 'positive' : 'negative'}`}>
                    {mainMetrics.change24h >= 0 ? '+' : ''}{(mainMetrics.change24h ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="metric-item">
                  <span>Объём:</span>
                  <span className="metric-value">
                    {vsCurrency === 'usd'
                      ? `$${(mainMetrics.volume / 1e6).toFixed(2)}M`
                      : `${(mainMetrics.volume / 1e6).toFixed(2)}M ${vsCurrency.toUpperCase()}`}
                  </span>
                </div>
                <div className="metric-item">
                  <span>Капитализация:</span>
                  <span className="metric-value">
                    {vsCurrency === 'usd'
                      ? `$${(mainMetrics.marketCap / 1e9).toFixed(2)}B`
                      : `${(mainMetrics.marketCap / 1e9).toFixed(2)}B ${vsCurrency.toUpperCase()}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Правая панель — без изменений */}
          <div className="chart-sidebar">
            <div className="sidebar-section">
              <h3>Топ по капитализации</h3>
              {loadingTop ? (
                <div className="sidebar-loading">Загрузка...</div>
              ) : (
                <div className="sidebar-list">
                  {topCoins.map(coin => (
                    <div key={coin.id} className="sidebar-coin">
                      <div><strong>{coin.symbol.toUpperCase()}</strong></div>
                      <div className="sidebar-coin-right">
                        <span className="sidebar-price">${coin.current_price.toLocaleString()}</span>
                        <span className={`metric-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                          {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsPage;