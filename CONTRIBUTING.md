# Contributing to prisma-searchparams-mapper

Merci de votre intérêt pour contribuer ! 🎉

## 🏗️ Architecture

### Principe de base : Pas de dépendance Prisma

**Important** : Cette bibliothèque n'installe PAS `@prisma/client` comme dépendance.

**Pourquoi ?**
- Éviter les conflits de versions avec le Prisma de l'utilisateur
- Garder le package léger
- Permettre l'utilisation sans Prisma

**Comment ?**
- Utilisation de **types génériques** qui s'adaptent aux types Prisma de l'utilisateur
- Peer dependency **optionnelle** sur `@prisma/client`

### Structure du code

```
src/
  index.ts          # Code principal avec types génériques
  index.test.ts     # Tests avec Vitest

examples/
  examples.ts                  # Exemples basiques
  examples-typesafe.ts         # Exemples avec types Prisma
  examples-nextjs-search.tsx   # Exemple Next.js complet

docs/
  README.md         # Documentation principale
  USAGE.md          # Guide détaillé
  FEATURES.md       # Liste des fonctionnalités
  TYPES.md          # Architecture des types
  QUICK-START.md    # Guide rapide
```

## 🚀 Setup

```bash
# Cloner le repo
git clone https://github.com/yourusername/prisma-searchparams-mapper.git
cd prisma-searchparams-mapper

# Installer les dépendances
pnpm install

# Lancer les tests
pnpm test

# Build
pnpm build
```

## 🧪 Tests

Tous les tests doivent passer avant de soumettre une PR :

```bash
# Lancer les tests
pnpm test

# Tests en mode watch
pnpm test:watch

# Build pour vérifier la compilation
pnpm build
```

## 📝 Ajouter une fonctionnalité

### 1. Écrire les tests d'abord

```typescript
// src/index.test.ts
describe('Ma nouvelle fonctionnalité', () => {
  it('should do something', () => {
    const result = parseSearchParams('?param=value');
    expect(result.where).toEqual({ param: 'value' });
  });
});
```

### 2. Implémenter la fonctionnalité

```typescript
// src/index.ts
export function parseSearchParams<TWhereInput, TOrderByInput>(
  input: string | URLSearchParams,
  options?: ParseOptions
): PrismaQuery<TWhereInput, TOrderByInput> {
  // Votre code ici
}
```

### 3. Mettre à jour la documentation

- `README.md` - Ajouter un exemple
- `FEATURES.md` - Documenter la fonctionnalité
- `CHANGELOG.md` - Ajouter l'entrée

### 4. Vérifier les types

```bash
# Vérifier que TypeScript compile
pnpm build

# Pas d'erreurs de types
```

## 🎯 Guidelines

### Types génériques

**À FAIRE** ✅
```typescript
export function myFunction<TWhereInput = PrismaWhere>(
  input: string
): PrismaQuery<TWhereInput> {
  // Utilise des types génériques
}
```

**À NE PAS FAIRE** ❌
```typescript
import { Prisma } from '@prisma/client'; // ❌ N'importe pas Prisma !

export function myFunction(
  input: string
): Prisma.UserWhereInput { // ❌ Type spécifique
  // ...
}
```

### Dépendances

**À FAIRE** ✅
- Utiliser uniquement les dépendances dev pour les tests
- Garder le package léger

**À NE PAS FAIRE** ❌
- Ajouter `@prisma/client` dans `dependencies`
- Ajouter des dépendances lourdes

### Tests

**À FAIRE** ✅
```typescript
// Tester avec types génériques
const result = parseSearchParams('?status=active');
expect(result.where).toEqual({ status: 'active' });

// Tester avec types mock Prisma
type MockWhereInput = { status?: string };
const result2 = parseSearchParams<MockWhereInput>('?status=active');
```

**À NE PAS FAIRE** ❌
```typescript
// Ne pas importer @prisma/client dans les tests
import { Prisma } from '@prisma/client'; // ❌
```

## 📚 Documentation

Chaque nouvelle fonctionnalité doit être documentée dans :

1. **README.md** - Exemple d'utilisation
2. **USAGE.md** - Guide pratique (si nécessaire)
3. **CHANGELOG.md** - Entrée de version

## 🔄 Process de PR

1. Fork le repo
2. Créer une branche : `git checkout -b feature/ma-fonctionnalite`
3. Écrire les tests
4. Implémenter la fonctionnalité
5. Mettre à jour la documentation
6. Vérifier que tout passe : `pnpm test && pnpm build`
7. Commit : `git commit -m "feat: ajouter ma fonctionnalité"`
8. Push : `git push origin feature/ma-fonctionnalite`
9. Créer une Pull Request

## 🐛 Reporter un bug

Ouvrir une issue avec :

1. **Description** du bug
2. **Étapes pour reproduire**
3. **Comportement attendu**
4. **Comportement actuel**
5. **Version** de la bibliothèque
6. **Version** de Prisma (si applicable)

## 💡 Proposer une fonctionnalité

Ouvrir une issue avec :

1. **Description** de la fonctionnalité
2. **Cas d'usage**
3. **Exemple** d'API proposée
4. **Alternatives** considérées

## 📋 Checklist PR

- [ ] Tests ajoutés et passent
- [ ] Build réussit (`pnpm build`)
- [ ] Documentation mise à jour
- [ ] CHANGELOG.md mis à jour
- [ ] Pas de dépendance Prisma ajoutée
- [ ] Types génériques utilisés correctement
- [ ] Exemples ajoutés si nécessaire

## 🙏 Merci !

Merci de contribuer à rendre cette bibliothèque meilleure ! 🚀
