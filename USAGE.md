# Usage Guide with Prisma

## Installation

```bash
npm install prisma-searchparams-mapper
# or
pnpm add prisma-searchparams-mapper
```

## Prisma Configuration

This library works **with or without Prisma**:

### Without Prisma (generic types)
```typescript
import { parseSearchParams } from 'prisma-searchparams-mapper';

const query = parseSearchParams('?status=active');
// Works with generic types
```

### With Prisma (type-safe)
Make sure you have Prisma installed and configured in your project:

```bash
npm install @prisma/client prisma
npx prisma init
```

> **Important**: The library does NOT install `@prisma/client` to avoid version conflicts. It uses generic types that adapt to your Prisma version.

## Example Prisma Schema

```prisma
// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  age       Int?
  role      Role     @default(USER)
  status    Status   @default(ACTIVE)
  createdAt DateTime @default(now())
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

enum Status {
  ACTIVE
  INACTIVE
  BANNED
}
```

## Type-Safe Usage

### 1. Direct usage with generic types

```typescript
import { parseSearchParams } from 'prisma-searchparams-mapper';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Parse parameters with full type safety
const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>(
  '?email_contains=@example.com&age_gte=18&status=ACTIVE&order=createdAt_desc'
);

// TypeScript knows that:
// - query.where is of type Prisma.UserWhereInput
// - query.orderBy is of type Prisma.UserOrderByWithRelationInput
const users = await prisma.user.findMany(query);
```

### 2. Create reusable parsers

```typescript
import { createParser } from 'prisma-searchparams-mapper';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create type-safe parsers for each model
const userParser = createParser<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>();

const postParser = createParser<
  Prisma.PostWhereInput,
  Prisma.PostOrderByWithRelationInput
>();

// Use parsers with full type safety
const userQuery = userParser.parse('?role_in=ADMIN,MODERATOR&status=ACTIVE&order=createdAt_desc');
const users = await prisma.user.findMany(userQuery);

const postQuery = postParser.parse('?published=true&title_contains=prisma&order=title_asc');
const posts = await prisma.post.findMany(postQuery);
```

## Framework Examples

### Next.js 14+ (App Router)

```typescript
// app/users/page.tsx
import { parseSearchParams } from 'prisma-searchparams-mapper';
import { Prisma, prisma } from '@/lib/prisma';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Convert searchParams to URLSearchParams
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, Array.isArray(value) ? value.join(',') : value);
    }
  });

  // Parse with full type safety
  const query = parseSearchParams<
    Prisma.UserWhereInput,
    Prisma.UserOrderByWithRelationInput
  >(params, {
    pageSize: 20, // 20 items per page
  });

  // Fetch users
  const [users, total] = await Promise.all([
    prisma.user.findMany(query),
    prisma.user.count({ where: query.where }),
  ]);

  return (
    <div>
      <h1>Users ({total})</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.email}</li>
        ))}
      </ul>
    </div>
  );
}

// Example URLs:
// /users?email_contains=@example.com
// /users?role_in=ADMIN,MODERATOR&status=ACTIVE
// /users?age_gte=18&age_lte=65&order=createdAt_desc
// /users?status=ACTIVE&page=2&pageSize=50
```

