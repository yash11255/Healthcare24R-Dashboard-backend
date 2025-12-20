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
  isTemplate: {
    type: Boolean,
    default: false,
    index: true
  },
  scheduledTime: {
    type: String,
    trim: true,
    // Format: "HH:mm" e.g., "09:00", "14:30"
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
