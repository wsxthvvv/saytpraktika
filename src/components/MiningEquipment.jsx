import React, { useState, useMemo, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import Testimonials from './Testimonials';
import { Link } from 'react-router-dom';

const MiningEquipment = () => {
  const { addToCart } = useCart();
  const [brokenImages, setBrokenImages] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('');
  const [selectedCoin, setSelectedCoin] = useState('');
  const [hashrateMin, setHashrateMin] = useState('');
  const [hashrateMax, setHashrateMax] = useState('');
  const [powerMin, setPowerMin] = useState('');
  const [powerMax, setPowerMax] = useState('');
  const [miners, setMiners] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    fetch('/api/products?category=miner')
      .then((response) => response.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.products)) setMiners(data.products);
        else setCatalogError('Не удалось загрузить каталог майнеров');
      })
      .catch(() => setCatalogError('Каталог недоступен. Запустите npm run server.'))
      .finally(() => setCatalogLoading(false));
  }, []);

  const parseHashrate = (hashrateStr) => {
    const match = hashrateStr.match(/([\d.]+)\s*(Th|Gh|Mh)\/s/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'TH') return value;
    if (unit === 'GH') return value / 1000;
    if (unit === 'MH') return value / 1000000;
    return 0;
  };

  const parsePower = (powerStr) => {
    const match = powerStr.match(/([\d.]+)\s*W/i);
    return match ? parseFloat(match[1]) : 0;
  };

  const uniqueAlgorithms = useMemo(() => {
    return [...new Set(miners.map(m => m.algorithm))].sort();
  }, [miners]);

  const uniqueCoins = useMemo(() => {
    const allCoins = miners.flatMap(m => m.coins.split('/').map(c => c.trim()));
    return [...new Set(allCoins)].sort();
  }, [miners]);

  const filteredMiners = useMemo(() => {
    return miners.filter(miner => {
      if (searchQuery && !miner.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (priceMin && miner.originalPrice < parseFloat(priceMin)) {
        return false;
      }
      if (priceMax && miner.originalPrice > parseFloat(priceMax)) {
        return false;
      }
      if (selectedAlgorithm && miner.algorithm !== selectedAlgorithm) {
        return false;
      }
      if (selectedCoin && !miner.coins.includes(selectedCoin)) {
        return false;
      }
      const hashrateValue = parseHashrate(miner.hashrate);
      if (hashrateMin && hashrateValue < parseFloat(hashrateMin)) {
        return false;
      }
      if (hashrateMax && hashrateValue > parseFloat(hashrateMax)) {
        return false;
      }
      const powerValue = parsePower(miner.power);
      if (powerMin && powerValue < parseFloat(powerMin)) {
        return false;
      }
      if (powerMax && powerValue > parseFloat(powerMax)) {
        return false;
      }
      return true;
    });
  }, [miners, searchQuery, priceMin, priceMax, selectedAlgorithm, selectedCoin, hashrateMin, hashrateMax, powerMin, powerMax]);

  const resetFilters = () => {
    setSearchQuery('');
    setPriceMin('');
    setPriceMax('');
    setSelectedAlgorithm('');
    setSelectedCoin('');
    setHashrateMin('');
    setHashrateMax('');
    setPowerMin('');
    setPowerMax('');
  };

  return (
    <>
    <section className="mining-section">
      <div className="mining-header">
        <h2 className="section-title">Оборудование для майнинга</h2>
        <p className="mining-subtitle">
          Профессиональные майнеры от Bitmain с доставкой по всему ТС. Гарантия 180 дней.
        </p>
        {catalogLoading && <p className="mining-subtitle" role="status">Загружаем каталог…</p>}
        {catalogError && <p className="contact-widget__error" role="alert">{catalogError}</p>}
      </div>

      <div className="mining-filters" style={{
        background: 'var(--card-bg, #fff)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Фильтры</h3>
          <button 
            onClick={resetFilters}
            className="btn-outline"
            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
          >
            Сбросить
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-field">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Поиск по названию
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите название..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border, #e0e0e0)',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div className="form-field">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Цена ($)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="От"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border, #e0e0e0)',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="До"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border, #e0e0e0)',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
          <div className="form-field">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Алгоритм
            </label>
            <select
              value={selectedAlgorithm}
              onChange={(e) => setSelectedAlgorithm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border, #e0e0e0)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                background: 'white'
              }}
            >
              <option value="">Все алгоритмы</option>
              {uniqueAlgorithms.map(alg => (
                <option key={alg} value={alg}>{alg}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Монеты
            </label>
            <select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border, #e0e0e0)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                background: 'white'
              }}
            >
              <option value="">Все монеты</option>
              {uniqueCoins.map(coin => (
                <option key={coin} value={coin}>{coin}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Хешрейт (Th/s)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                step="0.1"
                value={hashrateMin}
                onChange={(e) => setHashrateMin(e.target.value)}
                placeholder="От"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border, #e0e0e0)',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
              <input
                type="number"
                step="0.1"
                value={hashrateMax}
                onChange={(e) => setHashrateMax(e.target.value)}
                placeholder="До"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border, #e0e0e0)',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
          <div className="form-field">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Потребление (W)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                value={powerMin}
                onChange={(e) => setPowerMin(e.target.value)}
                placeholder="От"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border, #e0e0e0)',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
              <input
                type="number"
                value={powerMax}
                onChange={(e) => setPowerMax(e.target.value)}
                placeholder="До"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border, #e0e0e0)',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border, #e0e0e0)', fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
          Найдено майнеров: <strong>{filteredMiners.length}</strong> из {miners.length}
        </div>
      </div>

      <div className="miners-grid">
        {filteredMiners.length > 0 ? (
          filteredMiners.map((miner) => (
          <article key={miner.id} className="miner-card">
            {/* УБРАЛИ БЕЙДЖ */}
            {/* <div className="miner-card__badge">{miner.badge}</div> */}
            <div className="miner-card__image">
              {miner.image && !brokenImages[miner.id] ? (
                <img
                  src={miner.image}
                  alt={miner.title}
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'contain',
                    borderRadius: '12px'
                  }}
                  onError={(e) => {
                    setBrokenImages((prev) => ({ ...prev, [miner.id]: true }));
                  }}
                />
              ) : (
                <div className="miner-image-placeholder">
                  <span className="miner-image-icon">⛏️</span>
                </div>
              )}
            </div>
            <header className="miner-card__header">
              <Link to={`/mining/${miner.id}`} className="miner-card__title-link">
                <h3 className="miner-card__title">{miner.title}</h3>
              </Link>
              <div className="miner-card__price">
                <span className="miner-price-current">${Math.round(miner.originalPrice).toLocaleString('en-US')}</span>
                <span className="miner-price-original">${Math.round(miner.price).toLocaleString('en-US')}</span>
              </div>
            </header>
            <div className="miner-card__specs">
              <div className="miner-spec">
                <span className="miner-spec__label">Алгоритм:</span>
                <span className="miner-spec__value">{miner.algorithm}</span>
              </div>
              <div className="miner-spec">
                <span className="miner-spec__label">Монеты:</span>
                <span className="miner-spec__value">{miner.coins}</span>
              </div>
              <div className="miner-spec">
                <span className="miner-spec__label">Хешрейт:</span>
                <span className="miner-spec__value">{miner.hashrate}</span>
              </div>
              <div className="miner-spec">
                <span className="miner-spec__label">Потребление:</span>
                <span className="miner-spec__value">{miner.power}</span>
              </div>
            </div>
            <p className="miner-card__description">{miner.description}</p>
            <div className="miner-card__actions">
              <Link to={`/mining/${miner.id}`} className="btn-outline miner-card__details-btn">
                Подробнее
              </Link>
              <button 
                className="btn miner-card__action" 
                onClick={() => addToCart({
                  ...miner,
                  price: miner.originalPrice
                })}
              >
                В корзину
              </button>
            </div>
          </article>
          ))
        ) : (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '3rem',
            color: 'var(--text-secondary, #666)'
          }}>
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Ничего не найдено</p>
            <p style={{ fontSize: '0.875rem' }}>Попробуйте изменить параметры фильтрации</p>
          </div>
        )}
      </div>
    </section>
    <Testimonials subtitle="Отзывы о майнинговом оборудовании и доставке" />
    </>
  );
};

export default MiningEquipment;
