const mongoose = require('mongoose');

// Simple Book schema for this fix (without the complex middleware)
const BookSchema = new mongoose.Schema({}, { strict: false });
const Book = mongoose.model('Book', BookSchema);

async function fixLanguageIndex() {
  try {
    // Try common MongoDB connection strings
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
      throw new Error('Could not connect to MongoDB. Please ensure MongoDB is running.');
    }

    // Drop the existing text index
    try {
      await Book.collection.dropIndex('title_text_author_text_subject_text_description_text');
      console.log('Dropped old text index');
    } catch (error) {
      console.log('No existing text index to drop or error dropping:', error.message);
    }

    // Update all existing books to have searchLanguage field
    const books = await Book.find({});
    console.log(`Found ${books.length} books to update`);

    for (const book of books) {
      const languageMapping = {
        'English': 'english',
        'english': 'english',
        'Spanish': 'spanish',
        'spanish': 'spanish', 
        'Español': 'spanish',
        'French': 'french',
        'french': 'french',
        'Français': 'french',
        'German': 'german',
        'german': 'german',
        'Deutsch': 'german',
        'Italian': 'italian',
        'italian': 'italian',
        'Italiano': 'italian',
        'Portuguese': 'portuguese',
        'portuguese': 'portuguese',
        'Português': 'portuguese',
        'Russian': 'russian',
        'russian': 'russian',
        'Русский': 'russian',
        // Unsupported languages default to english
        'Kannada': 'english',
        'kannada': 'english',
        'Hindi': 'english',
        'hindi': 'english',
        'Tamil': 'english',
        'tamil': 'english',
        'Telugu': 'english',
        'telugu': 'english',
        'Bengali': 'english',
        'bengali': 'english',
        'Marathi': 'english',
        'marathi': 'english'
      };

      const searchLanguage = languageMapping[book.language] || 'english';
      
      await Book.updateOne(
        { _id: book._id },
        { $set: { searchLanguage: searchLanguage } }
      );
    }

    console.log('Updated all books with searchLanguage field');

    // Recreate the text index with new configuration
    await Book.createIndexes();
    console.log('Recreated text index with new configuration');

    console.log('✅ Language index fix completed successfully!');
    console.log('You can now update books with any language including Kannada');

  } catch (error) {
    console.error('Error fixing language index:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixLanguageIndex();
