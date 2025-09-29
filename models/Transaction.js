const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.ObjectId,
    ref: 'Book',
    required: [true, 'Please add a book'],
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'Student',
    required: [true, 'Please add a student'],
  },
  type: {
    type: String,
    enum: ['issue', 'return', 'renew'],
    required: [true, 'Please specify transaction type'],
  },
  issueDate: {
    type: Date,
    required: function() {
      return this.type === 'issue' || this.type === 'renew';
    },
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: function() {
      return this.type === 'issue' || this.type === 'renew';
    },
  },
  returnDate: {
    type: Date,
    required: function() {
      return this.type === 'return';
    },
  },
  status: {
    type: String,
    enum: ['active', 'returned', 'overdue', 'lost'],
    default: 'active',
  },
  fine: {
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Fine amount cannot be negative'],
    },
    reason: {
      type: String,
      enum: ['overdue', 'damage', 'lost', 'none'],
      default: 'none',
    },
    paid: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
    },
  },
  renewalCount: {
    type: Number,
    default: 0,
    max: [3, 'Maximum 3 renewals allowed'],
  },
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot be more than 200 characters'],
  },
  processedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Calculate due date (14 days from issue date)
TransactionSchema.pre('save', function(next) {
  if (this.type === 'issue' || this.type === 'renew') {
    if (!this.dueDate) {
      const dueDate = new Date(this.issueDate);
      dueDate.setDate(dueDate.getDate() + 14); // 14 days loan period
      this.dueDate = dueDate;
    }
  }
  next();
});

// Check for overdue status
TransactionSchema.methods.checkOverdue = function() {
  if (this.status === 'active' && new Date() > this.dueDate) {
    this.status = 'overdue';
    return true;
  }
  return false;
};

// Calculate fine for overdue books
TransactionSchema.methods.calculateFine = function() {
  if (this.status === 'overdue' || this.status === 'returned') {
    const currentDate = this.returnDate || new Date();
    const overdueDays = Math.ceil((currentDate - this.dueDate) / (1000 * 60 * 60 * 24));
    
    if (overdueDays > 0) {
      this.fine.amount = overdueDays * 2; // $2 per day fine
      this.fine.reason = 'overdue';
    }
  }
  return this.fine.amount;
};

// Index for efficient queries
TransactionSchema.index({ student: 1, status: 1 });
TransactionSchema.index({ book: 1, status: 1 });
TransactionSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
