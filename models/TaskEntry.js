const mongoose = require('mongoose');

const TaskEntrySchema = new mongoose.Schema({
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
  ownerTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OwnerTask',
    required: true
  },
  note: {
    type: String,
    trim: true
  },
  timestampUTC: {
    type: Date,
    default: () => new Date()
  },
  nurseLocalTime: {
    type: String
  },
  nurseTimezone: {
    type: String
  },
  expectedCompletionTime: {
    type: String,
    // Format: "HH:mm" from the task's scheduledTime
  },
  submittedAt: {
    type: Date,
    default: () => new Date()
  },
  isLate: {
    type: Boolean,
    default: false
  }
});

// Indexes for faster queries
TaskEntrySchema.index({ patientId: 1, timestampUTC: -1 });
TaskEntrySchema.index({ nurseId: 1, timestampUTC: -1 });
TaskEntrySchema.index({ ownerTaskId: 1 });

module.exports = mongoose.model('TaskEntry', TaskEntrySchema);
