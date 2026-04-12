#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const workspace = process.cwd();
const image = 'capotej/harness';

const shMode = process.argv.includes('--sh');

const envFileIndex = process.argv.indexOf('--env-file');
const envFilePath = envFileIndex !== -1 ? process.argv[envFileIndex + 1] : null;

if (envFilePath && !fs.existsSync(envFilePath)) {
  console.error(`harness: env file not found: ${envFilePath}`);
  process.exit(1);
}

const envFileArgs = envFilePath ? ['--env-file', path.resolve(envFilePath)] : [];

const args = [
  'run',
  '--rm',
  '-it',
  '--cap-drop=ALL',
  '--cap-add=NET_RAW',
  '--security-opt', 'no-new-privileges:true',
  ...envFileArgs,
  '-v', `${workspace}:/workspace`,
  '-w', '/workspace',
  image,
  ...(shMode ? ['bash'] : ['pi'])
];

const docker = spawn('docker', args, { stdio: 'inherit' });

docker.on('exit', (code) => {
  process.exit(code);
});
