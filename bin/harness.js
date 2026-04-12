#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const minimist = require('minimist');

const workspace = process.cwd();
const image = 'capotej/harness';

const argv = minimist(process.argv.slice(2), {
  boolean: ['sh', 's'],
  string: ['env-file', 'e', 'prompt', 'p'],
  alias: { s: 'sh', e: 'env-file', p: 'prompt' },
});

const shMode = argv.sh;
const envFilePath = argv['env-file'] || null;
const promptArg = argv.prompt || null;
const pMode = promptArg !== null;

if (envFilePath && !fs.existsSync(envFilePath)) {
  console.error(`harness: env file not found: ${envFilePath}`);
  process.exit(1);
}

const envFileArgs = envFilePath ? ['--env-file', path.resolve(envFilePath)] : [];

let containerCmd;
if (shMode) {
  containerCmd = ['bash'];
} else if (pMode) {
  containerCmd = ['pi', '-p', promptArg];
} else {
  containerCmd = ['pi'];
}

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
  ...containerCmd
];

const docker = spawn('docker', args, { stdio: 'inherit' });

docker.on('exit', (code) => {
  process.exit(code);
});
