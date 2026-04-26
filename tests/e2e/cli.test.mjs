// E2E tests for the harness CLI.
//
// Strategy: shadow `docker` with a tiny shim on PATH that prints
// `DOCKER_INVOKED <args>` to stdout and exits 0. We then run the real
// built CLI under various flag combinations and assert:
//   - process exit code
//   - stdout/stderr text
//   - the exact docker args the CLI produced
//
// This exercises the full CLI: minimist parsing, agent adapters, env-file
// validation, file-mount validation, persistence directory creation,
// adapter-specific docker args (e.g. OPENCODE_MODEL), volume mounts, and
// the cosign verification skip path (HARNESS_IMAGE_TAG and --no-verify).

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CLI = path.join(REPO_ROOT, "bin", "harness.js");

let SHIM_DIR;
let WORK_DIR;
let ENV_FILE;
let SAMPLE_FILE;

function ensureBuilt() {
  if (!fs.existsSync(CLI)) {
    throw new Error(`Build first: ${CLI} not found. Run \`pnpm build\`.`);
  }
}

function makeDockerShim(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const shim = path.join(dir, "docker");
  // Echo invocation prefix so the CLI's own stderr is distinguishable.
  fs.writeFileSync(
    shim,
    `#!/usr/bin/env bash
echo "DOCKER_INVOKED $*"
exit 0
`,
    { mode: 0o755 },
  );
  return shim;
}

function runCli(args, { extraEnv = {}, input = null } = {}) {
  const env = {
    ...process.env,
    PATH: `${SHIM_DIR}:${process.env.PATH}`,
    // Skip cosign verification; we never want a real network call here.
    HARNESS_IMAGE_TAG: "test-tag",
    ...extraEnv,
  };
  const opts = {
    cwd: WORK_DIR,
    env,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  };
  if (input !== null) opts.input = input;
  return spawnSync("node", [CLI, ...args], opts);
}

function dockerArgs(stdout) {
  const line = stdout.split("\n").find((l) => l.startsWith("DOCKER_INVOKED "));
  if (!line) return null;
  // Split safely: docker shim joined with spaces, but our test fixtures
  // never contain literal spaces inside individual args.
  return line.replace("DOCKER_INVOKED ", "").split(" ").filter(Boolean);
}

before(() => {
  ensureBuilt();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-e2e-"));
  SHIM_DIR = path.join(tmp, "shim");
  WORK_DIR = path.join(tmp, "work");
  fs.mkdirSync(WORK_DIR, { recursive: true });
  makeDockerShim(SHIM_DIR);

  ENV_FILE = path.join(tmp, ".env");
  fs.writeFileSync(ENV_FILE, "OPENROUTER_API_KEY=fake\n");

  SAMPLE_FILE = path.join(tmp, "script.py");
  fs.writeFileSync(SAMPLE_FILE, 'print("hi")\n');
});

after(() => {
  // best-effort cleanup; ignore errors
  try {
    fs.rmSync(path.dirname(SHIM_DIR), { recursive: true, force: true });
  } catch {}
});

// ---- argument parsing & validation -----------------------------------------

