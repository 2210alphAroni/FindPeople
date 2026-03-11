const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// GET /api/admin/stats
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMessages = await Message.countDocuments();
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    res.json({ totalUsers, totalMessages, recentUsers });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search
      ? { $or: [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] }
      : {};
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(query);
    res.json({ users, total, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    await User.findByIdAndDelete(req.params.id);
    await Message.deleteMany({ $or: [{ sender: req.params.id }, { receiver: req.params.id }] });
    res.json({ message: 'User deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { banned } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { banned }, { new: true }).select('-password');
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
