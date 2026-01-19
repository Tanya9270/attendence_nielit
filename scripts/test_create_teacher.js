(async () => {
  try {
    const base = 'http://localhost:3000/api';
    const loginRes = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'nielit@123' })
    });
    const login = await loginRes.json();
    console.log('Login response:', login);
    if (!login.token) {
      console.error('Login failed; cannot proceed');
      process.exit(1);
    }

    const token = login.token;
    const createRes = await fetch(`${base}/admin/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ username: 'teacher2', password: 'pass123', course_code: 'JAI-002', course_name: 'AI II' })
    });
    const created = await createRes.json().catch(() => null);
    console.log('Create response status:', createRes.status);
    console.log('Create response body:', created);
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
})();
