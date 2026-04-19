---
name: release
description: Automate releasing the harness npm package. Use this skill whenever the user wants to cut a release, publish a new version, bump the version, tag a release, update the CHANGELOG, or run npm publish. Triggers on phrases like "release version X", "cut a release", "publish", "bump to X.X.X", "tag this release", "release the project", or any combination of version bumping + publishing intent. Always use this skill for release work — don't attempt ad-hoc release steps without it.
---

# Release Skill for `harness`

Automates the full release pipeline: pre-flight checks → version bump → CHANGELOG → build → publish → tag → GitHub release.

## Step 1: Pre-flight checks (abort on failure)

**Image version check** — Read `src/harness.ts` and locate the `image` constant (e.g. `const image = 'ghcr.io/...'`). If its tag is `:latest`, stop immediately:

> "Aborting: harness.ts uses `:latest` for the Docker image. Pin it to a specific commit hash before releasing."

**Main bookmark is up to date** — Verify that the local `main` bookmark and `main@origin` point to the same commit. In jj, remote bookmarks use `<bookmark>@<remote>` syntax (not `origin/<bookmark>`). Run:

```bash
jj log -r "main" --no-graph -T 'commit_id ++ "\n"'
jj log -r "main@origin" --no-graph -T 'commit_id ++ "\n"'
```

If they differ, there are unpushed commits on `main`. Inform the user:

> "Aborting: local main is ahead of main@origin. Push your commits first with `jj git push`."

**Clean working state** — Run `jj status`. If there are uncommitted changes beyond what you're about to create (package.json + CHANGELOG.md), warn the user and ask whether to proceed.

**README is up to date** — Read `README.md` and the commits since the last tag (collected in Step 3). Check whether any commit introduces new CLI flags, options, agents, or user-visible behavior that isn't reflected in `README.md`. If gaps are found, list them and ask the user to update `README.md` before continuing:

> "Aborting: README.md appears out of date. The following changes may need documentation: <list>. Update README.md and re-run the release."

## Step 2: Determine the new version

- If the user gave an explicit version, use it.
- Otherwise read `version` from `package.json` and infer a semantic bump from commits since the last tag:
  - **patch** (default) — bug fixes, docs, tooling
  - **minor** — any commit suggesting new features ("add", "support", "new", "feat")
  - **major** — only on user request or explicit breaking-change commit messages

Tell the user what version you chose and why before continuing.

## Step 3: Get commits since last release

```bash
# Find the last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)

# If a tag exists:
git log ${LAST_TAG}..HEAD --oneline

# If no previous tag (first release):
git log --oneline
```

Collect these as bullet points for the changelog: `- <short-hash> <message>`

## Step 4: Update CHANGELOG.md

Get today's date:
```bash
date +%Y-%m-%d
```

Based on the commits collected, write a 1–3 sentence prose summary of what changed (new features, fixes, notable improvements). For any new user-visible features — especially new CLI flags, options, or agents — include a concrete inline example showing how to use them (e.g. `harness --flag value`). Then include the raw commit list beneath it.

**Dockerfile dependency changes** — Diff `Dockerfile` against the last tag to find any version bumps to installed tools (e.g. `@mariozechner/pi-coding-agent`, `opencode-ai`, Node.js). If any are found, include a `### Dependency Updates` section listing each change as `- updated <package> to <version>`.

**If CHANGELOG.md does not exist**, create it:
```markdown
# Changelog

## [<version>] - <YYYY-MM-DD>

### Summary
<1–3 sentence prose summary of what changed>

### Dependency Updates
- updated <package> to <version>

### Changes
- <hash> <message>
```

Omit `### Dependency Updates` entirely if there are no Dockerfile dependency changes.

**If it already exists**, insert the new entry immediately after the `# Changelog` header line, before any existing entries.

## Step 5: Bump version in package.json

Edit the `version` field directly in `package.json`. Do not use `npm version` — it creates git commits automatically and would interfere with the jj workflow.

## Step 6: Build

```bash
pnpm build
```

Stop if this fails.

## Step 7: Commit and push the release

In jj, file changes are automatically snapshotted in the working-copy commit. Describe it and move to a new empty commit:

```bash
jj describe -m "release v<version>"
jj new
```

Advance the main bookmark to the release commit, then push:

```bash
jj bookmark set main -r @-
jj git push --bookmark main
```

## Step 8: Publish to npm

npm publish requires an OTP and cannot be automated. Tell the user:

> "Please run `npm publish` (with `--otp=<code>` if prompted for 2FA). Let me know when it succeeds and I'll continue."

Wait for the user to confirm success before proceeding to Step 9.

## Step 9: Create and push the tag

Create the tag locally pointing to the release commit (one behind `@`, the current empty working copy):

```bash
jj tag set v<version> -r @-
```

Push it to the remote (jj doesn't support pushing tags directly; use git):

```bash
git push --tags
```

## Step 10: Create GitHub release

Extract the changelog section for this version — everything from `## [<version>]` down to (but not including) the next `## [` entry.

```bash
gh release create v<version> \
  --title "v<version>" \
  --notes "<changelog-entry>"
```

## Final report

Tell the user:
- Version released
- The CHANGELOG entry added
- GitHub release URL (from `gh release create` stdout)
