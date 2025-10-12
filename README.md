# 🧭 prisma-searchparams-mapper

[![npm version](https://img.shields.io/npm/v/prisma-searchparams-mapper.svg?color=blue)](https://www.npmjs.com/package/prisma-searchparams-mapper)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![typescript](https://img.shields.io/badge/written%20in-TypeScript-blue)](tsconfig.json)
[![AI friendly](https://img.shields.io/badge/AI-friendly-purple)](AI_USAGE.md)

Convert your **URLSearchParams** ↔ **Prisma queries** (`where`, `orderBy`, pagination) —  
perfect for **Next.js**, **Remix**, or any app bridging the client’s query string with Prisma filters.

---

## Why prisma-searchparams-mapper?

**Stop writing boilerplate!** Turn 50+ lines of manual URL parsing into a single line.

### Before (Manual parsing 😫)
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

### After (One line 🎉)
```typescript
const query = parseSearchParams<Prisma.UserWhereInput>(searchParams);
const users = await prisma.user.findMany(query);
```

### Perfect for

- 🔍 **Search pages** with filters and sorting
- 📊 **Admin dashboards** with complex queries
- 🏢 **Multi-tenant apps** (built-in context merging)
- ♾️ **Infinite scroll** (offset-based pagination)
- 🎨 **Data tables** with dynamic filtering

---

## ✨ Features

- 🔁 **Bidirectional mapping**:  
  `URLSearchParams` → Prisma `{ where, orderBy, take, skip }` and back.
- ⚙️ **Type-safe ready**:  
  Works with your Prisma models’ typings.
- 🧩 **Platform-agnostic**:  
  Works with Next.js, TanStack Router, Express, Fastify, or any Node.js framework.
- 🔗 **Plays well with others**:  
  Combine with nuqs for client-side state management.
- 🧠 **Simple, predictable syntax**:  
  `?status=active&role_in=admin,user&order=createdAt_desc&page=2`
- 🔍 **Global search**:  
  Search across multiple fields with `?search=john` or `?q=john`
- 🔤 **Case-insensitive mode**:  
  Built-in support for case-insensitive search
- 🔗 **Relations support**:  
  Handle nested Prisma relations with dot notation (`user.name=John`)

---

## 📦 Installation

```bash
npm install prisma-searchparams-mapper
# or
pnpm add prisma-searchparams-mapper
# or
yarn add prisma-searchparams-mapper
```

> **Note**: This library works with or without Prisma. If you want type-safe integration, make sure you have `@prisma/client` installed in your project. The library uses generic types and doesn't install Prisma to avoid version conflicts.

---

## 🚀 Usage

### Basic Example

```typescript
import { parseSearchParams } from 'prisma-searchparams-mapper';

// From URL search params to Prisma query
const searchParams = new URLSearchParams('?status=active&role=admin&page=1');
const prismaQuery = parseSearchParams(searchParams);

// Use with Prisma
const users = await prisma.user.findMany(prismaQuery);
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

### Nested Relations

```typescript
import { parseNestedRelations, mergeRelations } from 'prisma-searchparams-mapper';

// ?user.name=John&user.email_contains=@example.com
const relations = parseNestedRelations('?user.name=John&user.email_contains=@example.com');
// Result: { user: { name: 'John', email: { contains: '@example.com' } } }

// Merge with existing where clause
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
  searchParams: <Promise>{ [key: string]: string | string[] | undefined };
}) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) params.set(key, Array.isArray(value) ? value.join(',') : value);
  });

  // Type-safe parsing with Prisma types
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
    const params = new URLSearchParams(deps as any);
    
    const query = parseSearchParams<
      Prisma.UserWhereInput,
      Prisma.UserOrderByWithRelationInput
    >(params, {
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

## 📖 API Reference

### `parseSearchParams<TWhereInput, TOrderByInput>(input: string | URLSearchParams, options?: ParseOptions): PrismaQuery<TWhereInput, TOrderByInput>`

Converts URL search parameters to a Prisma query object.

**Type Parameters:**
- `TWhereInput` - Prisma WhereInput type (e.g., `Prisma.UserWhereInput`)
- `TOrderByInput` - Prisma OrderByWithRelationInput type (e.g., `Prisma.UserOrderByWithRelationInput`)

**Parameters:**
- `input` - URL search params string or URLSearchParams object
- `options` - Optional configuration
  - `pageSize` - Items per page (default: 10)
  - `searchMode` - Search mode: `'default'` or `'insensitive'` (case-insensitive)
  - `searchFields` - Array of field names for global search (type-safe with Prisma types)
  - `logicalOperator` - Logical operator: `'AND'` or `'OR'` for combining conditions
  - `searchKey` - Custom key for global search (default: `'search'`, also accepts `'q'` as alias)
  - `orderKey` - Custom key for sorting (default: `'order'`)

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

**Example:**
```typescript
// Add tenant/user context to search params
const contextualWhere = { tenantId: 'tenant-123', userId: 'user-456' };
const query = parseSearchParams('?status=active&role=admin');
const merged = mergeWhere(contextualWhere, query);

// Use with Prisma
const users = await prisma.user.findMany(merged);
// WHERE tenantId = 'tenant-123' AND userId = 'user-456' AND status = 'active' AND role = 'admin'
```

### `mergeQuery<TWhereInput, TOrderByInput>(contextualQuery: Partial<PrismaQuery>, parsedQuery: PrismaQuery): PrismaQuery`

Merges contextual query (where + orderBy + pagination) with parsed query.

**Priority**:
- `where`: contextualQuery takes priority (security)
- `orderBy`: parsedQuery takes priority (user choice)
- `skip/take`: parsedQuery takes priority

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

## 🛠️ TypeScript Support

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

---

## 📝 License

MIT © Nicolas Bocquet

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📊 Comparison

| Feature | Manual parsing | This library |
|---------|---------------|--------------|
| Lines of code | 50+ | 1 |
| Type-safe | ❌ | ✅ |
| Edge cases handled | ❌ | ✅ |
| Bidirectional (URL ↔ Prisma) | ❌ | ✅ |
| Multi-tenant support | ❌ | ✅ |
| Framework-agnostic | ❌ | ✅ |
| Bundle size | N/A | < 5kb |
| Tests | ❌ | 100+ |

## 🔗 Links

- [npm package](https://www.npmjs.com/package/prisma-searchparams-mapper)
- [GitHub repository](https://github.com/yourusername/prisma-searchparams-mapper)
- [USAGE.md](./USAGE.md) - Detailed guide with Prisma examples
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [AI_USAGE.md](./AI_USAGE.md) - Guide for AI assistants
