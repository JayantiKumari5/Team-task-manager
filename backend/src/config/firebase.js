const admin = require('firebase-admin');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    console.log('--- Initializing Firebase Admin via Environment Variable ---');
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error('FAILED to parse FIREBASE_SERVICE_ACCOUNT env var. Falling back to local file...');
    serviceAccount = require('./serviceAccountKey.json');
  }
} else {
  try {
    console.log('--- Initializing Firebase Admin via serviceAccountKey.json ---');
    serviceAccount = require('./serviceAccountKey.json');
  } catch (err) {
    console.error('CRITICAL: No Firebase credentials found (env var or JSON file).');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };