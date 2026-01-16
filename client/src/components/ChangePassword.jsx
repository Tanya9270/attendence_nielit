import { useState } from 'react';
import { api } from '../api';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.changePassword(token, oldPassword, newPassword);
      if (res.ok) {
        setMessage('Password changed successfully');
        setOldPassword('');
        setNewPassword('');
      } else {
        setMessage(res.error || 'Failed to change password');
      }
    } catch (err) {
      setMessage('Error changing password');
      console.error(err);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <div className="change-password">
      <h3>Change Password</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Old Password</label>
          <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
        </div>
        <div>
          <label>New Password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        </div>
        <button type="submit">Change Password</button>
      </form>
      {message && <div className="message">{message}</div>}
    </div>
  );
}
