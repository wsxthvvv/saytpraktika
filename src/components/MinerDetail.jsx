import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import Testimonials from './Testimonials';
import { formatUsd } from '../utils/currency';
import ServiceLeadModal from './ServiceLeadModal';
import { Helmet } from 'react-helmet-async';
import ProductImage from './ProductImage';

const MINER_SPEC_ROWS = [
  ['Алгоритм', 'algorithm'],
  ['Монеты', 'coins'],
  ['Хешрейт', 'hashrate'],
  ['Потребление', 'power'],
  ['Шум', 'noise'],
  ['Размер', 'size'],
  ['Вес', 'weight'],
  ['Бренд', 'brand'],
  ['Модель', 'model'],
  ['Эффективность', 'efficiency'],
  ['Серия', 'badge'],
];

const readSpec = (product, key) => {
  const meta = product?.metadata && typeof product.metadata === 'object' ? product.metadata : {};
  const value = meta[key] ?? product?.[key];
  if (value == null || value === '') return null;
  return String(value);
};

const MinerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('description');
  const [questionOpen, setQuestionOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Товар не найден');
        setProduct(data.product);
      })
      .catch((requestError) => { if (requestError.name !== 'AbortError') setError(requestError.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  if (loading) return <p className="route-loading" role="status">Загружаем карточку…</p>;
  if (!product) return <div className="profile-section"><h1 className="section-title">{error || 'Товар не найден'}</h1><Link to="/products" className="btn">Вернуться в каталог</Link></div>;

  const catalogPath = '/products';
  const characteristics = MINER_SPEC_ROWS
    .map(([label, key]) => [label, readSpec(product, key)])
    .filter(([, value]) => value);

  return (
    <>
      <section className="miner-detail-page">
        <Helmet>
          <title>{product.title} — 01service</title>
          <meta name="description" content={String(product.description || `Карточка товара ${product.title}`).slice(0, 250)} />
          {window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
            && <link rel="canonical" href={`${window.location.origin}${catalogPath}/${encodeURIComponent(product.slug || product.id)}`} />}
        </Helmet>
        <div className="miner-detail-breadcrumbs"><Link to={catalogPath}>Каталог</Link><span> / </span><span>{product.title}</span></div>
        <div className="miner-detail-container">
          <div className="miner-detail-left-column">
            <div className="miner-image-main">
              {product.image ? (
                <ProductImage src={product.image} alt={product.title} className="miner-detail-image" />
              ) : (
                <ProductImage src="/catalog/miner-default.svg" alt={product.title} className="miner-detail-image" />
              )}
            </div>
          </div>
          <div className="miner-detail-right-column">
            <h1 className="miner-detail-title">{product.title}</h1>
            <div className="miner-detail-price">{formatUsd(product.price)}</div>
            <p className="miner-detail-stock">{product.isAvailable ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}</p>
            {(product.reviewCount > 0) && <p className="miner-detail-rating" aria-label={`Рейтинг ${product.averageRating} из 5`}>★ {product.averageRating.toFixed(1)} · {product.reviewCount} отзывов</p>}
            <div className="miner-detail-actions">
              <button type="button" className="btn btn--large" disabled={!product.isAvailable} onClick={() => { if (addToCart(product)) navigate('/cart'); }}>{product.isAvailable ? 'Купить сейчас' : 'Нет в наличии'}</button>
              <button type="button" className="btn-outline" onClick={() => setQuestionOpen(true)}>Задать вопрос</button>
            </div>
            <p className="admin-muted">Стоимость и срок доставки подтвердит менеджер. Товар оформляется в долларах США.</p>
          </div>
        </div>
        <div className="miner-detail-tabs">
          <div className="tabs-header">
            {['description', 'specs', 'delivery'].map((item) => <button type="button" key={item} className={`tab-btn ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>{item === 'description' ? 'Описание' : item === 'specs' ? 'Характеристики' : 'Гарантия и доставка'}</button>)}
          </div>
          <div className="tabs-content">
            {tab === 'description' && (
              <div className="miner-detail-description miner-description-content">
                {(product.description || 'Описание товара уточняется менеджером.')
                  .split(/\n{2,}|\r\n\r\n/)
                  .map((block) => block.trim())
                  .filter(Boolean)
                  .map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
              </div>
            )}
            {tab === 'specs' && (
              <div className="specs-grid">
                {characteristics.length ? characteristics.map(([label, value]) => (
                  <div className="miner-spec-item" key={label}>
                    <span className="spec-label">{label}</span>
                    <span className="spec-value">{value}</span>
                  </div>
                )) : <p>Характеристики ещё не добавлены.</p>}
              </div>
            )}
            {tab === 'delivery' && (
              <div>
                <p><strong>Гарантия:</strong> {product.warranty || readSpec(product, 'warranty') || 'Уточняется менеджером.'}</p>
                <p><strong>Срок поставки:</strong> {product.shippingTime || readSpec(product, 'shipping') || 'Уточняется менеджером.'}</p>
              </div>
            )}
          </div>
        </div>
      </section>
      <Testimonials productId={product.id} title="Отзывы о товаре" subtitle="Публикуются только отзывы покупателей с завершённым заказом." />
      {questionOpen && <ServiceLeadModal service={{ title: `Вопрос о товаре: ${product.title}` }} onClose={() => setQuestionOpen(false)} />}
    </>
  );
};

export default MinerDetail;