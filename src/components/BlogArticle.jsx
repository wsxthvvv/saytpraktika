// src/pages/BlogArticle.jsx
import { useParams, Link } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts'; // ✅ Импортируем полные статьи

const BlogArticle = () => {
  const { id } = useParams();

  // ✅ УБРАТЬ локальный массив blogPosts — он перекрывает импорт!

  const post = blogPosts.find(p => p.id === parseInt(id));

  if (!post) {
    return (
      <div className="blog-article-not-found">
        <h2>Статья не найдена</h2>
        <p>Запрошенная статья не существует или была удалена.</p>
        <Link to="/blog" className="btn">
          Вернуться к блогу
        </Link>
      </div>
    );
  }

  // Преобразуем категорию для отображения (если нужно)
  const getCategoryName = (category) => {
    const map = {
      'Майнинг': 'Майнинг',
      'Криптовалюты': 'Криптовалюты',
      'Технологии': 'Технологии',
      'Обновления сайта': 'Обновления сайта'
    };
    return map[category] || category;
  };

  return (
    <div className="blog-article-page">
      <div className="container">
        <div className="blog-article-breadcrumbs">
          <Link to="/blog">Блог</Link>
          <span> / </span>
          <span>{post.title}</span>
        </div>

        <article className="blog-article">
          <header className="blog-article-header">
            <div className="blog-article-meta">
              <span className="blog-post-category">
                {getCategoryName(post.category)}
              </span>
              <span className="blog-article-date">
                {new Date(post.date).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <h1 className="blog-article-title">{post.title}</h1>
          </header>

          <div className="blog-article-image">
            <img
              src={post.image.trim()} // ✅ Убираем лишние пробелы в URL
              alt={post.title}
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>

          <div 
            className="blog-article-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="blog-article-footer">
            <Link to="/blog" className="btn-outline">
              ← Назад к статьям
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogArticle;