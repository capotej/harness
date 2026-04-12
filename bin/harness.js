#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const minimist = require('minimist');

const workspace = process.cwd();
const image = 'capotej/harness';

const argv = minimist(process.argv.slice(2), {
  boolean: ['sh', 's'],
  string: ['env-file', 'e', 'prompt', 'p', 'model', 'm'],
  alias: { s: 'sh', e: 'env-file', p: 'prompt', m: 'model' },
});

const shMode = argv.sh;
const envFilePath = argv['env-file'] || null;
const promptArg = argv.prompt || null;
const modelArg = argv.model || null;

if (envFilePath && !fs.existsSync(envFilePath)) {
  console.error(`harness: env file not found: ${envFilePath}`);
  process.exit(1);
}

function run(prompt) {
  const pMode = prompt !== null;
  const envFileArgs = envFilePath ? ['--env-file', path.resolve(envFilePath)] : [];
  const modelArgs = modelArg ? ['--model', modelArg] : [];

  let containerCmd;
  if (shMode) {
    containerCmd = ['bash'];
  } else if (pMode) {
    containerCmd = ['pi', '-p', prompt, ...modelArgs];
  } else {
    containerCmd = ['pi', ...modelArgs];
  }

  const interactive = process.stdin.isTTY;
  const ttyFlags = interactive ? ['-it'] : ['-i'];

  const args = [
    'run',
    '--rm',
    ...ttyFlags,
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
  docker.on('exit', (code) => process.exit(code));
}

if (!process.stdin.isTTY && promptArg === null && !shMode) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => run(input.trim() || null));
} else {
  run(promptArg);
}
