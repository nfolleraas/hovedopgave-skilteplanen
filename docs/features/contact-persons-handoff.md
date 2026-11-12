# Contact persons (UC-031, UC-032, UC-033) – handoff

Branch: `feature-handleContactperson` (branched from `main`, not merged with
`Feature-CreateArea` or `AktørUseCase`). Paste the prompt at the bottom into a
new agent session to continue.

## What is built

The feature copies the master-detail pattern from the areas feature on
`Feature-CreateArea`. The page's master is the application (case number). Each
contact person belongs to an **actor** (Aktør) on that application, as in the
updated UC-031 to UC-033 (UC-040 step 7).

### Data model (taken from `AktørUseCase`)

The schema follows the `AktørUseCase` branch. These files were copied from it
byte for byte, so they merge without conflicts:

- `prisma/domain/actor.prisma`, `address.prisma` and `contact-person.prisma`.
- The migrations `20261103144206` (actor address),
  `20261104101955` (`ContactPerson.actorId`, drop `Actor.ContactPersonName`)
  and `20261104134121_allow_multiple_contact_persons_per_application`.

The team then decided that an actor can have several contact persons
(`Actor.contactPersons` is a list). This branch therefore removes `@unique`
from `ContactPerson.actorId` in `contact-person.prisma`, with the migration
`20261112120000_allow_multiple_contact_persons_per_actor`
(`DROP INDEX "ContactPerson_actorId_key"`). `AktørUseCase` still has
`@unique`, so the same change must be made there, or kept from this branch,
when the branches are merged.

The result is that `ContactPerson` has both `applicationId` and `actorId`, and
there is no uniqueness on either: **several contact persons per actor and per
application**. `Actor` requires an address.

### API (`apps/api`)

- `src/modules/contact-persons/`: controller, service, repository, module,
  DTOs, mapper and rules.
  - `POST /api/contact-persons` with `{ applicationId, actorId, ...fields }`
    creates (UC-031). The actor must be on the application.
  - `GET /api/contact-persons?applicationId=<caseNumber>` returns
    `{ application, actors, contactPersons }`. `actors` are
    `{ uuid, name, role }`, sorted by name. Each contact person has `actorId`.
  - `GET /api/contact-persons/:id`.
  - `PATCH /api/contact-persons/:id` updates (UC-033). It merges the saved
    values with the request and validates the whole record. The application
    and the actor cannot change.
  - `DELETE /api/contact-persons/:id` deletes (UC-032) and returns 204.
- `rules/contact-person-rules.ts` holds the business rules: name is required,
  the phone number must be 8 digits, the email must have a valid format,
  changes are only allowed while the status is `Draft` or `ChangeRequired`,
  and availability is chosen for excavation permits but always `Day` for
  road use applications (UC-031 A1, UC-033 A1).
- Errors use `{ code, message }`, with `invalidFields` where relevant:
  `APPLICATION_NOT_FOUND`, `ACTOR_NOT_FOUND` (the actor is not on the
  application), `CONTACT_PERSON_NOT_FOUND`, `APPLICATION_NOT_EDITABLE`,
  `CONTACT_PERSON_INVALID`, `CONTACT_PERSON_FIELDS_NOT_ALLOWED`.
  Exception: a phone number that is not 8 digits is rejected by the DTO's
  `@Matches` before the service runs, so the body is Nest's default
  validation error (`message: ['phoneNumber must be 8 digits']`).
- `src/modules/dev-applications/` is test-only (not loaded when
  `NODE_ENV=production`). `GET` and `POST /api/dev/applications` list and
  create draft test applications (`DEV-GRAVE-n`, `DEV-ROV-n`). Each new test
  application gets two actors (Testentreprenør A/S, Testledningsejer A/S),
  because there is no actors step on this branch. It reports
  `contactPersonCount` where `Feature-CreateArea` reports `areaCount`.
- `src/app.setup.ts` adds the global `ValidationPipe` (whitelist,
  forbidNonWhitelisted, transform) and the `/api` prefix. `main.ts` and the
  e2e tests use it.
