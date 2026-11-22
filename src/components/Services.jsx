// src/components/Services.jsx
import React, { useState } from 'react';
import Testimonials from './Testimonials';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import serviceCatalog from '../data/serviceCatalog.json';

const SERVICE_TITLES = new Map(serviceCatalog.map((service) => [service.id, service.title]));

const Services = () => {
  const { contacts } = useSiteSettings();
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [botNotice, setBotNotice] = useState('');

  const services = [
    {
      id: 1,
      title: SERVICE_TITLES.get(1),
      price: null,
      description: 'Разработка современных веб-приложений на React с TypeScript и современным стеком технологий.',
      category: 'frontend',
      deliverables: [
        'Архитектура приложения',
        'Компонентный подход',
        'State management',
        'Интеграция с API',
        'Тестирование'
      ],
      pricing: [],
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
      title: SERVICE_TITLES.get(2),
      price: null,
      description: 'Качественная адаптивная верстка по макетам с соблюдением стандартов и кроссбраузерности.',
      category: 'frontend',
      deliverables: [
        'HTML5/CSS3/JavaScript',
        'Адаптивная верстка',
        'Кроссбраузерность',
        'Оптимизация скорости',
        'SEO-верстка'
      ],
      pricing: [],
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
      title: SERVICE_TITLES.get(3),
      price: null,
      description: 'Создание интуитивных и эстетичных интерфейсов с продуманным пользовательским опытом.',
      category: 'design',
      deliverables: [
        'User Research',
        'Wireframing',
        'Prototyping',
        'UI Design System',
        'Design Handoff'
      ],
      pricing: [],
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
      title: SERVICE_TITLES.get(4),
      price: null,
      description: 'Разработка надежных бэкенд-систем на Python/Django с REST API и оптимизированной базой данных.',
      category: 'backend',
      deliverables: [
        'RESTful API',
        'База данных',
        'Авторизация',
        'Документация',
        'Deployment'
      ],
      pricing: [],
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
      title: SERVICE_TITLES.get(5),
      price: null,
      description: 'Проектирование и разработка RESTful API с документацией, тестированием и безопасностью.',
      category: 'backend',
      deliverables: [
        'REST API Design',
        'Swagger документация',
        'JWT аутентификация',
        'Rate limiting',
        'API testing'
      ],
      pricing: [],
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
      title: SERVICE_TITLES.get(6),
      price: null,
      description: 'Профессиональное администрирование и оптимизация баз данных для высоконагруженных проектов.',
      category: 'backend',
      deliverables: [
        'Мониторинг',
        'Резервное копирование',
        'Оптимизация запросов',
        'Репликация',
        'Миграции'
      ],
      pricing: [],
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
      title: SERVICE_TITLES.get(7),
      price: null,
      description: 'Комплексная разработка от фронтенда до бэкенда с полным циклом проектирования и реализации.',
      category: 'fullstack',
      deliverables: [
        'End-to-end разработка',
        'Архитектура системы',
        'CI/CD',
        'Code review',
        'Техническая поддержка'
      ],
      pricing: [],
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
      title: SERVICE_TITLES.get(8),
      price: null,
      description: 'Экспертная консультация по архитектуре, технологическому стеку и оптимизации проектов.',
      category: 'consulting',
      deliverables: [
        'Технический аудит',
        'Архитектурный ревью',
        'Code review',
        'Рекомендации по стеку',
        'Roadmap'
      ],
      pricing: [],
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

  const telegramServiceUrl = (service) => {
    const base = contacts.telegramBotUrl || '';
    if (!base) return '';
    try {
      const url = new URL(base);
      if (url.hostname !== 't.me') return '';
      url.searchParams.set('start', `service_${service.id}`);
      return url.toString();
    } catch {
      return '';
    }
  };

  const openTelegram = (service) => {
    const url = telegramServiceUrl(service);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else setBotNotice('Ссылка на Telegram-бота пока не настроена. Укажите её в админ-панели в разделе «Контакты и доставка».');
  };

  return (
    <>
    <section className="services-section">
      <div className="services-header">
        <div>
          <h2 className="section-title">Профессиональные услуги разработки</h2>
          <p className="services-subtitle">
            Полный цикл разработки: от UI/UX дизайна до высоконагруженных бэкенд-систем.
            Выберите услугу на сайте, а заявку оформите в Telegram-боте. Состав и стоимость работ согласуем после обсуждения задачи.
          </p>
          {botNotice && <p className="catalog-notice" role="status">{botNotice}</p>}
        </div>
      </div>

      <div className="services-grid">
        {services.map((service) => (
          <article key={service.id} className="service-card">
            <div className="service-card__badge">{service.badge}</div>
            <header className="service-card__header">
              <h3>{service.title}</h3>
            </header>
            <div className="service-card__price-main">Стоимость — после обсуждения задачи</div>
            <p className="service-card__description">{service.description}</p>
            <div className="service-card__deliverables">
              <h4>ЧТО ВХОДИТ:</h4>
              <ul className="service-card__list">
                {service.deliverables.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="service-card__actions">
              <button type="button" className="btn service-card__action" onClick={() => openTelegram(service)}>
                Оформить в Telegram
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
                    <h3>Стоимость</h3>
                    <p>Стоимость работ рассчитывается после обсуждения задачи и состава работ.</p>
                  </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--large modal-order-btn" onClick={() => { openTelegram(selectedService); closeDetails(); }}>
                Оформить в Telegram
              </button>
              <button className="btn-outline" onClick={closeDetails}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
    <Testimonials subtitle="Отзывы о разработке и IT-сервисе" />
    </>
  );
};

export default Services;
