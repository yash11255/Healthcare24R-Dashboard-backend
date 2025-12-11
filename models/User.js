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
  
  // Nurse-specific fields
  address: {
    type: String,
    trim: true
  },
  aadhaarNumber: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  bankAccountNumber: {
    type: String,
    trim: true
  },
  bankIFSC: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },
  
  createdAt: {
    type: Date,
    default: () => new Date()
  }
});

// Index for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ aadhaarNumber: 1 }); // Index for Aadhaar lookup

// Validate required fields for nurses
UserSchema.pre('save', function(next) {
  if (this.role === 'nurse') {
    const requiredFields = ['phone', 'address', 'aadhaarNumber', 'bankAccountNumber', 'bankIFSC'];
    for (let field of requiredFields) {
      if (!this[field]) {
        return next(new Error(`${field} is required for nurse users`));
      }
    }
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