- Tests:
  - Unit: `contact-persons.service.spec.ts` and `contact-person-rules.spec.ts`.
  - E2E: `test/contact-persons.e2e-spec.ts` runs against the database in
    `DATABASE_URL`. It covers create, list, update and delete; several per
    actor and per application; `ACTOR_NOT_FOUND`; `APPLICATION_NOT_FOUND`;
    the validation errors; unknown fields; road use availability; the
    read-only status; and the dev application actors. It creates its own
    records with unique `E2E-CP-*` case numbers and deletes them in
    `afterAll`.

### Web (`apps/web`)

- `src/api/client.ts` is a fetch client with `ApiError` (`status`, `body`,
  `code`).
- `src/api/contact-persons.api.ts` (`createContactPerson(applicationId,
  actorId, input)`) and `src/api/dev-applications.api.ts`.
- `src/types/contact-person.types.ts` (`ContactPersonActor`, `actorId`),
  `application.types.ts`, and `prisma-enums.ts`. The enums, including
  `ActorRole`, are re-exported from the generated Prisma client, so run
  `bun run db:generate` in `apps/api` first.
- `src/features/contact-persons/`: validation that mirrors the API rules,
  label keys (availability and actor roles), and an edit-state reducer. Each
  entry has an `actorId`, and `addNew` takes the actor.
- `src/pages/contacts-page/` at `/kontaktpersoner?sag=<caseNumber>`. It shows
  collapsible cards with the actor ("Aktør: Navn (Rolle)") and an edit form.
  An "Aktør" select next to "+ Opret kontaktperson" lists all actors on the
  application. When there are no actors, a message replaces the select. It
  also has a delete confirmation dialog with the
  contact person's details and actor (UC-032), an unsaved-changes dialog,
  focus handling, and read-only mode when the application cannot be edited.
  Without `?sag=` it shows the test-only list of applications.
- Translations (Danish and English) are under `contacts.*`,
  `contacts.labels.actorRole.*`, `devApplications.*` and
  `navigation.contacts`.
- Tests (`bun test src`, preload in `bunfig.toml`):
  - `src/test/setup-dom.ts` and `src/test/render.tsx` are copied unchanged
    from `Feature-CreateArea`. `src/test/fake-contact-persons-api.ts` is an
    in-memory fetch fake like `fake-areas-api.ts`.
  - `src/pages/contacts-page/index.test.tsx` covers create for a chosen
    actor, the validation errors (F1 to F4), cancelling a new contact person,
    edit and cancel (UC-033 A4), edit and save, delete cancel (UC-032 A1),
    delete confirm, the API error codes as Danish messages, the delete error
    (UC-032 F1), no actors, a second contact person for the same actor, road
    use availability, read-only mode, and an unknown case number.
  - Reducer and validation unit tests.
  - Dev dependencies: `@happy-dom/global-registrator`,
    `@testing-library/react`, `@testing-library/dom` and
    `@testing-library/user-event`, the same versions as `Feature-CreateArea`.

### Checks that passed (12 Nov 2026)

- API: `tsc --noEmit`, `bun run test` (4 files, 34 tests), and
  `bun run test:e2e` (`contact-persons.e2e-spec.ts`, 10 tests).
  `test:e2e` still exits with 1, because the existing scaffold
  `test/app.e2e-spec.ts` from `main` has no tests.
- Web: `tsc -b`, `bun test src` (6 files, 34 tests), `bun run locale:check`.
- Root: `bun run check` (Biome) is clean.
- The checks ran in a throwaway container from the dev container image,
  against a separate `contact_persons_dev` database, so the `app` database
  was not changed.

## Open issues and decisions

1. **The schema comes from `AktørUseCase`, which is unfinished and not
   merged yet.** Three migrations here are the same files as on that branch.
   If the team changes them there before merging, copy the new versions here
   as well. The team decided that an actor can have several contact persons,
   so `ContactPerson.actorId` is no longer `@unique` on this branch (migration
   `20261112120000_allow_multiple_contact_persons_per_actor`). Make sure
   `AktørUseCase` gets the same change, so the migration history does not
   split. If that branch adds its own migration for this, keep only one of
   the two.
