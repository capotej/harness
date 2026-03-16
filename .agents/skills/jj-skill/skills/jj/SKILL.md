---
name: jj
description: >-
  Manages version control using jujutsu (jj) instead of git.
  Provides workflows for creating changes, describing commits, pushing to remotes, and managing bookmarks.
  Use when performing any version control operation, when the user mentions commits, diffs, branches, push, pull, or history,
  or when git commands would normally be used. This repository uses jj, not git.
---

# Jujutsu (jj) Version Control Guide

## CRITICAL: This is NOT git

This repository uses **jujutsu (jj)** as its version control system, NOT git.

- **NEVER use git commands** (`git add`, `git commit`, `git push`, `git branch`, etc.)
- Using git commands directly can corrupt the repository state
- jj manages the underlying git repository internally — all operations go through `jj`

## Git to jj Mapping

If you know git, use this table to find the jj equivalent:

| Git command | jj equivalent | Notes |
| --- | --- | --- |
| `git status` | `jj status` | Show changed files |
| `git diff` | `jj diff` | Show working copy changes |
| `git log` | `jj log` | Show commit history |
| `git show <rev>` | `jj show <rev>` | Show a specific commit |
| `git add` + `git commit` | `jj describe -m "msg"` | No staging needed; changes are auto-tracked |
| `git branch <name>` | `jj bookmark create <name>` | Bookmarks replace branches |
| `git checkout -b <name>` | `jj new` + `jj bookmark create <name>` | Create new change, then bookmark it |
| `git push` | `jj git push -b <bookmark>` | Must specify bookmark |
| `git pull` | `jj git fetch` + `jj rebase -d main@origin` | Fetch then rebase |
| `git stash` | Not needed | Every change is already a commit |
| `git rebase -i` | `jj rebase -d <dest>` | Non-interactive by default |
| `git reset` | `jj restore` / `jj abandon` | Restore files or abandon changes |

## Commands to Avoid

| Command | Status | Reason | Use instead |
| --- | --- | --- | --- |
| `git *` | **PROHIBITED** | jj is the VCS; git commands can corrupt state | Corresponding `jj` command |
| `jj commit` | **PROHIBITED** | Splits working copy in confusing ways | `jj new` + `jj describe` |
| `jj squash -r <rev>` | **RESTRICTED** | Risk of merging into unintended commit | Only bare `jj squash` (squash into parent) is allowed |

`jj squash` without `-r` is safe — it squashes the current change into its parent, which is a common and useful operation.

## Reading Repository State

```bash
jj status          # Changed files in working copy
jj diff            # Diff of working copy changes
jj diff -r <rev>   # Diff of a specific revision
jj log             # Commit history (default revset)
jj log -r 'all()'  # Full history
jj show            # Show current commit details
jj show <rev>      # Show specific commit details
```

## Core Workflow

### 1. Create a New Change

```bash
jj new              # Create a new empty change on top of current
jj new -m "msg"     # Create with initial description
```

### 2. Edit Files

Make your changes. jj automatically tracks all file modifications — no `git add` needed.

### 3. Describe the Change

```bash
jj describe -m "What you did and why"
```

## Push Operations

### Push to a Feature Bookmark (Branch)

```bash
# If bookmark does not exist yet:
jj bookmark create <bookmark-name> -r @
jj git push -b <bookmark-name>

# If bookmark already exists (e.g., pushing additional changes):
jj bookmark set <bookmark-name> -r @
jj git push -b <bookmark-name>
```

### Push to main

```bash
jj new                               # Create next working space first
jj bookmark set main -r @-           # Point main to the completed change
jj git push -b main
```

Why `@-`? After `jj new`, the completed work is in the parent (`@-`), and the current change (`@`) is the new empty working space.

## Troubleshooting

### Push blocked by empty commits

If `jj git push` fails because a commit has no description, find and remove the empty commit:

```bash
jj log                               # Find the empty change-id
jj abandon <change-id>               # Remove it (children are auto-rebased)
```

### Nix flake does not recognize new files

Nix flakes only see files tracked by the VCS. To make jj track a new file:

```bash
jj describe -m "description"         # Commit current state
jj new                               # New files are now in a parent commit, visible to git
```

### More commands and details

See [references/command-reference.md](references/command-reference.md) for:

- Full command quick-reference table
- Workspace and bookmark management
- Conflict resolution procedures
- Undo and recovery operations
- Advanced operations (rebase, split, squash)
