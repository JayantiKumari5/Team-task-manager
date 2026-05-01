const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');

// Search user by email (Public/Authenticated)
router.get('/search', authMiddleware, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email query parameter is required' });

  try {
    const userRecord = await auth.getUserByEmail(email);
    res.json({ 
      uid: userRecord.uid, 
      email: userRecord.email, 
      displayName: userRecord.displayName 
    });
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

// Register user to an Org/Team (Called during signup for Team Admins / Members)
router.post('/register', authMiddleware, async (req, res) => {
  const { globalRole, organizationId, teamId } = req.body; // 'teamadmin' or 'member'
  const userId = req.user.uid;
  const email = req.user.email || req.body.email;

  if (!['teamadmin', 'member'].includes(globalRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if (!organizationId || !teamId) {
    return res.status(400).json({ error: 'Organization and Team selection are required' });
  }

  try {
    await db.collection('users').doc(userId).set({
      email,
      globalRole,
      organizationId,
      teamId,
      status: 'pending', // Both require approval
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'User registered', status: 'pending', globalRole });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found. Please register.' });
    }

    res.json(userDoc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending users (SuperAdmin -> TeamAdmins, TeamAdmin -> Members)
router.get('/pending', authMiddleware, async (req, res) => {
  const userProfile = req.userProfile;
  if (!userProfile || !['superadmin', 'teamadmin'].includes(userProfile.globalRole)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    let query = db.collection('users')
      .where('status', '==', 'pending')
      .where('organizationId', '==', userProfile.organizationId);

    if (userProfile.globalRole === 'superadmin') {
      // SuperAdmin approves Team Admins
      query = query.where('globalRole', '==', 'teamadmin');
    } else if (userProfile.globalRole === 'teamadmin') {
      // TeamAdmin approves Members for their team
      query = query.where('globalRole', '==', 'member')
                   .where('teamId', '==', userProfile.teamId);
    }

    const pendingSnapshot = await query.get();
    const pendingUsers = [];
    pendingSnapshot.forEach(doc => {
      pendingUsers.push({ id: doc.id, ...doc.data() });
    });

    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve a user
router.patch('/:uid/approve', authMiddleware, async (req, res) => {
  const userProfile = req.userProfile;
  if (!userProfile || !['superadmin', 'teamadmin'].includes(userProfile.globalRole)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { uid } = req.params;

  try {
    // Validate hierarchy
    const targetDoc = await db.collection('users').doc(uid).get();
    if (!targetDoc.exists) return res.status(404).json({ error: 'User not found' });
    const targetUser = targetDoc.data();

    if (targetUser.organizationId !== userProfile.organizationId) {
       return res.status(403).json({ error: 'Cross-organization approval forbidden' });
    }

    if (userProfile.globalRole === 'teamadmin' && targetUser.globalRole !== 'member') {
      return res.status(403).json({ error: 'Team Admins can only approve members' });
    }
    if (userProfile.globalRole === 'teamadmin' && targetUser.teamId !== userProfile.teamId) {
      return res.status(403).json({ error: 'Cannot approve members for other teams' });
    }

    await db.collection('users').doc(uid).update({ status: 'approved' });
    res.json({ message: 'User approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject a user (Delete)
router.delete('/:uid/reject', authMiddleware, async (req, res) => {
  // Similar logic to approve
  const userProfile = req.userProfile;
  if (!userProfile || !['superadmin', 'teamadmin'].includes(userProfile.globalRole)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { uid } = req.params;

  try {
    const targetDoc = await db.collection('users').doc(uid).get();
    if (!targetDoc.exists) return res.status(404).json({ error: 'User not found' });
    const targetUser = targetDoc.data();

    if (targetUser.organizationId !== userProfile.organizationId) {
       return res.status(403).json({ error: 'Cross-organization rejection forbidden' });
    }
    if (userProfile.globalRole === 'teamadmin' && targetUser.globalRole !== 'member') {
      return res.status(403).json({ error: 'Team Admins can only reject members' });
    }
    if (userProfile.globalRole === 'teamadmin' && targetUser.teamId !== userProfile.teamId) {
      return res.status(403).json({ error: 'Cannot reject members for other teams' });
    }

    // Delete from Firestore
    await db.collection('users').doc(uid).delete();
    // Delete from Firebase Auth
    await auth.deleteUser(uid);
    
    res.json({ message: 'User rejected and deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team members
router.get('/team/:teamId', authMiddleware, async (req, res) => {
  const { teamId } = req.params;
  try {
    const snapshot = await db.collection('users')
      .where('teamId', '==', teamId)
      .where('status', '==', 'approved')
      .get();
    const members = [];
    snapshot.forEach(doc => members.push({ id: doc.id, email: doc.data().email, globalRole: doc.data().globalRole }));
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
