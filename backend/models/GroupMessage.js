const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  fileUrl: { type: String, default: '' },
  fileType: { type: String, enum: ['image', 'file', ''], default: '' },
  fileName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

groupMessageSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);