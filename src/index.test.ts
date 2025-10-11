import { describe, expect, it } from 'vitest'
import {
  createParser,
  mergeRelations,
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
