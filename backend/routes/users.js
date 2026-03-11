const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Multer config for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/avatars';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// GET /api/users/profile
router.get('/profile', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, bio } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (bio !== undefined) updates.bio = bio;

    // Check username uniqueness
    if (username && username !== req.user.username) {
      const exists = await User.findOne({ username });
      if (exists) return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    );

    res.json({ avatar: avatarUrl, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

module.exports = router;
