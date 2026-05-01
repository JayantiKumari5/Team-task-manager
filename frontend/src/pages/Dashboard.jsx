import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout, Plus, Folder, LogOut, CheckCircle2, Clock, AlertCircle, ListTodo, Users, Building } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5001/api';

const Dashboard = () => {
  const { user, logout, userProfile, refreshProfile } = useAuth();
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [user, userProfile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch Tasks assigned to user
      const tasksRes = await axios.get(`${API_BASE}/tasks/user`, { headers });
      setTasks(tasksRes.data);

      // Fetch Teams (If SuperAdmin, fetch all teams in org. If others, maybe just their team)
      const teamsRes = await axios.get(`${API_BASE}/teams/${userProfile.organizationId}`, { headers });
      setTeams(teamsRes.data);

      // Fetch Pending Users (If SuperAdmin or TeamAdmin)
      if (['superadmin', 'teamadmin'].includes(userProfile.globalRole)) {
        const pendingRes = await axios.get(`${API_BASE}/users/pending`, { headers });
        setPendingUsers(pendingRes.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (uid) => {
    try {
      const token = await user.getIdToken();
      await axios.patch(`${API_BASE}/users/${uid}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(pendingUsers.filter(u => u.id !== uid));
    } catch (err) {
      console.error('Error approving user:', err);
    }
  };

  const handleReject = async (uid) => {
    if (!window.confirm('Are you sure you want to reject and delete this user?')) return;
    try {
      const token = await user.getIdToken();
      await axios.delete(`${API_BASE}/users/${uid}/reject`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(pendingUsers.filter(u => u.id !== uid));
    } catch (err) {
      console.error('Error rejecting user:', err);
    }
  };

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const token = await user.getIdToken();
      const res = await axios.post(`${API_BASE}/teams`, { name: teamName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams([...teams, res.data]);
      setShowTeamModal(false);
      setTeamName('');
    } catch (err) {
      console.error('Error creating team:', err);
    }
  };

  const todoCount = tasks.filter(t => t.status === 'Todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const doneCount = tasks.filter(t => t.status === 'Done').length;
  
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'Done' || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });

  if (loading && !userProfile) return <div style={{ padding: '40px' }}>Loading...</div>;

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '8px' }}>
            <Building size={20} />
            <span style={{ fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.875rem' }}>
              Organization Portal
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Welcome, {user.email.split('@')[0]}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Role: <span style={{ color: 'var(--text)', fontWeight: 'bold', textTransform: 'capitalize' }}>{userProfile?.globalRole}</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {userProfile?.globalRole === 'superadmin' && (
            <button onClick={() => setShowTeamModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} /> New Team
            </button>
          )}
          <button onClick={logout} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      {/* Approvals Section */}
      {pendingUsers.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
            <AlertCircle size={20} /> Pending Approvals
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {pendingUsers.map(u => (
              <div key={u.id} className="glass-card animate-in" style={{ padding: '16px', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{u.email}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                    Requesting to join as <span style={{ fontWeight: 'bold' }}>{u.globalRole === 'teamadmin' ? 'Team Admin' : 'Member'}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleApprove(u.id)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Approve</button>
                  <button onClick={() => handleReject(u.id)} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.875rem', borderColor: '#ef4444', color: '#ef4444' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Summary Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layout size={20} /> My Task Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div className="glass-card animate-in" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(148, 163, 184, 0.1)', padding: '12px', borderRadius: '12px' }}>
              <ListTodo color="#94a3b8" size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{todoCount}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Todo</p>
            </div>
          </div>
          <div className="glass-card animate-in" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px' }}>
              <Clock color="#3b82f6" size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{inProgressCount}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>In Progress</p>
            </div>
          </div>
          <div className="glass-card animate-in" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
              <CheckCircle2 color="#10b981" size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{doneCount}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Tasks Section */}
      {overdueTasks.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
            <AlertCircle size={20} /> Overdue Tasks
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {overdueTasks.map(task => (
              <div key={task.id} className="glass-card animate-in" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>{task.title}</h4>
                  <span style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 'bold' }}>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '8px' }}>{task.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams Section */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Users size={20} /> Organizations Teams
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {teams.map(team => (
          <div 
            key={team.id} 
            className="glass-card animate-in" 
            style={{ 
              padding: '24px', 
              cursor: (userProfile.globalRole === 'superadmin' || userProfile.teamId === team.id) ? 'pointer' : 'not-allowed', 
              opacity: (userProfile.globalRole === 'superadmin' || userProfile.teamId === team.id) ? 1 : 0.6,
              transition: 'transform 0.2s',
              border: userProfile.teamId === team.id ? '2px solid var(--primary)' : '1px solid transparent'
            }}
            onClick={() => {
              if (userProfile.globalRole === 'superadmin' || userProfile.teamId === team.id) {
                navigate(`/team/${team.id}`);
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '10px' }}>
                <Users color="var(--primary)" size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>{team.name}</h3>
              {userProfile.teamId === team.id && <span className="badge badge-done" style={{ marginLeft: 'auto' }}>My Team</span>}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Collaborate and manage tasks for the {team.name} department.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                View Team Board →
              </span>
            </div>
          </div>
        ))}
      </div>

      {showTeamModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
        }}>
          <div className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '24px' }}>Create New Team</h2>
            <form onSubmit={createTeam} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Team Name</label>
                <input 
                  className="input-field" 
                  value={teamName} 
                  onChange={(e) => setTeamName(e.target.value)} 
                  placeholder="e.g. Development, Design"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Team</button>
                <button type="button" onClick={() => setShowTeamModal(false)} style={{ flex: 1, background: 'var(--bg-card)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
