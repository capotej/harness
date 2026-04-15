#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import minimist, { ParsedArgs } from 'minimist';

interface Args extends ParsedArgs {
  sh: boolean;
  s: boolean;
  help: boolean;
  h: boolean;
  'env-file'?: string;
  e?: string;
  prompt?: string;
  p?: string;
  model?: string;
  m?: string;
}

const USAGE = `Usage: harness [options]

Options:
  -p, --prompt <text>    Pass a prompt directly to the coding agent
  -e, --env-file <file>  Load environment variables from a file into the container
  -m, --model <model>    Override the model used by the agent
  -s, --sh               Open an interactive bash shell instead of running the agent
  -h, --help             Show this help message

You can also pipe text to harness as an implied -p:
  echo "write me a fizzbuzz in Go" | harness
`;

const workspace = process.cwd();
const image = 'ghcr.io/capotej/harness:253b4e3';

const argv = minimist<Args>(process.argv.slice(2), {
  boolean: ['sh', 's', 'help', 'h'],
  string: ['env-file', 'e', 'prompt', 'p', 'model', 'm'],
  alias: { s: 'sh', e: 'env-file', p: 'prompt', m: 'model', h: 'help' },
});

if (argv.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const shMode = argv.sh;
const envFilePath = argv['env-file'] || null;
const promptArg = argv.prompt || null;
const modelArg = argv.model || null;

if (envFilePath && !fs.existsSync(envFilePath)) {
  console.error(`harness: env file not found: ${envFilePath}`);
  process.exit(1);
}

function run(prompt: string | null): void {
  const pMode = prompt !== null;
  const envFileArgs = envFilePath ? ['--env-file', path.resolve(envFilePath)] : [];
  const modelArgs = modelArg ? ['--model', modelArg] : [];

  let containerCmd: string[];
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
  docker.on('exit', (code) => process.exit(code ?? 1));
}

if (!process.stdin.isTTY && promptArg === null && !shMode) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => { input += chunk; });
  process.stdin.on('end', () => run(input.trim() ? input : null));
} else {
  run(promptArg);
}
