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
        { type: 'Junior Developer', rate: '$12/час' },
        { type: 'Middle Developer', rate: '$25/час' },
        { type: 'Senior Developer', rate: '$40/час' },
        { type: 'Фиксированный проект', rate: '$500 – $1000' }
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
          'Unit и интеграционное тестирование'
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
        { type: 'Лендинг', rate: '$100' },
        { type: 'Многостраничный сайт', rate: '$100/страница' },
        { type: 'Адаптивный дизайн', rate: '$500/страница' },
        { type: 'Поддержка', rate: '$40/час' }
      ],
      badge: 'PIXEL PERFECT',
      details: {
        technologies: ['HTML5', 'CSS3', 'JavaScript', 'SASS/SCSS', 'Bootstrap'],
        timeline: '1-4 недель',
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
        { type: 'Концепция UI/UX', rate: '$500' },
        { type: 'Прототипы', rate: '$1000' },
        { type: 'Дизайн интерфейса', rate: '$700' }
      ],
      badge: 'UX CERTIFIED',
      details: {
        technologies: ['Figma', 'Adobe XD', 'Sketch', 'InVision', 'Principle'],
        timeline: '3-6 недель',
        features: [
          'User Research и анализ',
          'Создание пользовательских сценариев',
          'Прототипирование и вайрфрейминг',
          'Дизайн-система и UI Kit',
          'Интерактивные прототипы'
        ],
        benefits: [
          'Увеличение конверсии',
          'Улучшение пользовательского опыта',
          'Снижение bounce rate',
          'Повышение лояльности пользователей',
          'Согласованный визуальный стиль'
        ]
      }
    },
    {
      id: 4,
      title: 'Backend разработка (Python/Django)',
      price: 550000,
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
        { type: 'Junior Developer', rate: '$14/час' },
        { type: 'Middle Developer', rate: '$28/час' },
        { type: 'Senior Developer', rate: '$45/час' },
        { type: 'Фиксированный проект', rate: '$3000 – $8000' }
      ],
      badge: 'PYTHON/DJANGO',
      details: {
        technologies: ['Python', 'Django', 'Django REST', 'PostgreSQL', 'Redis'],
        timeline: '4-12 недель',
        features: [
          'RESTful API разработка',
          'Система аутентификации',
          'Админ-панель Django',
          'Кеширование и оптимизация',
          'Документация API'
        ],
        benefits: [
          'Высокая производительность',
          'Безопасность данных',
          'Масштабируемость',
          'Легкость поддержки',
          'Интеграция с фронтендом'
        ]
      }
    },
    {
      id: 5,
      title: 'API разработка',
      price: 450000,
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
        { type: 'Проектирование БД', rate: '$3000 – $8000' },
        { type: 'Оптимизация БД', rate: '$35/час' },
        { type: 'Senior Developer', rate: '$50/час' }
      ],
      badge: 'API SPECIALIST',
      details: {
        technologies: ['REST', 'GraphQL', 'Swagger', 'JWT', 'OAuth2'],
        timeline: '2-8 недель',
        features: [
          'Проектирование API архитектуры',
          'Реализация эндпоинтов',
          'Система безопасности',
          'Документация OpenAPI',
          'Тестирование и валидация'
        ],
        benefits: [
          'Четкая документация',
          'Высокая безопасность',
          'Легкость интеграции',
          'Мониторинг и логирование',
          'Версионирование API'
        ]
      }
    },
    {
      id: 6,
      title: 'Администрирование БД',
      price: 100000,
      description: 'Профессиональное администрирование и оптимизация баз данных для высоконагруженных проектов.',
      category: 'backend',
      deliverables: [
        'Мониторинг производительности',
        'Резервное копирование',
        'Оптимизация запросов',
        'Репликация',
        'Миграции'
      ],
      pricing: [
        { type: 'Абонентское обслуживание', rate: '$500 – $1500/мес' }
      ],
      badge: 'DBA EXPERT',
      details: {
        technologies: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch'],
        timeline: 'Постоянная поддержка',
        features: [
          'Настройка и конфигурация БД',
          'Мониторинг производительности',
          'Резервное копирование',
          'Оптимизация запросов',
          'Replication и clustering'
        ],
        benefits: [
          'Стабильная работа БД',
          'Высокая доступность',
          'Защита от потери данных',
          'Оптимизация производительности',
          'Проактивный мониторинг'
        ]
      }
    },
    {
      id: 7,
      title: 'Full-stack разработка',
      price: 850000,
      description: 'Комплексная разработка от фронтенда до бэкенда с полным циклом проектирования и реализации.',
      category: 'fullstack',
      deliverables: [
        'End-to-end разработка',
        'Архитектура системы',
        'CI/CD настройка',
        'Code review',
        'Техническая поддержка'
      ],
      pricing: [
        { type: 'Команда разработки', rate: 'Индивидуальный расчет' },
        { type: 'Технический аудит', rate: '$250' }
      ],
      badge: 'FULL STACK',
      details: {
        technologies: ['React', 'Node.js', 'Python', 'Docker', 'AWS'],
        timeline: '8-24 недели',
        features: [
          'Полный цикл разработки',
          'Архитектурное проектирование',
          'DevOps настройка',
          'Code review и тестирование',
          'Deployment и мониторинг'
        ],
        benefits: [
          'Единая точка ответственности',
          'Согласованность технологий',
          'Ускорение time-to-market',
          'Комплексное решение',
          'Техническая экспертиза'
        ]
      }
    },
    {
      id: 8,
      title: 'Техническая консультация',
      price: 25000,
      description: 'Экспертная консультация по архитектуре, технологическому стеку и оптимизации проектов.',
      category: 'consulting',
      deliverables: [
        'Технический аудит',
        'Архитектурный ревью',
        'Code review',
        'Рекомендации по стеку',
        'Roadmap планирование'
      ],
      pricing: [
        { type: 'Консультация', rate: '$40/час' },
        { type: 'Технический аудит', rate: '$250' }
      ],
      badge: 'TECH ADVISOR',
      details: {
        technologies: ['Архитектура', 'Best Practices', 'Code Review', 'DevOps'],
        timeline: '1-2 дня',
        features: [
          'Анализ текущей архитектуры',
          'Code review и рекомендации',
          'Проектирование масштабирования',
          'Оптимизация производительности',
          'План развития проекта'
        ],
        benefits: [
          'Экспертная оценка',
          'Выявление узких мест',
          'Рекомендации по улучшению',
          'Повышение качества кода',
          'Снижение технического долга'
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

  // Форматирование цены в шапке карточки (75000 → "$75K")
  const formatMainPrice = (price) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `$${Math.round(price / 1000)}K`;
    }
    return `$${price}`;
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
          <p>
            При заказе от 2 услуг — специальные условия и приоритетная поддержка.
          </p>
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
                {service.deliverables.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="service-card__pricing">
              <h4>СТОИМОСТЬ:</h4>
              <div className="pricing-list">
                {service.pricing.map((item, index) => (
                  <div key={index} className="pricing-item">
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
                onClick={() => addToCart(service)}
              >
                Заказать консультацию
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

      {/* Modal for Service Details */}
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
                        {selectedService.details.technologies.map((tech, index) => (
                          <span key={index} className="tech-tag">{tech}</span>
                        ))}
                      </div>
                    </div>

                    <div className="details-section">
                      <h3>⏱ Сроки выполнения</h3>
                      <p className="timeline">{selectedService.details.timeline}</p>
                    </div>
                  </div>

                  <div className="details-column">
                    <div className="details-section">
                      <h3>✅ Основные возможности</h3>
                      <ul className="features-list">
                        {selectedService.details.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h3>🎯 Преимущества</h3>
                  <div className="benefits-grid">
                    {selectedService.details.benefits.map((benefit, index) => (
                      <div key={index} className="benefit-item">
                        <span className="benefit-icon">✓</span>
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="details-section">
                  <h3>💰 Детализация стоимости</h3>
                  <div className="detailed-pricing">
                    {selectedService.pricing.map((item, index) => (
                      <div key={index} className="pricing-detail">
                        <span className="pricing-type">{item.type}</span>
                        <span className="pricing-rate">{item.rate}</span>
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
                  addToCart(selectedService);
                  closeDetails();
                }}
              >
                Заказать услугу
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