import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import blogData from '../data/blogPosts.json';
import SiteNotFound from '../components/SiteNotFound';
import BlogArticleBody from '../components/BlogArticleBody';

const CATEGORY_LABELS = {
  'it-services': 'IT',
  mining: 'Майнинг',
  accounting: 'Бухгалтерия',
  'ai-solutions': 'ИИ',
};

const normalizeTitle = (value) => String(value || '').toLowerCase().trim();

const enrichPostFromJson = (apiPost, routeSlug) => {
  if (!apiPost) return null;
  const list = blogData.posts || [];
  const legacyId = apiPost.legacyId ?? apiPost.legacy_id;
  const apiTitle = normalizeTitle(apiPost.title);
  const match = list.find((item) => item.slug && (item.slug === apiPost.slug || item.slug === routeSlug))
    || list.find((item) => normalizeTitle(item.title) === apiTitle)
    || list.find((item) => legacyId != null
      && String(item.id) === String(legacyId)
      && normalizeTitle(item.title) === apiTitle)
    || list.find((item) => String(item.id) === String(routeSlug));
  if (!match?.body) return apiPost;

  const body = String(apiPost.body || '').trim();
  const excerpt = String(apiPost.excerpt || '').trim();
  const short = !body || body.length < 200 || body === excerpt;
  if (!short) return apiPost;

  return {
    ...apiPost,
    title: apiPost.title || match.title,
    excerpt: excerpt || match.excerpt,
    body: match.body,
    tags: (Array.isArray(apiPost.tags) && apiPost.tags.length) ? apiPost.tags : match.tags,
    slug: apiPost.slug || match.slug || String(match.id),
  };
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

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/blog/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok && data.post) setPost(enrichPostFromJson(data.post, slug));
        else {
          const list = blogData.posts || [];
          const fallback = list.find((item) => item.slug === slug)
            || list.find((item) => String(item.id) === String(slug));
          if (fallback) setPost({ ...fallback, slug: fallback.slug || String(fallback.id) });
        }
      })
      .catch(() => {
        const list = blogData.posts || [];
        const fallback = list.find((item) => item.slug === slug)
          || list.find((item) => String(item.id) === String(slug));
        if (fallback) setPost({ ...fallback, slug: fallback.slug || String(fallback.id) });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return <p className="route-loading" role="status">Загружаем статью…</p>;
  }

  if (!post) return <SiteNotFound />;

  const tags = Array.isArray(post.tags) ? post.tags : [];

  return (
    <article className="blog-article services-section">
      <p className="blog-card__meta">
        <span>{CATEGORY_LABELS[post.category] || post.category}</span>
        <time dateTime={post.date}>{formatDate(post.date)}</time>
      </p>
      <h1 className="section-title">{post.title}</h1>
      {post.excerpt ? <p className="blog-article__lead">{post.excerpt}</p> : null}
      <BlogArticleBody body={post.body || post.excerpt} />
      <div className="blog-card__tags">
        {tags.map((tag) => (
          <span key={tag} className="blog-tag">{tag}</span>
        ))}
      </div>
      <p className="blog-article__note">
        Нужна помощь по теме? Оформите{' '}
        <Link to="/services?kind=corporate">заявку на услугу</Link>
        {' '}
        или воспользуйтесь виджетом контактов.
      </p>
      <div className="blog-article__nav">
        <Link to="/blog" className="btn-outline">← Ко всем статьям</Link>
        <Link to="/services?kind=corporate" className="btn">Услуги</Link>
      </div>
    </article>
  );
};

export default BlogPostPage;