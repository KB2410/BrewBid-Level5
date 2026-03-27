# Contributing to BrewBid

## What's Tracked in Git

### ✅ Files that SHOULD be in the repository:
- Source code (`*.ts`, `*.tsx`, `*.rs`, `*.js`)
- Configuration files (`package.json`, `Cargo.toml`, `tsconfig.json`, etc.)
- Documentation (`README.md`, `ARCHITECTURE.md`, etc.)
- Public assets (`frontend/public/*`)
- Smart contract source (`soroban-contracts/src/*`)
- Test files (`*.test.ts`, `test.rs`)
- License and legal files

### ❌ Files that should NOT be in the repository:
- `node_modules/` - Dependencies (install with `npm install`)
- `frontend/.next/` - Next.js build output
- `soroban-contracts/target/` - Rust build artifacts
- `Cargo.lock` - Rust dependency lock file
- `.DS_Store` - macOS system files
- `.env.local` - Local environment variables
- `*.log` - Log files
- `.vercel/` - Vercel deployment config
- Build artifacts and compiled files

## Before Committing

1. Run `git status` to check what files are being tracked
2. Make sure no sensitive data (API keys, private keys) are included
3. Verify build artifacts are not being committed
4. Test your changes locally before pushing

## Clean Up Unnecessary Files

If you accidentally committed files that shouldn't be tracked:

```bash
# Remove from git but keep locally
git rm --cached <file>

# Remove all .DS_Store files
find . -name .DS_Store -type f -delete
git rm --cached **/.DS_Store

# Commit the changes
git commit -m "Remove unnecessary files from tracking"
```
