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
  try {
    const dotNext = path.join(__dirname, '..', '.next');
    if (process.env.CLEAN_START === 'true' || fs.existsSync(path.join(dotNext, 'BUILD_ID'))) {
      console.log('[ensure-port] Purging .next build cache for clean startup...');
      if (fs.existsSync(dotNext)) {
        for (const file of fs.readdirSync(dotNext)) {
          fs.rmSync(path.join(dotNext, file), { recursive: true, force: true });
        }
      }
    }
  } catch (e) {}
}

freePort();
cleanStaleBuild();
try {
  const dotNext = path.join(__dirname, '..', '.next');
  if (process.platform === 'win32' && fs.existsSync(dotNext)) {
    execSync(`attrib +U -P "${dotNext}"`);
  }
} catch (e) {}
