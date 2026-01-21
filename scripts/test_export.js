async function run() {
  try {
    const base = 'http://localhost:3000';
    // login
    const loginRes = await fetch(base + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'nielit@123' })
    });
    const loginJson = await loginRes.json();
    console.log('Login response:', loginJson);
    if (!loginJson.ok) return;
    const token = loginJson.token;

    // list courses
    const coursesRes = await fetch(base + '/api/export/courses', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('/api/export/courses status', coursesRes.status);
    const coursesJson = await coursesRes.json();
    console.log('Courses:', coursesJson);

    // try daily csv using existing course
    const csvRes = await fetch(base + '/api/export/daily/csv?date=2026-01-20&course_code=JAI-001', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('/api/export/daily/csv status', csvRes.status);
    const csvText = await csvRes.text();
    console.log('CSV response (truncated):', csvText.slice(0, 500));

    // try daily pdf
    const pdfRes = await fetch(base + '/api/export/daily/pdf?date=2026-01-20&course_code=JAI-001', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('/api/export/daily/pdf status', pdfRes.status);
    const pdfHead = await pdfRes.arrayBuffer();
    console.log('PDF bytes length:', pdfHead.byteLength);
  } catch (err) {
    console.error('Test script error:', err);
  }
}

run();
