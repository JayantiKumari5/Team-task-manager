import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Building2, Users2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5001/api';

const Signup = () => {
  const [mode, setMode] = useState('create'); // 'create' or 'join'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [globalRole, setGlobalRole] = useState('member'); // 'teamadmin' or 'member'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    if (mode === 'join') {
      fetchOrganizations();
    }
  }, [mode]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchTeams(selectedOrgId);
    } else {
      setTeams([]);
      setSelectedTeamId('');
    }
  }, [selectedOrgId]);

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/organizations`);
      setOrganizations(res.data);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchTeams = async (orgId) => {
    try {
      const res = await axios.get(`${API_BASE}/teams/${orgId}`);
      setTeams(res.data);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (mode === 'join' && (!selectedOrgId || !selectedTeamId)) {
        throw new Error('Please select an organization and a team');
      }
      if (mode === 'create' && !orgName) {
        throw new Error('Please provide an organization name');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      if (mode === 'create') {
        // Create Organization path
        await axios.post(`${API_BASE}/organizations`, { name: orgName }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Join Organization path
        await axios.post(`${API_BASE}/users/register`, { 
          globalRole, 
          organizationId: selectedOrgId, 
          teamId: selectedTeamId,
          email 
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      await refreshProfile();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '500px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            background: 'var(--primary)', 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <UserPlus color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)' }}>Get started with Team Task Manager</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <button 
            onClick={() => setMode('create')}
            className={mode === 'create' ? 'btn-primary' : 'btn-outline'}
            style={{ flex: 1, fontSize: '0.875rem' }}
          >
            Create Org
          </button>
          <button 
            onClick={() => setMode('join')}
            className={mode === 'join' ? 'btn-primary' : 'btn-outline'}
            style={{ flex: 1, fontSize: '0.875rem' }}
          >
            Join Org
          </button>
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {mode === 'create' ? (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Organization Name</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ paddingLeft: '40px' }}
                  value={orgName} 
                  onChange={(e) => setOrgName(e.target.value)} 
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Select Organization</label>
                <select 
                  className="input-field" 
                  value={selectedOrgId} 
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Organization --</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Select Team</label>
                <select 
                  className="input-field" 
                  value={selectedTeamId} 
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  required
                  disabled={!selectedOrgId}
                >
                  <option value="">-- Choose Team --</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                {!selectedOrgId && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Select an organization first</p>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Join As</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="member" 
                      checked={globalRole === 'member'} 
                      onChange={() => setGlobalRole('member')}
                    />
                    Team Member
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="teamadmin" 
                      checked={globalRole === 'teamadmin'} 
                      onChange={() => setGlobalRole('teamadmin')}
                    />
                    Team Admin
                  </label>
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="name@company.com"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Min. 6 characters"
              required
            />
          </div>
          
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : (mode === 'create' ? 'Create Organization' : 'Request to Join')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
