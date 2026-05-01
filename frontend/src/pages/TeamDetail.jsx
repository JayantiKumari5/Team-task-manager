import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, ArrowLeft, CheckCircle2, Clock, ListTodo, Trash2, Calendar } from 'lucide-react';
import axios from 'axios';

import { API_BASE } from '../config';

const TeamDetail = () => {
  const { id } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  useEffect(() => {
    if (userProfile) {
      fetchTeamData();
    }
  }, [id, user, userProfile]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch ALL teams in org to find the correct one (handling casing typos in URL)
      const teamsRes = await axios.get(`${API_BASE}/teams/${userProfile.organizationId}`, { headers });
      const currentTeam = teamsRes.data.find(t => t.id.toLowerCase() === id.toLowerCase());
      
      if (!currentTeam) {
        setTeam(null);
        return;
      }

      setTeam(currentTeam);
      const realId = currentTeam.id; // Correct casing from DB

      // 2. Fetch Tasks and Members using the REAL ID
      const [taskRes, membersRes] = await Promise.all([
        axios.get(`${API_BASE}/tasks/team/${realId}`, { headers }),
        axios.get(`${API_BASE}/users/team/${realId}`, { headers })
      ]);

      setTasks(taskRes.data);
      setTeamMembers(membersRes.data);
    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const token = await user.getIdToken();
      const res = await axios.post(`${API_BASE}/tasks`, { 
        title: taskTitle, 
        description: taskDesc, 
        teamId: id,
        assignedTo: taskAssignee,
        dueDate: taskDueDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks([...tasks, res.data]);
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskDueDate('');
      fetchTeamData(); // Refresh to get the full task object
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = await user.getIdToken();
      await axios.patch(`${API_BASE}/tasks/${taskId}`, { 
        status: newStatus,
        teamId: id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const updateTaskAssignment = async (taskId, newAssignee) => {
    try {
      const token = await user.getIdToken();
      await axios.patch(`${API_BASE}/tasks/${taskId}`, { 
        assignedTo: newAssignee,
        teamId: id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, assignedTo: newAssignee } : t));
    } catch (err) {
      console.error('Error updating task assignment:', err);
      alert(err.response?.data?.error || 'Failed to reassign task');
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const token = await user.getIdToken();
      await axios.delete(`${API_BASE}/tasks/${taskId}?teamId=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  };

  if (loading && !team) return <div style={{ padding: '40px' }}>Loading Team Board...</div>;
  if (!team) return <div style={{ padding: '40px' }}>Team not found.</div>;

  const columns = [
    { title: 'Todo', icon: <ListTodo size={18} />, color: '#94a3b8' },
    { title: 'In Progress', icon: <Clock size={18} />, color: '#3b82f6' },
    { title: 'Done', icon: <CheckCircle2 size={18} />, color: '#10b981' }
  ];

  const canManage = ['superadmin', 'teamadmin'].includes(userProfile?.globalRole);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ 
        padding: '20px 40px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <ArrowLeft />
          </button>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>{team.name}</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team Board</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
             <Users size={18} color="var(--text-muted)" />
             <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
               {teamMembers.filter(m => m.status === 'approved').length} / {teamMembers.length} Members
             </span>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
              <Plus size={18} /> Add Task
            </button>
          )}
        </div>
      </nav>

      <div className="kanban-container" style={{ flex: 1, padding: '24px', display: 'flex', gap: '24px', overflowX: 'auto' }}>
        {columns.map(col => (
          <div key={col.title} className="kanban-column animate-in" style={{ 
            flex: 1, minWidth: '320px', background: 'var(--bg-card)', borderRadius: '16px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                {col.icon} {col.title}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem' }}>
                {tasks.filter(t => t.status === col.title).length}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              {tasks.filter(t => t.status === col.title).map(task => (
                <div key={task.id} className="glass-card animate-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>{task.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {canManage && (
                        <button 
                          onClick={() => deleteTask(task.id)}
                          style={{ background: 'transparent', color: '#ef4444', padding: '4px' }}
                          title="Delete Task"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{task.description}</p>
                  
                  <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</label>
                      <select 
                        style={{ background: 'transparent', color: 'var(--text)', border: 'none', fontSize: '0.75rem', outline: 'none', cursor: 'pointer', padding: 0 }}
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        disabled={!canManage && task.assignedTo !== user.uid}
                      >
                        <option value="Todo">Todo</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>

                    <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Assignee</label>
                      {canManage ? (
                        <select 
                          style={{ background: 'transparent', color: 'var(--text)', border: 'none', fontSize: '0.75rem', outline: 'none', cursor: 'pointer', padding: 0 }}
                          value={task.assignedTo || ''}
                          onChange={(e) => updateTaskAssignment(task.id, e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {teamMembers.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.email.split('@')[0]} {m.status === 'pending' ? '(Pending)' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.75rem' }}>
                          {teamMembers.find(m => m.id === task.assignedTo)?.email.split('@')[0] || 'Unassigned'}
                        </span>
                      )}
                    </div>
                  </div>

                  {task.dueDate && (
                    <div style={{ 
                      fontSize: '0.75rem',
                      color: (new Date(task.dueDate) < new Date() && task.status !== 'Done') ? '#ef4444' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      <Calendar size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showTaskModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
        }}>
          <div className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '24px' }}>Create New Task</h2>
            <form onSubmit={createTask} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Title</label>
                <input className="input-field" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Description</label>
                <textarea className="input-field" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} style={{ height: '100px', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Assign To</label>
                  <select className="input-field" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.email}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Due Date</label>
                  <input type="date" className="input-field" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Task</button>
                <button type="button" onClick={() => setShowTaskModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetail;
