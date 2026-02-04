import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login for:', username);
      const result = await api.login(username, password);
      console.log('Login result:', result);

      if (result.ok) {
        // Clear old data first to avoid session mixing
        localStorage.clear();
        
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));

        // UPDATED REDIRECTION LOGIC
        // We now separate admin, teacher, and student to their own specific portals
        if (result.user.role === 'admin') {
          navigate('/admin');
        } else if (result.user.role === 'teacher') {
          navigate('/teacher');
        } else if (result.user.role === 'student') {
          navigate('/student');
        }
      } else {
        setError(result.error === 'invalid_credentials' ? 'Invalid username or password' : 'Login failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed: ' + (err.message || 'Network error. Check your connection.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)'
    }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', margin: '20px', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img 
            src="/nielit-logo.svg" 
            alt="NIELIT Logo" 
            style={{ height: '70px', marginBottom: '15px' }}
          />
        </div>
        
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '8px', 
          color: '#0066B3',
          fontSize: '24px',
          fontWeight: '700'
        }}>
          QR Attendance System
        </h1>
        <p style={{ 
          textAlign: 'center', 
          marginBottom: '25px', 
          color: '#666',
          fontSize: '14px'
        }}>
          National Institute of Electronics & Information Technology
        </p>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ color: '#0066B3', fontWeight: '600' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
              style={{ borderRadius: '8px', padding: '12px' }}
            />
          </div>

          <div className="form-group">
            <label style={{ color: '#0066B3', fontWeight: '600' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{ borderRadius: '8px', padding: '12px' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              marginTop: '15px', 
              padding: '14px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600'
            }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ 
          textAlign: 'center', 
          marginTop: '20px', 
          fontSize: '11px', 
          color: '#999' 
        }}>
          © 2025 NIELIT. All rights reserved.
        </p>
      </div>
    </div>
  );
}