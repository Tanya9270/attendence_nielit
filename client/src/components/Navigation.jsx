import { useNavigate } from 'react-router-dom';

export default function Navigation() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.email || user.username || 'User';
  const userRole = user.role || '-';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #003E8E, #0066B3)',
      color: 'white',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      flexWrap: 'wrap',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: 'white', fontWeight: '700' }}>NIELIT Attendance</h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '13px',
          color: 'white'
        }}>
          <strong style={{ color: 'white' }}>{userName}</strong>
          <span style={{ marginLeft: '8px', opacity: 0.85, color: 'white' }}>({userRole})</span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#d32f2f',
            color: 'white',
            border: 'none',
            padding: '8px 18px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            letterSpacing: '0.3px',
            transition: 'background 0.2s'
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
