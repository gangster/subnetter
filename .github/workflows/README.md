# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the Subnetter project.

## CI/CD Pipeline (`ci-cd.yml`)

The main workflow that handles continuous integration and continuous deployment. It uses a modular, optimized structure with dependency caching and build artifact sharing.

### Architecture

```
┌─────────────┐
│ validate-pr │ (PR only - commit lint, package-lock check)
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│              build (matrix)              │
│     Node 18 │ Node 20 │ Node 22         │
└──────────────────┬───────────────────────┘
                   │ (saves build artifacts)
       ┌───────────┴───────────┐
       ▼                       ▼
┌──────────┐           ┌──────────────────────┐
│   lint   │           │    test (matrix)     │
└────┬─────┘           │  Node 18/20/22       │
     │                 └──────────┬───────────┘
     │                            │
     └────────────┬───────────────┘
                  ▼
          ┌───────────────┐
          │ check-release │ (main branch only)
          └───────┬───────┘
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
┌─────────────┐      ┌──────────┐
│   release   │      │   docs   │ (only if docs changed)
└─────────────┘      └──────────┘
```

### Key Optimizations

1. **Dependency Caching**: Yarn dependencies are cached based on `yarn.lock` hash
2. **Build Artifact Sharing**: Build output from the build job is reused by test, release, and docs jobs
3. **Matrix Testing**: Tests run on Node.js 18, 20, and 22
4. **Conditional Docs Deploy**: Documentation only deploys when docs files change
5. **Parallel Execution**: Lint and test jobs run in parallel
6. **Reusable Setup Action**: Common setup steps extracted to `.github/actions/setup/`

### Jobs

| Job | Trigger | Purpose |
|-----|---------|---------|
| `validate-pr` | PR only | Validate commit messages, check for package-lock.json |
| `build` | All | Build all packages (matrix: Node 18/20/22) |
| `lint` | All | Run ESLint |
| `test` | All | Run unit and E2E tests (matrix: Node 18/20/22) |
| `check-release` | Push to main | Determine if semantic-release should run |
| `release` | Push to main | Create GitHub release and publish |
| `docs` | Push to main | Build and deploy documentation to GitHub Pages |

### Reusable Components

#### Setup Action (`.github/actions/setup/`)

A composite action that handles:
- Node.js setup (configurable version)
- Yarn Berry setup via corepack
- Dependency caching
- Package installation

Usage in workflows:
```yaml
- name: Setup Environment
  uses: ./.github/actions/setup
  with:
    node-version: '20'
```

### Forcing Docs Deployment

To force a docs deployment even when no docs files changed, use this commit message:
```
chore: force docs deploy
```

## Dependabot

The repository uses Dependabot for dependency updates. PRs are automatically created for outdated dependencies.

---

*Last verified: 2025-11-26*
