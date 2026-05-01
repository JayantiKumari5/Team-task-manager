const { db, auth } = require('./src/config/firebase');

async function wipeDatabase() {
  console.log('Wiping database...');
  
  const collections = ['users', 'projects', 'tasks', 'organizations', 'teams'];
  
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.size === 0) continue;
    
    console.log(`Deleting ${snapshot.size} documents from ${collectionName}...`);
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
  
  console.log('Database wiped.');
  process.exit(0);
}

wipeDatabase().catch(console.error);
