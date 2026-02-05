import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navigation() {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.username || 'User';
  const userRole = user.role || '-';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <nav style={{
      background: 'var(--nielit-blue)',
      color: 'white',
      padding: '15px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>NIELIT Attendance</h3>
      </div>

      {/* Desktop Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '5px' }}>
            <strong>{userName}</strong>
            <span style={{ marginLeft: '8px', opacity: 0.8 }}>({userRole})</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#d32f2f',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'background 0.3s'
          }}
          onMouseOver={(e) => e.target.style.background = '#b71c1c'}
          onMouseOut={(e) => e.target.style.background = '#d32f2f'}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
