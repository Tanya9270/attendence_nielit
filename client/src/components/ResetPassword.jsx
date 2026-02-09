import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    // Check if we have a valid token in the URL
    const hash = location.hash;
    if (!hash.includes('type=recovery')) {
      setError('Invalid or expired reset link. Please request a new password reset.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate passwords
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // Update password using Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        if (updateError.message.includes('invalid') || updateError.message.includes('expired')) {
          setError('Reset link is invalid or expired. Please request a new password reset.');
        } else {
          setError(updateError.message || 'Failed to reset password');
        }
      } else {
        setSuccess('Password reset successfully! Redirecting to login...');
        setPassword('');
        setConfirmPassword('');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nielit-blue)', padding: '20px' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: '450px', width: '100%' }}>
        <img src="/nielit-logo.svg" alt="NIELIT" style={{ height: '70px', marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '10px', color: '#003E8E' }}>Reset Password</h2>
        <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>Enter your new password below</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              disabled={loading}
              minLength="6"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Retype your password"
              disabled={loading}
              minLength="6"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-blue"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#0066B3',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.color = '#004080'}
            onMouseOut={(e) => e.target.style.color = '#0066B3'}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
