export type PrismaFilterValue =
  | string
  | number
  | boolean
  | (string | number | boolean)[]

export type PrismaOperator = {
  [operator: string]: PrismaFilterValue
}

export type PrismaWhere = Record<string, PrismaFilterValue | PrismaOperator>

export interface SearchParamsQuery<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
> {
  where: TWhereInput
  orderBy?: TOrderByInput | TOrderByInput[]
  skip?: number
  take?: number
}

/**
 * @deprecated Use SearchParamsQuery instead
 */
export type PrismaQuery<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
> = SearchParamsQuery<TWhereInput, TOrderByInput>

export type SearchMode = 'default' | 'insensitive'
export type LogicalOperator = 'AND' | 'OR'

export interface ParseOptions<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
> {
  pageSize?: number
  searchMode?: SearchMode
  searchFields?: (keyof TWhereInput | string)[]
  logicalOperator?: LogicalOperator
  searchKey?: string // Default: 'search' (also accepts 'q' as alias)
  orderKey?: string // Default: 'order'
  mergeWith?: Partial<SearchParamsQuery<TWhereInput, TOrderByInput>> // Merge with existing query
}

export function parseSearchParams<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
>(
  input:
    | string
    | URLSearchParams
    | Record<string, string | string[] | undefined>,
  options: ParseOptions<TWhereInput, TOrderByInput> = {},
): SearchParamsQuery<TWhereInput, TOrderByInput> {
  let params: URLSearchParams

  if (typeof input === 'string') {
    params = new URLSearchParams(input.startsWith('?') ? input : `?${input}`)
  } else if (input instanceof URLSearchParams) {
    params = input
  } else {
    // Convert object to URLSearchParams
    params = new URLSearchParams()
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, Array.isArray(value) ? value.join(',') : String(value))
      }
    })
  }

  // Using Record for dynamic property access, will be cast to TWhereInput at the end
  const where: Record<string, any> = {}
  const orderBy: Record<string, 'asc' | 'desc'> = {}
  let take: number | undefined
  let skip: number | undefined
  let pageSize = options.pageSize || 10

  // Handle global search with OR logic
  let searchValue: string | undefined
  const searchMode = options.searchMode || 'insensitive'
  const logicalOp = options.logicalOperator
  const searchKey = options.searchKey || 'search'
  const orderKey = options.orderKey || 'order'

  // First pass: check for offset-based params (priority)
  if (params.has('skip')) {
    skip = Number(params.get('skip')) || 0
  }
  if (params.has('take')) {
    const takeNum = Number(params.get('take'))
    take = takeNum > 0 ? takeNum : pageSize // take must be > 0
  }

  // Second pass: handle page-based if offset not set
  if (skip === undefined && params.has('page')) {
    // Update pageSize first if provided
    if (params.has('pageSize')) {
      pageSize = Number(params.get('pageSize')) || pageSize
    }

    const pageNum = Number(params.get('page'))
    const page = pageNum > 0 ? pageNum : 1 // page must be >= 1
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

    // Global search parameter (custom key or default 'search'/'q')
    if (key === searchKey || (searchKey === 'search' && key === 'q')) {
      searchValue = value
      return
    }

    // order (custom key or default 'order')
    if (key === orderKey) {
      // Support both underscore and colon separators: updatedAt_asc or updatedAt:asc
      const separator = value.includes(':') ? ':' : '_'
      const [field, dir] = value.split(separator)
      orderBy[field] = dir === 'desc' ? 'desc' : 'asc'
      return
    }

    // Handle nested relations (e.g., customer.name or customer.email_contains)
    if (key.includes('.')) {
      const parts = key.split('.')
      const lastPart = parts[parts.length - 1]

      // Check if last part has an operator
      const operatorMatch = lastPart.match(
        /(.+?)_(in|notIn|not|gte|lte|gt|lt|contains|startsWith|endsWith)$/,
      )

      let current = where
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }

      if (operatorMatch) {
        // Has operator: customer.email_contains
        const [, field, op] = operatorMatch
        const vals = value.includes(',')
          ? value.split(',').map(normalizeValue)
          : [normalizeValue(value)]
        const operatorValue = ['in', 'notIn'].includes(op) ? vals : vals[0]
        const condition: any = { [op]: operatorValue }

        if (
          searchMode === 'insensitive' &&
          ['contains', 'startsWith', 'endsWith'].includes(op)
        ) {
          condition.mode = 'insensitive'
        }

        // Merge with existing operators on the same field
        if (current[field] && typeof current[field] === 'object') {
          current[field] = { ...current[field], ...condition }
        } else {
          current[field] = condition
        }
      } else {
        // No operator: customer.name
        current[lastPart] = normalizeValue(value)
      }
      return
    }

    // operators: _in, _notIn, _not, _gte, _lte, _contains, _startsWith, _endsWith
    const operatorMatch = key.match(
      /(.+?)_(in|notIn|not|gte|lte|gt|lt|contains|startsWith|endsWith)$/,
    )
    if (operatorMatch) {
      const [, field, op] = operatorMatch
      const vals = value.includes(',')
        ? value.split(',').map(normalizeValue)
        : [normalizeValue(value)]

      // in and notIn use array, others use single value
      const operatorValue = ['in', 'notIn'].includes(op) ? vals : vals[0]
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
      const fieldStr = String(field)

      // Handle nested fields (e.g., 'customer.name')
      if (fieldStr.includes('.')) {
        const parts = fieldStr.split('.')
        const condition: any = {}
        let current = condition

        // Build nested structure
        for (let i = 0; i < parts.length - 1; i++) {
          current[parts[i]] = {}
          current = current[parts[i]]
        }

        // Add the final field with contains operator
        current[parts[parts.length - 1]] = {
          contains: searchValue,
          ...(searchMode !== 'default' && { mode: searchMode }),
        }

        return condition
      }

      // Simple field
      const condition: any = {
        [fieldStr]: {
          contains: searchValue,
          ...(searchMode !== 'default' && { mode: searchMode }),
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

  const result: SearchParamsQuery<TWhereInput, TOrderByInput> = {
    where: where as TWhereInput,
    orderBy:
      Object.keys(orderBy).length > 0 ? (orderBy as TOrderByInput) : undefined,
    skip,
    take,
  }

  // Merge with existing query if provided
  if (options.mergeWith) {
    return mergeQuery(options.mergeWith, result)
  }

  return result
}

// helper
function normalizeValue(v: string): string | number | boolean {
  if (v === 'true') return true
  if (v === 'false') return false
  const num = Number(v)
  if (!Number.isNaN(num) && v.trim() !== '') return num
  return v
}

/**
 * Convert Prisma query back to URLSearchParams
 */
export function toSearchParams<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
>(
  query: Partial<SearchParamsQuery<TWhereInput, TOrderByInput>>,
): URLSearchParams {
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
  input:
    | string
    | URLSearchParams
    | Record<string, string | string[] | undefined>,
): Record<string, any> {
  let params: URLSearchParams

  if (typeof input === 'string') {
    params = new URLSearchParams(input.startsWith('?') ? input : `?${input}`)
  } else if (input instanceof URLSearchParams) {
    params = input
  } else {
    params = new URLSearchParams()
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, Array.isArray(value) ? value.join(',') : String(value))
      }
    })
  }

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
      input:
        | string
        | URLSearchParams
        | Record<string, string | string[] | undefined>,
      options?: ParseOptions<TWhereInput, TOrderByInput>,
    ) => parseSearchParams<TWhereInput, TOrderByInput>(input, options),
    toParams: (query: Partial<SearchParamsQuery<TWhereInput, TOrderByInput>>) =>
      toSearchParams<TWhereInput, TOrderByInput>(query),
    parseRelations: (
      input:
        | string
        | URLSearchParams
        | Record<string, string | string[] | undefined>,
    ) => parseNestedRelations(input),
    mergeRelations: (where: TWhereInput, relations: Record<string, any>) =>
      mergeRelations<TWhereInput>(where, relations),
  }
}

