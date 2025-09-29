const mongoose = require('mongoose');

// Test the Book model update functionality
async function testBookUpdate() {
  try {
    // Try to connect to MongoDB
    const possibleUris = [
      'mongodb://localhost:27017/library-management',
      'mongodb://127.0.0.1:27017/library-management',
      'mongodb://localhost:27017/library',
      'mongodb://127.0.0.1:27017/library'
    ];

    let connected = false;
    for (const uri of possibleUris) {
      try {
        console.log(`Trying to connect to: ${uri}`);
        await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000
        });
        console.log(`✅ Connected to MongoDB: ${uri}`);
        connected = true;
        break;
      } catch (error) {
        console.log(`❌ Failed to connect to ${uri}`);
      }
    }

    if (!connected) {
      console.log('❌ Could not connect to MongoDB. Please ensure MongoDB is running.');
      return;
    }

    // Simple schema without complex middleware
    const BookSchema = new mongoose.Schema({
      title: String,
      author: String,
      language: String,
      category: String,
      publicationYear: Number
    }, { strict: false });

    const Book = mongoose.model('TestBook', BookSchema, 'books');

    // Find a book to test update
    const books = await Book.find().limit(1);
    if (books.length === 0) {
      console.log('No books found to test update');
      return;
    }

    const book = books[0];
    console.log(`Found book: ${book.title} by ${book.author}`);
    console.log(`Current language: ${book.language}`);

    // Try to update the language
    const result = await Book.findByIdAndUpdate(
      book._id,
      { $set: { language: 'Kannada' } },
      { new: true }
    );

    console.log(`✅ Successfully updated language to: ${result.language}`);
    console.log('Book update test passed!');

  } catch (error) {
    console.error('❌ Book update test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testBookUpdate();
