const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  bio: { type: String, maxlength: 150, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  banned: { type: Boolean, default: false },
  isAnonymous: { type: Boolean, default: false },
  anonymousName: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  lastLocation: { lat: Number, lng: Number, updatedAt: Date },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (p) {
  return bcrypt.compare(p, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
