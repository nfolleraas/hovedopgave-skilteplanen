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
| Fail early | Validate inputs and assumptions near the boundary. |
| TypeScript | Use meaningful types and follow the official guidance for declaration files. |
| Formatting | Follow Biome: spaces, 80-character line width, single quotes, trailing commas. |

## Comments and documentation

Describe a method's purpose when it is not clear from its name, types, and
surrounding code. Comment on complex logic to explain intent, reasoning, or a
non-obvious constraint. Do not comment every line or repeat what the code says.
Update or remove comments when behavior changes.

```ts
// Keep the selected route when a user refreshes the page.
function restoreSelectedRoute(savedRoute: string | null): string {
  return savedRoute ?? '/';
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

## Review checklist

- Is each function, class, or module's responsibility clear?
- Are inputs validated early and are failures handled with useful context?
- Do comments explain intent or complex reasoning, and match the code?
- Is duplicated logic worth extracting without adding needless abstraction?
- Is this the simplest design that satisfies the requirement?
- Does TypeScript formatting follow Biome?
- Do declaration files follow the TypeScript handbook guidance?
