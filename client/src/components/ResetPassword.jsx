import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid or missing reset link. Please try again.');
    }
  }, [token, email]);

  const validatePassword = () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(email, token, password);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        if (res.error === 'token_expired') {
          setError('Reset link has expired. Please request a new one.');
        } else if (res.error === 'invalid_token') {
          setError('Invalid reset link. Please request a new one.');
        } else {
          setError(res.error || 'Failed to reset password');
        }
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nielit-blue)', padding: '20px' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
          <img src="/nielit-logo.svg" alt="NIELIT" style={{ height: '70px', marginBottom: '20px' }} />
          <div style={{ background: '#ffebee', border: '1px solid #f44336', color: '#c62828', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
            <strong>Invalid Link</strong>
            <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
              This password reset link is invalid or expired.
            </p>
          </div>
          <Link to="/forgot-password" style={{ color: 'var(--nielit-blue)', textDecoration: 'none', fontWeight: 'bold' }}>
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nielit-blue)', padding: '20px' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
        <img src="/nielit-logo.svg" alt="NIELIT" style={{ height: '70px', marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '10px' }}>Set New Password</h2>
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          Enter your new password below
        </p>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#e8f5e9', border: '1px solid #4caf50', color: '#2e7d32', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
              <strong>Password Reset Successfully!</strong>
              <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                You can now login with your new password. Redirecting...
              </p>
            </div>
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm password"
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-green" disabled={loading} style={{ width: '100%', marginBottom: '10px' }}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            <Link to="/" style={{ color: 'var(--nielit-blue)', textDecoration: 'none', fontSize: '14px' }}>
              ← Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
