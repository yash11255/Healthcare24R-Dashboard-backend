const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Patient = require('../models/Patient');
const OwnerTask = require('../models/OwnerTask');
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
    body('phone').trim().notEmpty().withMessage('Phone number is required for nurses'),
    body('address').trim().notEmpty().withMessage('Address is required for nurses'),
    body('aadhaarNumber').trim().notEmpty().withMessage('Aadhaar number is required for nurses')
      .isLength({ min: 12, max: 12 }).withMessage('Aadhaar number must be 12 digits'),
    body('bankAccountNumber').trim().notEmpty().withMessage('Bank account number is required for nurses'),
    body('bankIFSC').trim().notEmpty().withMessage('Bank IFSC code is required for nurses'),
    body('bankName').optional().trim(),
    body('timezone').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, phone, address, aadhaarNumber, bankAccountNumber, bankIFSC, bankName, timezone } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Check if Aadhaar number already exists
      const existingAadhaar = await User.findOne({ aadhaarNumber });
      if (existingAadhaar) {
        return res.status(400).json({
          success: false,
          message: 'A user with this Aadhaar number already exists'
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
        address,
        aadhaarNumber,
        bankAccountNumber,
        bankIFSC,
        bankName: bankName || '',
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
          address: nurse.address,
          aadhaarNumber: nurse.aadhaarNumber,
          bankAccountNumber: nurse.bankAccountNumber,
          bankIFSC: nurse.bankIFSC,
          bankName: nurse.bankName,
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

      // Update patient's assignedNurse field
      patient.assignedNurse = nurseId;
      await patient.save();

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

/**
 * @route   POST /api/admin/task-templates
 * @desc    Create predefined task templates (Admin only)
 * @access  Admin
 */
router.post('/task-templates', async (req, res) => {
  try {
    const predefinedTemplates = [
      { name: 'Morning Check-in', description: 'Check patient status and vitals in the morning', scheduledTime: '09:00', order: 1 },
      { name: 'Medication Administration', description: 'Administer prescribed medications', scheduledTime: '10:00', order: 2 },
      { name: 'Lunch Check', description: 'Ensure patient has eaten lunch', scheduledTime: '13:00', order: 3 },
      { name: 'Afternoon Check-in', description: 'Check patient status in the afternoon', scheduledTime: '15:00', order: 4 },
      { name: 'Evening Check-in', description: 'Check patient status and vitals in the evening', scheduledTime: '18:00', order: 5 },
      { name: 'Dinner Check', description: 'Ensure patient has eaten dinner', scheduledTime: '19:30', order: 6 },
      { name: 'Night Check-out', description: 'Final check before bedtime', scheduledTime: '21:00', order: 7 },
      { name: 'Blood Pressure Check', description: 'Monitor blood pressure', scheduledTime: '11:00', order: 8 },
      { name: 'Temperature Check', description: 'Monitor body temperature', scheduledTime: '12:00', order: 9 },
      { name: 'Wound Dressing', description: 'Change and clean wound dressings', scheduledTime: '14:00', order: 10 }
    ];

    const templates = [];
    for (const tpl of predefinedTemplates) {
      const existing = await OwnerTask.findOne({ name: tpl.name, isTemplate: true, ownerId: null });
      if (!existing) {
        const template = new OwnerTask({
          ownerId: null, // Global template
          name: tpl.name,
          description: tpl.description,
          scheduledTime: tpl.scheduledTime,
          order: tpl.order,
          isTemplate: true,
          active: true
        });
        await template.save();
        templates.push(template);
      }
    }

    res.json({
      success: true,
      message: `${templates.length} templates created`,
      data: templates
    });
  } catch (error) {
    console.error('Error creating templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create templates',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/task-templates
 * @desc    Get all predefined task templates (Admin only)
 * @access  Admin
 */
router.get('/task-templates', async (req, res) => {
  try {
    const templates = await OwnerTask.find({ isTemplate: true, ownerId: null }).sort({ order: 1 });

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
 * @route   POST /api/admin/owners/:ownerId/tasks
 * @desc    Create a task for a specific owner (Admin only)
 * @access  Admin
 */
router.post(
  '/owners/:ownerId/tasks',
  [
    body('name').trim().notEmpty().withMessage('Task name is required'),
    body('description').optional().trim(),
    body('order').optional().isInt().withMessage('Order must be an integer'),
    body('scheduledTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('scheduledTime must be in HH:mm format'),
    body('fromTemplate').optional().isMongoId().withMessage('Invalid template ID')
  ],
  validate,
  async (req, res) => {
    try {
      const { ownerId } = req.params;
      const { name, description, order, scheduledTime, fromTemplate } = req.body;

      // Verify owner exists and role is owner
      const owner = await User.findById(ownerId);
      if (!owner || owner.role !== 'owner') {
        return res.status(404).json({ success: false, message: 'Owner not found' });
      }

      let taskData = {
        ownerId,
        name,
        description,
        order: order || 0,
        scheduledTime: scheduledTime || undefined,
        active: true,
        isTemplate: false
      };

      if (fromTemplate) {
        const template = await OwnerTask.findOne({ _id: fromTemplate, isTemplate: true, ownerId: null });
        if (template) {
          taskData.name = name || template.name;
          taskData.description = description || template.description;
          taskData.scheduledTime = scheduledTime || template.scheduledTime;
        }
      }

      const task = new OwnerTask(taskData);
      await task.save();

      res.status(201).json({ success: true, message: 'Task created successfully', data: task });
    } catch (error) {
      console.error('Error creating owner task:', error);
      res.status(500).json({ success: false, message: 'Failed to create task', error: error.message });
    }
  }
);

/**
 * @route   GET /api/admin/owners/:ownerId/tasks
 * @desc    Get tasks for a specific owner (Admin only)
 * @access  Admin
 */
router.get('/owners/:ownerId/tasks', async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { active } = req.query;

    const query = { ownerId };
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const tasks = await OwnerTask.find(query).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    console.error('Error fetching owner tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks', error: error.message });
  }
});

/**
 * @route   PUT /api/admin/owner-tasks/:id
 * @desc    Update an owner task (Admin only)
 * @access  Admin
 */
router.put(
  '/owner-tasks/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Task name cannot be empty'),
    body('description').optional().trim(),
    body('order').optional().isInt().withMessage('Order must be an integer'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean')
  ],
  validate,
  async (req, res) => {
    try {
      const task = await OwnerTask.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const { name, description, order, active } = req.body;
      if (name !== undefined) task.name = name;
      if (description !== undefined) task.description = description;
      if (order !== undefined) task.order = order;
      if (active !== undefined) task.active = active;

      task.updatedAt = new Date();
      await task.save();

      res.json({ success: true, message: 'Task updated successfully', data: task });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ success: false, message: 'Failed to update task', error: error.message });
    }
  }
);

/**
 * @route   DELETE /api/admin/owner-tasks/:id
 * @desc    Deactivate an owner task (Admin only)
 * @access  Admin
 */
router.delete('/owner-tasks/:id', async (req, res) => {
  try {
    const task = await OwnerTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.active = false;
    task.updatedAt = new Date();
    await task.save();

    res.json({ success: true, message: 'Task deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating task:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate task', error: error.message });
  }
});

/**
 * @route   POST /api/admin/owners/:ownerId/tasks/reorder
 * @desc    Reorder tasks for a specific owner (Admin only)
 * @access  Admin
 */
router.post(
  '/owners/:ownerId/tasks/reorder',
  [
    body('tasks')
      .isArray()
      .withMessage('Tasks must be an array')
      .custom((tasks) => tasks.every(t => t.id && typeof t.order === 'number'))
      .withMessage('Each task must have id and order')
  ],
  validate,
  async (req, res) => {
    try {
      const { ownerId } = req.params;
      const { tasks } = req.body;

      // Verify all tasks belong to the specified owner
      const taskIds = tasks.map(t => t.id);
      const ownerTasks = await OwnerTask.find({ _id: { $in: taskIds }, ownerId });
      if (ownerTasks.length !== taskIds.length) {
        return res.status(403).json({ success: false, message: 'Some tasks do not belong to this owner or do not exist' });
      }

      const updates = tasks.map(t =>
        OwnerTask.updateOne({ _id: t.id, ownerId }, { order: t.order, updatedAt: new Date() })
      );
      await Promise.all(updates);

      res.json({ success: true, message: 'Tasks reordered successfully' });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      res.status(500).json({ success: false, message: 'Failed to reorder tasks', error: error.message });
    }
  }
);

module.exports = router;
