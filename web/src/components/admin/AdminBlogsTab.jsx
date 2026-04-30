import { useMemo, useState } from 'react';

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  authorName: 'PTIT Learning Team',
  status: 'draft',
  publishedAt: '',
};

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildForm(blog) {
  if (!blog) return EMPTY_FORM;
  return {
    title: blog.title || '',
    slug: blog.slug || '',
    excerpt: blog.excerpt || '',
    content: blog.content || '',
    coverImage: blog.cover_image || '',
    authorName: blog.author_name || 'PTIT Learning Team',
    status: blog.status || 'draft',
    publishedAt: toDateTimeLocal(blog.published_at),
  };
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN');
}

export default function AdminBlogsTab({
  blogs,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const filteredBlogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return blogs.filter((blog) => {
      const matchSearch = !q ||
        blog.title?.toLowerCase().includes(q) ||
        blog.slug?.toLowerCase().includes(q) ||
        blog.author_name?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || blog.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [blogs, search, statusFilter]);

  const setField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'title' && !editingId ? { slug: slugify(value) } : {}),
    }));
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (blog) => {
    setEditingId(blog.blog_id);
    setForm(buildForm(blog));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.title),
        publishedAt: form.publishedAt || null,
      };
      if (editingId) {
        await onUpdate(editingId, payload);
      } else {
        await onCreate(payload);
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">{editingId ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</h3>
          {editingId && (
            <button className="ta-btn ta-btn--outline ta-btn--sm" type="button" onClick={startCreate}>Tạo mới</button>
          )}
        </div>

        <form className="ta-panel-body" onSubmit={submit}>
          <div className="ta-form-card">
            <div className="ta-form-grid">
              <div>
                <label className="ta-form-label">Tiêu đề <span className="ta-required">*</span></label>
                <input className="ta-form-input" value={form.title} onChange={(e) => setField('title', e.target.value)} required />
              </div>
              <div>
                <label className="ta-form-label">Slug <span className="ta-required">*</span></label>
                <input className="ta-form-input" value={form.slug} onChange={(e) => setField('slug', slugify(e.target.value))} required />
              </div>
            </div>

            <div className="ta-form-grid">
              <div>
                <label className="ta-form-label">Tác giả</label>
                <input className="ta-form-input" value={form.authorName} onChange={(e) => setField('authorName', e.target.value)} />
              </div>
              <div>
                <label className="ta-form-label">Ảnh bìa URL</label>
                <input className="ta-form-input" value={form.coverImage} onChange={(e) => setField('coverImage', e.target.value)} placeholder="/uploads/course-images/..." />
              </div>
            </div>

            <div className="ta-form-grid">
              <div>
                <label className="ta-form-label">Trạng thái</label>
                <select className="ta-form-select" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Xuất bản</option>
                </select>
              </div>
              <div>
                <label className="ta-form-label">Ngày xuất bản</label>
                <input className="ta-form-input" type="datetime-local" value={form.publishedAt} onChange={(e) => setField('publishedAt', e.target.value)} />
              </div>
            </div>

            <div className="ta-form-row ta-form-row--compact">
              <label className="ta-form-label">Tóm tắt</label>
              <textarea className="ta-form-textarea" rows="2" value={form.excerpt} onChange={(e) => setField('excerpt', e.target.value)} />
            </div>

            <div className="ta-form-row ta-form-row--compact">
              <label className="ta-form-label">Nội dung <span className="ta-required">*</span></label>
              <textarea className="ta-form-textarea" rows="10" value={form.content} onChange={(e) => setField('content', e.target.value)} required />
              <div className="ta-form-hint">Mỗi đoạn cách nhau bằng dòng trống. Trang public sẽ render nội dung dạng văn bản an toàn.</div>
            </div>

            <div className="ta-form-actions ta-form-actions--top">
              <button className="ta-btn ta-btn--primary" type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : editingId ? 'Lưu bài viết' : 'Tạo bài viết'}
              </button>
              <button className="ta-btn ta-btn--outline" type="button" onClick={startCreate}>Làm mới</button>
            </div>
          </div>
        </form>
      </div>

      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">
            Blog
            <span className="ta-count-muted">{filteredBlogs.length}/{blogs.length}</span>
          </h3>
        </div>

        <div className="rm-filter-bar">
          <div className="rm-search-wrap">
            <svg className="rm-search-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input className="rm-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề, slug, tác giả..." />
            {search && <button className="rm-clear-btn" type="button" onClick={() => setSearch('')}>×</button>}
          </div>
          <select className="ta-form-select ta-select-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>

        {loading ? (
          <div className="ta-empty">Đang tải bài viết...</div>
        ) : filteredBlogs.length === 0 ? (
          <div className="ta-empty">Chưa có bài viết phù hợp</div>
        ) : (
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr><th>Tiêu đề</th><th>Slug</th><th>Tác giả</th><th>Trạng thái</th><th>Xuất bản</th><th>Hành động</th></tr>
              </thead>
              <tbody>
                {filteredBlogs.map((blog) => (
                  <tr key={blog.blog_id}>
                    <td>
                      <div className="ta-text-bold">{blog.title}</div>
                      <div className="ta-text-muted ta-text-xs">{blog.excerpt || 'Không có tóm tắt'}</div>
                    </td>
                    <td>{blog.slug}</td>
                    <td>{blog.author_name}</td>
                    <td>
                      <span className={`ta-badge ${blog.status === 'published' ? 'ta-badge--active' : 'ta-badge--pending'}`}>
                        {blog.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                      </span>
                    </td>
                    <td>{formatDate(blog.published_at)}</td>
                    <td>
                      <div className="ta-actions">
                        <button className="ta-btn ta-btn--sm ta-btn--primary" type="button" onClick={() => startEdit(blog)}>Sửa</button>
                        <button className="ta-btn ta-btn--sm ta-btn--danger" type="button" onClick={() => onDelete(blog)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
