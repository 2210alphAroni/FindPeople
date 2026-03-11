const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'All fields required' });
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: existing.email === email ? 'Email already in use' : 'Username already taken' });
    }
    const user = new User({ username, email, password });
    await user.save();
    const token = generateToken(user._id);
    res.status(201).json({ message: 'Registration successful', token, user: user.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    if (user.banned) return res.status(403).json({ message: 'Your account has been banned. Contact support.' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });
    const token = generateToken(user._id);
    res.json({ message: 'Login successful', token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

router.put('/toggle-anonymous', authMiddleware, async (req, res) => {
  try {
    const { isAnonymous, anonymousName } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { isAnonymous, anonymousName: anonymousName || '' }, { new: true });
    res.json({ user: user.toJSON() });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Make first user admin (for setup)
router.post('/make-admin', authMiddleware, async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'admin' });
    if (count > 0) return res.status(400).json({ message: 'Admin already exists' });
    const user = await User.findByIdAndUpdate(req.user._id, { role: 'admin' }, { new: true });
    res.json({ message: 'You are now admin!', user: user.toJSON() });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;