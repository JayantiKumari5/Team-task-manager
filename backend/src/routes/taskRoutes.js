const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to check if user belongs to the team and has required role
const checkTeamAccess = (requiredRole) => {
  return async (req, res, next) => {
    const userProfile = req.userProfile;
    const teamId = req.body.teamId || req.query.teamId || req.params.teamId;

    if (!userProfile) return res.status(403).json({ error: 'User profile not found' });
    if (!teamId) return res.status(400).json({ error: 'Team ID is required' });

    // Superadmins have global access to all teams in their org
    if (userProfile.globalRole === 'superadmin') {
      const teamDoc = await db.collection('teams').doc(teamId).get();
      if (!teamDoc.exists || teamDoc.data().organizationId !== userProfile.organizationId) {
        return res.status(403).json({ error: 'Team not in your organization' });
      }
      return next();
    }

    if (userProfile.teamId !== teamId) {
      return res.status(403).json({ error: 'Access denied: You do not belong to this team' });
    }

    if (requiredRole === 'teamadmin' && userProfile.globalRole !== 'teamadmin') {
      return res.status(403).json({ error: 'Team Admin access required' });
    }

    next();
  };
};

// Create Task (Team Admin or Super Admin)
router.post('/', authMiddleware, checkTeamAccess('teamadmin'), async (req, res) => {
  const { title, description, teamId, assignedTo, dueDate } = req.body;

  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const taskRef = await db.collection('tasks').add({
      title,
      description: description || '',
      teamId,
      assignedTo: assignedTo || null,
      status: 'Todo',
      dueDate: dueDate || null,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ id: taskRef.id, title, status: 'Todo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Tasks for a Team
router.get('/team/:teamId', authMiddleware, checkTeamAccess('member'), async (req, res) => {
  const { teamId } = req.params;
  try {
    const tasksSnapshot = await db.collection('tasks').where('teamId', '==', teamId).get();
    const tasks = [];
    tasksSnapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Tasks Assigned to Current User
router.get('/user', authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  try {
    const tasksSnapshot = await db.collection('tasks').where('assignedTo', '==', userId).get();
    const tasks = [];
    tasksSnapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Task (Status/Assignment)
// Members can update status. Only admins can reassign.
router.patch('/:taskId', authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const { status, assignedTo, teamId } = req.body; 

  if (!teamId) return res.status(400).json({ error: 'Team ID is required' });

  try {
    const userProfile = req.userProfile;
    
    // Check access manually for more granular control
    if (userProfile.globalRole !== 'superadmin' && userProfile.teamId !== teamId) {
       return res.status(403).json({ error: 'Not in this team' });
    }

    const updates = {};
    if (status) updates.status = status;
    
    if (assignedTo !== undefined) {
      if (!['superadmin', 'teamadmin'].includes(userProfile.globalRole)) {
        return res.status(403).json({ error: 'Admin access required to reassign tasks' });
      }
      updates.assignedTo = assignedTo;
    }

    if (Object.keys(updates).length > 0) {
      await db.collection('tasks').doc(taskId).update(updates);
    }
    
    res.json({ message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Task (Admin only)
router.delete('/:taskId', authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const { teamId } = req.query; 

  if (!teamId) return res.status(400).json({ error: 'Team ID is required' });

  const userProfile = req.userProfile;
  if (!['superadmin', 'teamadmin'].includes(userProfile.globalRole)) {
    return res.status(403).json({ error: 'Admin access required to delete tasks' });
  }

  try {
    await db.collection('tasks').doc(taskId).delete();
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
