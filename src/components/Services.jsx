// src/components/Services.jsx
import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';

const Services = () => {
  const { addToCart } = useCart();
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const services = [
    {
      id: 1,
      title: 'Frontend разработка (React)',
      price: 75000, 
      description: 'Разработка современных веб-приложений на React с TypeScript и современным стеком технологий.',
      category: 'frontend',
      deliverables: [
        'Архитектура приложения',
        'Компонентный подход',
        'State management',
        'Интеграция с API',
        'Тестирование'
      ],
      pricing: [
        { type: 'Junior Developer', rate: '7 500 ₽/час' },
        { type: 'Middle Developer', rate: '15 000 ₽/час' },
        { type: 'Senior Developer', rate: '25 000 ₽/час' },
        { type: 'Фиксированный проект', rate: '30 000 – 60 000 ₽' }
      ],
      badge: 'REACT EXPERT',
      details: {
        technologies: ['React', 'TypeScript', 'Redux', 'Next.js', 'Vite'],
        timeline: '2-8 недель',
        features: [
          'Разработка SPA приложений',
          'Интеграция с REST API',
          'Оптимизация производительности',
          'PWA возможности',
          'Тестирование'
        ],
        benefits: [
          'Современный стек технологий',
          'Чистый и поддерживаемый код',
          'Высокая производительность',
          'Кроссбраузерная совместимость',
          'SEO-оптимизация'
        ]
      }
    },
    {
      id: 2,
      title: 'Верстка сайтов',
      price: 30000,
      description: 'Качественная адаптивная верстка по макетам с соблюдением стандартов и кроссбраузерности.',
      category: 'frontend',
      deliverables: [
        'HTML5/CSS3/JavaScript',
        'Адаптивная верстка',
        'Кроссбраузерность',
        'Оптимизация скорости',
        'SEO-верстка'
      ],
      pricing: [
        { type: 'Лендинг', rate: '10 000 ₽' },
        { type: 'Многостраничный сайт', rate: '10 000 ₽/страница' },
        { type: 'Адаптивный дизайн', rate: '50 000 ₽/страница' },
        { type: 'Поддержка', rate: '4 000 ₽/час' }
      ],
      badge: 'PIXEL PERFECT',
      details: {
        technologies: ['HTML5', 'CSS3', 'JavaScript', 'SASS/SCSS', 'Bootstrap'],
        timeline: '1-4 недели',
        features: [
          'Pixel-perfect верстка',
          'Mobile-first подход',
          'Оптимизация загрузки',
          'Семантическая разметка',
          'Доступность (a11y)'
        ],
        benefits: [
          'Идеальное соответствие макету',
          'Быстрая загрузка страниц',
          'Адаптивность под все устройства',
          'Чистый и валидный код',
          'Улучшенные показатели SEO'
        ]
      }
    },
    {
      id: 3,
      title: 'UI/UX дизайн',
      price: 75000,
      description: 'Создание интуитивных и эстетичных интерфейсов с продуманным пользовательским опытом.',
      category: 'design',
      deliverables: [
        'User Research',
        'Wireframing',
        'Prototyping',
        'UI Design System',
        'Design Handoff'
      ],
      pricing: [
        { type: 'Концепция UI/UX', rate: '50 000 ₽' },
        { type: 'Прототипы', rate: '100 000 ₽' },
        { type: 'Дизайн интерфейса', rate: '70 000 ₽' }
      ],
      badge: 'UX CERTIFIED',
      details: {
        technologies: ['Figma', 'Adobe XD', 'Sketch', 'InVision', 'Principle'],
        timeline: '3-6 недель',
        features: [
          'User Research и анализ',
          'Создание сценариев',
          'Прототипирование',
          'Дизайн-система',
          'Интерактивные прототипы'
        ],
        benefits: [
          'Увеличение конверсии',
          'Улучшение UX',
          'Снижение bounce rate',
          'Повышение лояльности',
          'Согласованный стиль'
        ]
      }
    },
    {
      id: 4,
      title: 'Backend разработка (Python/Django)',
      price: 150000, 
      description: 'Разработка надежных бэкенд-систем на Python/Django с REST API и оптимизированной базой данных.',
      category: 'backend',
      deliverables: [
        'RESTful API',
        'База данных',
        'Авторизация',
        'Документация',
        'Deployment'
      ],
      pricing: [
        { type: 'Junior Developer', rate: '14 000 ₽/час' },
        { type: 'Middle Developer', rate: '28 000 ₽/час' },
        { type: 'Senior Developer', rate: '45 000 ₽/час' },
        { type: 'Фиксированный проект', rate: '70 000 – 200 000 ₽' }
      ],
      badge: 'PYTHON/DJANGO',
      details: {
        technologies: ['Python', 'Django', 'PostgreSQL', 'Redis'],
        timeline: '4-12 недель',
        features: [
          'REST API',
          'Аутентификация',
          'Админ-панель',
          'Кеширование',
          'Документация'
        ],
        benefits: [
          'Производительность',
          'Безопасность',
          'Масштабируемость',
          'Поддержка',
          'Интеграция'
        ]
      }
    },
    {
      id: 5,
      title: 'API разработка',
      price: 120000,
      description: 'Проектирование и разработка RESTful API с документацией, тестированием и безопасностью.',
      category: 'backend',
      deliverables: [
        'REST API Design',
        'Swagger документация',
        'JWT аутентификация',
        'Rate limiting',
        'API testing'
      ],
      pricing: [
        { type: 'Проектирование БД', rate: '50 000 – 120 000 ₽' },
        { type: 'Оптимизация БД', rate: '35 000 ₽/час' },
        { type: 'Senior Developer', rate: '50 000 ₽/час' }
      ],
      badge: 'API SPECIALIST',
      details: {
        technologies: ['REST', 'Swagger', 'JWT', 'OAuth2'],
        timeline: '2-8 недель',
        features: [
          'Архитектура API',
          'Эндпоинты',
          'Безопасность',
          'Документация',
          'Тестирование'
        ],
        benefits: [
          'Четкая документация',
          'Высокая безопасность',
          'Легкость интеграции',
          'Мониторинг',
          'Версионирование'
        ]
      }
    },
    {
      id: 6,
      title: 'Администрирование БД',
      price: 80000, 
      description: 'Профессиональное администрирование и оптимизация баз данных для высоконагруженных проектов.',
      category: 'backend',
      deliverables: [
        'Мониторинг',
        'Резервное копирование',
        'Оптимизация запросов',
        'Репликация',
        'Миграции'
      ],
      pricing: [
        { type: 'Абонентское обслуживание', rate: '50 000 – 150 000 ₽/мес' }
      ],
      badge: 'DBA EXPERT',
      details: {
        technologies: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'],
        timeline: 'Постоянная поддержка',
        features: [
          'Настройка БД',
          'Мониторинг',
          'Резервное копирование',
          'Оптимизация',
          'Replication'
        ],
        benefits: [
          'Стабильность',
          'Доступность',
          'Защита данных',
          'Производительность',
          'Проактивный мониторинг'
        ]
      }
    },
    {
      id: 7,
      title: 'Full-stack разработка',
      price: 250000,
      description: 'Комплексная разработка от фронтенда до бэкенда с полным циклом проектирования и реализации.',
      category: 'fullstack',
      deliverables: [
        'End-to-end разработка',
        'Архитектура системы',
        'CI/CD',
        'Code review',
        'Техническая поддержка'
      ],
      pricing: [
        { type: 'Команда разработки', rate: 'Индивидуальный расчет' },
        { type: 'Технический аудит', rate: '25 000 ₽' }
      ],
      badge: 'FULL STACK',
      details: {
        technologies: ['React', 'Node.js', 'Python', 'Docker', 'AWS'],
        timeline: '8-24 недели',
        features: [
          'Полный цикл',
          'Архитектура',
          'DevOps',
          'Code review',
          'Deployment'
        ],
        benefits: [
          'Единая ответственность',
          'Согласованность',
          'Скорость запуска',
          'Комплексное решение',
          'Экспертиза'
        ]
      }
    },
    {
      id: 8,
      title: 'Техническая консультация',
      price: 15000,
      description: 'Экспертная консультация по архитектуре, технологическому стеку и оптимизации проектов.',
      category: 'consulting',
      deliverables: [
        'Технический аудит',
        'Архитектурный ревью',
        'Code review',
        'Рекомендации по стеку',
        'Roadmap'
      ],
      pricing: [
        { type: 'Консультация', rate: '15 000 ₽/час' },
        { type: 'Технический аудит', rate: '25 000 ₽' }
      ],
      badge: 'TECH ADVISOR',
      details: {
        technologies: ['Архитектура', 'Best Practices', 'Code Review', 'DevOps'],
        timeline: '1-2 дня',
        features: [
          'Анализ архитектуры',
          'Code review',
          'Масштабирование',
          'Оптимизация',
          'План развития'
        ],
        benefits: [
          'Экспертная оценка',
          'Выявление проблем',
          'Рекомендации',
          'Качество кода',
          'Снижение долга'
        ]
      }
    }
  ];

  const openDetails = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const closeDetails = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };

  const formatMainPrice = (price) => {
    if (price >= 1000000) return `₽${Math.round(price / 1000000)}M`;
    if (price >= 1000) return `₽${Math.round(price / 1000)}K`;
    return `₽${price}`;
  };

  return (
    <section className="services-section">
      <div className="services-header">
        <div>
          <h2 className="section-title">Профессиональные услуги разработки</h2>
          <p className="services-subtitle">
            Полный цикл разработки: от UI/UX дизайна до высоконагруженных бэкенд-систем.
            Гибкие модели сотрудничества и гарантия качества.
          </p>
        </div>
        <div className="services-highlight">
          <span className="services-highlight__tag">Скидка 10% на первый проект</span>
          <p>При заказе от 2 услуг — специальные условия и приоритетная поддержка.</p>
        </div>
      </div>

      <div className="services-grid">
        {services.map((service) => (
          <article key={service.id} className="service-card">
            <div className="service-card__badge">{service.badge}</div>
            <header className="service-card__header">
              <h3>{service.title}</h3>
            </header>
            <div className="service-card__price-main">
              от {formatMainPrice(service.price)}
            </div>
            <p className="service-card__description">{service.description}</p>
            <div className="service-card__deliverables">
              <h4>ЧТО ВХОДИТ:</h4>
              <ul className="service-card__list">
                {service.deliverables.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="service-card__pricing">
              <h4>СТОИМОСТЬ:</h4>
              <div className="pricing-list">
                {service.pricing.map((item, i) => (
                  <div key={i} className="pricing-item">
                    <span className="pricing-label">{item.type}</span>
                    <span className="pricing-value">{item.rate}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="service-card__actions">
              <button
                type="button"
                className="btn service-card__action"
                onClick={() => {
                  const consultation = {
                    id: `consult-${service.id}`,
                    title: `Консультация по "${service.title}"`,
                    description: `Первичная консультация по услуге "${service.title}"`,
                    price: 15,
                    quantity: 1,
                  };
                  addToCart(consultation);
                }}
              >
                Заказать консультацию — 1500 ₽
              </button>
              <button
                type="button"
                className="btn-outline service-card__details"
                onClick={() => openDetails(service)}
              >
                Подробнее
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && selectedService && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedService.title}</h2>
              <button className="modal-close" onClick={closeDetails}>✕</button>
            </div>
            <div className="modal-body">
              <div className="service-details">
                <div className="details-section">
                  <h3>Описание услуги</h3>
                  <p>{selectedService.description}</p>
                </div>
                <div className="details-grid">
                  <div className="details-column">
                    <div className="details-section">
                      <h3>🛠 Технологии</h3>
                      <div className="tech-tags">
                        {selectedService.details.technologies.map((tech, i) => (
                          <span key={i} className="tech-tag">{tech}</span>
                        ))}
                      </div>
                    </div>
                    <div className="details-section">
                      <h3>⏱ Сроки</h3>
                      <p className="timeline">{selectedService.details.timeline}</p>
                    </div>
                  </div>
                  <div className="details-column">
                    <div className="details-section">
                      <h3>✅ Возможности</h3>
                      <ul className="features-list">
                        {selectedService.details.features.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="details-section">
                  <h3>🎯 Преимущества</h3>
                  <div className="benefits-grid">
                    {selectedService.details.benefits.map((b, i) => (
                      <div key={i} className="benefit-item">
                        <span className="benefit-icon">✓</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="details-section">
                  <h3>💰 Стоимость</h3>
                  <div className="detailed-pricing">
                    {selectedService.pricing.map((p, i) => (
                      <div key={i} className="pricing-detail">
                        <span className="pricing-type">{p.type}</span>
                        <span className="pricing-rate">{p.rate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn--large modal-order-btn"
                onClick={() => {
                  const consultation = {
                    id: `consult-modal-${selectedService.id}`,
                    title: `Консультация по "${selectedService.title}"`,
                    description: `Консультация из модального окна`,
                    price: 15,
                    quantity: 1,
                  };
                  addToCart(consultation);
                  closeDetails();
                }}
              >
                Заказать консультацию — 1500 ₽
              </button>
              <button className="btn-outline" onClick={closeDetails}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Services;