# jj Command Reference

## Command Quick Reference

### Reading State

| Command | Description |
| --- | --- |
| `jj status` | Show changed files in working copy |
| `jj diff` | Show diff of working copy |
| `jj diff -r <rev>` | Show diff of a specific revision |
| `jj diff --from <rev1> --to <rev2>` | Compare two revisions |
| `jj log` | Show commit history (default revset) |
| `jj log -r 'all()'` | Show full history |
| `jj log -r <revset>` | Show history matching revset |
| `jj show` | Show current change details |
| `jj show <rev>` | Show specific change details |

### Creating and Modifying Changes

| Command | Description |
| --- | --- |
| `jj new` | Create a new empty change |
| `jj new -m "msg"` | Create a new change with description |
| `jj new <rev>` | Create a new change on top of a specific revision |
| `jj new <rev1> <rev2>` | Create a merge change |
| `jj describe -m "msg"` | Set description for current change |
| `jj describe -m "msg" -r <rev>` | Set description for a specific change |

### File Operations

| Command | Description |
| --- | --- |
| `jj restore <path>` | Restore file to parent's version |
| `jj restore --from <rev> <path>` | Restore file from a specific revision |
| `jj restore --from <rev> --to <rev>` | Restore changes between revisions |

### Navigation

| Command | Description |
| --- | --- |
| `jj edit <rev>` | Set working copy to an existing change |
| `jj next` | Move to the next (child) change |
| `jj prev` | Move to the previous (parent) change |

### Remote Operations

| Command | Description |
| --- | --- |
| `jj git fetch` | Fetch from remote |
| `jj git push -b <bookmark>` | Push a bookmark to remote |
| `jj git push --all` | Push all bookmarks |

## Workspace Operations

Workspaces allow multiple working copies of the same repository.

```bash
jj workspace list                    # List all workspaces
jj workspace add <path>              # Create a new workspace at path
jj workspace add <path> --name <n>   # Create with a specific name
jj workspace forget <name>           # Remove a workspace (keeps files)
```

## Bookmark Management

Bookmarks are jj's equivalent of git branches.

```bash
# Create
jj bookmark create <name> -r <rev>   # Create bookmark at revision
jj bookmark create <name> -r @       # Create bookmark at current change

# Move
jj bookmark set <name> -r <rev>      # Move bookmark to revision
jj bookmark set <name> -r @          # Move bookmark to current change

# Delete
jj bookmark delete <name>            # Delete local bookmark

# List
jj bookmark list                     # List all bookmarks
jj bookmark list --all-remotes       # Include remote bookmarks

# Push
jj git push -b <name>               # Push bookmark to remote
jj git push --deleted                # Push bookmark deletions
```

### Common Bookmark Patterns

**Point main to a change and push:**

```bash
jj bookmark set main -r @-
jj git push -b main
```

**Create a feature bookmark and push:**

```bash
jj bookmark create feature-x -r @
jj git push -b feature-x
```

**Update an existing bookmark:**

```bash
jj bookmark set feature-x -r @
jj git push -b feature-x
```

## Conflict Resolution

### Detecting Conflicts

```bash
jj status                            # Shows conflicted files
jj log                               # Conflicted changes show conflict marker
```

### Resolving Conflicts

1. Edit the conflicted files to resolve markers (`<<<<<<<`, `>>>>>>>`)
2. The resolution is automatically recorded — no `git add` needed
3. Verify with `jj status` that conflicts are resolved

### Avoiding Conflicts with Rebase

```bash
jj rebase -d main@origin             # Rebase current change onto latest main
```

## Undo and Recovery

```bash
jj undo                              # Undo the last jj operation
jj restore <path>                    # Discard changes to a file
jj abandon                           # Abandon current change (children re-parent)
jj abandon <rev>                     # Abandon a specific change
```

### Operation Log

```bash
jj op log                            # Show history of jj operations
jj op restore <op-id>                # Restore to a previous operation state
```

## Advanced Operations

### Rebase

Move changes to a new parent:

```bash
jj rebase -d <destination>           # Rebase current change
jj rebase -r <rev> -d <destination>  # Rebase a specific change
jj rebase -s <source> -d <dest>      # Rebase source and descendants
jj rebase -b <rev> -d <dest>         # Rebase entire branch
```

**Example — rebase onto latest main:**

```bash
jj git fetch
jj rebase -d main@origin
```

### Split

Split a change into multiple smaller changes:

```bash
jj split                             # Interactive split of current change
jj split <path>                      # Split out changes to specific files
jj split -r <rev>                    # Split a specific change
```

### Squash

Merge a change into its parent:

```bash
jj squash                            # Squash current change into parent
jj squash <path>                     # Squash only specific files into parent
```

**WARNING:** Do not use `jj squash -r <rev>` to squash into arbitrary revisions.
This risks merging changes into unintended commits. Only use bare `jj squash`
to squash into the immediate parent.

### Duplicate

Copy a change without moving it:

```bash
jj duplicate <rev>                   # Create a copy of a change
```

## Revset Syntax Quick Reference

| Expression | Meaning |
| --- | --- |
| `@` | Current working copy change |
| `@-` | Parent of current change |
| `<rev>-` | Parent of revision |
| `<rev>+` | Children of revision |
| `root()..@` | All ancestors of current change |
| `heads(all())` | All head changes |
| `bookmarks()` | All bookmarked changes |
| `main` | The change pointed to by bookmark `main` |
| `main@origin` | Remote bookmark `main` on `origin` |
| `description(pattern)` | Changes matching description |
| `author(pattern)` | Changes by author |
| `empty()` | Empty changes |
