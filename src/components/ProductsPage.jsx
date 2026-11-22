import { useEffect, useMemo, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { formatUsd } from '../utils/currency';
import Testimonials from './Testimonials';
import ServiceLeadModal from './ServiceLeadModal';
import { Link, useSearchParams } from 'react-router-dom';

const ProductsPage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [availability, setAvailability] = useState('all');
  const [questionProduct, setQuestionProduct] = useState(null);
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = ['miner', 'computer'].includes(searchParams.get('category')) ? searchParams.get('category') : 'all';

  useEffect(() => {
    fetch('/api/products')
      .then((response) => response.json())
      .then((data) => { setDbProducts(data.products || []); if (!data.ok) setCatalogError(data.error || 'Каталог временно недоступен'); })
      .catch(() => setCatalogError('Каталог временно недоступен. Попробуйте позже.'))
      .finally(() => setLoading(false));
  }, []);

  const products = useMemo(() => dbProducts
    .filter((product) => category === 'all' || product.category === category)
    .filter((product) => !search.trim() || `${product.title} ${product.description || ''}`.toLocaleLowerCase('ru-RU').includes(search.trim().toLocaleLowerCase('ru-RU')))
    .filter((product) => availability === 'all' || (availability === 'in-stock' ? product.isAvailable : !product.isAvailable))
    .sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'rating') return Number(b.averageRating || 0) - Number(a.averageRating || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }), [dbProducts, category, search, availability, sortBy]);
  const viewProduct = (product) => ({ ...product, ...(product.metadata || {}) });
  const hasUsdPrice = (product) => product.currency === 'USD' && Number(product.price) > 0;
  const formatPrice = (product) => hasUsdPrice(product) ? `${product.testOnly ? 'Тестовая цена: ' : ''}${formatUsd(product.price)}` : 'Цена уточняется';
  const productFeatures = (product) => product.category === 'miner'
    ? [product.algorithm && `Алгоритм: ${product.algorithm}`, product.hashrate && `Хешрейт: ${product.hashrate}`, product.power && `Потребление: ${product.power}`, product.coins && `Монеты: ${product.coins}`].filter(Boolean)
    : (product.features || []);
  const categoryOptions = [
    { id: 'all', label: 'Все товары' },
    { id: 'miner', label: 'Майнеры' },
    { id: 'computer', label: 'Компьютеры и серверы' },
  ];

  return (
    <>
    <section className="services-section products-section">
      <div className="services-header products-header">
        <div>
          <h2 className="section-title">Товары</h2>
          <p className="services-subtitle">
            Майнинг-оборудование, компьютеры и серверы. Цены и наличие берутся из базы сайта.
          </p>
        </div>
      </div>

      <div className="product-categories" role="group" aria-label="Категории товаров">
        {categoryOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`product-category ${category === option.id ? 'is-active' : ''}`}
            aria-pressed={category === option.id}
            onClick={() => setSearchParams(option.id === 'all' ? {} : { category: option.id })}
          >
            {option.label}
            <span>{option.id === 'all' ? dbProducts.length : dbProducts.filter((product) => product.category === option.id).length}</span>
          </button>
        ))}
      </div>

      <div className="catalog-controls products-controls" aria-label="Фильтры каталога">
        <label>Поиск<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название или описание" /></label>
        <label>Наличие<select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">Любое</option><option value="in-stock">В наличии</option><option value="out-of-stock">Нет в наличии</option></select></label>
        <label>Сортировка<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="newest">Сначала новые</option><option value="price-asc">Цена: по возрастанию</option><option value="price-desc">Цена: по убыванию</option><option value="rating">По рейтингу</option></select></label>
      </div>
      <div className="services-grid products-grid">
        {loading && <div className="catalog-state" role="status"><span className="catalog-state__icon">↻</span><strong>Загружаем каталог</strong><p>Получаем актуальные цены и остатки.</p></div>}
        {catalogError && <div className="catalog-state catalog-state--error" role="alert"><span className="catalog-state__icon">!</span><strong>Каталог временно недоступен</strong><p>{catalogError}</p></div>}
        {!loading && !catalogError && products.length === 0 && (
          <div className="catalog-state catalog-state--empty">
            <span className="catalog-state__icon" aria-hidden="true">◇</span>
            <strong>{search || availability !== 'all' ? 'Подходящих товаров нет' : 'В этой категории пока нет товаров'}</strong>
            <p>{search || availability !== 'all' ? 'Попробуйте изменить поиск или фильтры.' : 'Позиции появятся здесь после публикации в админ-панели.'}</p>
            <div className="catalog-state__actions">
              {category !== 'all' && <button type="button" className="btn" onClick={() => setSearchParams({})}>Показать все товары</button>}
              <Link to="/services" className="btn-outline">Услуги разработки</Link>
            </div>
          </div>
        )}
        {products.map((rawProduct) => {
          const product = viewProduct(rawProduct);
          return (
          <article key={product.id} className="service-card product-card">
            <span className="product-card__category">{product.category === 'miner' ? 'Майнинг-оборудование' : 'Компьютеры и серверы'}</span>
            {(product.badge || product.testOnly) && <div className="service-card__badge">{product.testOnly ? 'ТЕСТОВАЯ МОДЕЛЬ' : product.badge}</div>}
            <div className="product-card__media">
              {product.image ? <img className="product-card__image" src={product.image} alt={product.title} loading="lazy" /> : <div className="product-card__placeholder" aria-label="Изображение товара не добавлено">01</div>}
            </div>
            <header className="service-card__header">
              <h3>{product.title}</h3>
            </header>
            <div className="service-card__price-main">{formatPrice(product)}</div>
            {product.reviewCount > 0 && <p className="product-card__rating" aria-label={`Рейтинг ${Number(product.averageRating).toFixed(1)} из 5`}>★ {Number(product.averageRating).toFixed(1)} <span>· {product.reviewCount} отзывов</span></p>}
            <p className={`product-card__availability ${product.isAvailable ? 'is-available' : 'is-unavailable'}`}><span />{product.isAvailable ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}</p>
            <p className="service-card__description">{product.description}</p>
              {productFeatures(product).length > 0 && <ul className="service-card__list product-card__features">
                {productFeatures(product).map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>}
            {product.warranty && <p className="product-card__warranty">Гарантия: {product.warranty}</p>}
            <div className="service-card__actions">
              <button
                type="button"
                className="btn service-card__action"
                disabled={!product.isAvailable || !hasUsdPrice(product)}
                onClick={() =>
                    addToCart({
                    id: String(product.id),
                    category: product.category,
                    stock: product.stock,
                    title: product.title,
                    description: product.description,
                    price: product.price,
                    currency: 'USD',
                  })
                }
              >
                {product.isAvailable && hasUsdPrice(product) ? 'Купить' : hasUsdPrice(product) ? 'Нет в наличии' : 'Цена уточняется'}
              </button>
              {(!product.isAvailable || !hasUsdPrice(product)) && <button type="button" className="btn-outline service-card__details" onClick={() => setQuestionProduct(product)}>Задать вопрос</button>}
              <Link to={`/products/${encodeURIComponent(product.slug || product.id)}`} className="btn-outline service-card__details">
                Подробнее
              </Link>
              <button
                type="button"
                className="btn-outline service-card__details"
                onClick={() => setSelectedProduct(product)}
              >
                Характеристики
              </button>
            </div>
          </article>
          );
        })}
      </div>

      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedProduct.title}</h2>
              <button type="button" className="modal-close" onClick={() => setSelectedProduct(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="service-details">
                <div className="details-section">
                  <h3>Описание товара</h3>
                  <p>{selectedProduct.longDescription || selectedProduct.description}</p>
                </div>
                <div className="details-section">
                  <h3>Стоимость</h3>
                  <p className="timeline">{formatPrice(selectedProduct)}</p>
                </div>
                <div className="details-section">
                  <h3>Характеристики</h3>
                  <ul className="features-list">
                    {productFeatures(selectedProduct).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
                {selectedProduct.useCases?.length > 0 && <div className="details-section">
                  <h3>Где используется</h3>
                  <ul className="features-list">
                    {(selectedProduct.useCases || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>}
                {selectedProduct.includes?.length > 0 && <div className="details-section">
                  <h3>Что входит в поставку</h3>
                  <ul className="features-list">
                    {(selectedProduct.includes || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>}
                <div className="details-section">
                  <h3>Поддержка и гарантия</h3>
                  <p>{selectedProduct.support || selectedProduct.warranty || 'Гарантия и условия поставки уточняются менеджером.'}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn--large modal-order-btn"
                disabled={!selectedProduct.isAvailable || !hasUsdPrice(selectedProduct)}
                onClick={() => {
                  addToCart({
                    id: String(selectedProduct.id),
                    category: selectedProduct.category,
                    stock: selectedProduct.stock,
                    title: selectedProduct.title,
                    description: selectedProduct.description,
                    price: selectedProduct.price,
                    currency: 'USD',
                  });
                  setSelectedProduct(null);
                }}
              >
                {selectedProduct.isAvailable && hasUsdPrice(selectedProduct) ? 'Добавить в корзину' : 'Нет в наличии'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setSelectedProduct(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      {questionProduct && <ServiceLeadModal service={{ title: `Вопрос о товаре: ${questionProduct.title}` }} onClose={() => setQuestionProduct(null)} />}
    </section>
    <Testimonials subtitle="Отзывы о майнинговом оборудовании, компьютерах и серверах" />
    </>
  );
};

export default ProductsPage;
