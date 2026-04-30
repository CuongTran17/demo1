const db = require('../config/database');

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

class Blog {
  static async ensureTable() {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blogs (
        blog_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(180) NOT NULL UNIQUE,
        excerpt TEXT,
        content LONGTEXT NOT NULL,
        cover_image VARCHAR(500),
        author_name VARCHAR(120) NOT NULL DEFAULT 'PTIT Learning Team',
        status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
        published_at DATETIME NULL,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_blogs_status_published (status, published_at),
        CONSTRAINT fk_blogs_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
        CONSTRAINT fk_blogs_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  static normalizePayload(data = {}) {
    const title = String(data.title || '').trim();
    const content = String(data.content || '').trim();
    const slug = slugify(data.slug || title);
    const status = data.status === 'published' ? 'published' : 'draft';

    if (!title) {
      const err = new Error('Tiêu đề không được để trống');
      err.status = 400;
      throw err;
    }
    if (!content) {
      const err = new Error('Nội dung không được để trống');
      err.status = 400;
      throw err;
    }
    if (!slug) {
      const err = new Error('Slug không hợp lệ');
      err.status = 400;
      throw err;
    }

    return {
      title,
      slug,
      excerpt: String(data.excerpt || '').trim() || null,
      content,
      coverImage: String(data.coverImage || data.cover_image || '').trim() || null,
      authorName: String(data.authorName || data.author_name || 'PTIT Learning Team').trim(),
      status,
      publishedAt: status === 'published'
        ? (data.publishedAt || data.published_at || new Date())
        : (data.publishedAt || data.published_at || null),
    };
  }

  static async getPublished() {
    await Blog.ensureTable();
    const [rows] = await db.execute(
      `SELECT blog_id, title, slug, excerpt, content, cover_image, author_name, status, published_at, created_at, updated_at
       FROM blogs
       WHERE status = 'published'
       ORDER BY COALESCE(published_at, created_at) DESC, blog_id DESC`
    );
    return rows;
  }

  static async getPublishedBySlug(slug) {
    await Blog.ensureTable();
    const [rows] = await db.execute(
      `SELECT blog_id, title, slug, excerpt, content, cover_image, author_name, status, published_at, created_at, updated_at
       FROM blogs
       WHERE slug = ? AND status = 'published'
       LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  }

  static async getAll() {
    await Blog.ensureTable();
    const [rows] = await db.execute(
      `SELECT blog_id, title, slug, excerpt, content, cover_image, author_name, status, published_at, created_at, updated_at
       FROM blogs
       ORDER BY updated_at DESC, blog_id DESC`
    );
    return rows;
  }

  static async getById(id) {
    await Blog.ensureTable();
    const [rows] = await db.execute('SELECT * FROM blogs WHERE blog_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data, userId) {
    await Blog.ensureTable();
    const payload = Blog.normalizePayload(data);
    const [result] = await db.execute(
      `INSERT INTO blogs
       (title, slug, excerpt, content, cover_image, author_name, status, published_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title,
        payload.slug,
        payload.excerpt,
        payload.content,
        payload.coverImage,
        payload.authorName,
        payload.status,
        payload.publishedAt,
        userId,
        userId,
      ]
    );
    return Blog.getById(result.insertId);
  }

  static async update(id, data, userId) {
    await Blog.ensureTable();
    const existing = await Blog.getById(id);
    if (!existing) {
      const err = new Error('Không tìm thấy bài viết');
      err.status = 404;
      throw err;
    }

    const payload = Blog.normalizePayload(data);
    await db.execute(
      `UPDATE blogs
       SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, author_name = ?,
           status = ?, published_at = ?, updated_by = ?
       WHERE blog_id = ?`,
      [
        payload.title,
        payload.slug,
        payload.excerpt,
        payload.content,
        payload.coverImage,
        payload.authorName,
        payload.status,
        payload.publishedAt,
        userId,
        id,
      ]
    );
    return Blog.getById(id);
  }

  static async deleteById(id) {
    await Blog.ensureTable();
    const [result] = await db.execute('DELETE FROM blogs WHERE blog_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Blog;
