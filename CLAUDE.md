# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**prisma-searchparams-mapper** is a TypeScript library that converts URL search parameters into Prisma query objects (where, orderBy, pagination) and vice versa. It's framework-agnostic, type-safe, and designed for Next.js, TanStack Router, Express, Fastify, and other Node.js frameworks.

Key features:
- Bidirectional mapping: URLSearchParams ↔ Prisma queries
- Type-safe with Prisma client types
- Supports operators: `_in`, `_gte`, `_lte`, `_contains`, `_startsWith`, `_endsWith`, etc.
- Nested relations with dot notation (`customer.name=John`)
- Global search across multiple fields
- Multi-tenant support (contextual filters)
- Zero runtime dependencies (peer: @prisma/client)

## Architecture

### Single-File Design
The entire library is contained in `src/index.ts` (~500 lines). This is intentional to:
- Minimize complexity for a focused utility library
- Make it easy to understand the full implementation
- Reduce overhead for bundlers and tree-shaking

### Core Components

**Types (lines 1-45):**
- `PrismaFilterValue`, `PrismaOperator`, `PrismaWhere`: Base types for filters
- `SearchParamsQuery<TWhereInput, TOrderByInput>`: Main return type with where/orderBy/skip/take
- `ParseOptions`: Configuration options for parsing

**Main Parser (`parseSearchParams`, lines 47-313):**
1. Input normalization: Accepts string, URLSearchParams, or plain objects
2. Pagination handling: Supports both page-based (`?page=2`) and offset-based (`?skip=20&take=10`)
3. Parameter parsing: Iterates through params to build where clause
4. Operator extraction: Uses regex to detect operators like `_gte`, `_contains`
5. Nested relations: Handles dot notation automatically (`customer.email_contains=...`)
6. Global search: Combines multiple fields with OR logic when `searchFields` option is provided

**Utility Functions:**
- `toSearchParams` (lines 327-382): Converts Prisma query back to URLSearchParams
- `parseNestedRelations` (lines 388-428): Extracts nested relations from params
- `mergeRelations` (lines 433-438): Merges nested relations into where clause
- `createParser` (lines 443-466): Factory for type-safe parsers
- `hasLogicalOperators` (lines 469-474): Checks if where clause has AND/OR/NOT operators
- `deepMergeWhere` (lines 476-526): **Smart merge** that preserves logical operators
- `mergeWhere` (lines 528-540): Merges contextual where filters (uses deepMergeWhere)
- `mergeQuery` (lines 542-556): Merges full query with contextual defaults (uses deepMergeWhere)

**Key Implementation Details:**
- `normalizeValue` (lines 316-322): Converts strings to proper types (boolean, number, string)
- Operator precedence: `skip`/`take` override `page`/`pageSize`
- **Smart Merge Logic**: `deepMergeWhere` intelligently combines where clauses:
  - Simple filters (no logical operators): Uses spread operator, contextual takes priority
  - Complex filters (with AND/OR/NOT): Combines with AND to preserve all conditions
  - Automatically flattens nested AND arrays to avoid `AND: [AND: [...], ...]`
  - Prevents OR conditions from being overwritten (fixes multi-tenant + search scenarios)

## Development Commands

### Testing
```bash
pnpm test           # Run all tests once
pnpm test:watch     # Run tests in watch mode
```

Tests are written in Vitest and located in `src/index.test.ts`. The test file uses mock Prisma types to validate all parsing scenarios.

### Building
```bash
pnpm build          # Compile TypeScript to dist/
```

Build outputs:
- `dist/index.js`: Compiled JavaScript
- `dist/index.d.ts`: TypeScript declarations

### Linting & Formatting
```bash
pnpm lint           # Check code with Biome
pnpm lint:fix       # Fix linting issues
pnpm format         # Format code
```

This project uses **Biome** (not ESLint/Prettier) with configuration in `biome.json`:
- Single quotes, semicolons as needed
- 2-space indentation, 80-char line width
- Trailing commas: all
- `noExplicitAny` rule is disabled (intentional for flexibility)

### Pre-commit Hooks
Husky runs `lint-staged` which executes `biome check --write` on staged files before commits.

### Publishing
```bash
pnpm prepublishOnly  # Automatically runs tests + build before publishing
pnpm release:patch   # Bump patch version (1.1.2 → 1.1.3)
pnpm release:minor   # Bump minor version (1.1.2 → 1.2.0)
pnpm release:major   # Bump major version (1.1.2 → 2.0.0)
```

## Testing Strategy

When adding new features or fixing bugs:
1. Add tests in `src/index.test.ts` using Vitest's `describe`/`it`/`expect`
2. Use mock Prisma types (defined at the top of the test file)
3. Test both parsing and reverse conversion (`toSearchParams`)
4. Cover edge cases: empty values, multiple operators, nested relations

## Code Style Guidelines

### Type Safety
- Use generic type parameters `TWhereInput` and `TOrderByInput` for Prisma integration
- Cast `Record<string, any>` to typed interfaces at function boundaries
- Prefer `Record<string, any>` internally for dynamic property access

### Operators
When adding new Prisma operators:
1. Update the regex pattern in both places (lines 145, 187):
   ```typescript
   /(.+?)_(in|notIn|not|gte|lte|gt|lt|contains|startsWith|endsWith|newOp)$/
   ```
2. Handle array vs single value (e.g., `in`/`notIn` use arrays)
3. Add `mode: 'insensitive'` for string operators if `searchMode` is set
4. Add tests for the new operator

### Nested Relations
The library automatically handles nested relations using dot notation:
- `customer.name=John` → `{ customer: { name: 'John' } }`
- `order.total_gte=100` → `{ order: { total: { gte: 100 } } }`

Nested logic is in two places:
- Main parser (lines 139-184): Handles nested fields with operators
- `parseNestedRelations` function (lines 388-428): Extracts all nested relations

### Security (Multi-tenant)
Always use `mergeWhere` or `mergeQuery` when adding tenant/user filters:
```typescript
const contextualWhere = { tenantId: user.tenantId };
const query = parseSearchParams(searchParams);
const merged = mergeWhere(contextualWhere, query);
```
Contextual filters take priority to prevent URL parameter injection.

## Documentation Files

- **README.md**: User-facing documentation, installation, API reference
- **USAGE.md**: Detailed usage guide with Prisma-specific examples
- **AI_USAGE.md**: Quick reference for AI assistants (LLMs)
- **CHANGELOG.md**: Version history and breaking changes
- **CONTRIBUTING.md**: Guidelines for contributors
- **RELEASE.md**: Release process documentation

When updating features, also update relevant documentation files.

## Package Configuration

- **Entry point**: `dist/index.js` (built from `src/index.ts`)
- **Types**: `dist/index.d.ts`
- **Module system**: ESM with NodeNext resolution
- **Target**: ES2021
- **Peer dependency**: `@prisma/client` (optional, >=4.0.0)
- **Files published**: Only `dist/` folder

## Common Patterns

### Adding a New Feature

1. Implement in `src/index.ts`
2. Add tests in `src/index.test.ts`
3. Run `pnpm test` to verify
4. Update `README.md` with examples
5. Update `CHANGELOG.md` with changes
6. Run `pnpm build` to verify TypeScript compilation

### Debugging Type Issues

The library uses generic types to avoid depending on a specific Prisma version:
- Users pass their own `Prisma.UserWhereInput` as type parameters
- Internally, use `Record<string, any>` for flexibility
- Cast to generic types at boundaries

If type errors occur:
- Check that casting happens at function return boundaries
- Verify generic parameters are properly propagated
- Test with actual `@prisma/client` types (not just mocks)
