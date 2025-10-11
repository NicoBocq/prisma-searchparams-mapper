export type PrismaFilterValue =
  | string
  | number
  | boolean
  | (string | number | boolean)[]

export type PrismaOperator = {
  [operator: string]: PrismaFilterValue
}

export type PrismaWhere = Record<string, PrismaFilterValue | PrismaOperator>

export interface PrismaQuery<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
> {
  where: TWhereInput
  orderBy?: TOrderByInput | TOrderByInput[]
  skip?: number
  take?: number
}

export type SearchMode = 'default' | 'insensitive'
export type LogicalOperator = 'AND' | 'OR'

export interface ParseOptions<TWhereInput = PrismaWhere> {
  pageSize?: number
  searchMode?: SearchMode
  searchFields?: (keyof TWhereInput | string)[]
  logicalOperator?: LogicalOperator
}

export function parseSearchParams<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
>(
  input: string | URLSearchParams,
  options: ParseOptions<TWhereInput> = {},
): PrismaQuery<TWhereInput, TOrderByInput> {
  const params =
    typeof input === 'string'
      ? new URLSearchParams(input.startsWith('?') ? input : '?' + input)
      : input

  const where: any = {}
  const orderBy: Record<string, 'asc' | 'desc'> = {}
  let take: number | undefined
  let skip: number | undefined
  let pageSize = options.pageSize || 10

  // Handle global search with OR logic
  let searchValue: string | undefined
  const searchMode = options.searchMode || 'default'
  const logicalOp = options.logicalOperator

  // First pass: check for offset-based params (priority)
  if (params.has('skip')) {
    skip = Number(params.get('skip')) || 0
  }
  if (params.has('take')) {
    take = Number(params.get('take')) || pageSize
  }

  // Second pass: handle page-based if offset not set
  if (skip === undefined && params.has('page')) {
    // Update pageSize first if provided
    if (params.has('pageSize')) {
      pageSize = Number(params.get('pageSize')) || pageSize
    }

    const page = Number(params.get('page')) || 1
    skip = (page - 1) * pageSize
    if (take === undefined) {
      take = pageSize
    }
  }

  // If only take is set without skip, keep skip undefined
  // If skip is set without take, use default pageSize
  if (skip !== undefined && take === undefined) {
    take = pageSize
  }

  params.forEach((value, key) => {
    // Skip pagination params (already handled)
    if (['skip', 'take', 'page', 'pageSize'].includes(key)) {
      return
    }

    // Global search parameter
    if (key === 'search' || key === 'q') {
      searchValue = value
      return
    }

    // order
    if (key === 'order') {
      const [field, dir] = value.split('_')
      orderBy[field] = dir === 'desc' ? 'desc' : 'asc'
      return
    }

    // operators: _in, _gte, _lte, _contains, _startsWith, _endsWith
    const operatorMatch = key.match(
      /(.+?)_(in|gte|lte|gt|lt|contains|startsWith|endsWith)$/,
    )
    if (operatorMatch) {
      const [, field, op] = operatorMatch
      const vals = value.includes(',')
        ? value.split(',').map(normalizeValue)
        : [normalizeValue(value)]

      const operatorValue = op === 'in' ? vals : vals[0]
      const condition: any = { [op]: operatorValue }

      // Add mode for string operations
      if (
        searchMode === 'insensitive' &&
        ['contains', 'startsWith', 'endsWith'].includes(op)
      ) {
        condition.mode = 'insensitive'
      }

      // Merge with existing operators on the same field
      if (where[field] && typeof where[field] === 'object') {
        where[field] = { ...where[field], ...condition }
      } else {
        where[field] = condition
      }
      return
    }

    // multi-values same key -> in
    const existing = where[key]
    if (existing) {
      if (Array.isArray(existing)) {
        ;(existing as (string | number | boolean)[]).push(normalizeValue(value))
      } else if (
        typeof existing === 'object' &&
        existing !== null &&
        'in' in existing
      ) {
        const inValue = (existing as PrismaOperator).in
        if (Array.isArray(inValue)) {
          inValue.push(normalizeValue(value))
        }
      } else {
        where[key] = {
          in: [existing as string | number | boolean, normalizeValue(value)],
        }
      }
      return
    }

    // CSV -> in
    if (value.includes(',')) {
      where[key] = { in: value.split(',').map(normalizeValue) }
      return
    }

    // simple value
    where[key] = normalizeValue(value)
  })

  // Handle global search across multiple fields
  if (searchValue && options.searchFields && options.searchFields.length > 0) {
    const searchConditions = options.searchFields.map((field) => {
      const condition: any = {
        [field]: {
          contains: searchValue,
          ...(searchMode === 'insensitive' && { mode: 'insensitive' }),
        },
      }
      return condition
    })

    // Combine with existing where conditions
    if (Object.keys(where).length > 0) {
      where[logicalOp || 'AND'] = [{ ...where }, { OR: searchConditions }]
      // Clear the original where keys
      Object.keys(where).forEach((key) => {
        if (key !== (logicalOp || 'AND')) {
          delete where[key]
        }
      })
    } else {
      where.OR = searchConditions
    }
  }

  return {
    where: where as TWhereInput,
    orderBy:
      Object.keys(orderBy).length > 0 ? (orderBy as TOrderByInput) : undefined,
    skip,
    take,
  }
}

