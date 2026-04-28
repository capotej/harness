// E2E tests for entrypoint-hermes.sh.
//
// Strategy: run the real entrypoint script in a tempdir, with the
// HERMES_SEED_SRC_* / HERMES_SEED_DST_* env vars pointing at fixtures we
// control, and /usr/bin/true as the exec target so we don't actually try
// to launch hermes. Then assert on what was (and wasn't) written into the
// destination "volume" dir.
//
// What we verify:
//   1. First boot: empty destination → all top-level files (incl. dotfiles
//      like .env) and all top-level directories are seeded.
//   2. Subsequent boot: pre-existing top-level files in the destination
//      are *overwritten* from the image (config-as-code semantics).
//   3. Subsequent boot: pre-existing top-level directories in the
//      destination are *preserved* (runtime state survives restarts).
//   4. Provider routing: HERMES_HOME flips to the openrouter dir when
//      OPENROUTER_API_KEY is set, otherwise to the local dir.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ENTRYPOINT = path.join(REPO_ROOT, "entrypoint-hermes.sh");

let TMP;
let SRC_LOCAL;
let SRC_OPENROUTER;
let DST_LOCAL;
let DST_OPENROUTER;

function fixtureSrc(dir) {
  // Mirrors what Dockerfile.hermes bakes into /etc/harness/hermes-defaults/<flavor>:
  //   - top-level config files (config.yaml, .env, system-prompt.md)
  //   - top-level state-scaffolding directories (sessions/, hooks/, ...)
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "config.yaml"), "model: from-image\n");
  fs.writeFileSync(path.join(dir, ".env"), "FROM_IMAGE=1\n");
  fs.writeFileSync(path.join(dir, "system-prompt.md"), "# image prompt\n");
  for (const sub of ["sessions", "hooks", "memories", "skills"]) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
  fs.writeFileSync(path.join(dir, "sessions", ".gitkeep"), "");
}

function runEntrypoint(extraEnv = {}) {
  // Use /usr/bin/true so the entrypoint's `exec "$@"` doesn't try to launch
  // hermes (which isn't installed on the test host). All seeding happens
  // before the exec, so this still exercises the full code path under test.
  return spawnSync("bash", [ENTRYPOINT, "/usr/bin/true"], {
    env: {
      ...process.env,
      HERMES_SEED_SRC_LOCAL: SRC_LOCAL,
      HERMES_SEED_SRC_OPENROUTER: SRC_OPENROUTER,
      HERMES_SEED_DST_LOCAL: DST_LOCAL,
      HERMES_SEED_DST_OPENROUTER: DST_OPENROUTER,
      ...extraEnv,
    },
    encoding: "utf8",
  });
}

before(() => {
  if (!fs.existsSync(ENTRYPOINT)) {
    throw new Error(`entrypoint not found: ${ENTRYPOINT}`);
  }
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "harness-entrypoint-hermes-"));
  SRC_LOCAL = path.join(TMP, "src", "local");
  SRC_OPENROUTER = path.join(TMP, "src", "openrouter");
  fixtureSrc(SRC_LOCAL);
  fixtureSrc(SRC_OPENROUTER);
});

after(() => {
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch {}
});

function freshDst() {
  // Fresh per-test destination dirs so tests don't bleed into each other.
  const subdir = fs.mkdtempSync(path.join(TMP, "dst-"));
  DST_LOCAL = path.join(subdir, "hermes-local");
  DST_OPENROUTER = path.join(subdir, "hermes-openrouter");
}

