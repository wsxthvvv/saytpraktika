// src/components/BlogPreview.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';

const BlogPreview = () => {
  // Покажем 3 самые свежие статьи
  const latestPosts = [...blogPosts]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  return (
    <section className="blog-preview">
      <div className="container">
        <div className="blog-preview-header">
          <h2 className="section-title">Полезные материалы</h2>
          <p className="blog-preview-subtitle">
            Актуальные статьи о майнинге, блокчейне и криптовалютах от наших экспертов
          </p>
          <Link to="/blog" className="btn-outline">
            Все статьи
          </Link>
        </div>

        <div className="blog-posts-grid">
          {latestPosts.map(post => (
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
                </div>
                <h3 className="blog-post-title">
                  <Link to={`/blog/${post.id}`}>{post.title}</Link>
                </h3>
                <p className="blog-post-excerpt">{post.excerpt}</p>
                <div className="blog-post-footer">
                  <span className="blog-post-date">
                    {new Date(post.date).toLocaleDateString('ru-RU')}
                  </span>
                  <Link to={`/blog/${post.id}`} className="blog-post-link">
                    Читать →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogPreview;