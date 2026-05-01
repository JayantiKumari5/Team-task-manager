const { db } = require('./src/config/firebase');

async function debugData() {
  console.log('--- USERS ---');
  const usersSnapshot = await db.collection('users').get();
  usersSnapshot.forEach(doc => {
    console.log(doc.id, '=>', JSON.stringify(doc.data(), null, 2));
  });

  console.log('\n--- TEAMS ---');
  const teamsSnapshot = await db.collection('teams').get();
  teamsSnapshot.forEach(doc => {
    console.log(doc.id, '=>', JSON.stringify(doc.data(), null, 2));
  });
  
  process.exit(0);
}

debugData();
