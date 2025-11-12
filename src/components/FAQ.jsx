import { useState } from 'react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'Сколько времени занимает разработка проекта?',
      answer: 'Время разработки зависит от сложности проекта. Лендинг — 1-2 недели, полноценный сайт — 3-4 недели, крипто-маркетплейс — 6-8 недель. Мы всегда соблюдаем дедлайны и держим вас в курсе прогресса.',
    },
    {
      question: 'Предоставляете ли вы поддержку после запуска?',
      answer: 'Да, мы предлагаем различные пакеты поддержки: от базовой поддержки до круглосуточного мониторинга. Все детали обсуждаются индивидуально в зависимости от ваших потребностей.',
    },
    {
      question: 'Можно ли интегрировать криптовалютные платежи?',
      answer: 'Конечно! Мы интегрируем различные платежные системы: USDT, Bitcoin, Ethereum, а также традиционные банковские карты. Поддерживаем WalletConnect и другие популярные кошельки.',
    },
    {
      question: 'Работаете ли вы с NFT проектами?',
      answer: 'Да, у нас большой опыт работы с NFT-маркетплейсами, коллекциями и DeFi проектами. Мы можем создать полноценную платформу для торговли NFT с интеграцией смарт-контрактов.',
    },
    {
      question: 'Какие гарантии вы предоставляете?',
      answer: 'Мы предоставляем гарантию на код в течение 3 месяцев после запуска. Также мы проводим полное тестирование перед релизом и обеспечиваем безопасность вашего проекта.',
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section">
      <h2 className="section-title">Часто задаваемые вопросы</h2>
      <p className="faq-subtitle">
        Ответы на популярные вопросы о наших услугах и процессе разработки
      </p>
      <div className="faq-list">
        {faqs.map((faq, index) => (
          <div key={index} className={`faq-item ${openIndex === index ? 'faq-item--open' : ''}`}>
            <button
              className="faq-question"
              onClick={() => toggleFAQ(index)}
              aria-expanded={openIndex === index}
            >
              <span>{faq.question}</span>
              <span className="faq-icon">{openIndex === index ? '−' : '+'}</span>
            </button>
            {openIndex === index && (
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;

