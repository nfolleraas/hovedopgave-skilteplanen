# Coding conventions

This guide describes how code should be written in Skilteplanen. It applies to
both `apps/web` and `apps/api`, unless a more specific app guide says otherwise.
Follow the existing TypeScript, React, NestJS, and Biome patterns near the
change.

## Quick lookup

| Convention | What to do |
| --- | --- |
| Comments | Explain non-obvious purpose and complex reasoning. Keep comments accurate. |
| Error handling | Handle failures with useful, actionable messages and preserve relevant context. |
| Single responsibility | Give each function, class, and module one clear job. |
| Low coupling, high cohesion | Keep related behavior together and reduce unnecessary dependencies. |
| DRY | Reuse shared behavior when it improves clarity; avoid duplicated logic. |
| KISS | Prefer the simplest design that meets the requirement. |
| Offensive programming | Reject invalid input early and fail visibly when internal contracts are broken. |
| TypeScript | Use meaningful types and follow the official guidance for declaration files. |
| Formatting | Follow Biome: spaces, 80-character line width, single quotes, trailing commas. |

## Comments and documentation

Add a descriptive summary comment to every function and method. Include
relevant parameters and return values in the documentation. Comment on
complex logic to explain intent, reasoning, or a non-obvious constraint. Do
not comment every line or repeat what the code says.
Update or remove comments when behavior changes.

```ts
/**
 * Calculates the square of a number.
 * @param value - The number to square
 * @returns The squared result
 */
function square(value: number): number {
  return value * value;
}
```

## Errors and early validation

Handle errors at the layer that has enough context to respond meaningfully.
Messages should explain what failed and, when useful, what the caller can do
next. Preserve useful context when translating an error. Do not silently
swallow failures or expose sensitive details.

Validate inputs and assumptions as early as practical, especially at API and UI
boundaries. TypeScript provides compile-time guarantees; values received from
outside the program also need runtime validation. Fail before invalid data or
state causes harder-to-diagnose problems downstream.

```ts
function getSignName(sign: Sign | undefined): string {
  if (!sign) {
    throw new Error('Sign was not found.');
  }

  return sign.name;
}
```

## Offensive programming

Apply offensive programming when adding or changing code: make contracts and
assumptions explicit, and fail early when they are violated. Expose programming
errors so they can be diagnosed and fixed instead of hiding them behind silent
fallbacks, default values, or catch blocks that continue with invalid state.

Validate untrusted input at API, UI, and external-service boundaries. Inside
the application, rely on validated contracts rather than repeating the same
validation at every layer. Use strict types and explicit guards or assertions
for internal invariants that TypeScript cannot guarantee at runtime. Check
preconditions before performing writes or other side effects.

Distinguish expected failures from broken internal contracts. Handle expected
cases, such as a requested record not existing, with an explicit result or an
appropriate application error. Throw a descriptive error for impossible
internal state and let it reach the error-handling boundary. Preserve the cause
when translating errors, and keep internal details out of user-facing responses.

```ts
function requireSavedSignId(sign: { id: string | null }): string {
  if (sign.id === null) {
    throw new Error('Invariant violated: a saved sign must have an ID.');
  }

  return sign.id;
}
```

Do not return an empty ID or invent a replacement when this invariant fails.
Fix the code that produced the invalid state. When adding or changing an
invariant, test that violations fail visibly before side effects occur.

## Responsibility and dependencies

Give each function, class, and module one clear responsibility. Keep related
behavior close together and dependencies explicit. Prefer small, focused
interfaces; avoid unnecessary knowledge of another component's internal
details. This supports high cohesion within components and low coupling between
them.

```ts
interface SignRepository {
  findById(id: string): Promise<Sign | undefined>;
}

class SignService {
  constructor(private readonly signs: SignRepository) {}

  async getName(id: string): Promise<string> {
    const sign = await this.signs.findById(id);
    return getSignName(sign);
  }
}
```

## Reuse and simplicity

Avoid repeating the same business rule or logic. Extract shared behavior when
it creates a clearer source of truth; do not add abstractions just to remove a
few trivial lines. Choose the simplest readable design that meets the
requirement. Avoid speculative flexibility and unnecessary layers.

