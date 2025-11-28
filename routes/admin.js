const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Patient = require('../models/Patient');
const { authenticate, isAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

/**
 * @route   POST /api/admin/create-owner
 * @desc    Create a new Owner user (Admin only)
 * @access  Admin
 */
router.post(
  '/create-owner',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
    body('timezone').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, phone, timezone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create owner
      const owner = new User({
        name,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        role: 'owner',
        timezone: timezone || 'UTC'
      });

      await owner.save();

      res.status(201).json({
        success: true,
        message: 'Owner created successfully',
        data: {
          id: owner._id,
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          role: owner.role,
          timezone: owner.timezone,
          createdAt: owner.createdAt
        }
      });
    } catch (error) {
      console.error('Error creating owner:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create owner',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/admin/create-nurse
 * @desc    Create a new Nurse user (Admin only)
 * @access  Admin
 */
router.post(
  '/create-nurse',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
    body('timezone').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, phone, timezone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create nurse
      const nurse = new User({
        name,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        role: 'nurse',
        timezone: timezone || 'UTC'
      });

      await nurse.save();

      res.status(201).json({
        success: true,
        message: 'Nurse created successfully',
        data: {
          id: nurse._id,
          name: nurse.name,
          email: nurse.email,
          phone: nurse.phone,
          role: nurse.role,
          timezone: nurse.timezone,
          createdAt: nurse.createdAt
        }
      });
    } catch (error) {
      console.error('Error creating nurse:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create nurse',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/admin/assign-nurse
 * @desc    Assign a nurse to a patient (Admin only)
 * @access  Admin
 */
router.post(
  '/assign-nurse',
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('nurseId').notEmpty().withMessage('Nurse ID is required'),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date')
  ],
  validate,
  async (req, res) => {
    try {
      const { patientId, nurseId, startDate, endDate } = req.body;

      // Verify patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Verify nurse exists and has nurse role
      const nurse = await User.findById(nurseId);
      if (!nurse) {
        return res.status(404).json({
          success: false,
          message: 'Nurse not found'
        });
      }

      if (nurse.role !== 'nurse') {
        return res.status(400).json({
          success: false,
          message: 'User is not a nurse'
        });
      }

      // Check if active assignment already exists
      const existingAssignment = await Assignment.findOne({
        patientId,
        nurseId,
        active: true
      });

      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          message: 'This nurse is already assigned to this patient'
        });
      }

      // Create assignment
      const assignment = new Assignment({
        patientId,
        nurseId,
        assignedByAdmin: req.user.userId,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        active: true
      });

      await assignment.save();

      // Populate references for response
      await assignment.populate('patientId', 'name');
      await assignment.populate('nurseId', 'name email');

      res.status(201).json({
        success: true,
        message: 'Nurse assigned to patient successfully',
        data: {
          id: assignment._id,
          patient: {
            id: assignment.patientId._id,
            name: assignment.patientId.name
          },
          nurse: {
            id: assignment.nurseId._id,
            name: assignment.nurseId.name,
            email: assignment.nurseId.email
          },
          startDate: assignment.startDate,
          endDate: assignment.endDate,
          active: assignment.active
        }
      });
    } catch (error) {
      console.error('Error assigning nurse:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign nurse',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/admin/assignments
 * @desc    Get all nurse-patient assignments (Admin only)
 * @access  Admin
 */
router.get('/assignments', async (req, res) => {
  try {
    const { active, nurseId, patientId } = req.query;

    // Build query
    const query = {};
    if (active !== undefined) {
      query.active = active === 'true';
    }
    if (nurseId) {
      query.nurseId = nurseId;
    }
    if (patientId) {
      query.patientId = patientId;
    }

    const assignments = await Assignment.find(query)
      .populate('patientId', 'name dob gender')
      .populate('nurseId', 'name email phone')
      .populate('assignedByAdmin', 'name email')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/assignments/:id/deactivate
 * @desc    Deactivate a nurse-patient assignment (Admin only)
 * @access  Admin
 */
router.put('/assignments/:id/deactivate', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    assignment.active = false;
    assignment.endDate = new Date();
    await assignment.save();

    res.json({
      success: true,
      message: 'Assignment deactivated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error deactivating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate assignment',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (Admin only)
 * @access  Admin
 */
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;

    const query = role ? { role } : {};
    
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

module.exports = router;
