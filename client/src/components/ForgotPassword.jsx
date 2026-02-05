import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(res.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Connection failed. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nielit-blue)', padding: '20px' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
        <img src="/nielit-logo.svg" alt="NIELIT" style={{ height: '70px', marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '10px' }}>Reset Your Password</h2>
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          Enter your registered email address and we'll send you a link to reset your password.
        </p>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#e8f5e9', border: '1px solid #4caf50', color: '#2e7d32', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
              <strong>Email Sent!</strong>
              <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                Check your inbox for a password reset link. The link will expire in 1 hour.
              </p>
            </div>
            <Link to="/" style={{ color: 'var(--nielit-blue)', textDecoration: 'none', fontWeight: 'bold' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your-email@example.com"
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-blue" disabled={loading} style={{ width: '100%', marginBottom: '10px' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
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
