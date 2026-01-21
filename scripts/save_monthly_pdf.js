import fs from 'fs';

async function run() {
  try {
    const base = 'http://localhost:3000';
    const loginRes = await fetch(base + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'nielit@123' })
    });
    const loginJson = await loginRes.json();
    if (!loginJson.ok) { console.error('Login failed', loginJson); return; }
    const token = loginJson.token;

    const month = '1';
    const year = '2026';
    const course = 'JAI-001';
    const url = `${base}/api/export/monthly/pdf?month=${month}&year=${year}&course_code=${course}`;
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) { console.error('Export failed', res.status); console.error(await res.text()); return; }
    const arr = await res.arrayBuffer();
    const buf = Buffer.from(arr);
    if (!fs.existsSync('exports')) fs.mkdirSync('exports');
    const out = `exports/monthly-2026-01-JAI-001.pdf`;
    fs.writeFileSync(out, buf);
    console.log('Saved monthly PDF to', out, 'size:', buf.length);
  } catch (err) { console.error('save_monthly_pdf error', err); }
}

run();
