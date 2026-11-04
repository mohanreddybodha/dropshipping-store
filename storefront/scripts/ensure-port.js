const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

function freePort() {
  try {
    const netstatOut = execSync('netstat -ano').toString();
    const lines = netstatOut.split('\n');
    const pids = new Set();

    for (const line of lines) {
      if (line.includes(`:${PORT} `) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && parseInt(pid, 10) > 0) {
          pids.add(pid);
        }
      }
    }

    for (const pid of pids) {
      if (parseInt(pid, 10) !== process.pid) {
        console.log(`[ensure-port] Freeing port ${PORT} from existing process PID ${pid}...`);
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`[ensure-port] Process ${pid} killed.`);
        } catch (e) {
          // Process might have exited
        }
      }
    }
  } catch (err) {
    // Netstat or taskkill error - ignore and let Next bind
  }
}

function cleanStaleBuild() {
  if (process.env.NODE_ENV === 'production') return;
  try {
    const dotNext = path.join(__dirname, '..', '.next');
    const buildIdFile = path.join(dotNext, 'BUILD_ID');
    const serverPages = path.join(dotNext, 'server', 'pages');
    // If .next contains production build artifacts or stale pages chunks, wipe it to prevent chunk collisions
    if (fs.existsSync(buildIdFile) || fs.existsSync(serverPages) || process.env.CLEAN_START === 'true') {
      console.log('[ensure-port] Resetting stale .next cache for clean development runtime...');
      try {
        fs.rmSync(dotNext, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (err) {
        if (process.platform === 'win32') {
          execSync(`powershell -Command "Remove-Item -Recurse -Force '${dotNext}' -ErrorAction SilentlyContinue"`);
        }
      }
    }
  } catch (e) {}
}

freePort();
cleanStaleBuild();
