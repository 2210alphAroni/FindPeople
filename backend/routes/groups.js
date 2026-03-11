const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/group-files';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `grp-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/groups — my groups
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('creator', 'username avatar')
      .populate('members', 'username avatar')
      .sort({ createdAt: -1 });
    res.json({ groups });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/groups — create group
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    if (!name) return res.status(400).json({ message: 'Group name required' });
    const members = [...new Set([req.user._id.toString(), ...(memberIds || [])])];
    const group = new Group({
      name, description,
      creator: req.user._id,
      members,
      admins: [req.user._id],
    });
    await group.save();
    await group.populate('members', 'username avatar');
    res.status(201).json({ group });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/groups/:id/messages
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isMember = group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not a member' });

    const messages = await GroupMessage.find({ group: req.params.id })
      .populate('sender', 'username avatar isAnonymous anonymousName')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json({ messages });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/groups/:id/messages — send message
router.post('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const msg = new GroupMessage({
      group: req.params.id,
      sender: req.user._id,
      message: message?.trim() || '',
    });
    await msg.save();
    await msg.populate('sender', 'username avatar isAnonymous anonymousName');
    res.status(201).json({ message: msg });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/groups/:id/upload — upload file
router.post('/:id/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const isImage = req.file.mimetype.startsWith('image/');
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/group-files/${req.file.filename}`;
    const msg = new GroupMessage({
      group: req.params.id,
      sender: req.user._id,
      fileUrl,
      fileType: isImage ? 'image' : 'file',
      fileName: req.file.originalname,
    });
    await msg.save();
    await msg.populate('sender', 'username avatar');
    res.status(201).json({ message: msg });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/groups/:id/join
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.user._id } },
      { new: true }
    ).populate('members', 'username avatar');
    res.json({ group });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// DELETE /api/groups/:id/leave
router.delete('/:id/leave', authMiddleware, async (req, res) => {
  try {
    await Group.findByIdAndUpdate(req.params.id, { $pull: { members: req.user._id, admins: req.user._id } });
    res.json({ message: 'Left group' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;