### Next.js API Route

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseSearchParams } from 'prisma-searchparams-mapper';
import { Prisma, prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const query = parseSearchParams<
    Prisma.UserWhereInput,
    Prisma.UserOrderByWithRelationInput
  >(searchParams);
  
  const users = await prisma.user.findMany(query);
  
  return NextResponse.json({ users });
}
```

### TanStack Router

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
    
    const [users, total] = await Promise.all([
      prisma.user.findMany(query),
      prisma.user.count({ where: query.where }),
    ]);
    
    return { users, total };
  },
});

function UsersComponent() {
  const { users, total } = Route.useLoaderData();
  
  return (
    <div>
      <h1>Users ({total})</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.email}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Express.js

```typescript
import express from 'express';
import { parseSearchParams } from 'prisma-searchparams-mapper';
import { Prisma, PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.get('/api/users', async (req, res) => {
  const searchParams = new URLSearchParams(req.url.split('?')[1]);
  
  const query = parseSearchParams<
    Prisma.UserWhereInput,
    Prisma.UserOrderByWithRelationInput
  >(searchParams);
  
  const users = await prisma.user.findMany(query);
  
  res.json({ users });
});

app.listen(3000);
```

## Advanced Patterns

### Combined Filters

```typescript
// URL: ?email_contains=@example.com&age_gte=18&age_lte=65&role_in=ADMIN,USER&status=ACTIVE&order=createdAt_desc&page=2

const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>(searchParams);

// Result:
// {
//   where: {
//     email: { contains: '@example.com' },
//     age: { gte: 18, lte: 65 },
//     role: { in: ['ADMIN', 'USER'] },
//     status: 'ACTIVE'
//   },
//   orderBy: { createdAt: 'desc' },
//   skip: 10,
//   take: 10
// }
```

### Global Search

```typescript
// Case-insensitive search across multiple fields
// URL: ?search=john

const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>(searchParams, {
  searchFields: ['name', 'email', 'bio'],
  searchMode: 'insensitive',
});

// Result:
// {
//   where: {
//     OR: [
//       { name: { contains: 'john', mode: 'insensitive' } },
//       { email: { contains: 'john', mode: 'insensitive' } },
//       { bio: { contains: 'john', mode: 'insensitive' } }
//     ]
//   }
// }

const users = await prisma.user.findMany(query);
```

### Combined Search with Filters

```typescript
// URL: ?status=ACTIVE&role=ADMIN&search=john

const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>(searchParams, {
  searchFields: ['name', 'email'],
  searchMode: 'insensitive',
});

// Result: Automatically combines with AND
// {
//   where: {
//     AND: [
//       { status: 'ACTIVE', role: 'ADMIN' },
//       {
//         OR: [
//           { name: { contains: 'john', mode: 'insensitive' } },
//           { email: { contains: 'john', mode: 'insensitive' } }
//         ]
//       }
//     ]
//   }
// }
```

### String Operators with Insensitive Mode

```typescript
// URL: ?name_contains=john&email_startsWith=admin

const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>(searchParams, {
  searchMode: 'insensitive',
});

// Result:
// {
//   where: {
//     name: { contains: 'john', mode: 'insensitive' },
//     email: { startsWith: 'admin', mode: 'insensitive' }
//   }
// }
```

### Nested Relations

```typescript
import { parseNestedRelations, mergeRelations } from 'prisma-searchparams-mapper';

// URL: ?status=ACTIVE&author.email_contains=@example.com&author.role=ADMIN

const baseQuery = parseSearchParams<
  Prisma.PostWhereInput,
  Prisma.PostOrderByWithRelationInput
>('?status=ACTIVE&order=createdAt_desc');
const relations = parseNestedRelations('?author.email_contains=@example.com&author.role=ADMIN');

const fullWhere = mergeRelations(baseQuery.where, relations);

const posts = await prisma.post.findMany({
  where: fullWhere,
  include: { author: true },
});
```

### Reverse Conversion (Prisma → URL)

```typescript
import { toSearchParams } from 'prisma-searchparams-mapper';

const prismaQuery = {
  where: {
    status: 'ACTIVE',
    role: { in: ['ADMIN', 'MODERATOR'] },
    age: { gte: 18 },
  },
  orderBy: { createdAt: 'desc' },
  skip: 20,
  take: 10,
};

const searchParams = toSearchParams(prismaQuery);
console.log(searchParams.toString());
// Output: status=ACTIVE&role_in=ADMIN,MODERATOR&age_gte=18&order=createdAt_desc&page=3
```

## Supported Operators

| Operator | URL Syntax | Prisma Equivalent |
|----------|------------|-------------------|
| Equality | `?status=ACTIVE` | `{ status: 'ACTIVE' }` |
| In | `?role_in=ADMIN,USER` | `{ role: { in: ['ADMIN', 'USER'] } }` |
| Contains | `?email_contains=@example` | `{ email: { contains: '@example' } }` |
| Starts with | `?email_startsWith=admin` | `{ email: { startsWith: 'admin' } }` |
| Ends with | `?name_endsWith=son` | `{ name: { endsWith: 'son' } }` |
| Greater than | `?age_gt=18` | `{ age: { gt: 18 } }` |
| Greater than or equal | `?age_gte=18` | `{ age: { gte: 18 } }` |
| Less than | `?age_lt=65` | `{ age: { lt: 65 } }` |
| Less than or equal | `?age_lte=65` | `{ age: { lte: 65 } }` |
| Global search | `?search=john` or `?q=john` | `{ OR: [...] }` (with searchFields) |
| Insensitive mode | Option: `searchMode: 'insensitive'` | `{ contains: 'x', mode: 'insensitive' }` |
| Sorting | `?order=createdAt_desc` | `{ orderBy: { createdAt: 'desc' } }` |
| Pagination (page) | `?page=2` | `{ skip: 10, take: 10 }` |
| Pagination (offset) | `?skip=20&take=10` | `{ skip: 20, take: 10 }` |
| Page size | `?pageSize=20` | `{ take: 20 }` |

## Two Pagination Modes

### 1. Page-based (classic pagination)

For UI with page numbers:

```typescript
// URL: ?page=1&pageSize=20
const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>('?page=1&pageSize=20');

// Result: { where: {}, skip: 0, take: 20 }
const users = await prisma.user.findMany(query);
```

### 2. Offset-based (infinite scroll)

For infinite scroll where frontend manages skip:

```typescript
// Frontend sends: ?skip=20&take=10
const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>('?skip=20&take=10');

// Result: { where: {}, skip: 20, take: 10 }
const users = await prisma.user.findMany(query);
```

**Priority**: If both `skip` and `page` are present, `skip` takes priority.

## Best Practices

1. **Always use Prisma types** to benefit from autocomplete and type checking
2. **Validate inputs** server-side before passing to Prisma
3. **Limit page sizes** to avoid heavy queries
4. **Use indexes** on frequently filtered columns
5. **Create reusable parsers** for each model with `createParser()`
6. **Choose the right pagination mode**: page-based for classic UI, offset-based for infinite scroll

## Security

⚠️ **Important**: This library does NOT validate user inputs. You must:

1. Validate parameters before using them
2. Limit allowed fields for filtering
3. Implement pagination limits
4. Check user permissions

Validation example:

```typescript
import { z } from 'zod';

const userSearchSchema = z.object({
  email_contains: z.string().optional(),
  role_in: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']).optional(),
  page: z.coerce.number().min(1).max(100).optional(),
});

// Validate before parsing
const validated = userSearchSchema.parse(Object.fromEntries(searchParams));
const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>(
  new URLSearchParams(validated as any)
);
```
