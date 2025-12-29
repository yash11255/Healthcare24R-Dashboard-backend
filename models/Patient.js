const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
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
  age: {
    type: Number,
    min: 0
  },
  phone: {
    type: String,
    trim: true
  },
  dob: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  address: {
    type: String,
    trim: true
  },
  assignedNurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  patientTimezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  }
});

// Indexes for faster queries
PatientSchema.index({ ownerId: 1 });
PatientSchema.index({ active: 1 });

module.exports = mongoose.model('Patient', PatientSchema);
