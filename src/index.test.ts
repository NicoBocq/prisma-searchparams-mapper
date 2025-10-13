import { describe, expect, it } from 'vitest'
import {
  createParser,
  mergeQuery,
  mergeRelations,
  mergeWhere,
  parseNestedRelations,
  parseSearchParams,
  toSearchParams,
} from './index'

// Mock Prisma types for testing
type MockUserWhereInput = {
  id?: number
  email?: string | { contains?: string }
  age?: number | { gte?: number; lte?: number }
  status?: string | { in?: string[] }
  role?: string | { in?: string[] }
}

describe('parseSearchParams', () => {
  it('should parse simple filters', () => {
    const result = parseSearchParams('?status=active&role=admin')
    expect(result.where).toEqual({ status: 'active', role: 'admin' })
  })

  it('should accept object input (Next.js searchParams)', () => {
    const result = parseSearchParams({ status: 'active', role: 'admin' })
    expect(result.where).toEqual({ status: 'active', role: 'admin' })
  })

  it('should handle array values in object input', () => {
    const result = parseSearchParams({ role: ['admin', 'user'] })
    expect(result.where).toEqual({ role: { in: ['admin', 'user'] } })
  })

  it('should handle undefined values in object input', () => {
    const result = parseSearchParams({ status: 'active', role: undefined })
    expect(result.where).toEqual({ status: 'active' })
  })

  it('should handle mixed types in object input', () => {
    const result = parseSearchParams({
      name: 'John',
      age: '30',
      isActive: 'true',
      score: '95.5',
    })
    expect(result.where).toEqual({
      name: 'John',
      age: 30,
      isActive: true,
      score: 95.5,
    })
  })

  it('should handle array of numbers in object input', () => {
    const result = parseSearchParams({ age_in: ['18', '25', '30'] })
    expect(result.where).toEqual({ age: { in: [18, 25, 30] } })
  })

  it('should handle array of booleans in object input', () => {
    const result = parseSearchParams({ isActive: ['true', 'false'] })
    expect(result.where).toEqual({ isActive: { in: [true, false] } })
  })

  it('should keep id fields as strings by default', () => {
    const result = parseSearchParams('?id=1234568&userId=9876543')
    expect(result.where).toEqual({ id: 1234568, userId: 9876543 })
  })

  it('should keep UUID-like IDs as strings', () => {
    const result = parseSearchParams('?id=550e8400-e29b-41d4-a716-446655440000')
    expect(result.where).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' })
  })

  it('should keep CUID-like IDs as strings', () => {
    const result = parseSearchParams('?id=clx123abc456def789')
    expect(result.where).toEqual({ id: 'clx123abc456def789' })
  })

  it('should parse boolean values', () => {
    const result = parseSearchParams('?isActive=true&isDeleted=false')
    expect(result.where).toEqual({ isActive: true, isDeleted: false })
  })

  it('should parse numeric values', () => {
    const result = parseSearchParams('?age=25&score=100')
    expect(result.where).toEqual({ age: 25, score: 100 })
  })

  it('should parse CSV as in operator', () => {
    const result = parseSearchParams('?role=admin,user,guest')
    expect(result.where).toEqual({ role: { in: ['admin', 'user', 'guest'] } })
  })

  it('should parse _in operator', () => {
    const result = parseSearchParams('?status_in=active,pending')
    expect(result.where).toEqual({ status: { in: ['active', 'pending'] } })
  })

  it('should parse comparison operators', () => {
    const result = parseSearchParams('?age_gte=18&age_lte=65')
    expect(result.where).toEqual({ age: { gte: 18, lte: 65 } })
  })

  it('should parse contains operator', () => {
    const result = parseSearchParams('?name_contains=john')
    expect(result.where).toEqual({ name: { contains: 'john' } })
  })

  it('should parse orderBy', () => {
    const result = parseSearchParams('?order=createdAt_desc')
    expect(result.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('should parse pagination', () => {
    const result = parseSearchParams('?page=2')
    expect(result.skip).toBe(10)
    expect(result.take).toBe(10)
  })

  it('should handle URLSearchParams input', () => {
    const params = new URLSearchParams('?status=active')
    const result = parseSearchParams(params)
    expect(result.where).toEqual({ status: 'active' })
  })
})

describe('toSearchParams', () => {
  it('should convert simple where to params', () => {
    const params = toSearchParams({
      where: { status: 'active', role: 'admin' },
    })
    expect(params.get('status')).toBe('active')
    expect(params.get('role')).toBe('admin')
  })

  it('should convert in operator to CSV', () => {
    const params = toSearchParams({
      where: { role: { in: ['admin', 'user'] } },
    })
    expect(params.get('role_in')).toBe('admin,user')
  })

  it('should convert orderBy', () => {
    const params = toSearchParams({ orderBy: { createdAt: 'desc' } })
    expect(params.get('order')).toBe('createdAt_desc')
  })

  it('should convert pagination', () => {
    const params = toSearchParams({ skip: 20, take: 10 })
    expect(params.get('page')).toBe('3')
  })
})

describe('parseNestedRelations', () => {
  it('should parse nested relations with dot notation', () => {
    const result = parseNestedRelations('?user.name=John&user.age=30')
    expect(result).toEqual({ user: { name: 'John', age: 30 } })
  })

  it('should parse deeply nested relations', () => {
    const result = parseNestedRelations('?user.profile.bio=Hello')
    expect(result).toEqual({ user: { profile: { bio: 'Hello' } } })
  })
})

describe('mergeRelations', () => {
  it('should merge relations with existing where', () => {
    const where = { status: 'active' }
    const relations = { user: { name: 'John' } }
    const result = mergeRelations(where, relations)
    expect(result).toEqual({ status: 'active', user: { name: 'John' } })
  })
})

describe('merge with contextual where', () => {
  it('should merge contextual where with helper function', () => {
    const contextualWhere = { tenantId: 'tenant-123', userId: 'user-456' }
    const query = parseSearchParams('?status=active&role=admin')

    const merged = mergeWhere(contextualWhere, query)

    expect(merged.where).toEqual({
      tenantId: 'tenant-123',
      userId: 'user-456',
      status: 'active',
      role: 'admin',
    })
  })

  it('should preserve orderBy and pagination when merging', () => {
    const contextualWhere = { tenantId: 'tenant-123' }
    const query = parseSearchParams(
      '?status=active&order=createdAt_desc&page=2',
    )

    const merged = mergeWhere(contextualWhere, query)

    expect(merged).toEqual({
      where: {
        tenantId: 'tenant-123',
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    })
  })
  it('should preserve existing where when merging', () => {
    const contextualWhere = { tenantId: 'XXXXXXXXXX' }
    const query = parseSearchParams('?tenantId=YYYYYYYYY')

    const merged = mergeWhere(contextualWhere, query)

    expect(merged.where).toEqual({
      tenantId: 'XXXXXXXXXX',
    })
  })
})

describe('Type-safe parsing', () => {
  it('should work with generic type parameter', () => {
    const result = parseSearchParams<MockUserWhereInput>(
      '?email_contains=test&age_gte=18',
    )
    expect(result.where).toEqual({
      email: { contains: 'test' },
      age: { gte: 18 },
    })
  })

  it('should work with createParser', () => {
    const userParser = createParser<MockUserWhereInput>()
    const result = userParser.parse('?status=active&role=admin')
    expect(result.where).toEqual({ status: 'active', role: 'admin' })
  })

  it('should convert back with type safety', () => {
    const userParser = createParser<MockUserWhereInput>()
    const params = userParser.toParams({
      where: { status: 'active', role: { in: ['admin', 'user'] } },
    })
    expect(params.get('status')).toBe('active')
    expect(params.get('role_in')).toBe('admin,user')
  })
})

describe('Page-based pagination', () => {
  it('should use default page size of 10', () => {
    const result = parseSearchParams('?page=2')
    expect(result.skip).toBe(10)
    expect(result.take).toBe(10)
  })

  it('should use custom page size from options', () => {
    const result = parseSearchParams('?page=2', { pageSize: 20 })
    expect(result.skip).toBe(20)
    expect(result.take).toBe(20)
  })

  it('should use pageSize from URL params', () => {
    const result = parseSearchParams('?page=2&pageSize=50')
    expect(result.skip).toBe(50)
    expect(result.take).toBe(50)
  })
})

describe('Offset-based pagination (infinite scroll)', () => {
  it('should support skip and take for offset-based pagination', () => {
    const result = parseSearchParams('?skip=20&take=10')
    expect(result.skip).toBe(20)
    expect(result.take).toBe(10)
  })

  it('should use skip=0 when skip is 0', () => {
    const result = parseSearchParams('?skip=0&take=10')
    expect(result.skip).toBe(0)
    expect(result.take).toBe(10)
  })

  it('should prioritize skip/take over page/pageSize', () => {
    const result = parseSearchParams('?page=2&pageSize=20&skip=15&take=10')
    expect(result.skip).toBe(15)
    expect(result.take).toBe(10)
  })

  it('should use skip without take', () => {
    const result = parseSearchParams('?skip=30')
    expect(result.skip).toBe(30)
    expect(result.take).toBe(10) // default pageSize
  })

  it('should use take without skip', () => {
    const result = parseSearchParams('?take=25')
    expect(result.skip).toBeUndefined()
    expect(result.take).toBe(25)
  })
})

describe('Search mode and operators', () => {
  it('should handle global search with OR across multiple fields', () => {
    const result = parseSearchParams('?search=john', {
      searchFields: ['name', 'email', 'bio'],
    })

    expect(result.where).toHaveProperty('OR')
    expect((result.where as any).OR).toHaveLength(3)
  })

  it('should add insensitive mode to search', () => {
    const result = parseSearchParams('?search=john', {
      searchFields: ['name', 'email'],
      searchMode: 'insensitive',
    })

    const orConditions = (result.where as any).OR
    expect(orConditions[0].name.mode).toBe('insensitive')
    expect(orConditions[1].email.mode).toBe('insensitive')
  })

  it('should add insensitive mode to contains operator', () => {
    const result = parseSearchParams('?name_contains=john', {
      searchMode: 'insensitive',
    })

    expect(result.where).toEqual({
      name: { contains: 'john', mode: 'insensitive' },
    })
  })

  it('should support startsWith and endsWith operators', () => {
    const result = parseSearchParams(
      '?email_startsWith=admin&name_endsWith=son',
    )

    expect(result.where).toEqual({
      email: { startsWith: 'admin' },
      name: { endsWith: 'son' },
    })
  })

  it('should add insensitive mode to startsWith and endsWith', () => {
    const result = parseSearchParams('?email_startsWith=admin', {
      searchMode: 'insensitive',
    })

    expect(result.where).toEqual({
      email: { startsWith: 'admin', mode: 'insensitive' },
    })
  })

  it('should support gt and lt operators', () => {
    const result = parseSearchParams('?age_gt=18&score_lt=100')

    expect(result.where).toEqual({
      age: { gt: 18 },
      score: { lt: 100 },
    })
  })

  it('should combine search with existing filters', () => {
    const result = parseSearchParams('?status=active&search=john', {
      searchFields: ['name', 'email'],
    })

    expect(result.where).toHaveProperty('AND')
  })

  it('should use q as alias for search', () => {
    const result = parseSearchParams('?q=john', {
      searchFields: ['name', 'email'],
    })

    expect(result.where).toHaveProperty('OR')
  })

  it('should support nested fields in searchFields', () => {
    const result = parseSearchParams('?search=john', {
      searchFields: ['name', 'user.email', 'post.title'],
    })

    expect(result.where).toHaveProperty('OR')
    const orConditions = (result.where as any).OR
    expect(orConditions).toHaveLength(3)
    expect(orConditions[0]).toHaveProperty('name')
    expect(orConditions[1]).toHaveProperty('user.email')
    expect(orConditions[2]).toHaveProperty('post.title')
  })
})

describe('Custom keys', () => {
  it('should use custom searchKey', () => {
    const result = parseSearchParams('?q=john', {
      searchFields: ['name', 'email'],
      searchKey: 'q',
    })

    expect(result.where).toHaveProperty('OR')
  })

  it('should use custom orderKey', () => {
    const result = parseSearchParams('?sort=name_asc', {
      orderKey: 'sort',
    })

    expect(result.orderBy).toEqual({ name: 'asc' })
  })

  it('should accept q as alias when searchKey is search', () => {
    const result = parseSearchParams('?q=john', {
      searchFields: ['name', 'email'],
      searchKey: 'search', // default
    })

    expect(result.where).toHaveProperty('OR')
  })

  it('should not accept q as alias when searchKey is custom', () => {
    const result = parseSearchParams('?q=john', {
      searchFields: ['name', 'email'],
      searchKey: 'query',
    })

    expect(result.where).not.toHaveProperty('OR')
  })

  it('should combine custom keys', () => {
    const result = parseSearchParams('?query=john&sort=name_desc', {
      searchFields: ['name'],
      searchKey: 'query',
      orderKey: 'sort',
    })

    expect(result.where).toHaveProperty('OR')
    expect(result.orderBy).toEqual({ name: 'desc' })
  })
})

describe('mergeQuery (where + orderBy)', () => {
  it('should merge where and orderBy', () => {
    const contextualQuery = {
      where: { tenantId: 'tenant-123' },
      orderBy: { createdAt: 'desc' as const },
    }
    const parsedQuery = parseSearchParams('?status=active')

    const merged = mergeQuery(contextualQuery, parsedQuery)

    expect(merged).toEqual({
      where: {
        status: 'active',
        tenantId: 'tenant-123',
      },
      orderBy: { createdAt: 'desc' },
      skip: undefined,
      take: undefined,
    })
  })

  it('should merge using mergeWith option', () => {
    const contextualQuery = {
      where: { tenantId: 'tenant-123' },
      orderBy: { createdAt: 'desc' as const },
    }

    const result = parseSearchParams('?status=active', {
      mergeWith: contextualQuery,
    })

    expect(result).toEqual({
      where: {
        status: 'active',
        tenantId: 'tenant-123',
      },
      orderBy: { createdAt: 'desc' },
      skip: undefined,
      take: undefined,
    })
  })

  it('should allow user to override default orderBy', () => {
    const contextualQuery = {
      where: { tenantId: 'tenant-123' },
      orderBy: { createdAt: 'desc' as const },
    }
    const parsedQuery = parseSearchParams('?status=active&order=name_asc')

    const merged = mergeQuery(contextualQuery, parsedQuery)

    expect(merged.orderBy).toEqual({ name: 'asc' })
  })

  it('should use default orderBy when user does not provide one', () => {
    const contextualQuery = {
      where: { tenantId: 'tenant-123' },
      orderBy: { createdAt: 'desc' as const },
    }
    const parsedQuery = parseSearchParams('?status=active')

    const merged = mergeQuery(contextualQuery, parsedQuery)

    expect(merged.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('should prevent user from overriding contextual where', () => {
    const contextualQuery = {
      where: { tenantId: 'tenant-123' },
    }
    const parsedQuery = parseSearchParams('?tenantId=tenant-456&status=active')

    const merged = mergeQuery(contextualQuery, parsedQuery)

    expect(merged.where).toEqual({
      status: 'active',
      tenantId: 'tenant-123', // contextual has priority
    })
  })

  it('should preserve pagination', () => {
    const contextualQuery = {
      where: { tenantId: 'tenant-123' },
      orderBy: { createdAt: 'desc' as const },
    }
    const parsedQuery = parseSearchParams('?page=2&pageSize=20')

    const merged = mergeQuery(contextualQuery, parsedQuery)

    expect(merged.skip).toBe(20)
    expect(merged.take).toBe(20)
  })

  it('should merge with complex contextual query using mergeWith', () => {
    const contextualQuery = {
      where: {
        tenantId: 'tenant-123',
        customerId: 'customer-456',
        shopifyId: { not: null },
      },
      orderBy: { updatedAt: 'desc' as const },
    }

    const result = parseSearchParams('?status=active&page=2', {
      mergeWith: contextualQuery,
      pageSize: 20,
    })

    expect(result).toEqual({
      where: {
        status: 'active',
        tenantId: 'tenant-123',
        customerId: 'customer-456',
        shopifyId: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      skip: 20,
      take: 20,
    })
  })

  it('should allow user to override orderBy with mergeWith', () => {
    const contextualQuery = {
      where: { tenantId: 'tenant-123' },
      orderBy: { createdAt: 'desc' as const },
    }

    const result = parseSearchParams('?status=active&order=name_asc', {
      mergeWith: contextualQuery,
    })

    expect(result.orderBy).toEqual({ name: 'asc' })
  })
})

describe('Edge cases', () => {
  it('should handle empty search params', () => {
    const result = parseSearchParams('')
    expect(result).toEqual({
      where: {},
      orderBy: undefined,
      skip: undefined,
      take: undefined,
    })
  })

  it('should handle empty URLSearchParams', () => {
    const result = parseSearchParams(new URLSearchParams())
    expect(result).toEqual({
      where: {},
      orderBy: undefined,
      skip: undefined,
      take: undefined,
    })
  })

  it('should handle params with empty values', () => {
    const result = parseSearchParams('?status=&name=')
    expect(result.where).toEqual({
      status: '',
      name: '',
    })
  })

  it('should handle special characters in values', () => {
    const result = parseSearchParams('?email=test%2Buser%40example.com')
    expect(result.where).toEqual({
      email: 'test+user@example.com',
    })
  })

  it('should handle multiple operators on same field', () => {
    const result = parseSearchParams('?age_gte=18&age_lte=65')
    expect(result.where).toEqual({
      age: { gte: 18, lte: 65 },
    })
  })

  it('should handle conflicting operators on same field', () => {
    const result = parseSearchParams('?age_gte=18&age_gt=20')
    expect(result.where).toEqual({
      age: { gte: 18, gt: 20 },
    })
  })

  it('should handle invalid page number', () => {
    const result = parseSearchParams('?page=invalid')
    expect(result.skip).toBe(0)
    expect(result.take).toBe(10)
  })

  it('should handle negative page number as page=1', () => {
    const result = parseSearchParams('?page=-1')
    expect(result.skip).toBe(0) // treated as page 1
    expect(result.take).toBe(10)
  })

  it('should handle page=0 as page=1', () => {
    const result = parseSearchParams('?page=0')
    expect(result.skip).toBe(0) // treated as page 1
    expect(result.take).toBe(10)
  })

  it('should handle invalid skip value', () => {
    const result = parseSearchParams('?skip=invalid')
    expect(result.skip).toBe(0)
  })

  it('should handle negative skip value', () => {
    const result = parseSearchParams('?skip=-10')
    expect(result.skip).toBe(-10)
  })

  it('should handle invalid take value', () => {
    const result = parseSearchParams('?take=invalid')
    expect(result.take).toBe(10) // default pageSize
  })

  it('should handle zero take value as default', () => {
    const result = parseSearchParams('?take=0')
    expect(result.take).toBe(10) // treated as default pageSize
  })

  it('should handle negative take value as default', () => {
    const result = parseSearchParams('?take=-5')
    expect(result.take).toBe(10) // treated as default pageSize
  })

  it('should handle invalid order format', () => {
    const result = parseSearchParams('?order=invalid')
    expect(result.orderBy).toEqual({ invalid: 'asc' })
  })

  it('should handle order without direction', () => {
    const result = parseSearchParams('?order=name')
    expect(result.orderBy).toEqual({ name: 'asc' })
  })

  it('should handle order with invalid direction', () => {
    const result = parseSearchParams('?order=name_invalid')
    expect(result.orderBy).toEqual({ name: 'asc' })
  })

  it('should handle search without searchFields', () => {
    const result = parseSearchParams('?search=john')
    expect(result.where).toEqual({})
  })

  it('should handle search with empty searchFields', () => {
    const result = parseSearchParams('?search=john', {
      searchFields: [],
    })
    expect(result.where).toEqual({})
  })

  it('should ignore empty search value', () => {
    const result = parseSearchParams('?search=', {
      searchFields: ['name'],
    })
    expect(result.where).toEqual({}) // empty search is ignored
  })

  it('should handle duplicate keys with different values', () => {
    const params = new URLSearchParams()
    params.append('status', 'active')
    params.append('status', 'pending')
    const result = parseSearchParams(params)
    expect(result.where).toEqual({
      status: { in: ['active', 'pending'] },
    })
  })

  it('should handle CSV with empty values', () => {
    const result = parseSearchParams('?role=admin,,user')
    expect(result.where).toEqual({
      role: { in: ['admin', '', 'user'] },
    })
  })

  it('should handle operator with empty value', () => {
    const result = parseSearchParams('?name_contains=')
    expect(result.where).toEqual({
      name: { contains: '' },
    })
  })

  it('should handle nested relations with empty values', () => {
    const result = parseNestedRelations('?user.name=')
    expect(result).toEqual({
      user: { name: '' },
    })
  })

  it('should handle deeply nested relations', () => {
    const result = parseNestedRelations('?user.profile.address.city=Paris')
    expect(result).toEqual({
      user: {
        profile: {
          address: {
            city: 'Paris',
          },
        },
      },
    })
  })

  it('should handle mergeWhere with empty contextual where', () => {
    const result = mergeWhere({}, parseSearchParams('?status=active'))
    expect(result.where).toEqual({ status: 'active' })
  })

  it('should handle mergeWhere with empty parsed query', () => {
    const result = mergeWhere({ tenantId: 'x' }, parseSearchParams(''))
    expect(result.where).toEqual({ tenantId: 'x' })
  })

  it('should handle mergeQuery with empty contextual query', () => {
    const result = mergeQuery({}, parseSearchParams('?status=active'))
    expect(result.where).toEqual({ status: 'active' })
  })

  it('should handle mergeQuery with only orderBy in contextual', () => {
    const result = mergeQuery(
      { orderBy: { createdAt: 'desc' } },
      parseSearchParams('?status=active'),
    )
    expect(result).toEqual({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      skip: undefined,
      take: undefined,
    })
  })

  it('should handle custom keys with special characters', () => {
    const result = parseSearchParams('?my-search=john', {
      searchFields: ['name'],
      searchKey: 'my-search',
    })
    expect(result.where).toHaveProperty('OR')
  })

  it('should handle boolean string values', () => {
    const result = parseSearchParams('?isActive=true&isDeleted=false')
    expect(result.where).toEqual({
      isActive: true,
      isDeleted: false,
    })
  })

  it('should handle numeric string values', () => {
    const result = parseSearchParams('?age=25&score=100.5')
    expect(result.where).toEqual({
      age: 25,
      score: 100.5,
    })
  })

  it('should trim and parse string that looks like number', () => {
    const result = parseSearchParams('?code= 123 ')
    expect(result.where).toEqual({
      code: 123, // trimmed and parsed as number
    })
  })

  it('should handle mixed types in CSV', () => {
    const result = parseSearchParams('?values=true,123,text,false')
    expect(result.where).toEqual({
      values: { in: [true, 123, 'text', false] },
    })
  })

  it('should handle URL with question mark prefix', () => {
    const result = parseSearchParams('?status=active')
    expect(result.where).toEqual({ status: 'active' })
  })

  it('should handle URL without question mark prefix', () => {
    const result = parseSearchParams('status=active')
    expect(result.where).toEqual({ status: 'active' })
  })

  it('should handle toSearchParams with empty query', () => {
    const params = toSearchParams({ where: {} })
    expect(params.toString()).toBe('')
  })

  it('should handle toSearchParams with undefined values', () => {
    const params = toSearchParams({
      where: { status: 'active' },
      orderBy: undefined,
      skip: undefined,
      take: undefined,
    })
    expect(params.toString()).toBe('status=active')
  })

  it('should handle single orderBy field', () => {
    const result = parseSearchParams('?order=status_asc')
    expect(result.orderBy).toEqual({ status: 'asc' })
  })
})

describe('not and notIn operators', () => {
  it('should parse not operator', () => {
    const result = parseSearchParams('?status_not=deleted')
    expect(result.where).toEqual({
      status: { not: 'deleted' },
    })
  })

  it('should parse notIn operator', () => {
    const result = parseSearchParams('?role_notIn=guest,banned')
    expect(result.where).toEqual({
      role: { notIn: ['guest', 'banned'] },
    })
  })

  it('should combine not with other operators', () => {
    const result = parseSearchParams('?age_gte=18&status_not=deleted')
    expect(result.where).toEqual({
      age: { gte: 18 },
      status: { not: 'deleted' },
    })
  })

  it('should parse notIn with single value', () => {
    const result = parseSearchParams('?status_notIn=deleted')
    expect(result.where).toEqual({
      status: { notIn: ['deleted'] },
    })
  })

  it('should parse not with boolean', () => {
    const result = parseSearchParams('?isDeleted_not=true')
    expect(result.where).toEqual({
      isDeleted: { not: true },
    })
  })

  it('should parse not with number', () => {
    const result = parseSearchParams('?age_not=25')
    expect(result.where).toEqual({
      age: { not: 25 },
    })
  })
})

describe('Sorting (orderBy)', () => {
  it('should parse sorting with underscore separator', () => {
    const result = parseSearchParams('?order=createdAt_desc')
    expect(result.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('should parse sorting with colon separator', () => {
    const result = parseSearchParams('?order=updatedAt:asc')
    expect(result.orderBy).toEqual({ updatedAt: 'asc' })
  })

  it('should default to asc if direction not specified', () => {
    const result = parseSearchParams('?order=name_invalid')
    expect(result.orderBy).toEqual({ name: 'asc' })
  })

  it('should work with custom order key', () => {
    const result = parseSearchParams('?sort=name_asc', { orderKey: 'sort' })
    expect(result.orderBy).toEqual({ name: 'asc' })
  })

  it('should work with custom order key and colon', () => {
    const result = parseSearchParams('?sort=name:desc', { orderKey: 'sort' })
    expect(result.orderBy).toEqual({ name: 'desc' })
  })

  it('should combine sorting with filters', () => {
    const result = parseSearchParams('?status=active&order=createdAt_desc')
    expect(result.where).toEqual({ status: 'active' })
    expect(result.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('should work with object input and underscore', () => {
    const result = parseSearchParams({ order: 'name_asc' })
    expect(result.orderBy).toEqual({ name: 'asc' })
  })

  it('should work with object input and colon', () => {
    const result = parseSearchParams({ order: 'name:desc' })
    expect(result.orderBy).toEqual({ name: 'desc' })
  })
})

describe('Nested Relations (automatic)', () => {
  it('should parse nested relation with simple value', () => {
    const result = parseSearchParams('?customer.name=John')
    expect(result.where).toEqual({
      customer: { name: 'John' },
    })
  })

  it('should parse nested relation with operator', () => {
    const result = parseSearchParams('?customer.email_contains=@example.com')
    expect(result.where).toEqual({
      customer: { email: { contains: '@example.com' } },
    })
  })

  it('should parse multiple nested relations', () => {
    const result = parseSearchParams(
      '?customer.name=John&customer.email_contains=@example.com',
    )
    expect(result.where).toEqual({
      customer: {
        name: 'John',
        email: { contains: '@example.com' },
      },
    })
  })

  it('should parse deeply nested relations', () => {
    const result = parseSearchParams('?user.profile.bio_contains=developer')
    expect(result.where).toEqual({
      user: {
        profile: {
          bio: { contains: 'developer' },
        },
      },
    })
  })

  it('should parse nested with case-insensitive mode', () => {
    const result = parseSearchParams('?customer.name_contains=john', {
      searchMode: 'insensitive',
    })
    expect(result.where).toEqual({
      customer: {
        name: { contains: 'john', mode: 'insensitive' },
      },
    })
  })

  it('should combine nested and non-nested filters', () => {
    const result = parseSearchParams(
      '?status=active&customer.name=John&role=admin',
    )
    expect(result.where).toEqual({
      status: 'active',
      customer: { name: 'John' },
      role: 'admin',
    })
  })

  it('should parse nested with in operator', () => {
    const result = parseSearchParams('?customer.role_in=admin,user')
    expect(result.where).toEqual({
      customer: { role: { in: ['admin', 'user'] } },
    })
  })

  it('should parse nested with comparison operators', () => {
    const result = parseSearchParams('?order.total_gte=100&order.total_lte=500')
    expect(result.where).toEqual({
      order: {
        total: { gte: 100, lte: 500 },
      },
    })
  })

  it('should work with object input', () => {
    const result = parseSearchParams({
      'customer.name': 'John',
      'customer.email_contains': '@example.com',
    })
    expect(result.where).toEqual({
      customer: {
        name: 'John',
        email: { contains: '@example.com' },
      },
    })
  })
})