/**
 * Check if a where clause contains logical operators (AND, OR, NOT)
 */
function hasLogicalOperators(where: any): boolean {
  if (!where || typeof where !== 'object') return false
  return 'AND' in where || 'OR' in where || 'NOT' in where
}

/**
 * Deep merge two where clauses, intelligently combining conditions
 *
 * Logic:
 * - If one is empty, return the other
 * - If neither has logical operators (AND/OR/NOT), use simple spread (contextual overrides)
 * - If one or both have logical operators, combine with AND to preserve all conditions
 * - Flattens nested AND arrays to avoid AND: [AND: [...], ...]
 */
function deepMergeWhere<TWhereInput>(
  whereA: Partial<TWhereInput>,
  whereB: Partial<TWhereInput>,
): TWhereInput {
  // If one is empty, return the other
  const keysA = whereA ? Object.keys(whereA) : []
  const keysB = whereB ? Object.keys(whereB) : []

  if (keysA.length === 0) return whereB as TWhereInput
  if (keysB.length === 0) return whereA as TWhereInput

  // Check if either has logical operators
  const hasLogicalA = hasLogicalOperators(whereA)
  const hasLogicalB = hasLogicalOperators(whereB)

  // If neither has logical operators, use simple spread (B overrides A)
  if (!hasLogicalA && !hasLogicalB) {
    return { ...whereA, ...whereB } as TWhereInput
  }

  // If one or both have logical operators, combine with AND to preserve all conditions
  // Flatten nested AND arrays to avoid AND: [AND: [...], ...]
  const conditions: any[] = []

  // If whereA is just {AND: [...]}, flatten it
  if ((whereA as any).AND && keysA.length === 1) {
    conditions.push(...(whereA as any).AND)
  } else {
    conditions.push(whereA)
  }

  // If whereB is just {AND: [...]}, flatten it
  if ((whereB as any).AND && keysB.length === 1) {
    conditions.push(...(whereB as any).AND)
  } else {
    conditions.push(whereB)
  }

  return {
    AND: conditions,
  } as TWhereInput
}

