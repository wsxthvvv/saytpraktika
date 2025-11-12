const Testimonials = () => {
  const testimonials = [
    {
      name: 'Алексей Петров',
      role: 'CEO, CryptoMarket',
      text: 'Команда создала для нас крипто-маркетплейс с нуля. Проект запустили в срок, все работает отлично. Особенно впечатлила интеграция кошельков и система KYC.',
      rating: 5,
    },
    {
      name: 'Мария Иванова',
      role: 'Основатель NFT Gallery',
      text: 'Отличная работа над нашим NFT-проектом. Дизайн современный, функционал продуман до мелочей. Поддержка работает оперативно, всегда на связи.',
      rating: 5,
    },
    {
      name: 'Дмитрий Соколов',
      role: 'CTO, DeFi Platform',
      text: 'Профессиональный подход к разработке. Код чистый, документация подробная. Рекомендую для любых Web3 проектов.',
      rating: 5,
    },
  ];

  return (
    <section className="testimonials-section">
      <h2 className="section-title">Отзывы клиентов</h2>
      <p className="testimonials-subtitle">
        Что говорят о нас наши клиенты
      </p>
      <div className="testimonials-grid">
        {testimonials.map((testimonial, index) => (
          <div key={index} className="testimonial-card">
            <div className="testimonial-rating">
              {[...Array(testimonial.rating)].map((_, i) => (
                <span key={i} className="star">★</span>
              ))}
            </div>
            <p className="testimonial-text">"{testimonial.text}"</p>
            <div className="testimonial-author">
              <div className="testimonial-author__info">
                <span className="testimonial-author__name">{testimonial.name}</span>
                <span className="testimonial-author__role">{testimonial.role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;

