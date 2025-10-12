# Contributing to prisma-searchparams-mapper

Thank you for your interest in contributing! 🎉

## 🏗️ Architecture

### Core Principle: No Prisma Dependency

**Important**: This library does NOT install `@prisma/client` as a dependency.

**Why?**
- Avoid version conflicts with user's Prisma installation
- Keep the package lightweight
- Allow usage without Prisma

**How?**
- Uses **generic types** that adapt to user's Prisma types
- **Optional** peer dependency on `@prisma/client`

### Code Structure

```
src/
  index.ts          # Main code with generic types
  index.test.ts     # Tests with Vitest

examples/
  examples.ts                  # Basic examples
  examples-typesafe.ts         # Examples with Prisma types

docs/
  README.md         # Main documentation
  USAGE.md          # Detailed guide
  AI_USAGE.md       # Guide for AI assistants
  CHANGELOG.md      # Version history
  CONTRIBUTING.md   # This file
```

## 🚀 Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/prisma-searchparams-mapper.git
cd prisma-searchparams-mapper

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

## 🧪 Tests

All tests must pass before submitting a PR:

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Build to verify compilation
pnpm build
```

## 📝 Adding a Feature

### 1. Write tests first

```typescript
// src/index.test.ts
describe('My new feature', () => {
  it('should do something', () => {
    const result = parseSearchParams('?param=value');
    expect(result.where).toEqual({ param: 'value' });
  });
});
```

### 2. Implement the feature

```typescript
// src/index.ts
export function parseSearchParams<TWhereInput, TOrderByInput>(
  input: string | URLSearchParams,
  options?: ParseOptions
): PrismaQuery<TWhereInput, TOrderByInput> {
  // Your code here
}
```

### 3. Update documentation

- `README.md` - Add an example
- `USAGE.md` - Add detailed guide (if needed)
- `CHANGELOG.md` - Add entry

### 4. Verify types

```bash
# Check TypeScript compilation
pnpm build

# No type errors
```

## 🎯 Guidelines

### Generic Types

**DO** ✅
```typescript
export function myFunction<TWhereInput = PrismaWhere>(
  input: string
): PrismaQuery<TWhereInput> {
  // Uses generic types
}
```

**DON'T** ❌
```typescript
import { Prisma } from '@prisma/client'; // ❌ Don't import Prisma!

export function myFunction(
  input: string
): Prisma.UserWhereInput { // ❌ Specific type
  // ...
}
```

### Dependencies

**DO** ✅
- Use dev dependencies for tests only
- Keep the package lightweight

**DON'T** ❌
- Add `@prisma/client` to `dependencies`
- Add heavy dependencies

### Tests

**DO** ✅
```typescript
// Test with generic types
const result = parseSearchParams('?status=active');
expect(result.where).toEqual({ status: 'active' });

// Test with mock Prisma types
type MockWhereInput = { status?: string };
const result2 = parseSearchParams<MockWhereInput>('?status=active');
```

**DON'T** ❌
```typescript
// Don't import @prisma/client in tests
import { Prisma } from '@prisma/client'; // ❌
```

## 📚 Documentation

Each new feature must be documented in:

1. **README.md** - Usage example
2. **USAGE.md** - Practical guide (if needed)
3. **CHANGELOG.md** - Version entry

## 🔄 PR Process

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Write tests
4. Implement the feature
5. Update documentation
6. Verify everything passes: `pnpm test && pnpm build`
7. Commit: `git commit -m "feat: add my feature"`
8. Push: `git push origin feature/my-feature`
9. Create a Pull Request

## 🐛 Reporting a Bug

Open an issue with:

1. **Description** of the bug
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. Library **version**
6. Prisma **version** (if applicable)

## 💡 Proposing a Feature

Open an issue with:

1. **Description** of the feature
2. **Use cases**
3. **API example**
4. **Alternatives** considered

## 📋 PR Checklist

- [ ] Tests added and passing
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No Prisma dependency added
- [ ] Generic types used correctly
- [ ] Examples added if needed

## 🙏 Thank You!

Thank you for contributing to make this library better! 🚀
