const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Student = require('../models/Student');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Sample staff users data
const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@library.com',
    password: 'password123',
    role: 'admin',
  },
  {
    name: 'Librarian',
    email: 'librarian@library.com',
    password: 'password123',
    role: 'librarian',
  },
];

// Sample students data (no login credentials)
const sampleStudents = [
  {
    name: 'Alice Johnson',
    email: 'alice@student.com',
    studentId: 'STU001',
    class: '10th',
    section: 'A',
    rollNumber: '001',
    phone: '9876543210',
    address: '123 Main St, City',
    parentName: 'John Johnson',
    parentPhone: '9876543200',
    dateOfBirth: new Date('2008-05-15'),
  },
  {
    name: 'Bob Smith',
    email: 'bob@student.com',
    studentId: 'STU002',
    class: '11th',
    section: 'B',
    rollNumber: '002',
    phone: '9876543211',
    address: '456 Oak Ave, City',
    parentName: 'Mike Smith',
    parentPhone: '9876543201',
    dateOfBirth: new Date('2007-08-22'),
  },
  {
    name: 'Carol Davis',
    email: 'carol@student.com',
    studentId: 'STU003',
    class: '12th',
    section: 'A',
    rollNumber: '003',
    phone: '9876543212',
    address: '789 Pine Rd, City',
    parentName: 'Sarah Davis',
    parentPhone: '9876543202',
    dateOfBirth: new Date('2006-12-10'),
  },
];

const sampleBooks = [
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '9780061120084',
    publisher: 'Harper Perennial',
    publicationYear: 1960,
    category: 'Literature',
    subject: 'American Literature',
    description: 'A classic novel about racial injustice and childhood in the American South.',
    totalCopies: 5,
    availableCopies: 3,
    location: { shelf: 'A1', section: 'Fiction' },
    language: 'English',
    pages: 376,
    condition: 'Good'
  },
  {
    title: '1984',
    author: 'George Orwell',
    isbn: '9780451524935',
    publisher: 'Signet Classics',
    publicationYear: 1949,
    category: 'Fiction',
    subject: 'Dystopian Fiction',
    description: 'A dystopian social science fiction novel about totalitarian control.',
    totalCopies: 4,
    availableCopies: 2,
    location: { shelf: 'A2', section: 'Fiction' },
    language: 'English',
    pages: 328,
    condition: 'Good'
  },
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '9780743273565',
    publisher: 'Scribner',
    publicationYear: 1925,
    category: 'Literature',
    subject: 'American Literature',
    description: 'A classic American novel set in the Jazz Age.',
    totalCopies: 6,
    availableCopies: 4,
    location: { shelf: 'A3', section: 'Fiction' },
    language: 'English',
    pages: 180,
    condition: 'Good'
  },
  {
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '9780262033848',
    publisher: 'MIT Press',
    publicationYear: 2009,
    category: 'Textbook',
    subject: 'Computer Science',
    description: 'Comprehensive textbook on algorithms and data structures.',
    totalCopies: 3,
    availableCopies: 2,
    location: { shelf: 'B1', section: 'Science' },
    language: 'English',
    pages: 1312,
    condition: 'New'
  },
  {
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    isbn: '9780553380163',
    publisher: 'Bantam',
    publicationYear: 1988,
    category: 'Science',
    subject: 'Physics',
    description: 'Popular science book about cosmology and the universe.',
    totalCopies: 4,
    availableCopies: 3,
    location: { shelf: 'B2', section: 'Science' },
    language: 'English',
    pages: 256,
    condition: 'Good'
  },
  {
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    isbn: '9780316769174',
    publisher: 'Little, Brown and Company',
    publicationYear: 1951,
    category: 'Literature',
    subject: 'American Literature',
    description: 'Coming-of-age novel about teenage rebellion and alienation.',
    totalCopies: 5,
    availableCopies: 3,
    location: { shelf: 'A4', section: 'Fiction' },
    language: 'English',
    pages: 277,
    condition: 'Fair'
  },
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    isbn: '9780141439518',
    publisher: 'Penguin Classics',
    publicationYear: 1813,
    category: 'Literature',
    subject: 'English Literature',
    description: 'Classic romance novel about manners and marriage in Georgian England.',
    totalCopies: 4,
    availableCopies: 2,
    location: { shelf: 'A5', section: 'Fiction' },
    language: 'English',
    pages: 432,
    condition: 'Good'
  },
  {
    title: 'The Art of War',
    author: 'Sun Tzu',
    isbn: '9781599869773',
    publisher: 'Filiquarian Publishing',
    publicationYear: 2006,
    category: 'History',
    subject: 'Military Strategy',
    description: 'Ancient Chinese military treatise on strategy and tactics.',
    totalCopies: 3,
    availableCopies: 3,
    location: { shelf: 'C1', section: 'History' },
    language: 'English',
    pages: 273,
    condition: 'New'
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Book.deleteMany({});
    await Transaction.deleteMany({});

    // Create staff users
    console.log('Creating staff users...');
    const adminUser = await User.create(sampleUsers[0]);
    const librarianUser = await User.create(sampleUsers[1]);
    
    // Create students (no login credentials)
    console.log('Creating students...');
    const students = [];
    for (const studentData of sampleStudents) {
      const student = await Student.create({
        ...studentData,
        addedBy: adminUser._id,
      });
      students.push(student);
    }

    // Create books
    console.log('Creating books...');
    const books = [];
    for (const bookData of sampleBooks) {
      const book = await Book.create({
        ...bookData,
        addedBy: adminUser._id
      });
      books.push(book);
    }

    // Create some sample transactions
    console.log('Creating sample transactions...');
    
    // Issue some books to students
    const transactions = [
      {
        book: books[0]._id, // To Kill a Mockingbird
        student: students[0]._id, // Alice
        type: 'issue',
        issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        dueDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // Due in 9 days (14 days from issue)
        status: 'active',
        processedBy: librarianUser._id
      },
      {
        book: books[1]._id, // 1984
        student: students[1]._id, // Bob
        type: 'issue',
        issueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // Due in 4 days (14 days from issue)
        status: 'active',
        processedBy: librarianUser._id
      },
      {
        book: books[2]._id, // The Great Gatsby
        student: students[2]._id, // Carol
        type: 'issue',
        issueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // Was due 6 days ago
        returnDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Returned 2 days ago
        status: 'returned',
        processedBy: librarianUser._id
      }
    ];

    for (const transactionData of transactions) {
      const transaction = await Transaction.create(transactionData);
      
      // Update book availability for active transactions
      if (transaction.status === 'active') {
        await Book.findByIdAndUpdate(
          transaction.book,
          { $inc: { availableCopies: -1 } }
        );
      }
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n📚 Sample Data Created:');
    console.log(`- ${sampleUsers.length} staff users (1 admin, 1 librarian)`);
    console.log(`- ${students.length} student records`);
    console.log(`- ${sampleBooks.length} books`);
    console.log(`- ${transactions.length} transactions`);
    
    console.log('\n🔑 Staff Login Credentials:');
    console.log('Admin: admin@library.com / password123');
    console.log('Librarian: librarian@library.com / password123');
    console.log('\n📋 Note: Students don\'t have login access - managed by librarians');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

// Run the seeder
seedDatabase();
