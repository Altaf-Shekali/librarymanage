const express = require('express');
const { body, validationResult } = require('express-validator');
const Student = require('../models/Student');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private (Admin/Librarian)
router.get('/', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    let query = Transaction.find();

    // Filter by status
    if (req.query.status) {
      query = query.find({ status: req.query.status });
    }

    // Filter by student
    if (req.query.student) {
      query = query.find({ student: req.query.student });
    }

    // Filter by book
    if (req.query.book) {
      query = query.find({ book: req.query.book });
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query = query.find({
        createdAt: {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        },
      });
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Transaction.countDocuments();

    query = query
      .skip(startIndex)
      .limit(limit)
      .populate('book', 'title author isbn')
      .populate('student', 'name studentId class section')
      .populate('processedBy', 'name');

    const transactions = await query;

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
      count: transactions.length,
      total,
      pagination,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('book', 'title author isbn')
      .populate('student', 'name studentId class section')
      .populate('processedBy', 'name');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Students can only view their own transactions
    if (req.user.role === 'student' && transaction.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this transaction',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Issue a book
// @route   POST /api/transactions/issue
// @access  Private (Admin/Librarian)
router.post('/issue', protect, authorize('admin', 'librarian'), [
  body('bookId').notEmpty().withMessage('Book ID is required'),
  body('studentId').notEmpty().withMessage('Student ID is required'),
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

    const { bookId, studentId, notes } = req.body;

    // Check if book exists and is available
    const book = await Book.findById(bookId);
    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Book is not available for issue',
      });
    }

    // Check if student exists
    const student = await Student.findOne({ _id: studentId, status: 'active' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if student already has this book
    const existingTransaction = await Transaction.findOne({
      book: bookId,
      student: studentId,
      status: 'active',
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'Student already has this book issued',
      });
    }

    // Check student's active book limit
    const activeBooks = await Transaction.countDocuments({
      student: studentId,
      status: 'active',
    });

    if (activeBooks >= student.maxBooksAllowed) {
      return res.status(400).json({
        success: false,
        message: `Student has reached maximum book limit (${student.maxBooksAllowed} books)`,
      });
    }

    // Create transaction
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14); // 14 days loan period

    const transaction = await Transaction.create({
      book: bookId,
      student: studentId,
      type: 'issue',
      issueDate: issueDate,
      dueDate: dueDate,
      notes,
      processedBy: req.user.id,
    });

    // Update book availability
    book.availableCopies -= 1;
    await book.save();

    // Update student's current books issued count
    student.currentBooksIssued += 1;
    await student.save();

    // Populate transaction
    await transaction.populate('book', 'title author isbn');
    await transaction.populate('student', 'name studentId class section');
    await transaction.populate('processedBy', 'name');

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Return a book
// @route   POST /api/transactions/return
// @access  Private (Admin/Librarian)
router.post('/return', protect, authorize('admin', 'librarian'), [
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
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

    const { transactionId, notes } = req.body;

    // Find the active transaction
    const transaction = await Transaction.findOne({
      _id: transactionId,
      status: 'active',
    }).populate('book');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Active transaction not found',
      });
    }

    // Update transaction
    transaction.type = 'return';
    transaction.returnDate = new Date();
    transaction.status = 'returned';
    transaction.notes = notes || transaction.notes;

    // Calculate fine if overdue
    transaction.calculateFine();

    await transaction.save();

    // Update book availability
    const book = await Book.findById(transaction.book._id);
    book.availableCopies += 1;
    await book.save();

    // Update student's current books issued count
    const student = await Student.findById(transaction.student);
    if (student && student.currentBooksIssued > 0) {
      student.currentBooksIssued -= 1;
      await student.save();
    }

    // Populate transaction
    await transaction.populate('student', 'name studentId class section');
    await transaction.populate('processedBy', 'name');

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Renew a book
// @route   POST /api/transactions/renew
// @access  Private (Admin/Librarian)
router.post('/renew', protect, authorize('admin', 'librarian'), [
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
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

    const { transactionId } = req.body;

    // Find the active transaction
    const transaction = await Transaction.findOne({
      _id: transactionId,
      status: 'active',
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Active transaction not found',
      });
    }

    // Check renewal limit
    if (transaction.renewalCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum renewal limit reached',
      });
    }

    // Update transaction
    transaction.renewalCount += 1;
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + 14); // 14 days extension
    transaction.dueDate = newDueDate;

    await transaction.save();

    // Populate transaction
    await transaction.populate('book', 'title author isbn');
    await transaction.populate('student', 'name studentId class section');
    await transaction.populate('processedBy', 'name');

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get student's transactions
// @route   GET /api/transactions/student/:studentId
// @access  Private
router.get('/student/:studentId', protect, async (req, res, next) => {
  try {
    // Students can only view their own transactions
    if (req.user.role === 'student' && req.params.studentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access these transactions',
      });
    }

    const transactions = await Transaction.find({ student: req.params.studentId })
      .populate('book', 'title author isbn')
      .populate('processedBy', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get overdue transactions
// @route   GET /api/transactions/meta/overdue
// @access  Private (Admin/Librarian)
router.get('/meta/overdue', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    const overdueTransactions = await Transaction.find({
      status: 'active',
      dueDate: { $lt: new Date() },
    })
      .populate('book', 'title author isbn')
      .populate('student', 'name studentId class section')
      .sort('dueDate');

    // Update status to overdue and calculate fines
    for (let transaction of overdueTransactions) {
      transaction.checkOverdue();
      transaction.calculateFine();
      await transaction.save();
    }

    res.status(200).json({
      success: true,
      count: overdueTransactions.length,
      data: overdueTransactions,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
