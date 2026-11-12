# Contact persons (UC-031, UC-032, UC-033) – handoff

Branch: `feature-handleContactperson` (branched from `main`, not merged with
`Feature-CreateArea`). Paste the prompt at the bottom into a new agent session
to continue.

## What is built

The feature copies the master-detail pattern from the areas feature on
`Feature-CreateArea`: the application (case number) is the master, and the
contact persons are the detail records edited on one page.

### API (`apps/api`)

- `src/modules/contact-persons/`: controller, service, repository, module,
  DTOs, mapper and rules.
  - `POST /api/contact-persons` creates (UC-031).
  - `GET /api/contact-persons?applicationId=<caseNumber>` returns
    `{ application, contactPersons }`.
  - `GET /api/contact-persons/:id`.
  - `PATCH /api/contact-persons/:id` updates (UC-033). It merges the saved
    values with the request and validates the whole record.
  - `DELETE /api/contact-persons/:id` deletes (UC-032) and returns 204.
- `rules/contact-person-rules.ts` holds the business rules: name is required,
  the phone number must be 8 digits, the email must have a valid format,
  changes are only allowed while the status is `Draft` or `ChangeRequired`,
  and availability is chosen for excavation permits but always `Day` for
  road use applications (UC-031 A1, UC-033 A1).
- Errors use `{ code, message }`, with `invalidFields` where relevant:
  `APPLICATION_NOT_FOUND`, `CONTACT_PERSON_NOT_FOUND`,
  `APPLICATION_NOT_EDITABLE`, `CONTACT_PERSON_INVALID`,
  `CONTACT_PERSON_FIELDS_NOT_ALLOWED`, `CONTACT_PERSON_ALREADY_EXISTS`.
- `src/modules/dev-applications/` is test-only (not loaded when
  `NODE_ENV=production`). It provides `GET` and `POST /api/dev/applications`
  to list and create draft test applications (`DEV-GRAVE-n`, `DEV-ROV-n`),
  as on `Feature-CreateArea`. It reports `contactPersonCount` where
  `Feature-CreateArea` reports `areaCount`.
- `src/app.setup.ts` adds the global `ValidationPipe` (whitelist,
  forbidNonWhitelisted, transform) and the `/api` prefix. `main.ts` uses it.
- `src/common/application-types.ts` lists the supported application types.
- Added the dependencies `class-validator` and `class-transformer`.
- Tests: `contact-persons.service.spec.ts` and `contact-person-rules.spec.ts`.

### Web (`apps/web`)

- `src/api/client.ts` replaces the placeholder with a real fetch client and
  `ApiError` (`status`, `body`, `code`).
- `src/api/contact-persons.api.ts` and `src/api/dev-applications.api.ts`.
- `src/types/contact-person.types.ts`, `application.types.ts`, and
  `prisma-enums.ts`. The enums are re-exported from the generated Prisma
  client, so run `bun run db:generate` in `apps/api` first.
- `src/features/contact-persons/`: validation that mirrors the API rules, enum
  label keys, and an edit-state reducer (temporary `new-N` keys, a draft, an
  unsaved-changes check, and the open-with-pending flow). Both have
  `bun test` unit tests.
- `src/pages/contacts-page/` at `/kontaktpersoner?sag=<caseNumber>`. It shows
  collapsible cards with an edit form, a delete confirmation dialog with the
  contact person's details (UC-032), an unsaved-changes dialog, focus
  handling, and read-only mode when the application cannot be edited. Without
  `?sag=` it shows the test-only list of applications, where you can create a
  test application.
- The navbar has a "Kontaktpersoner" link. The Danish and English
  translations are under `contacts.*`, `devApplications.*` and
  `navigation.contacts`.
- `package.json` has a `test` script (`bun test src`). `tsconfig.app.json`
  excludes the test files, because the `bun:test` types are not installed.

### Checks that passed

- API: `tsc --noEmit`, `bun run test` (4 files, 34 tests).
- Web: `tsc -b`, `bun test src` (5 files, 17 tests), `bun run locale:check`.
- Root: `bun run check` (Biome) is clean.
- Manual check against the dev database: create, list, update, delete, the
  validation errors, and the road use availability rules all worked.

## Open issues and decisions

