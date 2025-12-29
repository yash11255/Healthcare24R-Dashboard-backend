const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Patient = require('../models/Patient');
const OwnerTask = require('../models/OwnerTask');
const TaskEntry = require('../models/TaskEntry');
const { authenticate, isOwner } = require('../middleware/auth');
const validate = require('../middleware/validate');
const moment = require('moment-timezone');

// All owner routes require authentication and owner role
router.use(authenticate);
router.use(isOwner);

// ==================== PATIENT MANAGEMENT ====================

/**
 * @route   POST /api/owner/patients
 * @desc    Create a new patient (Owner only)
 * @access  Owner
 */
router.post(
  '/patients',
  [
    body('name').trim().notEmpty().withMessage('Patient name is required'),
    body('age').optional().isInt({ min: 0 }).withMessage('Age must be a positive number'),
    body('phone').optional().trim(),
    body('dob').optional().isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    body('address').optional().trim(),
    body('assignedNurse').optional().isMongoId().withMessage('Invalid nurse ID'),
    body('patientTimezone').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const { name, age, phone, dob, gender, address, assignedNurse, patientTimezone } = req.body;

      const patient = new Patient({
        ownerId: req.user.userId,
        name,
        age,
        phone,
        dob: dob ? new Date(dob) : undefined,
        gender,
        address,
        assignedNurse: assignedNurse || null,
        patientTimezone: patientTimezone || 'Asia/Kolkata',
        active: true
      });

      await patient.save();

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        data: patient
      });
    } catch (error) {
      console.error('Error creating patient:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create patient',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/owner/patients
 * @desc    Get all patients for the owner (Owner only)
 * @access  Owner
 */
router.get('/patients', async (req, res) => {
  try {
    const { active } = req.query;

    const query = { ownerId: req.user.userId };
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const patients = await Patient.find(query)
      .populate('assignedNurse', 'name phone email')
      .sort({ createdAt: -1 });
    
      console.log('Fetched patients for owner:', req.user.userId, 'Count:', patients.length, 'Patients:', patients);

    res.json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patients',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/owner/patients/:id
 * @desc    Get a single patient by ID (Owner only)
 * @access  Owner
 */
router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      ownerId: req.user.userId
    }).populate('assignedNurse', 'name phone email');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      data: patient
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
 * @route   PUT /api/owner/patients/:id
 * @desc    Update a patient (Owner only)
 * @access  Owner
 */
router.put(
  '/patients/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Patient name cannot be empty'),
    body('age').optional().isInt({ min: 0 }).withMessage('Age must be a positive number'),
    body('phone').optional().trim(),
    body('dob').optional().isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    body('address').optional().trim(),
    body('assignedNurse').optional().custom(value => value === null || value === '' || /^[a-fA-F0-9]{24}$/.test(value)).withMessage('Invalid nurse ID'),
    body('patientTimezone').optional().trim(),
    body('active').optional().isBoolean().withMessage('Active must be a boolean')
  ],
  validate,
  async (req, res) => {
    try {
      const patient = await Patient.findOne({
        _id: req.params.id,
        ownerId: req.user.userId
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const { name, age, phone, dob, gender, address, assignedNurse, patientTimezone, active } = req.body;

      if (name !== undefined) patient.name = name;
      if (age !== undefined) patient.age = age;
      if (phone !== undefined) patient.phone = phone;
      if (dob !== undefined) patient.dob = new Date(dob);
      if (gender !== undefined) patient.gender = gender;
      if (address !== undefined) patient.address = address;
      if (assignedNurse !== undefined) patient.assignedNurse = assignedNurse || null;
      if (patientTimezone !== undefined) patient.patientTimezone = patientTimezone;
      if (active !== undefined) patient.active = active;

      await patient.save();

      // Populate nurse info before returning
      await patient.populate('assignedNurse', 'name phone email');

      res.json({
        success: true,
        message: 'Patient updated successfully',
        data: patient
      });
    } catch (error) {
      console.error('Error updating patient:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update patient',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/owner/patients/:id
 * @desc    Delete/deactivate a patient (Owner only)
 * @access  Owner
 */
router.delete('/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      ownerId: req.user.userId
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Soft delete by setting active to false
    patient.active = false;
    await patient.save();

    res.json({
      success: true,
      message: 'Patient deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete patient',
      error: error.message
    });
  }
});

// ==================== CUSTOM TASK VIEWING (READ-ONLY) ====================

/**
 * @route   GET /api/owner/tasks
 * @desc    Get all custom tasks for the owner (Owner only - READ ONLY)
 * @access  Owner
 */
router.get('/tasks', async (req, res) => {
  try {
    const { active } = req.query;

    const query = { ownerId: req.user.userId };
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const tasks = await OwnerTask.find(query).sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      count: tasks.length,
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
 * @route   GET /api/owner/task-templates
 * @desc    Get predefined task templates available to owners
 * @access  Owner
 */
router.get('/task-templates', async (req, res) => {
  try {
    const templates = await OwnerTask.find({ isTemplate: true, ownerId: null, active: true }).sort({ order: 1 });

    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/owner/tasks/entries
 * @desc    View all task entries for all patients of this owner (Owner only)
 * @access  Owner
 */
router.get('/tasks/entries', async (req, res) => {
  try {
    // Get all patients belonging to this owner
    const patients = await Patient.find({ ownerId: req.user.userId });
    const patientIds = patients.map(p => p._id);

    if (patientIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get query parameters for filtering
    const { startDate, endDate, taskId, patientId, limit } = req.query;

    // Build query
    const query = { patientId: { $in: patientIds } };
    
    if (patientId) {
      query.patientId = patientId;
    }

    if (taskId) {
      query.ownerTaskId = taskId;
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
      .populate('nurseId', 'name email')
      .sort({ timestampUTC: -1 });

    if (limit) {
      taskEntriesQuery = taskEntriesQuery.limit(parseInt(limit));
    }

    const taskEntries = await taskEntriesQuery;

    // Convert timestamps to owner's timezone
    const ownerTimezone = req.user.timezone || 'UTC';
    const formattedEntries = taskEntries.map(entry => {
      const localTime = moment(entry.timestampUTC).tz(ownerTimezone).format('YYYY-MM-DD HH:mm:ss');
      
      return {
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
        nurse: entry.nurseId ? {
          id: entry.nurseId._id,
          name: entry.nurseId.name,
          email: entry.nurseId.email
        } : null,
        note: entry.note,
        timestampUTC: entry.timestampUTC,
        ownerLocalTime: localTime,
        nurseLocalTime: entry.nurseLocalTime,
        nurseTimezone: entry.nurseTimezone,
        expectedCompletionTime: entry.expectedCompletionTime,
        submittedAt: entry.submittedAt,
        isLate: entry.isLate
      };
    });

    res.json({
      success: true,
      count: formattedEntries.length,
      ownerTimezone,
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

/**
 * @route   GET /api/owner/tasks/:id
 * @desc    Get a single task by ID (Owner only - READ ONLY)
 * @access  Owner
 */
router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await OwnerTask.findOne({
      _id: req.params.id,
      ownerId: req.user.userId
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message
    });
  }
});

// ==================== TASK ENTRY VIEWING ====================

/**
 * @route   GET /api/owner/patients/:id/tasks
 * @desc    View task entries for a specific patient (Owner only)
 * @access  Owner
 */
router.get('/patients/:id/tasks', async (req, res) => {
  try {
    const patientId = req.params.id;

    // Verify the patient belongs to this owner
    const patient = await Patient.findOne({
      _id: patientId,
      ownerId: req.user.userId
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get query parameters for filtering
    const { startDate, endDate, taskId, limit } = req.query;

    // Build query
    const query = { patientId };
    
    if (taskId) {
      query.ownerTaskId = taskId;
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
      .populate('ownerTaskId', 'name description')
      .populate('nurseId', 'name email')
      .sort({ timestampUTC: -1 });

    if (limit) {
      taskEntriesQuery = taskEntriesQuery.limit(parseInt(limit));
    }

    const taskEntries = await taskEntriesQuery;

    // Convert timestamps to owner's timezone
    const ownerTimezone = req.user.timezone || 'UTC';
    const formattedEntries = taskEntries.map(entry => {
      const localTime = moment(entry.timestampUTC).tz(ownerTimezone).format('YYYY-MM-DD HH:mm:ss');
      
      return {
        id: entry._id,
        task: entry.ownerTaskId ? {
          id: entry.ownerTaskId._id,
          name: entry.ownerTaskId.name,
          description: entry.ownerTaskId.description
        } : null,
        nurse: entry.nurseId ? {
          id: entry.nurseId._id,
          name: entry.nurseId.name,
          email: entry.nurseId.email
        } : null,
        note: entry.note,
        timestampUTC: entry.timestampUTC,
        ownerLocalTime: localTime,
        nurseLocalTime: entry.nurseLocalTime,
        nurseTimezone: entry.nurseTimezone
      };
    });

    res.json({
      success: true,
      count: formattedEntries.length,
      patient: {
        id: patient._id,
        name: patient.name
      },
      ownerTimezone,
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
