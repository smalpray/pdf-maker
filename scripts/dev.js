const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const isWindows = process.platform === 'win32';

const services = [
  {
    name: 'Laravel API',
    url: 'http://127.0.0.1:8000/up',
    command: 'php',
    args: ['artisan', 'serve', '--host', '127.0.0.1', '--port', '8000'],
    cwd: backend,
  },
  {
    name: 'React frontend',
    url: 'http://127.0.0.1:5173',
    command: isWindows ? 'npm.cmd' : 'npm',
    args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'],
    cwd: frontend,
    shell: isWindows,
  },
];

function isRunning(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });

    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

async function main() {
  if (!fs.existsSync(path.join(backend, 'vendor', 'autoload.php'))) {
    throw new Error('Laravel dependencies are missing. Run: composer install --working-dir=backend');
  }

  if (!fs.existsSync(path.join(frontend, 'node_modules'))) {
    throw new Error('React dependencies are missing. Run: npm --prefix frontend install');
  }

  const states = await Promise.all(services.map(async (service) => ({
    service,
    running: await isRunning(service.url),
  })));
  const missing = states.filter(({ running }) => !running).map(({ service }) => service);

  states.filter(({ running }) => running).forEach(({ service }) => {
    console.log(`${service.name} is already running at ${service.url}`);
  });

  if (missing.length === 0) {
    return;
  }

  let stopping = false;
  const children = missing.map((service) => {
    console.log(`Starting ${service.name}...`);
    const child = spawn(service.command, service.args, {
      cwd: service.cwd,
      stdio: 'inherit',
      shell: service.shell || false,
    });

    child.on('error', (error) => {
      console.error(`Could not start ${service.name}: ${error.message}`);
      stop(1);
    });
    child.on('exit', (code) => {
      if (!stopping) {
        console.error(`${service.name} stopped${code ? ` with exit code ${code}` : ''}.`);
        stop(code || 1);
      }
    });

    return child;
  });

  function stop(code) {
    if (stopping) {
      return;
    }

    stopping = true;
    process.exitCode = code;
    children.forEach((child) => {
      if (child.exitCode === null) {
        child.kill();
      }
    });
  }

  process.on('SIGINT', () => stop(130));
  process.on('SIGTERM', () => stop(143));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
