const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startDate: {
    type: Date,
    default: () => new Date()
  },
  endDate: {
    type: Date
  },
  active: {
    type: Boolean,
    default: true
  }
});

// Indexes for faster queries
AssignmentSchema.index({ patientId: 1, active: 1 });
AssignmentSchema.index({ nurseId: 1, active: 1 });
AssignmentSchema.index({ patientId: 1, nurseId: 1 });

module.exports = mongoose.model('Assignment', AssignmentSchema);
