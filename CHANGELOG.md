# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2024-10-26

### Added
- **`context` option** - New, more explicit name for merging contextual queries
  - Replaces `mergeWith` with clearer semantics (tenant filters, permissions, default sorting)
  - Example: `parseSearchParams(params, { context: { where: { tenantId: 'abc' } } })`
  - Prioritizes `context` over `mergeWith` when both are provided
- **Security warning section** in documentation
  - Explicit guidance on validating user inputs with schema validators (Zod, Yup)
  - Examples of proper validation before parsing
  - Warnings about permissions, rate limiting, and field validation

### Changed
- **Smart merge for logical operators** - `mergeWhere()` and `mergeQuery()` now intelligently combine conditions
  - Simple filters (no AND/OR/NOT): Uses spread operator (backward compatible)
  - Complex filters (with AND/OR/NOT): Combines with AND to preserve all conditions
  - Automatically flattens nested AND arrays to avoid `AND: [AND: [...], ...]`
  - **Fixes critical bug** where OR conditions were overwritten during merge
- Simplified documentation - removed excessive emojis and marketing language

### Deprecated
- **`mergeWith` option** - Use `context` instead (will be removed in v2.0.0)
  - Still works for backward compatibility
  - Shows deprecation warning in TypeScript

### Fixed
- **OR/AND/NOT conditions preserved during merge**
  - Before: `mergeWhere({ OR: [permissions] }, { OR: [search] })` would only keep permissions OR
  - After: Correctly generates `{ AND: [{ OR: [search] }, { OR: [permissions] }] }`
  - Critical fix for multi-tenant applications with search functionality
  - Added 13+ new tests to cover smart merge scenarios

## [1.1.2] - 2025-13-10

### Added
- **`mergeWith` option** - Merge with existing query directly in `parseSearchParams()`
  - Simplifies query merging without calling `mergeQuery()` separately
  - Example: `parseSearchParams(params, { mergeWith: { where: { tenantId: 'abc' } } })`
  - Contextual where takes priority for security
  - User orderBy takes priority for UX

### Changed
- **BREAKING: Renamed `PrismaQuery` to `SearchParamsQuery`** for better clarity and uniqueness
  - `PrismaQuery` and `ParsedQuery` kept as deprecated aliases for backward compatibility
  - Update your imports: `import type { SearchParamsQuery } from 'prisma-searchparams-mapper'`
- **BREAKING: Default `searchMode` changed to `'insensitive'`** for better UX
  - String operators (`contains`, `startsWith`, `endsWith`) are now case-insensitive by default
  - Searching for "john" will match "John", "JOHN", etc.
  - Use `searchMode: 'default'` to restore case-sensitive behavior

### Fixed
- **Nested fields in `searchFields`** now generate proper Prisma nested structure
  - Before: `{ "customer.name": { contains: "john" } }` ❌ (invalid Prisma syntax)
  - After: `{ customer: { name: { contains: "john" } } }` ✅
  - Supports unlimited nesting depth (e.g., `'user.profile.bio'`)
  - Works with all logical operators (AND/OR)

## [1.1.1] - 2025-13-10

### Added
- **Automatic nested relations** - Dot notation now works automatically in `parseSearchParams()`
  - `?customer.name=John` → `{ customer: { name: 'John' } }`
  - `?customer.email_contains=@example.com` → `{ customer: { email: { contains: '@example.com' } } }`
  - Works with all operators (`_in`, `_gte`, `_contains`, etc.)
  - Supports deeply nested relations (`user.profile.bio_contains=dev`)
  - No need to use `parseNestedRelations()` + `mergeRelations()` separately anymore
- **Flexible sorting syntax** - Support both underscore and colon separators for orderBy
  - `?order=createdAt_desc` (underscore - original format)
  - `?order=createdAt:desc` (colon - alternative format)
  - Both formats work identically
- Added comprehensive tests for nested relations and sorting formats

### Fixed
- **Nested operators merge** - Multiple operators on the same nested field are now correctly merged
  - `?order.total_gte=100&order.total_lte=500` correctly generates `{ order: { total: { gte: 100, lte: 500 } } }`

## [1.1.0] - 2025-13-10

### Added
- **Direct object input support** - `parseSearchParams()` now accepts plain objects
  - Perfect for Next.js `searchParams` (no conversion needed!)
  - Works with TanStack Router `deps` directly
  - Supports array values for multi-select filters
  - Automatically filters out `undefined` values
  - Three input formats: `string | URLSearchParams | Record<string, string | string[] | undefined>`
- Updated all documentation examples to showcase direct object support
- Added comprehensive tests for object input format

## [1.0.0] - 2025-13-10

### Added
- Initial release of prisma-searchparams-mapper
- Type-safe Prisma integration with generic types
  - `TWhereInput` for filters (e.g., `Prisma.UserWhereInput`)
  - `TOrderByInput` for sorting (e.g., `Prisma.UserOrderByWithRelationInput`)
  - Type-safe `searchFields` with field name validation
- Bidirectional parsing
  - `parseSearchParams()` - URLSearchParams → Prisma query
  - `toSearchParams()` - Prisma query → URLSearchParams
- Complete Prisma operators support
  - Comparison: `in`, `notIn`, `not`, `gte`, `lte`, `gt`, `lt`
  - String: `contains`, `startsWith`, `endsWith`
  - Case-insensitive mode for string operators
- Global search functionality
  - `?search=` or `?q=` - Search across multiple fields with OR logic
  - `searchFields` - Configure searchable fields
  - `searchMode: 'insensitive'` - Case-insensitive search
  - Automatic combination with other filters (AND logic)
- Sorting and pagination
  - **Page-based**: `?page=2&pageSize=20` (classic pagination)
  - **Offset-based**: `?skip=20&take=10` (infinite scroll)
  - Automatic mode detection based on parameters
  - `skip/take` takes priority over `page/pageSize`
- Custom keys
  - `searchKey` - Customize global search key (default: `'search'`, also accepts `'q'` as alias)
  - `orderKey` - Customize sorting key (default: `'order'`)
- Nested relations
  - `parseNestedRelations()` - Support for dot notation (e.g., `user.name=John`)
  - `mergeRelations()` - Merge relations into filters
- Context merging
  - `mergeWhere()` - Merge contextual where clause (tenant, user filters, etc.)
  - `mergeQuery()` - Merge contextual query (where + orderBy + pagination)
  - Contextual where takes priority for security (prevents URL override)
  - User orderBy takes priority for UX (user can override default sort)
- Type-safe parser factory
  - `createParser<TWhereInput, TOrderByInput>()` - Create reusable type-safe parsers
- Edge case handling
  - Invalid/negative page numbers → defaults to page 1
  - Invalid/zero take values → defaults to pageSize
  - Empty search values → ignored
  - Special characters → properly decoded
  - Multiple operators on same field → merged correctly
- Comprehensive test suite
  - 100+ tests covering all features
  - Edge cases and error scenarios
  - Type safety validation

### Documentation
- Complete README with examples
- Detailed USAGE guide with framework examples (Next.js, TanStack Router, Express)
- AI_USAGE guide for AI assistants and LLMs
- TypeScript examples with Prisma types
- Contributing guidelines
- MIT License

### Technical
- Zero dependencies (peer: @prisma/client >= 4.0.0, optional)
- TypeScript strict mode
- ESM/CommonJS support
- Biome for linting and formatting
- Husky + lint-staged for pre-commit hooks
- Vitest for testing


