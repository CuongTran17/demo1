const express = require('express');
const Blog = require('../models/Blog');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.getPublished();
    res.json(blogs);
  } catch (err) {
    console.error('Get blogs error:', err);
    res.status(500).json({ error: 'Lỗi tải bài viết' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.getPublishedBySlug(req.params.slug);
    if (!blog) return res.status(404).json({ error: 'Bài viết không tồn tại' });
    res.json(blog);
  } catch (err) {
    console.error('Get blog error:', err);
    res.status(500).json({ error: 'Lỗi tải bài viết' });
  }
});

module.exports = router;