/**
 * Merge contextual where clause with parsed query
 * Useful for adding tenant filters, user filters, etc.
 *
 * Note: contextualWhere takes priority over parsedQuery.where for security
 * (prevents users from overriding tenant/user filters via URL)
 *
 * Now uses smart merging: combines conditions with AND when logical operators are present
 */
export function mergeWhere<TWhereInput = PrismaWhere>(
  contextualWhere: Partial<TWhereInput>,
  parsedQuery: SearchParamsQuery<TWhereInput, any>,
): SearchParamsQuery<TWhereInput, any> {
  return {
    ...parsedQuery,
    where: deepMergeWhere(parsedQuery.where, contextualWhere),
  }
}

/**
 * Merge contextual query (where + orderBy) with parsed query
 * Useful for adding default filters and sorting
 *
 * Priority:
 * - where: contextualQuery takes priority (security), but uses smart merging
 * - orderBy: parsedQuery takes priority (user choice)
 *
 * Now uses smart merging: combines where conditions with AND when logical operators are present
 */
export function mergeQuery<
  TWhereInput = PrismaWhere,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
>(
  contextualQuery: Partial<SearchParamsQuery<TWhereInput, TOrderByInput>>,
  parsedQuery: SearchParamsQuery<TWhereInput, TOrderByInput>,
): SearchParamsQuery<TWhereInput, TOrderByInput> {
  return {
    ...contextualQuery,
    ...parsedQuery,
    where: deepMergeWhere(
      parsedQuery.where,
      contextualQuery.where || ({} as TWhereInput),
    ),
    // parsedQuery.orderBy has priority (user can override default sort)
    orderBy: parsedQuery.orderBy || contextualQuery.orderBy,
  }
}
