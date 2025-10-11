# Changelog

## [0.1.0] - 2025-01-10

### ✨ Features

- **Type-safe Prisma integration**: Support complet des types génériques Prisma
  - `TWhereInput` pour les filtres (ex: `Prisma.UserWhereInput`)
  - `TOrderByInput` pour le tri (ex: `Prisma.UserOrderByWithRelationInput`)
  - `searchFields` type-safe avec validation des champs directs
  - Support des nested fields (ex: `author.name`, `post.title`)
  
- **Parsing bidirectionnel**:
  - `parseSearchParams()` - URLSearchParams → Prisma query
  - `toSearchParams()` - Prisma query → URLSearchParams
  
- **Support complet des opérateurs Prisma**:
  - `in` - Valeurs multiples
  - `gte` / `lte` / `gt` / `lt` - Comparaisons numériques
  - `contains` / `startsWith` / `endsWith` - Recherche de texte
  
- **Recherche globale (Global Search)**:
  - `?search=` ou `?q=` - Recherche sur plusieurs champs avec OR
  - `searchFields` - Configuration des champs de recherche
  - `searchMode: 'insensitive'` - Recherche insensible à la casse
  - Combinaison automatique avec les autres filtres (AND logic)
  
- **Tri et pagination**:
  - `?order=field_asc` ou `?order=field_desc`
  - **Page-based** : `?page=2&pageSize=20` (pagination classique)
  - **Offset-based** : `?skip=20&take=10` (infinite scroll)
  - Détection automatique du mode selon les paramètres
  - `skip/take` prioritaires sur `page/pageSize`
  
- **Relations imbriquées**:
  - `parseNestedRelations()` - Support de la notation point (ex: `user.name=John`)
  - `mergeRelations()` - Fusion des relations dans les filtres
  
- **Parser réutilisable**:
  - `createParser<TWhereInput, TOrderByInput>()` - Créer des parsers type-safe par modèle

### 📚 Documentation

- README complet avec exemples
- USAGE.md avec guide détaillé pour Next.js, Remix, Express
- Exemples type-safe avec Prisma
- Guide de sécurité et bonnes pratiques

### 🧪 Tests

- Suite de tests complète avec Vitest
- Tests pour tous les opérateurs
- Tests de type safety

### 🔧 Configuration

- TypeScript strict mode
- Support ESM/CommonJS
- Exports configurés pour compatibilité maximale
- **Pas de dépendance Prisma** : Utilise des types génériques pour éviter les conflits de versions
- Peer dependency optionnelle sur `@prisma/client` >= 4.0.0

### 📐 Architecture des types

- Types génériques qui s'adaptent à votre version de Prisma
- Fonctionne avec ou sans Prisma
- Pas de conflit de versions
- Package léger sans dépendances lourdes
- Voir [TYPES.md](./TYPES.md) pour plus de détails
