import fs from 'fs';

const path = 'exports/monthly-2026-01-JAI-001.pdf';
if (!fs.existsSync(path)) {
  console.error('File not found:', path);
  process.exit(1);
}
const buf = fs.readFileSync(path);
console.log('size', buf.length);
const needle = Buffer.from('swati');
const idx = buf.indexOf(needle);
console.log('contains "swati"?', idx >= 0, 'at', idx);
