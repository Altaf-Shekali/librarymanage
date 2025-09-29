const { MongoClient } = require('mongodb');

async function dropTextIndex() {
  let client;
  
  try {
    // Try common MongoDB connection strings
    const possibleUris = [
      'mongodb://localhost:27017',
      'mongodb://127.0.0.1:27017'
    ];

    const possibleDbs = ['library-management', 'library'];

    let connected = false;
    let db;

    for (const uri of possibleUris) {
      for (const dbName of possibleDbs) {
        try {
          console.log(`Trying to connect to: ${uri}/${dbName}`);
          client = new MongoClient(uri);
          await client.connect();
          db = client.db(dbName);
          
          // Check if books collection exists
          const collections = await db.listCollections({ name: 'books' }).toArray();
          if (collections.length > 0) {
            console.log(`✅ Connected to MongoDB: ${uri}/${dbName}`);
            connected = true;
            break;
          } else {
            await client.close();
          }
        } catch (error) {
          console.log(`❌ Failed to connect to ${uri}/${dbName}`);
          if (client) {
            try { await client.close(); } catch (e) {}
          }
        }
      }
      if (connected) break;
    }

    if (!connected) {
      throw new Error('Could not connect to MongoDB or find books collection');
    }

    const booksCollection = db.collection('books');

    // List all indexes
    console.log('\n📋 Current indexes on books collection:');
    const indexes = await booksCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
    });

    // Find and drop text indexes
    const textIndexes = indexes.filter(index => 
      Object.values(index.key).includes('text')
    );

    if (textIndexes.length === 0) {
      console.log('\n✅ No text indexes found. The issue might be resolved.');
      return;
    }

    console.log(`\n🗑️  Found ${textIndexes.length} text index(es) to drop:`);
    
    for (const index of textIndexes) {
      try {
        console.log(`Dropping index: ${index.name}`);
        await booksCollection.dropIndex(index.name);
        console.log(`✅ Successfully dropped index: ${index.name}`);
      } catch (error) {
        console.log(`❌ Failed to drop index ${index.name}:`, error.message);
      }
    }

    // Verify indexes after dropping
    console.log('\n📋 Remaining indexes:');
    const remainingIndexes = await booksCollection.indexes();
    remainingIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n🎉 Text index cleanup completed!');
    console.log('You should now be able to update book languages without errors.');
    console.log('Please restart your backend server to ensure changes take effect.');

  } catch (error) {
    console.error('❌ Error dropping text index:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

dropTextIndex();
