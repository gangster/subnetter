# Subnetter Documentation

This package contains the documentation site for Subnetter, built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

## Overview

The documentation site provides comprehensive guides for using Subnetter:

- **User Guide**: Complete usage examples and scenarios
- **Configuration Reference**: Detailed schema documentation
- **API Documentation**: Reference for programmatic usage
- **Architecture**: Technical design and system components
- **CIDR Primer**: Educational guide about IP addressing
- **Troubleshooting Guide**: Solutions for common issues
- **Developer Guide**: For contributors

## Development

### Prerequisites

- Node.js ^18.18.0 || ^20.9.0 || >=21.1.0
- Yarn (included in repository)

### Commands

All commands are run from the `packages/docs` directory:

| Command | Action |
|:--------|:-------|
| `yarn dev` | Starts local dev server at `localhost:4321` |
| `yarn build` | Build production site to `./dist/` |
| `yarn preview` | Preview build locally before deploying |

### Project Structure

```
docs/
├── src/
│   ├── assets/       # Images and static assets
│   ├── content/
│   │   └── docs/     # Documentation pages (.md/.mdx)
│   └── content.config.ts
├── astro.config.mjs  # Astro configuration
└── package.json
```

### Adding Documentation

1. Create a new `.md` or `.mdx` file in `src/content/docs/`
2. Add frontmatter with title and description
3. The file path determines the URL route

### Deployment

The documentation site is automatically deployed to GitHub Pages when changes are pushed to the main branch (via the CI/CD workflow).

**Live Site**: [https://gangster.github.io/subnetter/](https://gangster.github.io/subnetter/)