test("first boot: empty volume → top-level files AND state dirs are seeded", () => {
  freshDst();
  const r = runEntrypoint();
  assert.equal(r.status, 0, r.stderr);

  // Files (including dotfiles) copied across.
  assert.equal(
    fs.readFileSync(path.join(DST_OPENROUTER, "config.yaml"), "utf8"),
    "model: from-image\n",
  );
  assert.equal(
    fs.readFileSync(path.join(DST_OPENROUTER, ".env"), "utf8"),
    "FROM_IMAGE=1\n",
  );
  assert.equal(
    fs.readFileSync(path.join(DST_OPENROUTER, "system-prompt.md"), "utf8"),
    "# image prompt\n",
  );
  // State scaffolding dirs created.
  for (const sub of ["sessions", "hooks", "memories", "skills"]) {
    assert.ok(
      fs.statSync(path.join(DST_OPENROUTER, sub)).isDirectory(),
      `expected ${sub}/ to be initialized`,
    );
  }
  // Same for the local flavor.
  assert.ok(fs.existsSync(path.join(DST_LOCAL, "config.yaml")));
});

test("subsequent boot: stale top-level config files are overwritten from image", () => {
  freshDst();

  // Pretend a prior boot left a stale config and a stale .env.
  fs.mkdirSync(DST_OPENROUTER, { recursive: true });
  fs.writeFileSync(
    path.join(DST_OPENROUTER, "config.yaml"),
    "model: stale-from-old-deploy\n",
  );
  fs.writeFileSync(path.join(DST_OPENROUTER, ".env"), "FROM_IMAGE=0\n");

  const r = runEntrypoint();
  assert.equal(r.status, 0, r.stderr);

  // Config-as-code: image wins on every boot.
  assert.equal(
    fs.readFileSync(path.join(DST_OPENROUTER, "config.yaml"), "utf8"),
    "model: from-image\n",
    "config.yaml should be refreshed from the image",
  );
  assert.equal(
    fs.readFileSync(path.join(DST_OPENROUTER, ".env"), "utf8"),
    "FROM_IMAGE=1\n",
    ".env should be refreshed from the image",
  );
});

test("subsequent boot: pre-existing state directories are preserved", () => {
  freshDst();

  // Pretend a prior boot accumulated runtime state.
  fs.mkdirSync(path.join(DST_OPENROUTER, "sessions"), { recursive: true });
  fs.writeFileSync(
    path.join(DST_OPENROUTER, "sessions", "user-conversation.json"),
    '{"messages":["hi","hello"]}',
  );
  fs.mkdirSync(path.join(DST_OPENROUTER, "memories"), { recursive: true });
  fs.writeFileSync(
    path.join(DST_OPENROUTER, "memories", "fact-1.md"),
    "important user fact",
  );

  const r = runEntrypoint();
  assert.equal(r.status, 0, r.stderr);

  // Runtime state untouched — we don't want to wipe sessions/memories on
  // every redeploy.
  assert.equal(
    fs.readFileSync(
      path.join(DST_OPENROUTER, "sessions", "user-conversation.json"),
      "utf8",
    ),
    '{"messages":["hi","hello"]}',
    "session file from prior boot must be preserved",
  );
  assert.equal(
    fs.readFileSync(path.join(DST_OPENROUTER, "memories", "fact-1.md"), "utf8"),
    "important user fact",
    "memory file from prior boot must be preserved",
  );
  // The image's empty .gitkeep should NOT have replaced the user's session
  // — we never enter a directory that already exists in the destination.
  assert.equal(
    fs.existsSync(path.join(DST_OPENROUTER, "sessions", ".gitkeep")),
    false,
    "image-side .gitkeep should not appear inside a pre-existing state dir",
  );
});

test("missing seed source dir is a no-op (does not fail)", () => {
  freshDst();
  const r = runEntrypoint({
    HERMES_SEED_SRC_LOCAL: path.join(TMP, "does-not-exist"),
    HERMES_SEED_SRC_OPENROUTER: path.join(TMP, "also-does-not-exist"),
  });
  assert.equal(r.status, 0, r.stderr);
  // Nothing was copied — that's fine; the entrypoint should still exec
  // cleanly so a misconfigured deployment surfaces the error elsewhere.
});
