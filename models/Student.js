const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add student name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters'],
  },
  studentId: {
    type: String,
    required: [true, 'Please add student ID'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add student email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
    match: [/^\d{10}$/, 'Please add a valid 10-digit phone number'],
  },
  class: {
    type: String,
    required: [true, 'Please add class'],
    trim: true,
  },
  section: {
    type: String,
    required: [true, 'Please add section'],
    trim: true,
  },
  rollNumber: {
    type: String,
    required: [true, 'Please add roll number'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Please add address'],
    trim: true,
  },
  parentName: {
    type: String,
    required: [true, 'Please add parent/guardian name'],
    trim: true,
  },
  parentPhone: {
    type: String,
    required: [true, 'Please add parent/guardian phone'],
    match: [/^\d{10}$/, 'Please add a valid 10-digit phone number'],
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Please add date of birth'],
  },
  admissionDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated'],
    default: 'active',
  },
  libraryCardNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  maxBooksAllowed: {
    type: Number,
    default: 3,
  },
  currentBooksIssued: {
    type: Number,
    default: 0,
  },
  totalFines: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
  addedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate library card number before saving
StudentSchema.pre('save', function(next) {
  if (!this.libraryCardNumber) {
    // Generate library card number: LIB + year + 4-digit sequence
    const year = new Date().getFullYear();
    const sequence = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    this.libraryCardNumber = `LIB${year}${sequence}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better performance
StudentSchema.index({ studentId: 1 });
StudentSchema.index({ email: 1 });
StudentSchema.index({ libraryCardNumber: 1 });
StudentSchema.index({ class: 1, section: 1 });
StudentSchema.index({ status: 1 });

module.exports = mongoose.model('Student', StudentSchema);
