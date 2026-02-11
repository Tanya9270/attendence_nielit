import fs from 'fs';

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
    if (!loginJson.ok) {
      console.error('Login failed', loginJson);
      return;
    }
    const token = loginJson.token;

    // Use today's date instead of hardcoded date
    const today = new Date();
    const date = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const course = 'JAO-001'; // Match your actual course code
    
    const url = `${base}/api/export/daily/pdf?date=${date}&course_code=${course}&_t=${Date.now()}`;
    const res = await fetch(url, { 
      headers: { 
        Authorization: 'Bearer ' + token,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      } 
    });
    if (!res.ok) {
      console.error('Export request failed', res.status);
      const txt = await res.text();
      console.error(txt);
      return;
    }
    const arr = await res.arrayBuffer();
    const buf = Buffer.from(arr);
    if (!fs.existsSync('exports')) fs.mkdirSync('exports');
    const outPath = `exports/daily-${date}-${course}.pdf`;
    fs.writeFileSync(outPath, buf);
    console.log('Saved PDF to', outPath, 'size:', buf.length);

    // quick binary-inspection: header + search for title bytes
    const header = buf.slice(0, 8).toString('latin1');
    console.log('Header bytes:', header);
    const str = buf.toString('latin1');
    const found = str.indexOf('NIELIT');
    if (found >= 0) console.log('Found text "NIELIT" at byte', found);
    else console.log('Did not find plaintext "NIELIT" in raw PDF bytes (may be compressed).');
  } catch (err) {
    console.error('save_pdf error', err);
  }
}

run();
