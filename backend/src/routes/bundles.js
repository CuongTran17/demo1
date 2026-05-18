const express = require('express');
const CourseBundle = require('../models/CourseBundle');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const bundles = await CourseBundle.getAll();
    res.json({ bundles });
  } catch (err) {
    console.error('Get bundles error:', err);
    res.status(500).json({ error: 'Loi tai combo khoa hoc' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bundle = await CourseBundle.getById(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'Combo khong ton tai' });
    res.json({ bundle });
  } catch (err) {
    console.error('Get bundle detail error:', err);
    res.status(500).json({ error: 'Loi tai chi tiet combo' });
  }
});

module.exports = router;