1. **One contact person per application in the schema.** On `Staging`,
   `ContactPerson.applicationId` is `@unique`, so an application can only
   have one contact person. The use cases need several (UC-006 step 23,
   UC-007 step 18, UC-004 F7 "mindst en kontakt"). The API returns
   `CONTACT_PERSON_ALREADY_EXISTS` (409) for a second one, and the web shows
   "Ansøgningen har allerede en kontaktperson." **Do not change the Prisma
   schema without the team agreeing first.**
2. **Should a contact person belong to the application or to an actor
   (Aktør)?** The updated UC-031, UC-032 and UC-033 attach the contact person
   to an actor (UC-040 step 7). The current schema links `ContactPerson` to
   `Application`, and `Actor` only has a `ContactPersonName` string. The code
   follows the schema, so the master is the application. If the team moves
   contact persons to actors, the repository, the DTO field
   (`applicationId` → `actorId`), and the page's master must change. The
   rules, the validation, and the UI can stay.
3. **Logging is not built.** UC-032 F1 says the error is logged. There is no
   log service yet.
4. **No authentication or ownership check.** No check yet that the applicant
   owns the application ("Ansøgeren er logget ind").
5. **The page is not part of the application wizard yet.** On
   `Feature-CreateArea`, `apps/web/src/pages/application-page` is a wizard
   with steps and a `contacts-step` that stores contact persons in local
   draft storage. When the branches meet, this page should become that step
   (reducer at page level, the same `leaveGuard` pattern as `areas-step`).
6. **Expected merge conflicts with `Feature-CreateArea`:**
   - Both branches add `modules/dev-applications`. Keep both counts
     (`areaCount` and `contactPersonCount`).
   - Both branches add `app.setup.ts`, `common/application-types.ts`,
     `web/src/api/client.ts`, `web/src/types/prisma-enums.ts`,
     `application.types.ts` and `utils/focus-by-id.ts`. They are almost the
     same, so keep the union. `prisma-enums.ts` here exports only the enums
     this feature uses.
   - `Feature-CreateArea` imports `PrismaService` from `src/prisma/`, while
     `main` and this branch use `src/modules/prisma/`.
   - Both branches change `app.module.ts`, `translation.json` and the web
     `package.json`.
   - `AGENTS.md` on `main` says the web app has no test script. This branch
     adds one, so update that line.
7. **Tests that are missing:** web component tests (happy-dom and Testing
   Library, with a fake contact persons API like
   `src/test/fake-areas-api.ts` on `Feature-CreateArea`) and API e2e tests
   for the endpoints.

## Prompt for the next session

```text
Continue the contact persons feature (UC-031 opret, UC-032 slet, UC-033
opdater kontaktperson) on branch feature-handleContactperson in this repo.
Do not merge other branches into it, and do not change the Prisma schema
without asking me first. The team's schema lives on Staging.

Start by reading docs/features/contact-persons-handoff.md. It lists what is
built and the open issues. Follow AGENTS.md and
docs/web/styles/stylesheet.md. The pattern to copy is the areas feature on
Feature-CreateArea; read it with `git show Feature-CreateArea:<path>`
(apps/api/src/modules/areas/*, apps/web/src/features/areas/*,
apps/web/src/pages/application-page/steps/areas-step/*).

Next tasks, in order:
1. Ask me which master the contact person has (the application, as now, or
   an actor as in the updated UC-031) and whether the schema may allow
   several contact persons per application. Only after I answer, adapt the
   repository, DTOs and page, or leave them as they are.
2. Add web component tests for apps/web/src/pages/contacts-page, using a
   fake fetch-based API like src/test/fake-areas-api.ts on
   Feature-CreateArea. You will need the dev dependencies
   @happy-dom/global-registrator, @testing-library/react,
   @testing-library/dom and @testing-library/user-event, plus a test setup
   file. Cover: create a contact person, the validation errors (UC-031 F1 to
   F4), cancelling a new contact person, editing and cancelling (UC-033),
   delete with the confirmation dialog and cancel (UC-032 A1), and the
   API error codes shown as Danish messages.
3. Add API e2e tests for /api/contact-persons with apps/api/vitest.config.e2e.ts
   and configureApp from src/app.setup.ts.
4. Leave TODO(UC-xxx) comments where logging or notifications are needed,
   but there is no service for them yet.

Run and report: `bun run check` from the root, `bun run test` in apps/api,
and `bun test src` plus `bun run locale:check` in apps/web. Do not commit
until I ask.
```
