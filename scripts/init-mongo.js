// MongoDB initialization script for Docker
db = db.getSiblingDB('library-management');

// Create collections
db.createCollection('users');
db.createCollection('books');
db.createCollection('transactions');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ studentId: 1 }, { unique: true, sparse: true });
db.books.createIndex({ isbn: 1 }, { unique: true });
db.books.createIndex({ title: "text", author: "text", subject: "text", description: "text" });
db.transactions.createIndex({ student: 1, status: 1 });
db.transactions.createIndex({ book: 1, status: 1 });
db.transactions.createIndex({ dueDate: 1, status: 1 });

print('Database initialized successfully!');
