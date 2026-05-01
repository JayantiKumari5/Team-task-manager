const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');

// Create Organization (User becomes Super Admin)
router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.uid;

  if (!name) return res.status(400).json({ error: 'Organization name is required' });

  try {
    const orgRef = await db.collection('organizations').add({
      name,
      superAdminUid: userId,
      createdAt: new Date().toISOString()
    });

    // Update user to superadmin of this org
    await db.collection('users').doc(userId).set({
      email: req.user.email,
      organizationId: orgRef.id,
      globalRole: 'superadmin',
      status: 'approved',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ id: orgRef.id, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Organizations (Public for Signup)
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('organizations').get();
    const orgs = [];
    snapshot.forEach(doc => orgs.push({ id: doc.id, name: doc.data().name }));
    res.json(orgs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
