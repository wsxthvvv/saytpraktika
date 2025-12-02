import React, { useState, useMemo } from 'react';
import { useCart } from '../contexts/CartContext';
import { Link } from 'react-router-dom';

const MiningEquipment = () => {
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('');
  const [selectedCoin, setSelectedCoin] = useState('');
  const [hashrateMin, setHashrateMin] = useState('');
  const [hashrateMax, setHashrateMax] = useState('');
  const [powerMin, setPowerMin] = useState('');
  const [powerMax, setPowerMax] = useState('');

  const miners = [
    {
      id: 101,
      title: 'Antminer U3S21EXPH',
      price: 21112.50,
      originalPrice: 16890.00,
      algorithm: 'SHA256',
      coins: 'BTC/BCH/BSV',
      hashrate: '220Th/s',
      power: '3420W',
      description: 'Профессиональный майнер для Bitcoin с высоким хешрейтом',
      badge: 'BTC Miner',
      efficiency: '15.5J/TH',
      shipping: '14 дней',
      warranty: '180 дней',
      image: 'https://www.bitmain.com.vc/wp-content/uploads/2025/10/Bitcoin-Miner-U3S23H1_1.webp'
    },
    {
      id: 102,
      title: 'Antminer Litecoin Miner L11 HU6',
      price: 18587.50,
      originalPrice: 14870.00,
      algorithm: 'SCRYPT',
      coins: 'DOGE/LTC/PEP',
      hashrate: '25Gh/s',
      power: '3200W',
      description: 'Мощный майнер для Litecoin и Dogecoin',
      badge: 'Scrypt Pro',
      efficiency: '128J/GH',
      shipping: '14 дней',
      warranty: '180 дней',
      image: 'https://www.bitmain.com.vc/wp-content/uploads/2025/11/L11-HU6-33G.webp'
    },
    {
      id: 103,
      title: 'Antminer Litecoin Miner L11',
      price: 10200.00,
      originalPrice: 8160.00,
      algorithm: 'SCRYPT',
      coins: 'DOGE/LTC/PEP',
      hashrate: '20Gh/s',
      power: '3680W',
      description: 'Эффективный майнер для Scrypt-алгоритмов',
      badge: 'Best Value',
      efficiency: '184J/GH',
      shipping: '14 дней',
      warranty: '180 дней',
      image: 'https://www.bitmain.com.vc/wp-content/uploads/2025/01/Antminer-L9-1-500x500.webp'
    },
    {
      id: 104,
      title: 'Antminer Litecoin Miner L11 HU2 (35G)',
      price: 17250.00,
      originalPrice: 13800.00,
      algorithm: 'SCRYPT',
      coins: 'DOGE/LTC/PEP',
      hashrate: '35Gh/s',
      power: '4200W',
      description: 'Высокопроизводительный майнер с улучшенным хешрейтом',
      badge: 'High Performance',
      efficiency: '120J/GH',
      shipping: '14 дней',
      warranty: '180 дней',
      image: 'https://www.bitmain.com.vc/wp-content/uploads/2025/11/BITMAIN_Antminer_L11_Hydro_2U_35GH_s.webp'
    },
    {
      id: 105,
      title: 'Antminer U3S23H',
      price: 37500.00,
      originalPrice: 30000.00,
      algorithm: 'SHA256',
      coins: 'BTC/BCH/BSV',
      hashrate: '250Th/s',
      power: '3800W',
      description: 'Флагманский майнер для профессионального майнинга',
      badge: 'Flagship',
      efficiency: '15.2J/TH',
      shipping: '21 день',
      warranty: '180 дней',
      image: 'https://www.bitmain.com.vc/wp-content/uploads/2025/10/Bitcoin-Miner-U3S23H1_3-500x500.webp'
    },
    {
      id: 106,
      title: 'Antminer S23 Hyd.',
      price: 18487.50,
      originalPrice: 14790.00,
      algorithm: 'SHA256',
      coins: 'BTC/BCH/BSV',
      hashrate: '180Th/s',
      power: '3200W',
      description: 'Гидравлическая система охлаждения для максимальной эффективности',
      badge: 'Hydro Cooling',
      efficiency: '17.8J/TH',
      shipping: '21 день',
      warranty: '180 дней',
      image: 'https://www.bitmain.com.vc/wp-content/uploads/2025/06/Antminer-S23-Hyd-4-500x500.webp'
    },
    {
      id: 107,
      title: 'Antminer S21 Hyd.',
      price: 4320.00,
      originalPrice: 3456.00,
      algorithm: 'SHA256',
      coins: 'BTC/BCH/BSV',
      hashrate: '100Th/s',
      power: '2800W',
      description: 'Компактный гидромайнер для домашнего использования',
      badge: 'Home Miner',
      efficiency: '28J/TH',
      shipping: '14 дней',
      warranty: '180 дней',
      image: 'https://www.bitmain.com.vc/wp-content/uploads/2025/04/Antminer-S21e-Hyd-1.webp'
    },
    {
      id: 108,
      title: 'Antminer K57',
      price: 7000.00,
      originalPrice: 5600.00,
      algorithm: 'KHEAVYHASH',
      coins: 'KASPA',
      hashrate: '6Th/s',
      power: '2400W',
      description: 'Специализированный майнер для Kaspa',
      badge: 'Kaspa Miner',
      efficiency: '400J/TH',
      shipping: '14 дней',
      warranty: '180 дней',
      image: 'https://www.bitmain.com.vc/wp-content/uploads/2025/04/Antminer-KS7-1-500x500.webp'
    },
    {
      id: 109,
      title: 'Antminer S21 XP+ Hyd',
      price: 13450.00,
      originalPrice: 10760.00,
      algorithm: 'SHA256',
      coins: 'BTC/BCH/BSV',
      hashrate: '160Th/s',
      power: '3100W',
      description: 'Улучшенная версия с повышенной эффективностью',
      badge: 'XP Series',
      efficiency: '19.4J/TH',
      shipping: '21 день',
      warranty: '180 дней',
      image: 'https://www.bitmain.com.vc/wp-content/uploads/2025/04/Antminer-S21-XP-Hyd-4-500x500.webp'
    },
    {
      id: 110,
      title: 'Antminer E11',
      price: 6300.00,
      originalPrice: 5040.00,
      algorithm: 'ETHASH',
      coins: 'ETC',
      hashrate: '2Gh/s',
      power: '2600W',
      description: 'Майнер для Ethereum Classic',
      badge: 'ETC Miner',
      efficiency: '1300J/GH',
      shipping: '14 дней',
      warranty: '180 дней',
      image: 'https://ibmm.ru/image/cache/catalog/image/catalog/miners_new/bitmain/e9Pro.webp'
    },
    {
      id: 111,
      title: 'Antminer L9 (17Gh)',
      price: 7237.50,
      originalPrice: 5790.00,
      algorithm: 'SCRYPT',
      coins: 'DOGE/LTC',
      hashrate: '17Gh/s',
      power: '3500W',
      description: 'Надежный майнер предыдущего поколения',
      badge: 'Classic',
      efficiency: '206J/GH',
      shipping: '14 дней',
      warranty: '180 дней',
      image: 'https://avatars.mds.yandex.net/i?id=e0b706fbd62fb4b7ab3780a3abe9c0588572cc8a-4600454-images-thumbs&n=13'
    },
    {
      id: 112,
      title: 'Antminer S21e XP Hyd.',
      price: 13575.00,
      originalPrice: 10860.00,
      algorithm: 'SHA256',
      coins: 'BTC/BCH/BSV',
      hashrate: '170Th/s',
      power: '3300W',
      description: 'Энергоэффективная модель с гидроохлаждением',
      badge: 'Energy Efficient',
      efficiency: '19.4J/TH',
      shipping: '21 день',
      warranty: '180 дней',
      image: 'https://avatars.mds.yandex.net/i?id=7f6c4ba0598a23ae322b77ad1c4153ce_l-12820356-images-thumbs&n=13'
    }
  ];

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
  }, []);

  const uniqueCoins = useMemo(() => {
    const allCoins = miners.flatMap(m => m.coins.split('/').map(c => c.trim()));
    return [...new Set(allCoins)].sort();
  }, []);

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
  }, [searchQuery, priceMin, priceMax, selectedAlgorithm, selectedCoin, hashrateMin, hashrateMax, powerMin, powerMax]);

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
    <section className="mining-section">
      <div className="mining-header">
        <h2 className="section-title">Оборудование для майнинга</h2>
        <p className="mining-subtitle">
          Профессиональные майнеры от Bitmain с доставкой по всему ТС. Гарантия 180 дней.
        </p>
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
              {miner.image ? (
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
                    e.target.style.display = 'none';
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
            <div className="miner-card__tax">5%+9%+0</div>
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
  );
};

export default MiningEquipment;