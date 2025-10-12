# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-10

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