```ts
const activeSigns = signs.filter((sign) => sign.isActive);
```

## TypeScript syntax and formatting

Biome is the source of truth for formatting. Its root configuration specifies
spaces for indentation, an 80-character line width, single quotes, and trailing
commas in multiline structures. Imports are organized by the configured Biome
action. Run `bun run check` from the repository root to check formatting and
lint rules.

Use `const` unless reassignment is needed. Use strict equality (`===`), name
reusable object shapes with `interface` or `type`, and type public function
inputs and outputs. Let simple local types be inferred. Use optional fields
only when omission is valid. Represent absence explicitly, such as with
`Sign | undefined`; avoid unsafe assumptions and prefer a specific type or
`unknown` over `any` where practical.

```ts
import type { Sign } from './sign';

export interface CreateSignInput {
  name: string;
  isActive?: boolean;
}

export function createSign(input: CreateSignInput): Sign {
  const isActive = input.isActive ?? true;

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    isActive,
  };
}
```

Use `async`/`await` for asynchronous control flow and declare the result as
`Promise<T>`. Handle expected failures explicitly:

```ts
async function loadSign(id: string): Promise<Sign> {
  try {
    const response = await fetch(`/api/signs/${id}`);
    if (!response.ok) {
      throw new Error(`Could not load sign (${response.status}).`);
    }

    return (await response.json()) as Sign;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Loading sign failed: ${error.message}`);
    }

    throw new Error('Loading sign failed.');
  }
}
```

For declaration files (`.d.ts`), follow the TypeScript handbook's
[Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html).
Keep declarations aligned with actual runtime behavior and avoid unnecessary
or misleading global declarations.

## Testing

Tests are part of the feature structure and should cover the behavior at the
layer where it is implemented.

- **Frontend unit and integration tests:** Use Vitest for components, pages,
  hooks, utilities, and domain use cases. Test files for a single component or
  page may live next to the source file; broader domain tests belong under
  `apps/web/tests/<domain>/`.
- **Frontend end-to-end tests:** Use Playwright for user flows with UI
  interaction, API requests, and other browser-visible behavior. Put these
  tests under `apps/web/tests/<domain>/e2e/` and name them `*.spec.ts`.
- **Backend unit tests:** Use Vitest for services, controllers, repositories,
  and other isolated API behavior. Place them next to the file they test and
  name them `<module>.<layer>.spec.ts`.
- **Backend API tests:** Use API tests for a module's endpoints and their
  integration with the application boundary. Place them under `apps/api/test/`
  and name them `*.api-spec.ts`.

Keep tests close to the behavior they verify and use descriptive names for the
scenario or expected outcome. A representative structure is:

```text
apps/
├── api/
│   ├── src/modules/<feature>/
│   │   ├── <feature>.api-spec.ts
│   │   ├── <feature>.controller.ts
│   │   ├── <feature>.controller.spec.ts
│   │   ├── <feature>.repository.ts
│   │   ├── <feature>.repository.spec.ts
│   │   ├── <feature>.service.ts
│   │   └── <feature>.service.spec.ts
└── web/
    ├── src/<component-or-page>/
    │   └── index.test.tsx
    └── tests/<domain>/
        ├── <use-case>.test.tsx
        └── e2e/<flow>.spec.ts
```

Run the relevant suite from the repository root:

```bash
# Backend unit tests
bun run --cwd apps/api test

# Backend API tests
bun run --cwd apps/api test:api

# Frontend unit and integration tests
bun run --cwd apps/web test:unit

# Frontend end-to-end tests
bun run --cwd apps/web test:e2e

# All frontend tests
bun run --cwd apps/web test
```

## Review checklist

- Is each function, class, or module's responsibility clear?
- Are inputs validated early and are failures handled with useful context?
- Do broken internal contracts fail visibly without silent fallbacks or side effects?
- Do comments explain intent or complex reasoning, and match the code?
- Is duplicated logic worth extracting without adding needless abstraction?
- Is this the simplest design that satisfies the requirement?
- Does the change have the appropriate unit, integration, or end-to-end tests?
- Are test files located and named according to the test structure?
- Does TypeScript formatting follow Biome?
- Do declaration files follow the TypeScript handbook guidance?
