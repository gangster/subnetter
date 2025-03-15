# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the Subnetter project.

## CI/CD Pipeline (`ci-cd.yml`)

This is the main workflow that handles continuous integration and continuous deployment. It is split into several jobs:

### For Pull Requests:

1. **Validate PR**: 
   - Validates that the PR doesn't contain package-lock.json files
   - Lints commit messages
   - Checks for dependency redundancy

2. **Test PR**: 
   - Runs on multiple platforms (Ubuntu and macOS)
   - Lints code
   - Builds the project
   - Runs tests with coverage
   - Uploads coverage to Codecov

### For Pushes to Main:

1. **Test Main Branch**:
   - Runs on multiple platforms
   - Lints code
   - Builds the project
   - Runs tests with coverage
   - Uploads coverage to Codecov

2. **Release**:
   - Runs after successful tests
   - Uses semantic-release to create a new release
   - Publishes to GitHub Packages

3. **Docs**:
   - Only runs when documentation files change
   - Builds the documentation site
   - Publishes to GitHub Pages

## Dependabot Workflows

Two workflows help manage Dependabot PRs:

1. **Fix Dependabot PRs** (`dependabot-fix.yml`):
   - Automatically fixes Dependabot PRs by removing package-lock.json files

2. **Manually Fix Dependabot PR** (`fix-dependabot-manually.yml`):
   - Allows manual fixing of Dependabot PRs that weren't caught by the automatic workflow 