// helper
function normalizeValue(v: string): string | number | boolean {
  if (v === 'true') return true
  if (v === 'false') return false
  const num = Number(v)
  if (!isNaN(num) && v.trim() !== '') return num
  return v
}

/**
 * Convert Prisma query back to URLSearchParams
 */
export function toSearchParams<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
>(query: Partial<PrismaQuery<TWhereInput, TOrderByInput>>): URLSearchParams {
  const params = new URLSearchParams()

  // where filters
  if (query.where) {
    Object.entries(query.where).forEach(([key, value]) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // operators
        Object.entries(value).forEach(([op, val]) => {
          if (Array.isArray(val)) {
            params.set(`${key}_${op}`, val.join(','))
          } else {
            params.set(`${key}_${op}`, String(val))
          }
        })
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','))
      } else {
        params.set(key, String(value))
      }
    })
  }

  // orderBy
  if (query.orderBy) {
    const orderByArray = Array.isArray(query.orderBy)
      ? query.orderBy
      : [query.orderBy]
    orderByArray.forEach((orderItem) => {
      Object.entries(orderItem as Record<string, any>).forEach(
        ([field, dir]) => {
          if (typeof dir === 'string' && (dir === 'asc' || dir === 'desc')) {
            params.append('order', `${field}_${dir}`)
          }
        },
      )
    })
  }

  // pagination
  if (query.skip !== undefined && query.take !== undefined) {
    const page = Math.floor(query.skip / query.take) + 1
    params.set('page', String(page))
  }

  return params
}

/**
 * Parse nested relation filters from searchParams
 * Example: user.name=John -> { user: { name: 'John' } }
 */
export function parseNestedRelations(
  input: string | URLSearchParams,
): Record<string, any> {
  const params =
    typeof input === 'string'
      ? new URLSearchParams(input.startsWith('?') ? input : '?' + input)
      : input

  const result: Record<string, any> = {}

  params.forEach((value, key) => {
    if (key.includes('.')) {
      const parts = key.split('.')
      let current = result

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current[part] = normalizeValue(value)
        } else {
          current[part] = current[part] || {}
          current = current[part]
        }
      })
    }
  })

  return result
}

/**
 * Merge nested relations into Prisma where clause
 */
export function mergeRelations<TWhereInput = PrismaWhere>(
  where: TWhereInput,
  relations: Record<string, any>,
): TWhereInput {
  return { ...where, ...relations } as TWhereInput
}

/**
 * Type-safe parser with Prisma WhereInput and OrderByInput
 */
export function createParser<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
>() {
  return {
    parse: (
      input: string | URLSearchParams,
      options?: ParseOptions<TWhereInput>,
    ) => parseSearchParams<TWhereInput, TOrderByInput>(input, options),
    toParams: (query: Partial<PrismaQuery<TWhereInput, TOrderByInput>>) =>
      toSearchParams<TWhereInput, TOrderByInput>(query),
    parseRelations: (input: string | URLSearchParams) =>
      parseNestedRelations(input),
    mergeRelations: (where: TWhereInput, relations: Record<string, any>) =>
      mergeRelations<TWhereInput>(where, relations),
  }
}
