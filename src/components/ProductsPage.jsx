import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { formatUsd, rubToUsd } from '../utils/currency';
import Testimonials from './Testimonials';

const STATIC_PRODUCTS = [
  {
    id: 1,
    badge: 'NEW',
    title: 'Офисный ПК',
    price: 35000,
    description: '4 ядра, 8GB RAM, SSD',
    features: ['Для офиса и учебы', 'Тихая работа', 'Быстрый SSD'],
    longDescription:
      'Надежный офисный компьютер для повседневных задач: документооборот, CRM, браузер, видеозвонки и работа с таблицами. Система собирается на проверенных комплектующих и готова к работе сразу после подключения.',
    useCases: [
      'Подходит для бухгалтерии, отдела продаж и колл-центра',
      'Комфортная работа в 1С, Office, браузере и мессенджерах',
      'Низкий уровень шума для рабочих кабинетов',
    ],
    includes: ['Системный блок', 'Кабель питания', 'Предустановленная ОС', 'Базовая настройка'],
    support: 'Гарантия 12 месяцев, удаленная поддержка при первичном запуске.',
  },
  {
    id: 2,
    badge: 'HOT',
    title: 'Рабочая станция AI',
    price: 125000,
    description: '8 ядер, RTX3060',
    features: ['Для ML/AI задач', 'Высокая производительность', 'Готово к апгрейду'],
    longDescription:
      'Производительная станция для разработки и обучения моделей машинного обучения, 3D-визуализации и рендеринга. Конфигурация сбалансирована для длительной нагрузки и стабильной работы под проектами AI.',
    useCases: [
      'Обучение и тестирование нейросетей на небольших и средних датасетах',
      'Работа в Python-стеке: PyTorch, TensorFlow, Jupyter',
      'Параллельная разработка, рендеринг и аналитика',
    ],
    includes: ['Системный блок', 'Оптимизированные драйверы GPU', 'Тест под нагрузкой', 'Акт проверки'],
    support: 'Гарантия 18 месяцев и рекомендации по дальнейшему апгрейду.',
  },
  {
    id: 3,
    badge: 'SALE',
    title: 'Сервер базовый',
    price: 95000,
    description: 'Xeon, 64GB RAM',
    features: ['Для 24/7 работы', 'Стабильная платформа', 'Серверная память'],
    longDescription:
      'Базовый сервер для запуска внутренних сервисов компании, хостинга базы данных и корпоративных приложений. Конфигурация рассчитана на круглосуточную работу и масштабирование по мере роста нагрузки.',
    useCases: [
      'Файловый сервер и резервное хранение данных',
      'Размещение внутренних порталов и API',
      'Работа с виртуализацией и контейнерами',
    ],
    includes: ['Серверный корпус', 'Настройка BIOS/RAID', 'Стартовая конфигурация сети', 'Проверка стабильности'],
    support: 'Гарантия 12 месяцев, консультация по резервному копированию и мониторингу.',
  },
];

const ProductsPage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    fetch('/api/products?category=computer')
      .then((response) => response.json())
      .then((data) => setDbProducts(data.products || []))
      .catch(() => setDbProducts([]));
  }, []);

  const products = dbProducts.length ? dbProducts : STATIC_PRODUCTS;
  const viewProduct = (product) => ({ ...product, ...(product.metadata || {}) });
  const priceInUsd = (product) => product.currency === 'USD' ? product.price : rubToUsd(product.price);
  const formatPrice = (product) => formatUsd(priceInUsd(product));

  return (
    <>
    <section className="services-section">
      <div className="services-header products-header">
        <div>
          <h2 className="section-title">Товары</h2>
          <p className="services-subtitle">
            Компьютеры и серверы с актуальными конфигурациями и ценами в долларах.
          </p>
        </div>
      </div>

      <div className="services-grid">
        {products.map((rawProduct) => {
          const product = viewProduct(rawProduct);
          return (
          <article key={product.id} className="service-card">
            <div className="service-card__badge">{product.badge}</div>
            <header className="service-card__header">
              <h3>{product.title}</h3>
            </header>
            <div className="service-card__price-main">{formatPrice(product)}</div>
            <p className="service-card__description">{product.description}</p>
            <ul className="service-card__list">
              {product.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="service-card__actions">
              <button
                type="button"
                className="btn service-card__action"
                onClick={() =>
                    addToCart({
                    id: String(product.id).startsWith('product-') ? product.id : `product-${product.id}`,
                    title: product.title,
                    description: product.description,
                    price: priceInUsd(product),
                    currency: 'USD',
                  })
                }
              >
                Купить
              </button>
              <button
                type="button"
                className="btn-outline service-card__details"
                onClick={() => setSelectedProduct(product)}
              >
                Подробнее
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
                  <p>{selectedProduct.longDescription}</p>
                </div>
                <div className="details-section">
                  <h3>Стоимость</h3>
                  <p className="timeline">{formatPrice(selectedProduct)}</p>
                </div>
                <div className="details-section">
                  <h3>Характеристики</h3>
                  <ul className="features-list">
                    {selectedProduct.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <div className="details-section">
                  <h3>Где используется</h3>
                  <ul className="features-list">
                    {selectedProduct.useCases.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="details-section">
                  <h3>Что входит в поставку</h3>
                  <ul className="features-list">
                    {selectedProduct.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="details-section">
                  <h3>Поддержка и гарантия</h3>
                  <p>{selectedProduct.support}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn--large modal-order-btn"
                onClick={() => {
                  addToCart({
                    id: String(selectedProduct.id).startsWith('product-') ? selectedProduct.id : `product-${selectedProduct.id}`,
                    title: selectedProduct.title,
                    description: selectedProduct.description,
                    price: priceInUsd(selectedProduct),
                    currency: 'USD',
                  });
                  setSelectedProduct(null);
                }}
              >
                Добавить в корзину
              </button>
              <button type="button" className="btn-outline" onClick={() => setSelectedProduct(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
    <Testimonials subtitle="Отзывы о наших компьютерах и серверных решениях" />
    </>
  );
};

export default ProductsPage;
