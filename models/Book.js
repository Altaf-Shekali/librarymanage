const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a book title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  author: {
    type: String,
    required: [true, 'Please add an author'],
    trim: true,
    maxlength: [50, 'Author name cannot be more than 50 characters'],
  },
  isbn: {
    type: String,
    required: [true, 'Please add an ISBN'],
    unique: true,
    match: [/^(?:\d{9}[\dX]|\d{13})$/, 'Please add a valid ISBN'],
  },
  publisher: {
    type: String,
    required: [true, 'Please add a publisher'],
    trim: true,
    maxlength: [50, 'Publisher name cannot be more than 50 characters'],
  },
  publicationYear: {
    type: Number,
    required: [true, 'Please add publication year'],
    min: [1800, 'Publication year must be after 1800'],
    max: [new Date().getFullYear(), 'Publication year cannot be in the future'],
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'Fiction',
      'Non-Fiction',
      'Science',
      'Mathematics',
      'History',
      'Geography',
      'Literature',
      'Biography',
      'Reference',
      'Textbook',
      'Other'
    ],
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [50, 'Subject cannot be more than 50 characters'],
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  totalCopies: {
    type: Number,
    required: [true, 'Please add total number of copies'],
    min: [1, 'Total copies must be at least 1'],
  },
  availableCopies: {
    type: Number,
    required: [true, 'Please add available copies'],
    min: [0, 'Available copies cannot be negative'],
  },
  location: {
    shelf: {
      type: String,
      required: [true, 'Please add shelf location'],
    },
    section: {
      type: String,
      required: [true, 'Please add section'],
    },
  },
  language: {
    type: String,
    default: 'English',
  },
  pages: {
    type: Number,
    min: [1, 'Pages must be at least 1'],
  },
  condition: {
    type: String,
    enum: ['New', 'Good', 'Fair', 'Poor'],
    default: 'Good',
  },
  addedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});


// Pre-save middleware
BookSchema.pre('save', function(next) {
  // Validate that available copies doesn't exceed total copies
  if (this.availableCopies > this.totalCopies) {
    return next(new Error('Available copies cannot exceed total copies'));
  }
  
  next();
});


module.exports = mongoose.model('Book', BookSchema);
