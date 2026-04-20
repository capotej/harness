#!/usr/bin/env node

import { spawn, execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import minimist, { ParsedArgs } from 'minimist';

interface Args extends ParsedArgs {
  sh: boolean;
  s: boolean;
  help: boolean;
  h: boolean;
  'no-verify': boolean;
  'env-file'?: string;
  e?: string;
  file?: string;
  f?: string;
  prompt?: string;
  p?: string;
  model?: string;
  m?: string;
  agent?: string;
  a?: string;
}

interface AgentOptions {
  prompt: string | null;
  model: string | null;
  envFilePath: string | null;
}

interface AgentAdapter {
  buildCommand(options: AgentOptions): string[];
  extraDockerArgs?(options: AgentOptions): string[];
}

class PiAdapter implements AgentAdapter {
  buildCommand({ prompt, model }: AgentOptions): string[] {
    const modelArgs = model ? ['--model', model] : [];
    if (prompt !== null) {
      return ['pi', '-p', prompt, ...modelArgs];
    }
    return ['pi', ...modelArgs];
  }
}

class OpenCodeAdapter implements AgentAdapter {
  buildCommand({ prompt }: AgentOptions): string[] {
    if (prompt !== null) {
      return ['opencode', 'run', prompt];
    }
    return ['opencode'];
  }

  extraDockerArgs({ model }: AgentOptions): string[] {
    return model ? ['-e', `OPENCODE_MODEL=${model}`] : [];
  }
}

class HermesAdapter implements AgentAdapter {
  buildCommand({ prompt, model }: AgentOptions): string[] {
    const args = ['hermes', 'chat'];
    if (model) args.push('-m', model);
    if (prompt !== null) args.push('-q', prompt);
    return args;
  }
}

const IDENTITY_REGEXP = 'https://github.com/capotej/harness/.github/workflows/docker.yml@refs/tags/';
const OIDC_ISSUER = 'https://token.actions.githubusercontent.com';

function verifyImage(image: string): void {
  const identityArgs = [
    '--certificate-identity-regexp', IDENTITY_REGEXP,
    '--certificate-oidc-issuer', OIDC_ISSUER,
  ];
  const execOptions = { stdio: 'pipe' as const, timeout: 30000 };

  try {
    execFileSync('cosign', ['verify', ...identityArgs, image], execOptions);
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: Buffer };
    if (e.code === 'ENOENT') {
      console.error('harness: WARNING: cosign not found — skipping image verification (brew install cosign)');
      return;
    }
    console.error(`harness: image signature verification failed for ${image}`);
    console.error(e.stderr?.toString().trim() || e.message);
    process.exit(1);
  }

  try {
    execFileSync('cosign', ['verify-attestation', '--type', 'slsaprovenance', ...identityArgs, image], execOptions);
  } catch {
    console.error(`harness: WARNING: no provenance attestation found for ${image}`);
  }
}

const ADAPTERS: Record<string, AgentAdapter> = {
  pi: new PiAdapter(),
  opencode: new OpenCodeAdapter(),
  hermes: new HermesAdapter(),
};

const USAGE = `Usage: harness [options]

Options:
  -p, --prompt <text>    Pass a prompt directly to the coding agent
  -e, --env-file <file>  Load environment variables from a file into the container
  -f, --file <file>      Mount a single file into the container instead of the current directory
  -m, --model <model>    Override the model used by the agent
  -s, --sh               Open an interactive bash shell instead of running the agent
  -a, --agent <name>     Select the coding agent adapter: pi, opencode, hermes (default: pi)
  --no-verify            Skip cosign image signature and provenance verification
  -h, --help             Show this help message

You can also pipe text to harness as an implied -p:
  echo "write me a fizzbuzz in Go" | harness
`;

const workspace = process.cwd();
const REGISTRY = 'ghcr.io/capotej/harness';
const VERSION: string = require('../package.json').version;
const IMAGE_TAG = process.env.HARNESS_IMAGE_TAG ?? VERSION;

function getImage(agent: string): string {
  const tag = agent === 'pi' ? IMAGE_TAG : `${agent}-${IMAGE_TAG}`;
  return `${REGISTRY}:${tag}`;
}

const argv = minimist<Args>(process.argv.slice(2), {
  boolean: ['sh', 's', 'help', 'h', 'no-verify'],
  string: ['env-file', 'e', 'file', 'f', 'prompt', 'p', 'model', 'm', 'agent', 'a'],
  alias: { s: 'sh', e: 'env-file', f: 'file', p: 'prompt', m: 'model', h: 'help', a: 'agent' },
});

if (argv.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const shMode = argv.sh;
const noVerify = argv['no-verify'];
const envFilePath = argv['env-file'] || null;
const fileArg = argv.file || null;
const promptArg = argv.prompt || null;
const modelArg = argv.model || null;
const agentName = argv.agent ?? 'pi';

if (!ADAPTERS[agentName]) {
  console.error(`harness: unknown agent: "${agentName}". Available: ${Object.keys(ADAPTERS).join(', ')}`);
  process.exit(1);
}

if (envFilePath && !fs.existsSync(envFilePath)) {
  console.error(`harness: env file not found: ${envFilePath}`);
  process.exit(1);
}

if (fileArg && !fs.existsSync(fileArg)) {
  console.error(`harness: file not found: ${fileArg}`);
  process.exit(1);
}

if (fileArg && fs.statSync(fileArg).isDirectory()) {
  console.error(`harness: --file requires a file, not a directory: ${fileArg}`);
  process.exit(1);
}

function run(prompt: string | null): void {
  const image = getImage(agentName);

  if (!noVerify && process.env.HARNESS_VERIFY === '1') {
    verifyImage(image);
  }

  const envFileArgs = envFilePath ? ['--env-file', path.resolve(envFilePath)] : [];

  const adapter = ADAPTERS[agentName];
  const adapterOptions = { prompt, model: modelArg, envFilePath };
  const containerCmd = shMode ? ['bash'] : adapter.buildCommand(adapterOptions);
  const adapterDockerArgs = adapter.extraDockerArgs?.(adapterOptions) ?? [];

  const interactive = process.stdin.isTTY;
  const ttyFlags = interactive ? ['-it'] : ['-i'];

  let volumeArgs: string[];
  if (fileArg) {
    const absFile = path.resolve(fileArg);
    const fileName = path.basename(absFile);
    volumeArgs = ['-v', `${absFile}:/workspace/${fileName}`];
  } else {
    volumeArgs = ['-v', `${workspace}:/workspace`];
  }

  const args = [
    'run',
    '--rm',
    ...ttyFlags,
    '--cap-drop=ALL',
    '--cap-add=NET_RAW',
    '--security-opt', 'no-new-privileges:true',
    ...envFileArgs,
    ...adapterDockerArgs,
    ...volumeArgs,
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
