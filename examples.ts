import {
  mergeRelations,
  parseNestedRelations,
  parseSearchParams,
  toSearchParams,
} from './src/index'

// Example 1: Basic filtering
console.log('Example 1: Basic filtering')
const query1 = parseSearchParams('?status=active&role=admin')
console.log(JSON.stringify(query1, null, 2))

// Example 2: Operators
console.log('\nExample 2: Operators')
const query2 = parseSearchParams('?age_gte=18&age_lte=65&name_contains=john')
console.log(JSON.stringify(query2, null, 2))

// Example 3: Multiple values
console.log('\nExample 3: Multiple values')
const query3 = parseSearchParams('?role_in=admin,user,guest')
console.log(JSON.stringify(query3, null, 2))

// Example 4: Sorting and pagination
console.log('\nExample 4: Sorting and pagination')
const query4 = parseSearchParams('?order=createdAt_desc&page=2')
console.log(JSON.stringify(query4, null, 2))

// Example 5: Convert back to search params
console.log('\nExample 5: Convert back to search params')
const params = toSearchParams({
  where: { status: 'active', role: { in: ['admin', 'user'] } },
  orderBy: { createdAt: 'desc' },
  skip: 10,
  take: 10,
})
console.log(params.toString())

// Example 6: Nested relations
console.log('\nExample 6: Nested relations')
const relations = parseNestedRelations(
  '?user.name=John&user.email_contains=@example.com',
)
console.log(JSON.stringify(relations, null, 2))

// Example 7: Merge relations
console.log('\nExample 7: Merge relations')
const baseQuery = parseSearchParams('?status=active')
const fullWhere = mergeRelations(baseQuery.where, relations)
console.log(JSON.stringify(fullWhere, null, 2))

// Example 8: Global search with OR
console.log('\nExample 8: Global search with OR')
const query8 = parseSearchParams('?search=john', {
  searchFields: ['name', 'email', 'bio'],
  searchMode: 'insensitive',
})
console.log(JSON.stringify(query8, null, 2))

// Example 9: Case-insensitive contains
console.log('\nExample 9: Case-insensitive contains')
const query9 = parseSearchParams('?name_contains=john&email_startsWith=admin', {
  searchMode: 'insensitive',
})
console.log(JSON.stringify(query9, null, 2))

// Example 10: Combined search with filters
console.log('\nExample 10: Combined search with filters')
const query10 = parseSearchParams('?status=active&role=admin&search=john', {
  searchFields: ['name', 'email'],
  searchMode: 'insensitive',
})
console.log(JSON.stringify(query10, null, 2))

// Example 11: All string operators
console.log('\nExample 11: All string operators')
const query11 = parseSearchParams(
  '?name_contains=john&email_startsWith=admin&bio_endsWith=dev',
)
console.log(JSON.stringify(query11, null, 2))

// Example 12: All comparison operators
console.log('\nExample 12: All comparison operators')
const query12 = parseSearchParams(
  '?age_gt=18&age_lt=65&score_gte=50&score_lte=100',
)
console.log(JSON.stringify(query12, null, 2))

// Example 13: Offset-based pagination (infinite scroll)
console.log('\nExample 13: Offset-based pagination')
const query13 = parseSearchParams('?skip=20&take=10')
console.log(JSON.stringify(query13, null, 2))

// Example 14: Mixed - skip/take priority over page
console.log('\nExample 14: skip/take priority')
const query14 = parseSearchParams('?page=2&skip=15&take=10')
console.log(JSON.stringify(query14, null, 2))
