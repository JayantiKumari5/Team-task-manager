const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');

// Create Team (SuperAdmin only)
router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body;
  const userProfile = req.userProfile;

  if (!name) return res.status(400).json({ error: 'Team name is required' });

  if (userProfile?.globalRole !== 'superadmin') {
    return res.status(403).json({ error: 'Only Super Admin can create teams' });
  }

  try {
    const teamRef = await db.collection('teams').add({
      name,
      organizationId: userProfile.organizationId,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ id: teamRef.id, name, organizationId: userProfile.organizationId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Teams for an Organization (Public for Signup)
router.get('/:orgId', async (req, res) => {
  const { orgId } = req.params;
  try {
    const snapshot = await db.collection('teams').where('organizationId', '==', orgId).get();
    const teams = [];
    snapshot.forEach(doc => teams.push({ id: doc.id, ...doc.data() }));
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
