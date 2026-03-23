# AGENTS.md - Agentic Coding Guidelines

This file provides guidelines for agentic coding agents operating in this repository.

## Project Overview

Nexu is a monorepo using pnpm workspaces + Turborepo. Contains:

- `/packages` - Shared packages (@repo/utils, @repo/ui, @repo/types, etc.)
- `/apps` - Applications
- `/nexu-app` - CLI tool for generating projects

## Commands

### Build, Lint, Test

```bash
# Build all packages
pnpm build

# Dev mode (runs all apps)
pnpm dev

# Lint all packages
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Type check all packages
pnpm typecheck

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

### Running a Single Test

```bash
# Run tests for specific package
pnpm --filter=@repo/utils test

# Or from package directory
cd packages/utils
pnpm test

# Test in watch mode
pnpm test --watch

# Run specific test file
pnpm test -- path/to/test.test.ts
```

### Package-specific Commands

From each package directory (e.g., `packages/utils/`):

```bash
pnpm build     # Build package
pnpm dev      # Watch mode
pnpm lint     # Lint
pnpm typecheck # TypeScript check
pnpm test     # Run tests
```

### Code Formatting

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check
```

## Code Style Guidelines

### TypeScript

- Always type parameters and return values
- Avoid `any`, prefer `unknown` if necessary
- Use strict types

```typescript
// Good
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Bad
function calculateTotal(items: any): any { ... }
```

### Import Order

1. Node.js built-in modules
2. External packages (react, etc.)
3. Monorepo packages (@repo/\*)
4. Relative imports

```typescript
// Correct order
import { useState, useEffect } from 'react';

import { Button } from '@repo/ui';
import { formatDate } from '@repo/utils';
import type { User } from '@repo/types';

import { UserCard } from './components/UserCard';
import { useUser } from './hooks/useUser';
```

### Naming Conventions

| Type             | Convention       | Example           |
| ---------------- | ---------------- | ----------------- |
| Variables        | camelCase        | `userName`        |
| Constants        | UPPER_SNAKE_CASE | `MAX_RETRIES`     |
| Functions        | camelCase        | `getUserById`     |
| Classes          | PascalCase       | `UserService`     |
| Interfaces/Types | PascalCase       | `UserProfile`     |
| Files            | kebab-case       | `user-service.ts` |
| React Components | PascalCase       | `UserCard.tsx`    |

### Error Handling

Use the Result pattern from `@repo/result`:

```typescript
import { tryCatchAsync, match } from '@repo/result';

const result = await tryCatchAsync(() => fetchUser(id));
return match(result, {
  ok: user => user,
  err: error => {
    logger.error('Failed to fetch user', { id, error });
    throw new AppError('USER_NOT_FOUND', error.message);
  },
});
```

### Comments

Explain the "why", not the "what":

```typescript
// Good - explains reasoning
// Skip validation for admin users as they have full access
if (user.role === 'admin') {
  return true;
}

// Bad - obvious
// Check if user is admin
if (user.role === 'admin') { ... }
```

## ESLint Rules

Key rules enforced:

- `unused-imports/no-unused-imports`: error
- `unused-imports/no-unused-vars`: warn (prefix with `_` to ignore)
- `import/order`: alphabetical, with newlines between groups
- `import/no-duplicates`: error
- `prefer-const`: error
- `no-var`: error
- `no-console`: warn (allows `warn` and `error`)

## Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

## Git Conventions

### Branch Naming

| Prefix      | Usage         |
| ----------- | ------------- |
| `feature/`  | New feature   |
| `fix/`      | Bug fix       |
| `docs/`     | Documentation |
| `refactor/` | Refactoring   |
| `test/`     | Tests         |
| `chore/`    | Maintenance   |

### Commit Messages

Format: `<type>: <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login redirect issue"
```

## Adding New Packages

1. Create `packages/my-package/src/`
2. Add `package.json` with name `@repo/my-package`
3. Use tsup for building
4. Add test script with vitest

Required scripts:

```json
{
  "build": "tsup",
  "dev": "tsup --watch",
  "lint": "eslint src/",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

## Testing with Vitest

```typescript
import { describe, it, expect } from 'vitest';

describe('functionName', () => {
  it('should do something', () => {
    expect(actual).toBe(expected);
  });
});
```

## Debugging

```typescript
import { logger } from '@repo/logger';

logger.debug('Debug info', { data });
```

Enable debug logs: `LOG_LEVEL=debug pnpm dev`
