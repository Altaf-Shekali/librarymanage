const express = require('express');
const { body, validationResult } = require('express-validator');
const Book = require('../models/Book');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all books
// @route   GET /api/books
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    let query = Book.find({ isActive: true });

    // Search functionality
    if (req.query.search) {
      query = query.find({
        $or: [
          { title: { $regex: req.query.search, $options: 'i' } },
          { author: { $regex: req.query.search, $options: 'i' } },
          { isbn: { $regex: req.query.search, $options: 'i' } },
          { subject: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } }
        ]
      });
    }

    // Filter by category
    if (req.query.category) {
      query = query.find({ category: req.query.category });
    }

    // Filter by availability
    if (req.query.available === 'true') {
      query = query.find({ availableCopies: { $gt: 0 } });
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
    const total = await Book.countDocuments({ isActive: true });

    query = query.skip(startIndex).limit(limit).populate('addedBy', 'name');

    const books = await query;

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
      count: books.length,
      total,
      pagination,
      data: books,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).populate('addedBy', 'name');

    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new book
// @route   POST /api/books
// @access  Private (Admin/Librarian)
router.post('/', protect, authorize('admin', 'librarian'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('isbn').matches(/^(?:\d{9}[\dX]|\d{13})$/).withMessage('Please provide a valid ISBN'),
  body('publisher').notEmpty().withMessage('Publisher is required'),
  body('publicationYear').isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Invalid publication year'),
  body('category').isIn(['Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Geography', 'Literature', 'Biography', 'Reference', 'Textbook', 'Other']).withMessage('Invalid category'),
  body('totalCopies').isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  body('availableCopies').isInt({ min: 0 }).withMessage('Available copies cannot be negative'),
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

    // Add user to req.body
    req.body.addedBy = req.user.id;

    const book = await Book.create(req.body);

    res.status(201).json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private (Admin/Librarian)
router.put('/:id', protect, authorize('admin', 'librarian'), [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('author').optional().notEmpty().withMessage('Author cannot be empty'),
  body('isbn').optional().matches(/^(?:\d{9}[\dX]|\d{13})$/).withMessage('Please provide a valid ISBN'),
  body('publicationYear').optional().isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Invalid publication year'),
  body('totalCopies').optional().isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  body('availableCopies').optional().isInt({ min: 0 }).withMessage('Available copies cannot be negative'),
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

    let book = await Book.findById(req.params.id);

    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete book (soft delete)
// @route   DELETE /api/books/:id
// @access  Private (Admin/Librarian)
router.delete('/:id', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // Soft delete
    book.isActive = false;
    await book.save();

    res.status(200).json({
      success: true,
      message: 'Book deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get book categories
// @route   GET /api/books/categories
// @access  Public
router.get('/meta/categories', async (req, res, next) => {
  try {
    const categories = ['Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Geography', 'Literature', 'Biography', 'Reference', 'Textbook', 'Other'];
    
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
