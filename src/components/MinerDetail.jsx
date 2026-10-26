// src/components/MinerDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import Testimonials from './Testimonials';

const MinerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState('description');
  const [miner, setMiner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(id)}`)
      .then((response) => response.json())
      .then((data) => setMiner(data.product || null))
      .catch(() => setMiner(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="route-loading" role="status">Загружаем карточку майнера…</p>;
  }

  if (!miner) {
    return (
      <div className="miner-not-found">
        <h2>Майнер не найден</h2>
        <Link to="/mining" className="btn">Вернуться к каталогу</Link>
      </div>
    );
  }
  const renderDescription = () => (
    <div className="miner-description-content">
      <h3>{miner.title} – Новое поколение майнинговой мощности</h3>
      <p>
        <strong>{miner.title}</strong> от <strong>Bitmain</strong> представляет будущее высокопроизводительного майнинга по алгоритму {miner.algorithm}. 
        Обеспечивая мощный <strong>хешрейт {miner.hashrate}</strong> при <strong>потребляемой мощности {miner.power}</strong>, 
        {miner.title} устанавливает новые стандарты эффективности и прибыльности.
      </p>
      <p>
        Независимо от того, майните ли вы <strong>{miner.coins.replace('/', ', ')}</strong>, 
        {miner.title} разработан для обеспечения стабильной производительности высшего класса.
      </p>
      <p>
        Построенный <strong>Bitmain</strong>, мировым лидером в области блокчейн-оборудования, 
        {miner.title.split(' ')[0]} объединяет передовой дизайн чипов, эффективное охлаждение и надежную конструкцию — 
        делая его идеальным выбором как для профессиональных майнинговых ферм, так и для серьезных индивидуальных майнеров, 
        стремящихся масштабировать операции.
      </p>
      <h4>Ключевые особенности:</h4>
      <ul>
        <li><strong>Высокий хешрейт</strong>: {miner.hashrate} для непревзойденной производительности майнинга</li>
        <li><strong>Оптимизированное энергопотребление</strong>: Потребление {miner.power} с эффективностью {miner.efficiency}</li>
        <li><strong>Алгоритм {miner.algorithm}</strong>: Идеально для майнинга {miner.coins.replace('/', ', ')}</li>
        <li><strong>Продвинутое охлаждение</strong>: Система охлаждения для непрерывной работы 24/7</li>
        <li><strong>Надежность Bitmain</strong>: Проверенная конструкция для крупномасштабного развертывания</li>
      </ul>
      <p>
        Если вы готовы вывести производительность майнинга на новый уровень, <strong>{miner.title}</strong> обеспечивает мощность, 
        эффективность и надежность, необходимые для лидерства в современной конкурентной крипто-индустрии.
      </p>
      <p className="miner-slogan">
        <strong>Майньте умнее. Майньте сильнее. Оборудуйте свою операцию {miner.title} от Bitmain.</strong>
      </p>
    </div>
  );
  const renderAdditionalInfo = () => (
    <div className="miner-additional-info">
      <h4>Технические характеристики:</h4>
      <div className="specs-grid">
        <div className="spec-item">
          <span className="spec-label">Бренд:</span>
          <span className="spec-value">{miner.title}</span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Модель:</span>
          <span className="spec-value">{miner.hashrate} @ {miner.power}</span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Алгоритм:</span>
          <span className="spec-value">{miner.algorithm}</span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Поддерживаемые монеты:</span>
          <span className="spec-value">{miner.coins}</span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Хешрейт:</span>
          <span className="spec-value">{miner.hashrate}</span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Потребляемая мощность:</span>
          <span className="spec-value">{miner.power}</span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Эффективность:</span>
          <span className="spec-value">{miner.efficiency}</span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Гарантия:</span>
          <span className="spec-value">{miner.warranty}</span>
        </div>
      </div>
      <h4>Примечания:</h4>
      <ul>
        <li>Значения хешрейта, мощности и эффективности являются типичными и могут варьироваться в пределах ±3% для хешрейта и ±5% для мощности</li>
        <li>Неправильное входное напряжение может привести к повреждению оборудования</li>
        <li>Максимальные рабочие условия предполагают работу вентиляторов на полной скорости</li>
        <li>При работе на высоте от 300м до 2000м максимальная рабочая температура уменьшается на 1°C каждые 300м</li>
      </ul>
    </div>
  );
  const renderWarranty = () => (
    <div className="miner-warranty-info">
      <h4>Условия гарантии:</h4>
      <ul>
        <li>Bitmain предоставляет <strong>180-дневную гарантию</strong> с даты отгрузки</li>
        <li>Bitmain покрывает стоимость доставки заменяемых блоков в течение гарантийного периода</li>
        <li>Гарантия распространяется только на <strong>оригинального покупателя</strong></li>
        <li>Повреждения, возникшие в результате неправильного использования, несанкционированных модификаций или несоблюдения условий эксплуатации, <strong>не покрываются</strong> гарантией</li>
      </ul>
      <h4>Условия доставки:</h4>
      <ol>
        <li>Заказы выполняются по принципу <strong>"первый оплачен - первый отправлен"</strong> после получения полной оплаты Bitmain</li>
        <li>Клиенты <strong>несут ответственность за таможенное оформление</strong> и любые связанные задержки или расходы</li>
        <li>Сертификаты соответствия и информация для таможенного оформления доступны на сайте Bitmain</li>
      </ol>
      <h4>Руководство по покупке:</h4>
      <ul>
        <li>Стоимость доставки, таможенные сборы и налоги (если применимо) <strong>не включены</strong> в указанную цену</li>
        <li>После отправки заказа <strong>отмены, возвраты или изменения</strong> товара(ов) или партии(й) <strong>не принимаются</strong> Bitmain</li>
        <li>Изображения продуктов приведены <strong>только для справки</strong>: окончательный отгруженный продукт может отличаться</li>
      </ul>
    </div>
  );
  return (
    <>
    <div className="miner-detail-page">
      <div className="miner-detail-breadcrumbs">
        <Link to="/mining">Оборудование для майнинга</Link>
        <span> / </span>
        <span>{miner.title}</span>
      </div>
      <div className="miner-detail-container">
        {/* Левая колонка */}
        <div className="miner-detail-left-column">
          <div className="miner-image-main">
            {miner.image ? (
              <img
                src={miner.image.trim()}
                alt={miner.title}
                className="miner-detail-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="miner-image-placeholder-large">
                <span className="miner-image-icon">⚡</span>
              </div>
            )}
          </div>
          <div className="miner-detail-categories-wrapper">
            <div className="miner-detail-categories-centered">
              <div className="categories-section">
                <strong>КАТЕГОРИИ:</strong> {miner.coins.replace(/\//g, ', ')}
              </div>
              <div className="tags-section">
                <strong>ТЕГИ:</strong> ANTMINER, {miner.title.replace(/\s+/g, '_').toUpperCase()}, BITMAIN, {miner.coins.split('/')[0]}, {miner.algorithm}
              </div>
            </div>
          </div>
        </div>
        {/* Правая колонка */}
        <div className="miner-detail-right-column">
          <div className="miner-detail-badge">{miner.badge}</div>
          <h1 className="miner-detail-title">{miner.title}</h1>
          <div className="miner-detail-price">
            <span className="miner-price-current">${Math.round(miner.originalPrice).toLocaleString('en-US')}</span>
            <span className="miner-price-original">${Math.round(miner.price).toLocaleString('en-US')}</span>
          </div>
          <div className="miner-detail-specs">
            <div className="miner-spec-item">
              <span className="spec-label">Бренд:</span>
              <span className="spec-value">{miner.title}</span>
            </div>
            <div className="miner-spec-item">
              <span className="spec-label">Модель:</span>
              <span className="spec-value">{miner.hashrate} @ {miner.power}</span>
            </div>
            <div className="miner-spec-item">
              <span className="spec-label">Доставка:</span>
              <span className="spec-value">Отправка в течение {miner.shipping}</span>
            </div>
          </div>
          {/* УБРАЛИ БЕГУЩУЮ СТРОКУ И БАННЕР */}
          {/* <div className="delivery-banner">
            <div className="delivery-banner__content">
              <span className="delivery-banner__icon">🚚</span>
              <div className="delivery-banner__text">
                <strong>Доставка во все регионы Таможенного Союза из Минска</strong>
                <span>Быстрая доставка, таможенное оформление, гарантия качества</span>
              </div>
            </div>
          </div> */}
          <div className="miner-detail-info-gap">
            <div className="miner-detail-actions">
              <button 
                className="btn btn--large miner-detail-cart"
                onClick={() => {
                  addToCart({
                    ...miner,
                    price: miner.originalPrice // ✅ ПРАВИЛЬНАЯ ЦЕНА ДЛЯ КОРЗИНЫ
                  });
                  navigate('/cart');
                }}
              >
                Добавить в корзину
              </button>
            </div>
            <div className="miner-detail-features-centered">
              <h4>Дополнительные преимущества:</h4>
              <div className="features-grid-centered">
                <div className="feature-item-centered">
                  <span className="feature-icon">⭐</span>
                  <span>Премиальное качество</span>
                </div>
                <div className="feature-item-centered">
                  <span className="feature-icon">🔒</span>
                  <span>Безопасные платежи</span>
                </div>
                <div className="feature-item-centered">
                  <span className="feature-icon">✓</span>
                  <span>Гарантия удовлетворения</span>
                </div>
                <div className="feature-item-centered">
                  <span className="feature-icon">🌍</span>
                  <span>Доставка по всему миру</span>
                </div>
                <div className="feature-item-centered">
                  <span className="feature-icon">💰</span>
                  <span>Гарантия возврата денег</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Табы */}
      <div className="miner-detail-tabs">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            ОПИСАНИЕ
          </button>
          <button 
            className={`tab-btn ${activeTab === 'additional' ? 'active' : ''}`}
            onClick={() => setActiveTab('additional')}
          >
            ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ
          </button>
          <button 
            className={`tab-btn ${activeTab === 'warranty' ? 'active' : ''}`}
            onClick={() => setActiveTab('warranty')}
          >
            ГАРАНТИЯ И ДОСТАВКА
          </button>
        </div>
        <div className="tabs-content">
          {activeTab === 'description' && renderDescription()}
          {activeTab === 'additional' && renderAdditionalInfo()}
          {activeTab === 'warranty' && renderWarranty()}
        </div>
      </div>
    </div>
    <Testimonials subtitle="Отзывы о майнинговом оборудовании" />
    </>
  );
};
export default MinerDetail;
