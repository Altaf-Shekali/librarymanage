const express = require('express');
const { body, validationResult } = require('express-validator');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin/Librarian)
router.get('/', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    let query = Student.find({ status: 'active' });

    // Search functionality
    if (req.query.search) {
      query = query.find({
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
          { studentId: { $regex: req.query.search, $options: 'i' } },
        ],
      });
    }

    // Filter by class
    if (req.query.class) {
      query = query.find({ class: req.query.class });
    }

    // Filter by section
    if (req.query.section) {
      query = query.find({ section: req.query.section });
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('name');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Student.countDocuments({ status: 'active' });

    query = query.skip(startIndex).limit(limit);

    const students = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: students.length,
      total,
      pagination,
      data: students,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private (Admin/Librarian)
router.get('/:id', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new student
// @route   POST /api/students
// @access  Private (Admin/Librarian)
router.post('/', [
  protect,
  authorize('admin', 'librarian'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('class').notEmpty().withMessage('Class is required'),
  body('section').notEmpty().withMessage('Section is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('rollNumber').notEmpty().withMessage('Roll number is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('parentName').notEmpty().withMessage('Parent name is required'),
  body('parentPhone').notEmpty().withMessage('Parent phone is required'),
  body('dateOfBirth').notEmpty().withMessage('Date of birth is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const studentData = {
      ...req.body,
      addedBy: req.user.id,
    };

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [{ email: studentData.email }, { studentId: studentData.studentId }],
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student with this email or student ID already exists',
      });
    }

    const student = await Student.create(studentData);

    res.status(201).json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin/Librarian)
router.put('/:id', protect, authorize('admin', 'librarian'), [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please include a valid email'),
  body('studentId').optional().notEmpty().withMessage('Student ID cannot be empty'),
  body('class').optional().notEmpty().withMessage('Class cannot be empty'),
  body('section').optional().notEmpty().withMessage('Section cannot be empty'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    let student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Don't allow role change
    delete req.body.role;

    student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Soft delete - mark as inactive
    await Student.findByIdAndUpdate(req.params.id, { status: 'inactive' });

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get student statistics
// @route   GET /api/students/meta/stats
// @access  Private (Admin/Librarian)
router.get('/meta/stats', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    const totalStudents = await Student.countDocuments({ status: 'active' });
    const studentsByClass = await Student.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$class', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        studentsByClass,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
