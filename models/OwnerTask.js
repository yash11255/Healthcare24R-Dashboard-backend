const mongoose = require('mongoose');

const OwnerTaskSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  },
  updatedAt: {
    type: Date,
    default: () => new Date()
  }
});

// Indexes for faster queries
OwnerTaskSchema.index({ ownerId: 1, active: 1 });
OwnerTaskSchema.index({ order: 1 });

// Update the updatedAt timestamp before saving
OwnerTaskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('OwnerTask', OwnerTaskSchema);
