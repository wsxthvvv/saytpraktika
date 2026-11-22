const { spawn } = require('child_process');

const command = process.platform === 'win32' ? 'react-scripts.cmd' : 'react-scripts';
const child = spawn(command, ['start'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: process.env.FRONTEND_PORT || '3000' },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
