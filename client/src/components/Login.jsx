import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if this is a password recovery redirect
  useEffect(() => {
    const hash = location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      // Redirect to reset password page with the hash
      navigate('/reset-password' + hash);
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.ok) {
        localStorage.clear();
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        navigate(res.user.role === 'admin' ? '/admin' : res.user.role === 'teacher' ? '/teacher' : '/student');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nielit-blue)', padding: '20px' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: '450px', width: '100%' }}>
        <img src="/nielit-logo.svg" alt="NIELIT" style={{ height: '70px', marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '10px', color: '#003E8E' }}>Attendance Portal</h2>
        <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>Login to your account</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your-email@example.com"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-blue" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
          <Link
            to="/forgot-password"
            style={{
              color: '#d32f2f',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.color = '#b71c1c'}
            onMouseOut={(e) => e.target.style.color = '#d32f2f'}
          >
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}