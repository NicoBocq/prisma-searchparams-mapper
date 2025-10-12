# Release Process

## Before Release

1. **Run tests**
   ```bash
   pnpm test
   ```

2. **Build**
   ```bash
   pnpm build
   ```

3. **Check package contents**
   ```bash
   npm pack --dry-run
   ```

## Release Steps

### 1. Update CHANGELOG.md

Move `[Unreleased]` section to new version:

```markdown
## [0.2.0] - 2025-01-15

### Added
- New feature X
- New feature Y

### Fixed
- Bug Z
```

### 2. Commit changes

```bash
git add CHANGELOG.md
git commit -m "docs: update changelog for v0.2.0"
```

### 3. Bump version

Choose the appropriate version bump:

```bash
# Patch (0.1.0 → 0.1.1) - Bug fixes only
pnpm release:patch

# Minor (0.1.0 → 0.2.0) - New features, backward compatible
pnpm release:minor

# Major (0.1.0 → 1.0.0) - Breaking changes
pnpm release:major
```

This will:
- Update version in package.json
- Create a git tag
- Run prepublishOnly (tests + build)

### 4. Push to GitHub

```bash
git push && git push --tags
```

### 5. Push to GitHub (triggers automation)

```bash
git push && git push --tags
```

This will automatically:
- ✅ Create a GitHub Release (from CHANGELOG.md)
- ✅ Publish to npm (after tests pass)

**Note:** You need to configure `NPM_TOKEN` in GitHub Secrets for automatic npm publishing.

### 6. Manual npm publish (if automation disabled)

```bash
npm publish
```

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

### Patch (0.1.x)
- Bug fixes
- Documentation updates
- Internal refactoring
- Performance improvements (no API changes)

### Minor (0.x.0)
- New features
- New operators
- New options (backward compatible)
- Deprecations (with warnings)

### Major (x.0.0)
- Breaking API changes
- Removed deprecated features
- Changed behavior of existing features
- Minimum version bumps (Node, Prisma, etc.)

## Post-Release

1. **Verify npm package**
   ```bash
   npm view prisma-searchparams-mapper
   ```

2. **Test installation**
   ```bash
   mkdir test-install && cd test-install
   npm init -y
   npm install prisma-searchparams-mapper
   ```

3. **Announce**
   - Twitter/X
   - Reddit (r/typescript, r/nextjs)
   - Discord communities
   - Dev.to article

## Rollback

If something goes wrong:

```bash
# Unpublish within 72 hours (use with caution!)
npm unpublish prisma-searchparams-mapper@0.2.0

# Or deprecate
npm deprecate prisma-searchparams-mapper@0.2.0 "This version has issues, use 0.2.1"
```

## Checklist

- [ ] Tests pass
- [ ] Build succeeds
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Git tag created
- [ ] Pushed to GitHub
- [ ] Published to npm
- [ ] GitHub release created
- [ ] Package verified on npm
- [ ] Announced
