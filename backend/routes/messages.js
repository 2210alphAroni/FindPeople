const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/chat-files';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `chat-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/messages/:userId
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id },
      ],
    }).sort({ createdAt: 1 }).limit(100)
      .populate('sender', 'username avatar isAnonymous anonymousName')
      .populate('receiver', 'username avatar isAnonymous anonymousName');

    await Message.updateMany({ sender: req.params.userId, receiver: req.user._id, isRead: false }, { isRead: true });
    res.json({ messages });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/messages
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    if (!receiverId) return res.status(400).json({ message: 'Receiver required' });
    const msg = new Message({ sender: req.user._id, receiver: receiverId, message: message?.trim() || '' });
    await msg.save();
    await msg.populate('sender', 'username avatar isAnonymous anonymousName');
    res.status(201).json({ message: msg });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/messages/upload — file/photo upload
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!req.file || !receiverId) return res.status(400).json({ message: 'File and receiver required' });
    const isImage = req.file.mimetype.startsWith('image/');
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/chat-files/${req.file.filename}`;
    const msg = new Message({
      sender: req.user._id,
      receiver: receiverId,
      fileUrl,
      fileType: isImage ? 'image' : 'file',
      fileName: req.file.originalname,
    });
    await msg.save();
    await msg.populate('sender', 'username avatar');
    res.status(201).json({ message: msg });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;