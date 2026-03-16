#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const workspace = process.cwd();
const image = 'capotej/harness';

const args = [
  'run',
  '--rm',
  '-it',
  '-v', `${workspace}:/workspace`,
  '-w', '/workspace',
  image,
  '/bin/bash'
];

const docker = spawn('docker', args, { stdio: 'inherit' });

docker.on('exit', (code) => {
  process.exit(code);
});
