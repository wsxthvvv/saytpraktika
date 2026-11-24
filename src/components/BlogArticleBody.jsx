import { Link } from 'react-router-dom';

const applyBold = (text, keyPrefix) => {
  if (!text || !text.includes('**')) return text;
  const parts = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match;
  let index = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<strong key={`${keyPrefix}-b-${index}`}>{match[1]}</strong>);
    last = match.index + match[0].length;
    index += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
};

const linkifyLine = (line, keyPrefix) => {
  const parts = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match;
  let index = 0;
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      parts.push(applyBold(line.slice(last, match.index), `${keyPrefix}-t-${index}`));
    }
    const href = match[2];
    const label = match[1];
    if (href.startsWith('/') && !href.startsWith('//')) {
      parts.push(<Link key={`${keyPrefix}-l-${index}`} to={href}>{label}</Link>);
    } else {
      parts.push(<a key={`${keyPrefix}-a-${index}`} href={href} target="_blank" rel="noopener noreferrer">{label}</a>);
    }
    last = match.index + match[0].length;
    index += 1;
  }
  if (last < line.length) {
    parts.push(applyBold(line.slice(last), `${keyPrefix}-end`));
  }
  const flat = parts.flatMap((part) => (Array.isArray(part) ? part : [part]));
  return flat.length ? flat : line;
};

const formatLine = (line, index) => linkifyLine(line, `line-${index}`);

const BlogArticleBody = ({ body }) => {
  const text = String(body || '').trim();
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  return (
    <div className="blog-article__body">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={`br-${index}`} />;
        if (trimmed.startsWith('## ')) {
          const heading = trimmed.slice(3).replace(/^\*\*|\*\*$/g, '');
          return <h2 key={`h2-${index}`} className="blog-article__h2">{formatLine(heading, index)}</h2>;
        }
        const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ');
        const isNumbered = /^\d+\.\s/.test(trimmed);
        const content = formatLine(trimmed, index);
        const className = isBullet || isNumbered ? 'blog-article__list-item' : undefined;
        return (
          <p key={`p-${index}`} className={className}>
            {content}
          </p>
        );
      })}
    </div>
  );
};

export default BlogArticleBody;