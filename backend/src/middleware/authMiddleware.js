const { auth, db } = require('../config/firebase');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;

    // Fetch user profile from Firestore to enforce global status
    try {
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        req.userProfile = userDoc.data();
        
        // Enforce approval status for any routes except user auth/registration routes
        if (req.userProfile.status === 'pending' && !req.originalUrl.includes('/api/users')) {
          return res.status(403).json({ error: 'Account pending approval' });
        }
      } else if (req.user.email === 'admin@admin.com') {
         req.userProfile = { globalRole: 'superadmin', status: 'approved' };
      }
    } catch (dbError) {
      console.error('Error fetching user profile:', dbError);
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;
