import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import blogData from '../data/blogPosts.json';

const CATEGORY_LABELS = {
  'it-services': 'IT',
  mining: 'Майнинг',
  accounting: 'Бухгалтерия',
  'ai-solutions': 'ИИ',
};

const formatDate = (value) => {
  try {
    return new Date(value).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const BlogPage = () => {
  const [category, setCategory] = useState('all');
  const [posts, setPosts] = useState(blogData.posts || []);
  const [total, setTotal] = useState(blogData.total || posts.length);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '200', page: '1' });
    if (category !== 'all') params.set('category', category);
    fetch(`/api/blog?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.posts) && data.posts.length) {
          setPosts(data.posts);
          setTotal(data.total || data.posts.length);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [category]);

  const filtered = useMemo(() => {
    if (category === 'all') return posts;
    return posts.filter((post) => post.category === category);
  }, [category, posts]);

  const categoryCounts = useMemo(() => {
    const counts = { all: total };
    posts.forEach((post) => {
      counts[post.category] = (counts[post.category] || 0) + 1;
    });
    return counts;
  }, [posts, total]);

  const postHref = (post) => `/blog/${post.slug || post.id}`;

  return (
    <section className="blog-page services-section">
      <header className="blog-page__head">
        <p className="section-eyebrow">БЛОГ</p>
        <h1 className="section-title">Экспертные материалы</h1>
        <p className="services-subtitle">
          IT, майнинг, бухгалтерия и ИИ — {total} статей для владельцев бизнеса и команд.
        </p>
      </header>

      <div className="product-categories" role="tablist" aria-label="Рубрики блога">
        <button
          type="button"
          className={`product-category${category === 'all' ? ' is-active' : ''}`}
          onClick={() => setCategory('all')}
        >
          Все
          <span>{categoryCounts.all}</span>
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`product-category${category === key ? ' is-active' : ''}`}
            onClick={() => setCategory(key)}
          >
            {label}
            <span>{categoryCounts[key] || 0}</span>
          </button>
        ))}
      </div>

      <ul className="blog-grid">
        {filtered.map((post) => (
          <li key={post.id}>
            <article className="blog-card">
              <p className="blog-card__meta">
                <span>{CATEGORY_LABELS[post.category] || post.category}</span>
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </p>
              <h2>
                <Link to={postHref(post)}>{post.title}</Link>
              </h2>
              <p>{post.excerpt}</p>
              <div className="blog-card__tags">
                {(post.tags || []).map((tag) => (
                  <span key={tag} className="blog-tag">{tag}</span>
                ))}
              </div>
              <Link to={postHref(post)} className="btn-outline blog-card__more">
                Читать далее
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default BlogPage;