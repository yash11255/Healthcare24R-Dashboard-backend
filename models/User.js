const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'owner', 'nurse'],
    required: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  }
});

// Index for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

module.exports = mongoose.model('User', UserSchema);