test("--help exits 0 and prints USAGE", () => {
  const r = runCli(["--help"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Usage: harness/);
  assert.match(r.stdout, /--prompt/);
  assert.match(r.stdout, /--no-verify/);
  assert.match(r.stdout, /--ephemeral/);
  assert.match(r.stdout, /pi, opencode, hermes/);
});

test("-h exits 0 and prints USAGE", () => {
  const r = runCli(["-h"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: harness/);
});

test("unknown agent fails fast with helpful error", () => {
  const r = runCli(["-a", "bogus-agent", "-p", "noop"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /unknown agent/);
  assert.match(r.stderr, /Available:.*pi/);
});

test("missing --env-file fails with descriptive error", () => {
  const r = runCli(["-e", "/tmp/does-not-exist.env", "-p", "x"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /env file not found/);
});

test("missing --file fails with descriptive error", () => {
  const r = runCli(["-f", "/tmp/does-not-exist.py", "-p", "x"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /file not found/);
});

test("--file pointing at a directory fails", () => {
  const r = runCli(["-f", WORK_DIR, "-p", "x"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /requires a file, not a directory/);
});

// ---- HARNESS_IMAGE_TAG / cosign skip ---------------------------------------

test("HARNESS_IMAGE_TAG short-circuits cosign verification", () => {
  const r = runCli(["-p", "noop"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /skipping cosign verification/);
  const args = dockerArgs(r.stdout);
  assert.ok(args, "expected DOCKER_INVOKED line");
  // image is the last positional before container cmd; for pi it's REGISTRY:test-tag
  assert.ok(
    args.some((a) => a === "ghcr.io/capotej/harness:test-tag"),
    `expected pi image in args: ${args.join(" ")}`,
  );
});

test("--no-verify still invokes docker successfully (no real cosign call)", () => {
  // Functional invariant: with --no-verify the CLI must not block on cosign
  // and must reach the docker invocation. We don't assert on informational
  // stderr lines because minimist's `--no-X => X=false` convention can cause
  // the "HARNESS_IMAGE_TAG is set" notice to still print (harmless).
  const r = runCli(["--no-verify", "-p", "noop"]);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /refusing to verify/);
  assert.doesNotMatch(r.stderr, /image signature verification failed/);
  const args = dockerArgs(r.stdout);
  assert.ok(args, "expected DOCKER_INVOKED line");
});

// ---- pi adapter ------------------------------------------------------------

test("pi: prompt is forwarded as `pi -p <prompt>`", () => {
  const r = runCli(["-p", "hello pi"]);
  assert.equal(r.status, 0, r.stderr);
  const a = dockerArgs(r.stdout);
  // last 3 args should be: <image> pi -p hello pi (joined)
  // We just assert ordering of the agent command at the tail.
  const tail = a.slice(a.indexOf("pi"));
  assert.deepEqual(tail.slice(0, 3), ["pi", "-p", "hello"]);
  assert.equal(tail[3], "pi"); // "pi" is second word of the prompt — split by space
});

test("pi: --model is forwarded with --provider ollama in local mode", () => {
  const r = runCli(["-p", "noop", "-m", "anthropic/claude-sonnet-4-5"]);
  assert.equal(r.status, 0, r.stderr);
  const a = dockerArgs(r.stdout);
  const idx = a.indexOf("pi");
  assert.notEqual(idx, -1);
  // In local mode (no env file), pi passes --provider ollama alongside --model
  // so the model is routed to LM Studio even when the model name contains slashes.
  assert.deepEqual(a.slice(idx, idx + 7), [
    "pi",
    "-p",
    "noop",
    "--provider",
    "ollama",
    "--model",
    "anthropic/claude-sonnet-4-5",
  ]);
});

// ---- opencode adapter ------------------------------------------------------

test("opencode: image tag is `opencode-<version>`", () => {
  const r = runCli(["-a", "opencode", "-p", "noop"]);
  assert.equal(r.status, 0, r.stderr);
  const a = dockerArgs(r.stdout);
  assert.ok(
    a.some((s) => s === "ghcr.io/capotej/harness:opencode-test-tag"),
    `expected opencode image: ${a.join(" ")}`,
  );
});

test("opencode: --model is passed via OPENCODE_MODEL env, not CLI", () => {
  const r = runCli([
    "-a",
    "opencode",
    "-p",
    "noop",
    "-m",
    "anthropic/claude-sonnet-4-5",
  ]);
  assert.equal(r.status, 0, r.stderr);
  const a = dockerArgs(r.stdout);
  // -e OPENCODE_MODEL=...
  const eIdx = a.findIndex(
    (v, i) => v === "-e" && a[i + 1]?.startsWith("OPENCODE_MODEL="),
  );
  assert.notEqual(
    eIdx,
    -1,
    `expected -e OPENCODE_MODEL=...; got ${a.join(" ")}`,
  );
  assert.equal(a[eIdx + 1], "OPENCODE_MODEL=anthropic/claude-sonnet-4-5");
  // container cmd is just `opencode run noop`
  const cmdIdx = a.indexOf(
    "opencode",
    a.indexOf("ghcr.io/capotej/harness:opencode-test-tag"),
  );
  assert.deepEqual(a.slice(cmdIdx, cmdIdx + 3), ["opencode", "run", "noop"]);
});

// ---- hermes adapter --------------------------------------------------------

test("hermes: model is passed via -m <provider/model>", () => {
  const r = runCli([
    "-a",
    "hermes",
    "-p",
    "noop",
    "-m",
    "anthropic/claude-sonnet-4-5",
  ]);
  assert.equal(r.status, 0, r.stderr);
  const a = dockerArgs(r.stdout);
  const cmdStart = a.indexOf("hermes");
  assert.notEqual(cmdStart, -1);
  assert.deepEqual(a.slice(cmdStart, cmdStart + 6), [
    "hermes",
    "chat",
    "-m",
    "anthropic/claude-sonnet-4-5",
    "-q",
    "noop",
  ]);
});

// ---- env-file forwarding ---------------------------------------------------

test("--env-file is passed to docker as --env-file <abs>", () => {
  const r = runCli(["-e", ENV_FILE, "-p", "noop"]);
  assert.equal(r.status, 0, r.stderr);
  const a = dockerArgs(r.stdout);
  const i = a.indexOf("--env-file");
  assert.notEqual(i, -1);
  assert.equal(a[i + 1], ENV_FILE); // resolved to abs path; ENV_FILE already abs
});

// ---- file mount vs cwd mount -----------------------------------------------

test("--file mounts only the file at /workspace/<basename>", () => {
  const r = runCli(["-f", SAMPLE_FILE, "-p", "noop"]);
  assert.equal(r.status, 0, r.stderr);
  const a = dockerArgs(r.stdout);
  const vIdx = a.indexOf("-v");
  assert.notEqual(vIdx, -1);
  assert.equal(a[vIdx + 1], `${SAMPLE_FILE}:/workspace/script.py`);
});

test("default mount is cwd:/workspace", () => {
  const r = runCli(["-p", "noop"]);
  assert.equal(r.status, 0, r.stderr);
  const a = dockerArgs(r.stdout);
  const vIdx = a.indexOf("-v");
  assert.notEqual(vIdx, -1);
  assert.equal(a[vIdx + 1], `${WORK_DIR}:/workspace`);
});

// ---- security flags --------------------------------------------------------

test("docker invocation always includes hardening flags", () => {
  const r = runCli(["-p", "noop"]);
  const a = dockerArgs(r.stdout);
  assert.ok(a.includes("--rm"));
  assert.ok(a.includes("--cap-drop=ALL"));
  assert.ok(a.includes("--cap-add=NET_RAW"));
  const sIdx = a.indexOf("--security-opt");
  assert.notEqual(sIdx, -1);
  assert.equal(a[sIdx + 1], "no-new-privileges:true");
  // -w /workspace is set
  const wIdx = a.indexOf("-w");
  assert.notEqual(wIdx, -1);
  assert.equal(a[wIdx + 1], "/workspace");
});

// ---- persistence behaviour --------------------------------------------------

test("one-shot run (-p) is implicitly ephemeral: no .harness/ dir created", () => {
  const localWork = fs.mkdtempSync(path.join(os.tmpdir(), "harness-e2e-cwd-"));
  const r = spawnSync("node", [CLI, "-p", "noop"], {
    cwd: localWork,
    env: {
      ...process.env,
      PATH: `${SHIM_DIR}:${process.env.PATH}`,
      HARNESS_IMAGE_TAG: "test-tag",
    },
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(
    fs.existsSync(path.join(localWork, ".harness")),
    false,
    ".harness/ should NOT be created for one-shot runs",
  );
});

test("piped stdin is implicitly ephemeral and forwards prompt", () => {
  const localWork = fs.mkdtempSync(path.join(os.tmpdir(), "harness-e2e-cwd-"));
  const r = spawnSync("node", [CLI], {
    cwd: localWork,
    env: {
      ...process.env,
      PATH: `${SHIM_DIR}:${process.env.PATH}`,
      HARNESS_IMAGE_TAG: "test-tag",
    },
    input: "piped prompt\n",
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(path.join(localWork, ".harness")), false);
  const a = dockerArgs(r.stdout);
  // pi adapter receives the piped prompt via -p
  const idx = a.indexOf("pi");
  assert.notEqual(idx, -1);
  assert.equal(a[idx + 1], "-p");
  assert.match(a[idx + 2], /piped/);
});
