const Technologies = () => {
  const technologies = [
    { name: 'React', category: 'Frontend' },
    { name: 'Next.js', category: 'Framework' },
    { name: 'TypeScript', category: 'Language' },
    { name: 'Web3.js', category: 'Blockchain' },
    { name: 'Ethereum', category: 'Blockchain' },
    { name: 'Solidity', category: 'Smart Contracts' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'AWS', category: 'Cloud' },
    { name: 'GraphQL', category: 'API' },
    { name: 'Tailwind CSS', category: 'Styling' },
  ];

  return (
    <section className="technologies-section">
      <h2 className="section-title">Технологический стек</h2>
      <p className="technologies-subtitle">
        Используем современные инструменты для создания быстрых, безопасных и масштабируемых решений
      </p>
      <div className="technologies-grid">
        {technologies.map((tech, index) => (
          <div key={index} className="tech-card">
            <span className="tech-name">{tech.name}</span>
            <span className="tech-category">{tech.category}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Technologies;

