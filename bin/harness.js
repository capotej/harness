#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const workspace = process.cwd();
const image = 'capotej/harness';

const args = [
  'run',
  '--rm',
  '-it',
  '--cap-drop=ALL',
  '--cap-add=NET_RAW',
  '--security-opt', 'no-new-privileges:true',
  '-v', `${workspace}:/workspace`,
  '-w', '/workspace',
  image,
  'pi'
];

const docker = spawn('docker', args, { stdio: 'inherit' });

docker.on('exit', (code) => {
  process.exit(code);
});
