# prisma-searchparams-mapper

[![npm version](https://img.shields.io/npm/v/prisma-searchparams-mapper.svg?color=blue)](https://www.npmjs.com/package/prisma-searchparams-mapper)
[![npm downloads](https://img.shields.io/npm/dm/prisma-searchparams-mapper.svg)](https://npmjs.com/package/prisma-searchparams-mapper)
[![bundle size](https://img.shields.io/bundlephobia/minzip/prisma-searchparams-mapper)](https://bundlephobia.com/package/prisma-searchparams-mapper)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Convert URL search parameters to Prisma queries (`where`, `orderBy`, pagination) and back. Type-safe, framework-agnostic, works with Next.js, TanStack Router, Express, Fastify.

## Why?

Stop writing boilerplate. Turn 50+ lines of manual URL parsing into a single line.

### Before
```typescript
const where: Prisma.UserWhereInput = {};
if (searchParams.status) where.status = searchParams.status;
if (searchParams.age_gte) where.age = { ...where.age, gte: Number(searchParams.age_gte) };
if (searchParams.age_lte) where.age = { ...where.age, lte: Number(searchParams.age_lte) };
if (searchParams.role) {
  where.role = searchParams.role.includes(',') 
    ? { in: searchParams.role.split(',') }
    : searchParams.role;
}
// ... 40+ more lines for all operators, pagination, sorting, etc.
```

### After
```typescript
const query = parseSearchParams<Prisma.UserWhereInput>(searchParams);
const users = await prisma.user.findMany(query);
```

## Features

- Bidirectional mapping: URLSearchParams ↔ Prisma queries
- Type-safe with Prisma types
- Framework-agnostic (Next.js, TanStack Router, Express, Fastify)
- Simple syntax: `?status=active&role_in=admin,user&order=createdAt_desc&page=2`
- Global search across multiple fields
- Nested relations with dot notation
- Smart merging for multi-tenant apps

## Installation

```bash
npm install prisma-searchparams-mapper
```

**Note**: For type-safe integration, install `@prisma/client` in your project. This library uses generic types and doesn't bundle Prisma to avoid version conflicts.

## Security Warning

**Always validate and sanitize user inputs before using them in database queries.**

```typescript
// ❌ NEVER trust user input directly
const query = parseSearchParams(req.query); // Dangerous!

// ✅ ALWAYS validate with a schema validator (Zod, Yup, etc.)
import { z } from 'zod';

const searchParamsSchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  role: z.enum(['admin', 'user', 'guest']).optional(),
  page: z.coerce.number().int().positive().max(1000).optional(),
});

const validated = searchParamsSchema.parse(req.query);
const query = parseSearchParams(validated);
```

This library parses URL parameters into Prisma queries but **does not validate the business logic**. You must validate:
- Allowed field names
- Allowed values (enums, ranges)
- Permissions (which fields users can filter on)
- Rate limiting and pagination limits

## Usage

### Basic Example

```typescript
import { parseSearchParams } from 'prisma-searchparams-mapper';

// From URL search params to Prisma query
const searchParams = new URLSearchParams('?status=active&role=admin&page=1');
const prismaQuery = parseSearchParams(searchParams);

// Use with Prisma
const users = await prisma.user.findMany(prismaQuery);
```

### Multiple Input Formats

The library accepts three input formats for maximum flexibility:

```typescript
// 1. String (query string)
parseSearchParams('?status=active&role=admin');
parseSearchParams('status=active&role=admin'); // '?' is optional

// 2. URLSearchParams object
const params = new URLSearchParams('?status=active');
parseSearchParams(params);

// 3. Plain object (Next.js searchParams, TanStack Router deps)
parseSearchParams({ status: 'active', role: 'admin' });
parseSearchParams({ role: ['admin', 'user'] }); // Arrays supported
```

### Type-Safe Usage with Prisma

```typescript
import { parseSearchParams, createParser } from 'prisma-searchparams-mapper';
import { Prisma } from '@prisma/client';

// Option 1: Direct type parameters (where + orderBy)
const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>('?email_contains=@example.com&age_gte=18&order=createdAt_desc');

// query.where is typed as Prisma.UserWhereInput ✅
// query.orderBy is typed as Prisma.UserOrderByWithRelationInput ✅
const users = await prisma.user.findMany(query);

// Option 2: Create reusable type-safe parser
const userParser = createParser<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>();

const query2 = userParser.parse('?status=active&role=admin&order=name_asc');
// Full type safety with autocomplete ✅

const users2 = await prisma.user.findMany(query2);
```

### Operators Support

```typescript
// Comparison operators
const query = parseSearchParams('?age_gte=18&age_lte=65&score_gt=50&score_lt=100');
// Result: { where: { age: { gte: 18, lte: 65 }, score: { gt: 50, lt: 100 } } }

// Multiple values
const query2 = parseSearchParams('?status_in=active,pending');
// Result: { where: { status: { in: ['active', 'pending'] } } }

// String operators
const query3 = parseSearchParams('?name_contains=john&email_startsWith=admin&bio_endsWith=dev');
// Result: { where: { name: { contains: 'john' }, email: { startsWith: 'admin' }, bio: { endsWith: 'dev' } } }

// Case-insensitive search
const query4 = parseSearchParams('?name_contains=john', { searchMode: 'insensitive' });
// Result: { where: { name: { contains: 'john', mode: 'insensitive' } } }
```

### Global Search

```typescript
// Search across multiple fields with OR logic
const query = parseSearchParams('?search=john', {
  searchFields: ['name', 'email', 'bio'],
  searchMode: 'insensitive',
});
// Result: { 
//   where: { 
//     OR: [
//       { name: { contains: 'john', mode: 'insensitive' } },
//       { email: { contains: 'john', mode: 'insensitive' } },
//       { bio: { contains: 'john', mode: 'insensitive' } }
//     ]
//   }
// }

// Use 'q' as alias for 'search'
const query2 = parseSearchParams('?q=john', {
  searchFields: ['name', 'email'],
});

// Custom search key
const query3 = parseSearchParams('?query=john', {
  searchFields: ['name', 'email'],
  searchKey: 'query',
});

// Custom order key
const query4 = parseSearchParams('?sort=name_asc', {
  orderKey: 'sort',
});

// Combine search with other filters
const query5 = parseSearchParams('?status=active&search=john', {
  searchFields: ['name', 'email'],
});
// Automatically combines with AND logic
```

### Sorting & Pagination

```typescript
// Sorting supports both underscore and colon separators
const query0 = parseSearchParams('?order=createdAt_desc'); // underscore
const query0b = parseSearchParams('?order=createdAt:desc'); // colon (both work!)

// Page-based pagination (classic UI with page numbers)
const query1 = parseSearchParams('?order=createdAt_desc&page=2');
// Result: { 
//   where: {},
//   orderBy: { createdAt: 'desc' },
//   skip: 10,
//   take: 10
// }

// Offset-based pagination (infinite scroll)
const query2 = parseSearchParams('?skip=20&take=10');
// Result: { where: {}, skip: 20, take: 10 }

// skip/take have priority over page/pageSize
const query3 = parseSearchParams('?page=2&skip=15&take=10');
// Result: { where: {}, skip: 15, take: 10 }
```

### Nested Relations (Automatic)

```typescript
// ✨ Nested relations work automatically with dot notation
const query = parseSearchParams('?customer.name=John&customer.email_contains=@example.com');
// Result: { 
//   where: { 
//     customer: { 
//       name: 'John', 
//       email: { contains: '@example.com' } 
//     } 
//   } 
// }

// Works with all operators
const query2 = parseSearchParams('?order.total_gte=100&order.status=pending');
// Result: { 
//   where: { 
//     order: { 
//       total: { gte: 100 }, 
//       status: 'pending' 
//     } 
//   } 
// }

// Deeply nested relations
const query3 = parseSearchParams('?user.profile.bio_contains=developer');
// Result: { 
//   where: { 
//     user: { 
//       profile: { 
//         bio: { contains: 'developer' } 
//       } 
//     } 
//   } 
// }

// Manual parsing (advanced use case)
import { parseNestedRelations, mergeRelations } from 'prisma-searchparams-mapper';

const relations = parseNestedRelations('?user.name=John');
const baseQuery = parseSearchParams('?status=active');
const fullWhere = mergeRelations(baseQuery.where, relations);
```

### Convert Back to SearchParams

```typescript
import { toSearchParams } from 'prisma-searchparams-mapper';

const prismaQuery = {
  where: { status: 'active', role: { in: ['admin', 'user'] } },
  orderBy: { createdAt: 'desc' },
  skip: 10,
  take: 10
};

const searchParams = toSearchParams(prismaQuery);
// Result: ?status=active&role_in=admin,user&order=createdAt_desc&page=2
```

### Next.js App Router Example (Type-Safe)

```typescript
// app/users/page.tsx
import { parseSearchParams } from 'prisma-searchparams-mapper';
import { Prisma, prisma } from '@/lib/prisma';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  
  // ✨ Direct object support - no conversion needed!
  const query = parseSearchParams<
    Prisma.UserWhereInput,
    Prisma.UserOrderByWithRelationInput
  >(params);
  
  const users = await prisma.user.findMany(query);

  return <div>{/* render users */}</div>;
}
```

### TanStack Router Example

```typescript
// routes/users.tsx
import { createFileRoute } from '@tanstack/react-router';
import { parseSearchParams } from 'prisma-searchparams-mapper';
import { Prisma, prisma } from '@/lib/prisma';

export const Route = createFileRoute('/users')({
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // ✨ Direct object support - no conversion needed!
    const query = parseSearchParams<
      Prisma.UserWhereInput,
      Prisma.UserOrderByWithRelationInput
    >(deps, {
      searchFields: ['name', 'email'],
      searchMode: 'insensitive',
    });
    
    const users = await prisma.user.findMany(query);
    return { users };
  },
});
```

### Custom Page Size

```typescript
import { parseSearchParams } from 'prisma-searchparams-mapper';

// Default page size is 10
const query1 = parseSearchParams('?page=2');
// { skip: 10, take: 10 }

// Custom page size
const query2 = parseSearchParams('?page=2', { pageSize: 20 });
// { skip: 20, take: 20 }

// Or use pageSize in URL
const query3 = parseSearchParams('?page=2&pageSize=50');
// { skip: 50, take: 50 }
```

---

## API Reference

### `parseSearchParams<TWhereInput, TOrderByInput>(input: string | URLSearchParams | Record<string, string | string[] | undefined>, options?: ParseOptions): PrismaQuery<TWhereInput, TOrderByInput>`

Converts URL search parameters to a Prisma query object.

**Type Parameters:**
- `TWhereInput` - Prisma WhereInput type (e.g., `Prisma.UserWhereInput`)
- `TOrderByInput` - Prisma OrderByWithRelationInput type (e.g., `Prisma.UserOrderByWithRelationInput`)

**Parameters:**
- `input` - URL search params as string, URLSearchParams, or plain object (e.g., Next.js searchParams)
- `options` - Optional configuration
  - `pageSize` - Items per page (default: 10)
  - `searchMode` - Search mode: `'default'` or `'insensitive'` (default: `'insensitive'`)
  - `searchFields` - Array of field names for global search (type-safe with Prisma types)
  - `logicalOperator` - Logical operator: `'AND'` or `'OR'` for combining conditions
  - `searchKey` - Custom key for global search (default: `'search'`, also accepts `'q'` as alias)
  - `orderKey` - Custom key for sorting (default: `'order'`)
  - `context` - Contextual query to merge with (tenant filters, default sorting, etc.)
  - `mergeWith` - ⚠️ **Deprecated**: Use `context` instead (will be removed in v2.0.0)

**Type-safe searchFields:**
```typescript
import { Prisma } from '@prisma/client';

const query = parseSearchParams<Prisma.UserWhereInput>('?search=john', {
  searchFields: ['name', 'email'], // ✅ TypeScript validates direct fields
  // searchFields: ['invalid'], // ❌ TypeScript error!
});

// Nested fields also supported (as strings)
const query2 = parseSearchParams<Prisma.PostWhereInput>('?search=john', {
  searchFields: ['title', 'author.name', 'author.email'], // ✅ Works
});
```

**Supported patterns:**
- Simple filters: `?status=active`
- Multiple values (CSV): `?role=admin,user` → `{ role: { in: ['admin', 'user'] } }`
- Operators: `_in`, `_gte`, `_lte`, `_contains`
- Sorting: `?order=field_asc` or `?order=field_desc`
- Pagination: `?page=2` (default page size: 10)

### `toSearchParams<TWhereInput, TOrderByInput>(query: Partial<PrismaQuery<TWhereInput, TOrderByInput>>): URLSearchParams`

Converts a Prisma query object back to URLSearchParams.

### `parseNestedRelations(input: string | URLSearchParams): Record<string, any>`

Parses nested relation filters using dot notation.

Example: `?user.name=John&post.title_contains=hello`

### `mergeRelations<TWhereInput>(where: TWhereInput, relations: Record<string, any>): TWhereInput`

Merges nested relations into an existing where clause.

### `mergeWhere<TWhereInput>(contextualWhere: Partial<TWhereInput>, parsedQuery: PrismaQuery<TWhereInput>): PrismaQuery<TWhereInput>`

Merges contextual where clause (tenant filters, user filters, etc.) with parsed query.

**Priority**: `contextualWhere` takes priority (security - prevents URL override)

**Smart Merging**:
- Simple filters (no AND/OR/NOT) are merged with spread operator
- Complex filters with logical operators (AND/OR/NOT) are combined with AND to preserve all conditions
- Nested AND arrays are automatically flattened for cleaner queries

**Example:**
```typescript
// Simple merge (no logical operators)
const contextualWhere = { tenantId: 'tenant-123', userId: 'user-456' };
const query = parseSearchParams('?status=active&role=admin');
const merged = mergeWhere(contextualWhere, query);
// Result: { tenantId: 'tenant-123', userId: 'user-456', status: 'active', role: 'admin' }

// Smart merge (with OR conditions)
const query2 = parseSearchParams('?search=john', { searchFields: ['name', 'email'] });
const permissionWhere = {
  OR: [
    { allowedCoachTypes: { isEmpty: true } },
    { allowedCoachTypes: { has: 'coach-123' } }
  ]
};
const merged2 = mergeWhere(permissionWhere, query2);
// Result: { AND: [ { OR: [search conditions] }, { OR: [permission conditions] } ] }
// Both OR conditions are preserved!
```

### `mergeQuery<TWhereInput, TOrderByInput>(contextualQuery: Partial<PrismaQuery>, parsedQuery: PrismaQuery): PrismaQuery`

Merges contextual query (where + orderBy + pagination) with parsed query.

**Priority**:
- `where`: contextualQuery takes priority (security), with smart merging
- `orderBy`: parsedQuery takes priority (user choice)
- `skip/take`: parsedQuery takes priority

**Smart Merging**: Uses the same intelligent merge logic as `mergeWhere` to preserve logical operators.

**Example:**
```typescript
// Set default filters and sorting
const contextualQuery = {
  where: { tenantId: 'tenant-123' },
  orderBy: { createdAt: 'desc' }, // default sort
};

const query = parseSearchParams('?status=active&order=name_asc');
const merged = mergeQuery(contextualQuery, query);

// User can override orderBy but not tenantId
// WHERE tenantId = 'tenant-123' AND status = 'active' ORDER BY name ASC
```

**Alternative: Use `context` option (simpler)**

Instead of calling `mergeQuery()` separately, you can use the `context` option directly in `parseSearchParams()`:

```typescript
// ✨ Simpler approach - merge directly in parseSearchParams
const query = parseSearchParams('?status=active&order=name_asc', {
  context: {
    where: { tenantId: 'tenant-123' },
    orderBy: { createdAt: 'desc' }, // default sort (user can override)
  }
});

// Same result as mergeQuery() but in one call
const users = await prisma.user.findMany(query);
// WHERE tenantId = 'tenant-123' AND status = 'active' ORDER BY name ASC
```

**When to use each:**
- Use `context` option for simple cases (recommended)
- Use `mergeQuery()` function when you need more control or reusable contextual queries

### `createParser<TWhereInput, TOrderByInput>()`

Creates a reusable type-safe parser for a specific Prisma model.

**Type Parameters:**
- `TWhereInput` - Prisma WhereInput type
- `TOrderByInput` - Prisma OrderByWithRelationInput type

**Returns an object with:**
- `parse(input, options?)` - Parse search params
- `toParams(query)` - Convert to search params
- `parseRelations(input)` - Parse nested relations
- `mergeRelations(where, relations)` - Merge relations

**Example:**
```typescript
import { Prisma } from '@prisma/client';

const userParser = createParser<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>();

const postParser = createParser<
  Prisma.PostWhereInput,
  Prisma.PostOrderByWithRelationInput
>();

const userQuery = userParser.parse('?email_contains=@example.com&order=createdAt_desc');
const postQuery = postParser.parse('?published=true&order=title_asc');
```

---

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { 
  PrismaQuery, 
  PrismaWhere, 
  PrismaFilterValue,
  PrismaOperator,
  ParseOptions
} from 'prisma-searchparams-mapper';
```

**Type-safe with Prisma:**
```typescript
import { Prisma } from '@prisma/client';
import { parseSearchParams, createParser } from 'prisma-searchparams-mapper';

// Generic type parameters (where + orderBy)
const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>('?email=test@example.com&order=createdAt_desc');

// Reusable parsers
const userParser = createParser<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>();

const postParser = createParser<
  Prisma.PostWhereInput,
  Prisma.PostOrderByWithRelationInput
>();
```

> **Note**: This library uses generic types and doesn't install `@prisma/client` to avoid version conflicts.

## License

MIT © Nicolas Bocquet

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
