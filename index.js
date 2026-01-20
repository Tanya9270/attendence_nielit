// Delegate to the server entry under `server/` so the root start command
// (`node index.js`) runs the full backend (with admin routes).
import './server/index.js';

console.log('Entrypoint: delegated to server/index.js');
