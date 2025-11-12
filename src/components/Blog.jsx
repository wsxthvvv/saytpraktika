// src/pages/Blog.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';

const Blog = () => {
  const [activeCategory, setActiveCategory] = useState('Все');

  const categories = ['Все', 'Майнинг', 'Криптовалюты', 'Технологии', 'Обновления сайта'];
  const filteredPosts = activeCategory === 'Все'
    ? blogPosts
    : blogPosts.filter(post => post.category === activeCategory);

  const getCategoryCount = (cat) => {
    return cat === 'Все' ? blogPosts.length : blogPosts.filter(p => p.category === cat).length;
  };

  return (
    <section className="blog-page">
      <div className="container">
        <div className="blog-preview-header">
          <h2 className="section-title">Новости и аналитика</h2>
          <p className="blog-preview-subtitle">
            Актуальные обновления из мира майнинга, криптовалют и веб3-разработки
          </p>
        </div>

        <div className="blog-filters">
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat} ({getCategoryCount(cat)})
            </button>
          ))}
        </div>

        <div className="blog-posts-grid">
          {filteredPosts.map(post => (
            <article key={post.id} className="blog-post-card">
              <div className="blog-post-image">
                <img
                  src={post.image}
                  alt={post.title}
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
              <div className="blog-post-content">
                <div className="blog-post-meta">
                  <span className="blog-post-category">{post.category}</span>
                  <span className="blog-post-date">
                    {new Date(post.date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <h3 className="blog-post-title">
                  <Link to={`/blog/${post.id}`}>{post.title}</Link>
                </h3>
                <p className="blog-post-excerpt">{post.excerpt}</p>
                <div className="blog-post-footer">
                  <Link to={`/blog/${post.id}`} className="blog-post-link">
                    Читать далее →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="blog-empty">
            <h3>Статей в этой категории нет</h3>
          </div>
        )}
      </div>
    </section>
  );
};

export default Blog;