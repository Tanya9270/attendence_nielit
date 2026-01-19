(async () => {
  try {
    // Allow self-signed HTTPS (Vite dev server)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const base = 'https://localhost:5173/api';
    console.log('Using base URL:', base);

    // Login via Vite proxy
    const loginRes = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'nielit@123' })
    });
    console.log('Login status:', loginRes.status);
    const loginBody = await loginRes.text();
    console.log('Login body:', loginBody);

    let token = null;
    try { token = JSON.parse(loginBody).token; } catch(e) {}
    if (!token) {
      console.error('No token received; aborting');
      process.exit(1);
    }

    const payload = { username: 'cheshta', password: 'teacher123', course_code: 'JAI-001', course_name: 'Overview of AI Technology' };
    console.log('Request payload:', payload);

    const createRes = await fetch(`${base}/admin/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    console.log('\nCreate request status:', createRes.status);
    const createText = await createRes.text();
    try { console.log('Create response JSON:', JSON.parse(createText)); } catch(e) { console.log('Create response text:', createText); }

    // Print response headers (selected)
    console.log('\nResponse headers:');
    for (const [k,v] of createRes.headers) {
      console.log(k + ': ' + v);
    }
  } catch (err) {
    console.error('Error during Vite-proxy test:', err);
    process.exit(1);
  }
})();