2. **Two contact person modules after the merge.** `AktørUseCase` adds
   `src/modules/contact-person/` (singular, route `/contact-person`). It is
   Nest boilerplate whose service returns placeholder strings, but its
   `dto/create-contact-person.dto.ts` is used by `CreateActorDto` for an
   inline `contactPerson`. Its actor mapper does not save that field yet.
   When merging, keep `modules/contact-persons/` for the endpoints, and
   agree on one DTO, either moving the actor DTOs to this module's DTO or the
   other way round. Then remove the empty controller and service.
3. **Logging is not built.** UC-032 F1 says the error is logged. There is a
   `TODO(UC-032 F1)` in `ContactPersonsService.remove`.
4. **No authentication or ownership check.** There is no check yet that the
   applicant owns the application ("Ansøgeren er logget ind").
5. **The page is not part of the application wizard yet.** On
   `Feature-CreateArea`, `apps/web/src/pages/application-page` is a wizard
   with steps and a `contacts-step` that stores contact persons in local
   draft storage. When the branches meet, this page should become that step
   (reducer at page level, the same `leaveGuard` pattern as `areas-step`).
   The actors step from `AktørUseCase` should come before it, because a
   contact person needs an actor.
6. **Expected merge conflicts:**
   - With `Feature-CreateArea`: both branches add `modules/dev-applications`
     (keep both counts, `areaCount` and `contactPersonCount`, and the test
     actors). Both add `app.setup.ts`, `common/application-types.ts`,
     `web/src/api/client.ts`, `web/src/types/prisma-enums.ts`,
     `application.types.ts` and `utils/focus-by-id.ts`. They are almost the
     same, so keep the union. `prisma-enums.ts` here exports only the enums
     this feature uses. `src/test/setup-dom.ts`, `render.tsx` and
     `bunfig.toml` are identical.
   - `Feature-CreateArea` imports `PrismaService` from `src/prisma/`, while
     `main`, this branch and `AktørUseCase` use `src/modules/prisma/`.
   - All branches change `app.module.ts`, `translation.json`, the web
     `package.json` and `bun.lock`.
   - `AGENTS.md` on `main` says the web app has no test script. This branch
     adds one, so update that line.
7. **The existing `test/app.e2e-spec.ts` has no tests**, so
   `bun run test:e2e` exits with 1 even when every contact person test
   passes. Add a test to it or delete it (team decision; it comes from
   `main`).
8. **Line endings in this WSL checkout.** Many files that this feature does
   not change (docs, migrations, `.devcontainer`) have CRLF line endings in
   the working copy, so WSL `git status` lists them as modified. Their
   timestamps are from before this work. Do not commit them by accident:
   stage only the feature files, or normalise the line endings first.

## Prompt for the next session

```text
Continue the contact persons feature (UC-031 opret, UC-032 slet, UC-033
opdater kontaktperson) on branch feature-handleContactperson in this repo.
Do not merge other branches into it, and do not change the Prisma schema
without asking me first. The schema and migrations are copied from
AktørUseCase; contact persons belong to an actor, and an actor can have
several (ContactPerson.actorId is not unique).

Start by reading docs/features/contact-persons-handoff.md. It lists what is
built and the open issues. Follow AGENTS.md and
docs/web/styles/stylesheet.md.

Next tasks, in order:
1. Ask me how to merge the two contact person modules (open issue 2).
2. Add a TODO(UC-xxx) wherever a use case needs logging or notifications
   that do not exist yet, after checking the use case text.
3. When I say so, prepare the merge with AktørUseCase and
   Feature-CreateArea following open issues 5 and 6.

Run and report: `bun run check` from the root, `bun run test` and
`bun run test:e2e` in apps/api, and `bun test src` plus `bun run
locale:check` in apps/web. Do not commit until I ask.
```
