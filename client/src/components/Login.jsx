import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgot = async () => {
    const mail = prompt("Enter your registered email:");
    if (mail) {
      const res = await api.forgotPassword(mail);
      alert(res.ok ? "Reset link sent to your email!" : "Error sending link.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.ok) {
        localStorage.clear();
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        navigate(res.user.role === 'admin' ? '/admin' : res.user.role === 'teacher' ? '/teacher' : '/student');
      } else { setError('Invalid email or password'); }
    } catch (err) { setError('Connection failed'); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nielit-blue)' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <img src="/nielit-logo.svg" alt="NIELIT" style={{ height: '70px', marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '20px' }}>Attendance Portal Login</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="form-group"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <button type="submit" className="btn btn-blue" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <button onClick={handleForgot} style={{ background: 'none', border: 'none', color: 'var(--nielit-blue)', marginTop: '15px', cursor: 'pointer', textDecoration: 'underline' }}>
          Forgot Password?
        </button>
      </div>
    </div>
  );
}