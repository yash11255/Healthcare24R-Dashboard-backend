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
    body('dob').optional().isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    body('address').optional().trim(),
    body('patientTimezone').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const { name, dob, gender, address, patientTimezone } = req.body;

      const patient = new Patient({
        ownerId: req.user.userId,
        name,
        dob: dob ? new Date(dob) : undefined,
        gender,
        address,
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

    const patients = await Patient.find(query).sort({ createdAt: -1 });

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
    });

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
    body('dob').optional().isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    body('address').optional().trim(),
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

      const { name, dob, gender, address, patientTimezone, active } = req.body;

      if (name !== undefined) patient.name = name;
      if (dob !== undefined) patient.dob = new Date(dob);
      if (gender !== undefined) patient.gender = gender;
      if (address !== undefined) patient.address = address;
      if (patientTimezone !== undefined) patient.patientTimezone = patientTimezone;
      if (active !== undefined) patient.active = active;

      await patient.save();

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

// ==================== CUSTOM TASK MANAGEMENT ====================

/**
 * @route   POST /api/owner/tasks
 * @desc    Create a custom task (Owner only)
 * @access  Owner
 */
router.post(
  '/tasks',
  [
    body('name').trim().notEmpty().withMessage('Task name is required'),
    body('description').optional().trim(),
    body('order').optional().isInt().withMessage('Order must be an integer')
  ],
  validate,
  async (req, res) => {
    try {
      const { name, description, order } = req.body;

      const task = new OwnerTask({
        ownerId: req.user.userId,
        name,
        description,
        order: order || 0,
        active: true
      });

      await task.save();

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create task',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/owner/tasks
 * @desc    Get all custom tasks for the owner (Owner only)
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
 * @route   GET /api/owner/tasks/:id
 * @desc    Get a single task by ID (Owner only)
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

/**
 * @route   PUT /api/owner/tasks/:id
 * @desc    Update a custom task (Owner only)
 * @access  Owner
 */
router.put(
  '/tasks/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Task name cannot be empty'),
    body('description').optional().trim(),
    body('order').optional().isInt().withMessage('Order must be an integer'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean')
  ],
  validate,
  async (req, res) => {
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

      const { name, description, order, active } = req.body;

      if (name !== undefined) task.name = name;
      if (description !== undefined) task.description = description;
      if (order !== undefined) task.order = order;
      if (active !== undefined) task.active = active;

      task.updatedAt = new Date();
      await task.save();

      res.json({
        success: true,
        message: 'Task updated successfully',
        data: task
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update task',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/owner/tasks/:id
 * @desc    Delete/deactivate a custom task (Owner only)
 * @access  Owner
 */
router.delete('/tasks/:id', async (req, res) => {
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

    // Soft delete by setting active to false
    task.active = false;
    task.updatedAt = new Date();
    await task.save();

    res.json({
      success: true,
      message: 'Task deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
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
        nurseTimezone: entry.nurseTimezone
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

module.exports = router;
