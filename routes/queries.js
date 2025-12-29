const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Query = require('../models/Query');
const { authenticate, authorize, isAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Create a query (Owner or Nurse)
router.post(
  '/',
  authenticate,
  authorize('owner', 'nurse'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('patientId').optional().isMongoId().withMessage('Invalid patientId'),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, message, patientId } = req.body;

      const query = new Query({
        title,
        message,
        category: req.user.role === 'owner' ? 'owner' : 'nurse',
        createdBy: req.user.userId,
        patientId: patientId || undefined,
        status: 'pending',
      });

      await query.save();

      res.status(201).json({
        success: true,
        message: 'Query created successfully',
        data: query,
      });
    } catch (error) {
      console.error('Error creating query:', error);
      res.status(500).json({ success: false, message: 'Failed to create query', error: error.message });
    }
  }
);

// Get my queries (Owner or Nurse)
router.get('/mine', authenticate, authorize('owner', 'nurse'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { createdBy: req.user.userId };
    if (status) filter.status = status;

    const queries = await Query.find(filter).populate('patientId', 'name').sort({ createdAt: -1 });

    res.json({ success: true, count: queries.length, data: queries });
  } catch (error) {
    console.error('Error fetching my queries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queries', error: error.message });
  }
});

// Admin: list all queries
router.get('/admin', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, category, userId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (userId) filter.createdBy = userId;

    const queries = await Query.find(filter)
      .populate('createdBy', 'name email role')
      .populate('patientId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: queries.length, data: queries });
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queries', error: error.message });
  }
});

// Admin: update status
router.patch(
  '/:id/status',
  authenticate,
  isAdmin,
  [body('status').isIn(['pending', 'resolved', 'priority']).withMessage('Invalid status')],
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const query = await Query.findById(id);
      if (!query) {
        return res.status(404).json({ success: false, message: 'Query not found' });
      }

      query.status = status;
      await query.save();

      res.json({ success: true, message: 'Status updated', data: query });
    } catch (error) {
      console.error('Error updating query status:', error);
      res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
    }
  }
);

// Delete my query (Owner or Nurse)
router.delete('/:id', authenticate, authorize('owner', 'nurse'), async (req, res) => {
  try {
    const { id } = req.params;
    const query = await Query.findOne({ _id: id, createdBy: req.user.userId });

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    await query.deleteOne();

    res.json({ success: true, message: 'Query deleted successfully' });
  } catch (error) {
    console.error('Error deleting query:', error);
    res.status(500).json({ success: false, message: 'Failed to delete query', error: error.message });
  }
});

module.exports = router;
