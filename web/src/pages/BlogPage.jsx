import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { blogsAPI } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

function buildBlogImage(title = 'Blog') {
  const safeTitle = String(title || 'Blog')
    .slice(0, 30)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="55%" stop-color="#2563eb"/>
          <stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" rx="28" fill="url(#bg)"/>
      <circle cx="812" cy="92" r="118" fill="rgba(255,255,255,.14)"/>
      <circle cx="130" cy="470" r="150" fill="rgba(255,255,255,.1)"/>
      <rect x="88" y="108" width="520" height="34" rx="17" fill="rgba(255,255,255,.92)"/>
      <rect x="88" y="178" width="690" height="24" rx="12" fill="rgba(255,255,255,.62)"/>
      <rect x="88" y="230" width="620" height="24" rx="12" fill="rgba(255,255,255,.44)"/>
      <text x="88" y="390" fill="#fff" font-family="Arial, sans-serif" font-size="58" font-weight="800">PTIT Learning Blog</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace('PTIT Learning Blog', safeTitle))}`;
}

function resolveBlogImage(value, title) {
  if (!value) return buildBlogImage(title);
  if (value.startsWith('http') || value.startsWith('/uploads/')) return value;
  return buildBlogImage(title);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
}

function renderContent(content) {
  return String(content || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default function BlogPage() {
  const { slug } = useParams();
  const [blogs, setBlogs] = useState([]);
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (slug) {
          const res = await blogsAPI.getBySlug(slug);
          if (!cancelled) setBlog(res.data);
        } else {
          const res = await blogsAPI.getAll();
          if (!cancelled) setBlogs(res.data || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Không tải được bài viết');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const relatedPosts = useMemo(() => {
    if (!slug) return [];
    return blogs.filter((item) => item.slug !== slug).slice(0, 3);
  }, [blogs, slug]);

  useEffect(() => {
    if (!slug) return;
    blogsAPI.getAll().then((res) => setBlogs(res.data || [])).catch(() => {});
  }, [slug]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <main className="container article">
        <h1 className="article-title">Blog</h1>
        <div className="home-empty-state">
          <h3>{error}</h3>
          <p>Bài viết có thể đã bị gỡ hoặc chưa được xuất bản.</p>
          <Link to="/blog" className="btn btn-primary">Quay lại blog</Link>
        </div>
      </main>
    );
  }

  if (slug && blog) {
    const paragraphs = renderContent(blog.content);
    return (
      <main className="container article">
        <Link to="/blog" className="btn btn-outline btn-sm">← Tất cả bài viết</Link>
        <h1 className="article-title">{blog.title}</h1>

        <figure className="article-cover">
          <img src={resolveBlogImage(blog.cover_image, blog.title)} alt={blog.title} />
        </figure>

        <div className="article-meta">
          <span>Ngày đăng: {formatDate(blog.published_at || blog.created_at)}</span>
          <span>•</span>
          <span>Tác giả: {blog.author_name}</span>
        </div>

        <div className="article-body">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {relatedPosts.length > 0 && (
          <section className="related">
            <h2 className="related-title">Bài viết khác</h2>
            <div className="grid grid-3">
              {relatedPosts.map((post) => (
                <Link key={post.blog_id} to={`/blog/${post.slug}`} className="card-link">
                  <article className="card">
                    <img className="card-img" src={resolveBlogImage(post.cover_image, post.title)} alt={post.title} style={{ height: '160px', objectFit: 'cover' }} />
                    <div className="card-body">
                      <h3 className="card-title">{post.title}</h3>
                      <p className="card-text">{post.excerpt || post.author_name}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="container article">
      <h1 className="article-title">Bài viết của chúng tôi</h1>
      <p className="section-sub">Cập nhật kiến thức, lộ trình học và tin tức từ PTIT Learning.</p>

      {blogs.length === 0 ? (
        <div className="home-empty-state">
          <h3>Chưa có bài viết nào</h3>
          <p>Admin có thể tạo và xuất bản bài viết trong dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {blogs.map((post) => (
            <Link key={post.blog_id} to={`/blog/${post.slug}`} className="card-link">
              <article className="card">
                <img className="card-img" src={resolveBlogImage(post.cover_image, post.title)} alt={post.title} style={{ height: '190px', objectFit: 'cover' }} />
                <div className="card-body">
                  <h3 className="card-title">{post.title}</h3>
                  <p className="card-text">{post.excerpt || renderContent(post.content)[0] || 'Bài viết từ PTIT Learning'}</p>
                  <div className="card-meta">
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                    <span>{post.author_name}</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
