const fs = require('fs');
const path = require('path');

const slugify = (title, id) => {
  const base = String(title)
    .toLowerCase()
    .replace(/[«»"'`]/g, '')
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'post'}-${id}`;
};

const pickSlug = (post) => {
  const custom = String(post.slug || '').trim();
  if (custom) return custom.slice(0, 120);
  return slugify(post.title, post.id);
};

const seedBlogPosts = async (query) => {
  const filePath = path.join(__dirname, '..', 'src', 'data', 'blogPosts.json');
  if (!fs.existsSync(filePath)) return;

  const reseed = String(process.env.BLOG_RESEED || '').toLowerCase() === 'true';
  const count = await query('SELECT COUNT(*)::int AS c FROM blog_posts');
  if (count.rows[0].c > 0 && !reseed) return;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const posts = Array.isArray(data.posts) ? data.posts : [];
  for (const post of posts) {
    const slug = pickSlug(post);
    const body = String(post.body || post.excerpt || '').trim();
    await query(
      `INSERT INTO blog_posts (legacy_id, slug, category, title, excerpt, body, tags, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (slug) DO UPDATE SET
         legacy_id = EXCLUDED.legacy_id,
         category = EXCLUDED.category,
         title = EXCLUDED.title,
         excerpt = EXCLUDED.excerpt,
         body = EXCLUDED.body,
         tags = EXCLUDED.tags,
         published_at = EXCLUDED.published_at,
         updated_at = NOW()`,
      [
        post.id,
        slug,
        post.category || 'it-services',
        post.title,
        post.excerpt || '',
        body,
        JSON.stringify(post.tags || []),
        post.date || null,
      ],
    );
  }
};

module.exports = { seedBlogPosts, slugify };