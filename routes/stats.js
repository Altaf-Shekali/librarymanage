const express = require('express');
const Book = require('../models/Book');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get dashboard statistics
// @route   GET /api/stats/dashboard
// @access  Private (Admin/Librarian)
router.get('/dashboard', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    // Basic counts
    const totalBooks = await Book.countDocuments({ isActive: true });
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const activeTransactions = await Transaction.countDocuments({ status: 'active' });
    const overdueTransactions = await Transaction.countDocuments({ 
      status: 'active', 
      dueDate: { $lt: new Date() } 
    });

    // Available books count
    const availableBooks = await Book.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$availableCopies' } } }
    ]);

    // Books by category
    const booksByCategory = await Book.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTransactions = await Transaction.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Monthly transaction trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTransactions = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Most popular books (most issued)
    const popularBooks = await Transaction.aggregate([
      { $match: { type: 'issue' } },
      { $group: { _id: '$book', issueCount: { $sum: 1 } } },
      { $sort: { issueCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      { $unwind: '$bookDetails' },
      {
        $project: {
          title: '$bookDetails.title',
          author: '$bookDetails.author',
          issueCount: 1
        }
      }
    ]);

    // Active students (students with current books)
    const activeStudents = await Transaction.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$student' } },
      { $count: 'total' }
    ]);

    // Fine statistics
    const fineStats = await Transaction.aggregate([
      { $match: { 'fine.amount': { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalFines: { $sum: '$fine.amount' },
          paidFines: {
            $sum: {
              $cond: [{ $eq: ['$fine.paid', true] }, '$fine.amount', 0]
            }
          },
          unpaidFines: {
            $sum: {
              $cond: [{ $eq: ['$fine.paid', false] }, '$fine.amount', 0]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalBooks,
          totalStudents,
          activeTransactions,
          overdueTransactions,
          availableBooks: availableBooks[0]?.total || 0,
          activeStudents: activeStudents[0]?.total || 0,
          recentTransactions
        },
        booksByCategory,
        monthlyTransactions,
        popularBooks,
        fineStats: fineStats[0] || { totalFines: 0, paidFines: 0, unpaidFines: 0 }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get book statistics
// @route   GET /api/stats/books
// @access  Private (Admin/Librarian)
router.get('/books', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    // Total books and copies
    const bookStats = await Book.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalBooks: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' }
        }
      }
    ]);

    // Books by category with copy counts
    const categoryStats = await Book.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          bookCount: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' }
        }
      },
      { $sort: { bookCount: -1 } }
    ]);

    // Books by publication year
    const yearStats = await Book.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$publicationYear', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 10 }
    ]);

    // Books by condition
    const conditionStats = await Book.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$condition', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: bookStats[0] || { totalBooks: 0, totalCopies: 0, availableCopies: 0 },
        categoryStats,
        yearStats,
        conditionStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get student statistics
// @route   GET /api/stats/students
// @access  Private (Admin/Librarian)
router.get('/students', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    // Students by class
    const classStats = await User.aggregate([
      { $match: { role: 'student', isActive: true } },
      { $group: { _id: '$class', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Students by section
    const sectionStats = await User.aggregate([
      { $match: { role: 'student', isActive: true } },
      { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
      { $sort: { '_id.class': 1, '_id.section': 1 } }
    ]);

    // Active borrowers
    const activeBorrowers = await Transaction.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$student',
          activeBooks: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentDetails'
        }
      },
      { $unwind: '$studentDetails' },
      {
        $project: {
          name: '$studentDetails.name',
          studentId: '$studentDetails.studentId',
          class: '$studentDetails.class',
          section: '$studentDetails.section',
          activeBooks: 1
        }
      },
      { $sort: { activeBooks: -1 } },
      { $limit: 10 }
    ]);

    // Students with overdue books
    const overdueStudents = await Transaction.aggregate([
      { 
        $match: { 
          status: 'active', 
          dueDate: { $lt: new Date() } 
        } 
      },
      {
        $group: {
          _id: '$student',
          overdueBooks: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentDetails'
        }
      },
      { $unwind: '$studentDetails' },
      {
        $project: {
          name: '$studentDetails.name',
          studentId: '$studentDetails.studentId',
          class: '$studentDetails.class',
          section: '$studentDetails.section',
          overdueBooks: 1
        }
      },
      { $sort: { overdueBooks: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        classStats,
        sectionStats,
        activeBorrowers,
        overdueStudents
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get transaction statistics
// @route   GET /api/stats/transactions
// @access  Private (Admin/Librarian)
router.get('/transactions', protect, authorize('admin', 'librarian'), async (req, res, next) => {
  try {
    // Transaction counts by status
    const statusStats = await Transaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Daily transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTransactions = await Transaction.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          issues: {
            $sum: { $cond: [{ $eq: ['$type', 'issue'] }, 1, 0] }
          },
          returns: {
            $sum: { $cond: [{ $eq: ['$type', 'return'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Average loan duration
    const avgLoanDuration = await Transaction.aggregate([
      { 
        $match: { 
          status: 'returned',
          returnDate: { $exists: true },
          issueDate: { $exists: true }
        } 
      },
      {
        $project: {
          duration: {
            $divide: [
              { $subtract: ['$returnDate', '$issueDate'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusStats,
        dailyTransactions,
        avgLoanDuration: avgLoanDuration[0]?.avgDuration || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
