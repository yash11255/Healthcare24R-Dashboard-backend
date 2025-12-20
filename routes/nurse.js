const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Patient = require('../models/Patient');
const Assignment = require('../models/Assignment');
const OwnerTask = require('../models/OwnerTask');
const TaskEntry = require('../models/TaskEntry');
const { authenticate, isNurse } = require('../middleware/auth');
const validate = require('../middleware/validate');
const moment = require('moment-timezone');

// All nurse routes require authentication and nurse role
router.use(authenticate);
router.use(isNurse);

/**
 * @route   GET /api/nurse/patients
 * @desc    Get all patients assigned to this nurse (Nurse only)
 * @access  Nurse
 */
router.get('/patients', async (req, res) => {
  try {
    // Find all active assignments for this nurse
    const assignments = await Assignment.find({
      nurseId: req.user.userId,
      active: true
    }).populate({
      path: 'patientId',
      select: 'name dob gender address patientTimezone active ownerId',
      populate: {
        path: 'ownerId',
        select: 'name email phone'
      }
    });

    // Filter out assignments where patient doesn't exist or is inactive
    const activeAssignments = assignments.filter(a => a.patientId && a.patientId.active);

    const patients = activeAssignments.map(assignment => ({
      id: assignment.patientId._id,
      name: assignment.patientId.name,
      dob: assignment.patientId.dob,
      gender: assignment.patientId.gender,
      address: assignment.patientId.address,
      patientTimezone: assignment.patientId.patientTimezone,
      owner: assignment.patientId.ownerId ? {
        id: assignment.patientId.ownerId._id,
        name: assignment.patientId.ownerId.name,
        email: assignment.patientId.ownerId.email,
        phone: assignment.patientId.ownerId.phone
      } : null,
      assignmentId: assignment._id,
      assignedSince: assignment.startDate
    }));

    res.json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    console.error('Error fetching assigned patients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned patients',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/nurse/patients/:id
 * @desc    Get details of a specific assigned patient (Nurse only)
 * @access  Nurse
 */
router.get('/patients/:id', async (req, res) => {
  try {
    const patientId = req.params.id;

    // Verify this nurse is assigned to this patient
    const assignment = await Assignment.findOne({
      patientId,
      nurseId: req.user.userId,
      active: true
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this patient'
      });
    }

    // Get patient details
    const patient = await Patient.findById(patientId).populate('ownerId', 'name email phone');

    if (!patient || !patient.active) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found or inactive'
      });
    }

    res.json({
      success: true,
      data: {
        id: patient._id,
        name: patient.name,
        dob: patient.dob,
        gender: patient.gender,
        address: patient.address,
        patientTimezone: patient.patientTimezone,
        owner: patient.ownerId ? {
          id: patient.ownerId._id,
          name: patient.ownerId.name,
          email: patient.ownerId.email,
          phone: patient.ownerId.phone
        } : null,
        assignmentId: assignment._id,
        assignedSince: assignment.startDate
      }
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/nurse/patients/:id/tasks
 * @desc    Get available tasks for a specific patient (Nurse only)
 * @access  Nurse
 */
router.get('/patients/:id/tasks', async (req, res) => {
  try {
    const patientId = req.params.id;

    // Verify this nurse is assigned to this patient
    const assignment = await Assignment.findOne({
      patientId,
      nurseId: req.user.userId,
      active: true
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this patient'
      });
    }

    // Get patient to find owner
    const patient = await Patient.findById(patientId);

    if (!patient || !patient.active) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found or inactive'
      });
    }

    // Get all active tasks for this owner
    const tasks = await OwnerTask.find({
      ownerId: patient.ownerId,
      active: true
    }).sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      count: tasks.length,
      patient: {
        id: patient._id,
        name: patient.name
      },
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/nurse/patients/:id/tasks
 * @desc    Submit a task completion for a patient (Nurse only)
 * @access  Nurse
 */
router.post(
  '/patients/:id/tasks',
  [
    body('ownerTaskId').notEmpty().withMessage('Task ID is required'),
    body('note').optional().trim(),
    body('nurseTimezone').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const patientId = req.params.id;
      const { ownerTaskId, note, nurseTimezone } = req.body;

      // Verify this nurse is assigned to this patient
      const assignment = await Assignment.findOne({
        patientId,
        nurseId: req.user.userId,
        active: true
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this patient'
        });
      }

      // Verify patient exists and is active
      const patient = await Patient.findById(patientId);

      if (!patient || !patient.active) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found or inactive'
        });
      }

      // Verify task exists and belongs to the patient's owner
      const task = await OwnerTask.findOne({
        _id: ownerTaskId,
        ownerId: patient.ownerId,
        active: true
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or not available for this patient'
        });
      }

      // Get nurse's timezone (from request, user profile, or default)
      const timezone = nurseTimezone || req.user.timezone || 'UTC';

      // Create timestamp in UTC
      const timestampUTC = new Date();

      // Format local time for nurse
      const nurseLocalTime = moment(timestampUTC).tz(timezone).format('YYYY-MM-DD HH:mm:ss');

      // Check if submission is late
      let isLate = false;
      if (task.scheduledTime) {
        // Parse scheduled time (HH:mm format)
        const [scheduledHour, scheduledMin] = task.scheduledTime.split(':').map(Number);
        const scheduledDateTime = moment.tz(timezone).hour(scheduledHour).minute(scheduledMin).second(0);
        const submissionTime = moment.tz(timestampUTC, timezone);
        
        if (submissionTime.isAfter(scheduledDateTime)) {
          isLate = true;
        }
      }

      // Create task entry
      const taskEntry = new TaskEntry({
        patientId,
        nurseId: req.user.userId,
        ownerTaskId,
        note,
        timestampUTC,
        nurseLocalTime,
        nurseTimezone: timezone,
        expectedCompletionTime: task.scheduledTime || undefined,
        submittedAt: timestampUTC,
        isLate
      });

      await taskEntry.save();

      // Populate references for response
      await taskEntry.populate('ownerTaskId', 'name description');

      res.status(201).json({
        success: true,
        message: isLate ? 'Task completed (marked as late)' : 'Task completed successfully',
        data: {
          id: taskEntry._id,
          patient: {
            id: patient._id,
            name: patient.name
          },
          task: {
            id: taskEntry.ownerTaskId._id,
            name: taskEntry.ownerTaskId.name,
            description: taskEntry.ownerTaskId.description,
            scheduledTime: task.scheduledTime
          },
          note: taskEntry.note,
          timestampUTC: taskEntry.timestampUTC,
          nurseLocalTime: taskEntry.nurseLocalTime,
          nurseTimezone: taskEntry.nurseTimezone,
          expectedCompletionTime: taskEntry.expectedCompletionTime,
          isLate: taskEntry.isLate
        }
      });
    } catch (error) {
      console.error('Error submitting task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit task',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/nurse/my-tasks
 * @desc    Get all task entries submitted by this nurse (Nurse only)
 * @access  Nurse
 */
router.get('/my-tasks', async (req, res) => {
  try {
    const { startDate, endDate, patientId, limit } = req.query;

    // Build query
    const query = { nurseId: req.user.userId };

    if (patientId) {
      query.patientId = patientId;
    }

    if (startDate || endDate) {
      query.timestampUTC = {};
      if (startDate) {
        query.timestampUTC.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestampUTC.$lte = new Date(endDate);
      }
    }

    // Fetch task entries
    let taskEntriesQuery = TaskEntry.find(query)
      .populate('patientId', 'name')
      .populate('ownerTaskId', 'name description')
      .sort({ timestampUTC: -1 });

    if (limit) {
      taskEntriesQuery = taskEntriesQuery.limit(parseInt(limit));
    }

    const taskEntries = await taskEntriesQuery;

    const formattedEntries = taskEntries.map(entry => ({
      id: entry._id,
      patient: entry.patientId ? {
        id: entry.patientId._id,
        name: entry.patientId.name
      } : null,
      task: entry.ownerTaskId ? {
        id: entry.ownerTaskId._id,
        name: entry.ownerTaskId.name,
        description: entry.ownerTaskId.description
      } : null,
      note: entry.note,
      timestampUTC: entry.timestampUTC,
      nurseLocalTime: entry.nurseLocalTime,
      nurseTimezone: entry.nurseTimezone,
      expectedCompletionTime: entry.expectedCompletionTime,
      submittedAt: entry.submittedAt,
      isLate: entry.isLate
    }));

    res.json({
      success: true,
      count: formattedEntries.length,
      data: formattedEntries
    });
  } catch (error) {
    console.error('Error fetching task entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task entries',
      error: error.message
    });
  }
});

module.exports = router;
