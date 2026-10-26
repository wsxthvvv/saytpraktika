import { useEffect, useState } from 'react';

const Testimonials = ({ productId, title = 'Отзывы клиентов', subtitle }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    fetch(`/api/reviews${query}`)
      .then((response) => response.json())
      .then((data) => setReviews(data.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [productId]);

  return (
    <section className="testimonials-section">
      <h2 className="section-title">{title}</h2>
      <p className="testimonials-subtitle">{subtitle || 'Отзывы покупателей с завершёнными заказами.'}</p>
      <div className="testimonials-grid">
        {loading ? <p className="testimonials-empty">Загружаем отзывы…</p> : reviews.length ? reviews.map((review) => (
          <article key={review.id} className="testimonial-card">
            <div className="testimonial-rating" aria-label={`Оценка: ${review.rating} из 5`}>
              {[...Array(review.rating)].map((_, index) => <span key={index} className="star">★</span>)}
            </div>
            <p className="testimonial-text">&quot;{review.text}&quot;</p>
            <div className="testimonial-author">
              <div className="testimonial-author__info">
                <span className="testimonial-author__name">{review.authorName}</span>
                <span className="testimonial-author__role">Проверенный покупатель</span>
              </div>
            </div>
          </article>
        )) : <p className="testimonials-empty">Пока нет опубликованных отзывов.</p>}
      </div>
    </section>
  );
};

export default Testimonials;
