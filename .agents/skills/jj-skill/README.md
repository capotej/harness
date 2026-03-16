# jj-skill

[Agent Skill](https://agentskills.io) for [jujutsu (jj)](https://jj-vcs.github.io/jj/) version control.

Teaches AI coding agents to use jj instead of git — covering core workflows, push operations, bookmark management, conflict resolution, and more.

## Minimum jj version

This skill is tested with jj **0.38.0** and above. See [`.min-jj-version`](.min-jj-version).

## Installation

### Claude Code

Add as a personal skill:

```bash
# Clone into your skills directory
git clone https://github.com/megumish/jj-skill.git ~/.claude/skills/jj-skill
```

Or reference from a project's `.claude/skills/` directory.

### With agent-skills-nix

Add as a flake input:

```nix
# flake.nix
inputs.jj-skill = {
  url = "github:megumish/jj-skill";
  flake = false;
};
```

Then configure in your agent-skills settings:

```nix
programs.agent-skills.sources.jj-skill = {
  path = inputs.jj-skill;
  subdir = "skills";
};

programs.agent-skills.skills.enable = [ "jj" ];
```

### Other agents

This skill follows the [Agent Skills](https://agentskills.io) open standard. Place the `skills/jj/` directory in your agent's skills folder:

- **Cursor**: `~/.cursor/skills/jj/`
- **Gemini CLI**: `~/.gemini/skills/jj/`
- **GitHub Copilot**: `~/.copilot/skills/jj/`
- **Windsurf**: `~/.codeium/windsurf/skills/jj/`

## Structure

```text
skills/
└── jj/
    ├── SKILL.md                        # Main skill instructions
    └── references/
        └── command-reference.md        # Full command reference
```

## License

Apache-2.0
