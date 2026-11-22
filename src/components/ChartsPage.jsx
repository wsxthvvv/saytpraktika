import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/charts.css';
import { useNavigate } from 'react-router-dom';
import { useCryptoRates } from '../contexts/CryptoRatesContext';

const PriceChart = ({ coinId, vsCurrency, days, refreshToken }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const requestSeqRef = useRef(0);
  const hasDataRef = useRef(false);
  const dataCacheRef = useRef(new Map());
  const inFlightRef = useRef(new Map());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hoverIndex, setHoverIndex] = useState(null);
  const formatAxisValue = useCallback((value) => {
    const num = Number(value || 0);
    if (vsCurrency === 'usd') return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (vsCurrency === 'rub') return `${num.toLocaleString(undefined, { maximumFractionDigits: 0 })} RUB`;
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${vsCurrency.toUpperCase()}`;
  }, [vsCurrency]);

  useEffect(() => {
    let isMounted = true;
    let debounceTimer = null;

    const fetchHistoricalData = async (isRefresh = false, params = { coinId, vsCurrency, days }) => {
      const currentSeq = ++requestSeqRef.current;

      try {
        const d = parseFloat(params.days);
        const actualDays = (isNaN(d) || d <= 0) ? 7 : d;
        const cacheKey = `${params.coinId}|${params.vsCurrency}|${actualDays}`;
        const url = `/api/crypto/chart?asset=${encodeURIComponent(params.coinId)}&currency=${encodeURIComponent(params.vsCurrency)}&days=${actualDays}`;
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
          setLastUpdatedAt(new Date(cached.timestamp).toISOString());
          hasDataRef.current = true;
          setError(null);
          setLoading(false);
          return;
        }

        const pending = inFlightRef.current.get(cacheKey);
        const json = pending || fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
          .then(async (res) => {
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.ok) throw new Error(body.error || `Ошибка ${res.status}`);
            return body;
          });
        if (!pending) inFlightRef.current.set(cacheKey, json);
        const result = await json;
        inFlightRef.current.delete(cacheKey);

        if (!isMounted || currentSeq !== requestSeqRef.current) return;
        if (!result?.prices?.length) {
          if (!isRefresh && !hasDataRef.current) setError('Нет данных');
          setLoading(false);
          return;
        }

        dataCacheRef.current.set(cacheKey, { prices: result.prices, timestamp: result.updatedAt ? new Date(result.updatedAt).getTime() : now });
        setData(result.prices);
        setLastUpdatedAt(result.updatedAt || new Date(now).toISOString());
        hasDataRef.current = true;
        setError(result.stale ? result.error || 'Показаны сохранённые данные' : null);
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

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchHistoricalData(true);
    }, 60000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchHistoricalData(true);
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
    };
  }, [coinId, vsCurrency, days, refreshToken]);

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
    if (!data.length || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    let width = containerSize.width;
    let height = containerSize.height;
    if (width <= 0 || height <= 0) {
      const rect = containerRef.current.getBoundingClientRect();
      width = Math.max(280, Math.floor(rect.width));
      height = Math.max(220, Math.floor(rect.height));
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const prices = data.map(d => d[1]).filter(p => p != null && !isNaN(p));
    if (prices.length === 0) return;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const leftPad = width < 360 ? 56 : width < 480 ? 64 : width < 768 ? 80 : 106;
    const axisFont = width < 480 ? '10px' : '12px';
    const padding = { top: 18, right: 16, bottom: 42, left: leftPad };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const scaleY = (price) => padding.top + (1 - (price - min) / range) * plotHeight;
    const stepX = plotWidth / Math.max(1, prices.length - 1);
    const axisSteps = 5;

    ctx.strokeStyle = 'rgba(177, 193, 217, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= axisSteps; i++) {
      const y = padding.top + (plotHeight * i) / axisSteps;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const value = max - ((max - min) * i) / axisSteps;
      ctx.fillStyle = '#91a3bd';
      ctx.font = `${axisFont} Inter, Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatAxisValue(value), 8, y);
    }

    const tickCount = Math.min(4, prices.length);
    ctx.fillStyle = '#91a3bd';
    ctx.font = `${axisFont} Inter, Arial, sans-serif`;
    ctx.textBaseline = 'top';
    for (let i = 0; i < tickCount; i++) {
      const index = Math.round((i / Math.max(1, tickCount - 1)) * (prices.length - 1));
      const timestamp = Number(data[index]?.[0]);
      if (!Number.isFinite(timestamp)) continue;
      const x = padding.left + index * stepX;
      const label = new Date(timestamp).toLocaleString('ru-RU', Number(days) < 1
        ? { hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: 'short' });
      ctx.textAlign = i === 0 ? 'left' : i === tickCount - 1 ? 'right' : 'center';
      ctx.fillText(label, x, height - padding.bottom + 10);
    }

    ctx.beginPath();
    ctx.moveTo(padding.left, scaleY(prices[0]));
    for (let i = 1; i < prices.length; i++) {
      const x = padding.left + i * stepX;
      const y = scaleY(prices[i]);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    fill.addColorStop(0, 'rgba(255, 92, 112, 0.28)');
    fill.addColorStop(1, 'rgba(255, 92, 112, 0.01)');
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(padding.left, scaleY(prices[0]));
    for (let i = 1; i < prices.length; i++) {
      ctx.lineTo(padding.left + i * stepX, scaleY(prices[i]));
    }
    ctx.shadowColor = 'rgba(255, 76, 101, 0.42)';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#ff5c70';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const lastX = padding.left + (prices.length - 1) * stepX;
    const lastY = scaleY(prices[prices.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5c70';
    ctx.fill();
    if (hoverIndex != null && prices[hoverIndex] != null) {
      const hoverX = padding.left + hoverIndex * stepX;
      const hoverY = scaleY(prices[hoverIndex]);
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(205, 220, 242, 0.4)';
      ctx.beginPath();
      ctx.moveTo(hoverX, padding.top);
      ctx.lineTo(hoverX, height - padding.bottom);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(hoverX, hoverY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#15243b';
      ctx.fill();
      ctx.strokeStyle = '#ff5c70';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }, [data, containerSize, formatAxisValue, hoverIndex, days]);

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const leftPad = rect.width < 360 ? 56 : rect.width < 480 ? 64 : rect.width < 768 ? 80 : 106;
    const plotWidth = Math.max(1, rect.width - leftPad - 16);
    const progress = Math.max(0, Math.min(1, (event.clientX - rect.left - leftPad) / plotWidth));
    setHoverIndex(Math.round(progress * Math.max(0, data.length - 1)));
  };

  const selectedPoint = hoverIndex == null ? data[data.length - 1] : data[hoverIndex];

  if (loading && !data.length) return <div className="chart-loading">Загружаем историю котировок…</div>;
  if (error && !data.length) return <div className="chart-error">График пока недоступен. Попробуйте позже.</div>;
  return (
    <>
      <div ref={containerRef} className="chart-canvas-container">
        <canvas
          ref={canvasRef}
          className="price-canvas"
          aria-label={`График цены ${coinId}`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
        {loading && data.length > 0 && <div className="chart-loading-overlay">Обновляем график...</div>}
        {error && data.length > 0 && <div className="chart-loading-overlay" role="status">Показаны последние сохранённые данные</div>}
      </div>
      <div className="chart-foot">
        {selectedPoint && <p className="chart-point-label" role="status">{new Date(selectedPoint[0]).toLocaleString('ru-RU')} · <strong>{formatAxisValue(selectedPoint[1])}</strong></p>}
        <span className="chart-updated-at">{lastUpdatedAt ? `Данные: ${new Date(lastUpdatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Ожидаем данные'} · автообновление</span>
      </div>
      <div className="chart-history">
        <div className="chart-history__header"><h3>История цены</h3><span>Последние значения</span></div>
        <div className="chart-history__table-wrap">
          <table className="chart-history__table">
            <thead><tr><th>Время</th><th>Цена</th><th>Изменение</th></tr></thead>
            <tbody>
              {data.slice(-8).reverse().map(([timestamp, value], index, rows) => {
                const previous = rows[index + 1]?.[1];
                const change = previous ? ((Number(value) - Number(previous)) / Number(previous)) * 100 : 0;
                return <tr key={`${timestamp}-${index}`}><td>{new Date(timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>{formatAxisValue(value)}</td><td className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const ChartsPage = () => {
  const navigate = useNavigate();
  const { markets, loading: marketsLoading, error: marketsError, refresh: refreshMarkets, updatedAt: marketsUpdatedAt } = useCryptoRates();

  const [baseAsset, setBaseAsset] = useState('bitcoin');
  const [vsCurrency, setVsCurrency] = useState('usd');
  const [timeRange, setTimeRange] = useState('7');

  const [mainMetrics, setMainMetrics] = useState(null);
  const [topCoins, setTopCoins] = useState([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const [metricsStale, setMetricsStale] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [manualRefreshing, setManualRefreshing] = useState(false);

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
  const marketsAreFresh = Boolean(marketsUpdatedAt && !marketsError && Date.now() - new Date(marketsUpdatedAt).getTime() < 3 * 60 * 1000);

  const refreshAll = async () => {
    setManualRefreshing(true);
    await Promise.allSettled([
      refreshMarkets(),
      fetch(`/api/crypto/asset?asset=${encodeURIComponent(baseAsset)}&currency=${encodeURIComponent(vsCurrency)}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
        .then((res) => res.json())
        .then((data) => { if (data.ok) { setMainMetrics(data); setMetricsStale(Boolean(data.stale)); } }),
    ]);
    setRefreshToken((value) => value + 1);
    setManualRefreshing(false);
  };

  useEffect(() => {
    let active = true;
    setMainMetrics(null);
    setMetricsStale(false);
    const fetchMainMetrics = async () => {
      try {
        const res = await fetch(`/api/crypto/asset?asset=${encodeURIComponent(baseAsset)}&currency=${encodeURIComponent(vsCurrency)}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || `Ошибка ${res.status}`);
        if (!active) return;
        setMainMetrics(data);
        setMetricsStale(Boolean(data.stale));
      } catch {
        if (active) setMetricsStale(true);
      }
    };
    fetchMainMetrics();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchMainMetrics();
    }, 60000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchMainMetrics();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
    };
  }, [baseAsset, vsCurrency]);

  useEffect(() => {
    setTopCoins(markets);
    setLoadingTop(marketsLoading && markets.length === 0);
  }, [markets, marketsLoading]);

  return (
    <div className="charts-page">
      <div className="container">
        <div className="charts-header">
          <div>
            <p className="charts-eyebrow">MARKET INTELLIGENCE</p>
            <h2 className="section-title">Анализ криптовалют</h2>
            <p className="charts-header__subtitle">Живые котировки, история и динамика рынка в одном экране.</p>
          </div>
          <div className="charts-header__actions">
            <span className={`charts-live ${marketsAreFresh ? '' : 'is-stale'}`}><i /> {marketsAreFresh ? 'LIVE' : 'Данные обновляются'} · {marketsUpdatedAt ? new Date(marketsUpdatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'ожидание'}</span>
            <button onClick={refreshAll} className="btn-outline" disabled={manualRefreshing}>
              {manualRefreshing ? 'Обновляем…' : 'Обновить данные'}
            </button>
            <button onClick={() => navigate(-1)} className="btn-outline charts-back-button">
              Назад
            </button>
          </div>
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
                refreshToken={refreshToken}
              />
            </div>

            {mainMetrics && (
              <div className="chart-metrics">
                <div className="metric-item">
                  <span>Цена:</span>
                  <span className="metric-value">
                    {vsCurrency === 'usd'
                      ? `$${Number(mainMetrics.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `${Number(mainMetrics.price).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${vsCurrency.toUpperCase()}`}
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
                      ? `$${(Number(mainMetrics.volume) / 1e6).toFixed(2)}M`
                      : `${(Number(mainMetrics.volume) / 1e6).toFixed(2)}M ${vsCurrency.toUpperCase()}`}
                  </span>
                </div>
                <div className="metric-item">
                  <span>Капитализация:</span>
                  <span className="metric-value">
                    {vsCurrency === 'usd'
                      ? `$${(Number(mainMetrics.marketCap) / 1e9).toFixed(2)}B`
                      : `${(Number(mainMetrics.marketCap) / 1e9).toFixed(2)}B ${vsCurrency.toUpperCase()}`}
                  </span>
                </div>
              </div>
            )}
            {metricsStale && <p className="chart-error" role="status">Данные временно могут быть устаревшими.</p>}
          </div>

          {/* Правая панель — без изменений */}
          <div className="chart-sidebar">
            <div className="sidebar-section">
              <h3>Топ по капитализации</h3>
              <p>Котировки в USD · обновление каждую минуту</p>
              {loadingTop ? (
                <div className="sidebar-loading">Загрузка...</div>
              ) : (
                <div className="sidebar-list">
                  {topCoins.map(coin => (
                    <div key={coin.id} className="sidebar-coin">
                      <div><strong>{coin.symbol.toUpperCase()}</strong></div>
                      <div className="sidebar-coin-right">
                        <span className="sidebar-price">${Number(coin.current_price || 0).toLocaleString()}</span>
                        <span className={`metric-change ${Number(coin.price_change_percentage_24h || 0) >= 0 ? 'positive' : 'negative'}`}>
                          {Number(coin.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{Number(coin.price_change_percentage_24h || 0).toFixed(2)}%
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
