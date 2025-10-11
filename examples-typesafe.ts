/**
 * Type-safe examples with Prisma types
 *
 * This file demonstrates how to use the library with actual Prisma types.
 * Uncomment and adapt to your Prisma schema.
 */

import { createParser, parseSearchParams } from './src/index'

// Example 1: Using generic type parameter directly
// Assuming you have a Prisma schema with a User model

/*
import { Prisma } from '@prisma/client';

// Direct usage with both type parameters
const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>('?email_contains=@example.com&age_gte=18&order=createdAt_desc');

// query.where is typed as Prisma.UserWhereInput
// query.orderBy is typed as Prisma.UserOrderByWithRelationInput
const users = await prisma.user.findMany(query);
*/

// Example 2: Using createParser for reusable type-safe parsers

/*
import { Prisma } from '@prisma/client';

// Create a type-safe parser for User model with both types
const userParser = createParser<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>();

// Parse search params with full type safety
const query = userParser.parse('?status=active&role=admin&order=createdAt_desc');
// query.where is typed as Prisma.UserWhereInput
// query.orderBy is typed as Prisma.UserOrderByWithRelationInput

const users = await prisma.user.findMany(query);

// Convert back to search params
const params = userParser.toParams(query);
console.log(params.toString());
*/

// Example 3: Multiple model parsers

/*
import { Prisma } from '@prisma/client';

const userParser = createParser<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>();

const postParser = createParser<
  Prisma.PostWhereInput,
  Prisma.PostOrderByWithRelationInput
>();

const commentParser = createParser<
  Prisma.CommentWhereInput,
  Prisma.CommentOrderByWithRelationInput
>();

// Each parser is type-safe for its model
const userQuery = userParser.parse('?email_contains=@example.com&order=createdAt_desc');
const postQuery = postParser.parse('?published=true&title_contains=prisma&order=title_asc');
const commentQuery = commentParser.parse('?approved=true&order=createdAt_desc');
*/

// Example 4: With custom page size

/*
import { Prisma } from '@prisma/client';

const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>(
  '?status=active&page=2&order=createdAt_desc',
  { pageSize: 20 } // Custom page size instead of default 10
);

// query.skip = 20, query.take = 20
// Full type safety on where and orderBy
*/

// Example 5: Next.js App Router with type safety

/*
// app/users/page.tsx
import { parseSearchParams } from 'prisma-searchparams-mapper';
import { Prisma, prisma } from '@/lib/prisma';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) params.set(key, Array.isArray(value) ? value.join(',') : value);
  });

  // Type-safe parsing with both types
  const query = parseSearchParams<
    Prisma.UserWhereInput,
    Prisma.UserOrderByWithRelationInput
  >(params);
  
  // TypeScript knows query.where is Prisma.UserWhereInput
  // and query.orderBy is Prisma.UserOrderByWithRelationInput
  const users = await prisma.user.findMany(query);

  return <div>{JSON.stringify(users)}</div>;
}
*/

// Example 6: Remix with type safety

/*
// routes/users.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { parseSearchParams } from 'prisma-searchparams-mapper';
import { Prisma, prisma } from '~/lib/prisma';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  // Type-safe parsing with both types
  const query = parseSearchParams<
    Prisma.UserWhereInput,
    Prisma.UserOrderByWithRelationInput
  >(url.searchParams);
  
  const users = await prisma.user.findMany(query);
  
  return json({ users });
}
*/

console.log(
  'See comments in examples-typesafe.ts for usage with your Prisma schema',
)

// Example 7: Type-safe searchFields
/*
import { Prisma } from '@prisma/client';

// Direct fields - type-safe
const query = parseSearchParams<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>('?search=john', {
  searchFields: ['name', 'email', 'bio'], // ✅ TypeScript vérifie que ces champs existent
  // searchFields: ['invalidField'], // ❌ TypeScript error!
  searchMode: 'insensitive',
});

// Nested fields - flexible
const query2 = parseSearchParams<
  Prisma.PostWhereInput,
  Prisma.PostOrderByWithRelationInput
>('?search=john', {
  searchFields: ['title', 'content', 'author.name', 'author.email'], // ✅ Nested fields as strings
  searchMode: 'insensitive',
});

// Avec createParser
const userParser = createParser<
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
>();

const query3 = userParser.parse('?search=john', {
  searchFields: ['name', 'email'], // ✅ Type-safe avec autocomplétion
  searchMode: 'insensitive',
});
*/

console.log(
  'See comments in examples-typesafe.ts for type-safe searchFields usage',
)
