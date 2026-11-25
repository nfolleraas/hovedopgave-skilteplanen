# Real document integration plan

## Goal

Replace every mocked or placeholder document flow in the road-permit application
with the existing document API, storage, and UI. Documents remain independent
resources linked to an application by its `caseNumber`; they are not duplicated
inside the road-permit draft or submission payload.

## Status

| Step | Status | Outcome |
| --- | --- | --- |
| 1. Scope documents to an application | Complete | Listing and uploads use the real draft `caseNumber`; production code no longer uses the demo application ID. |
| 2. Separate the route page from the reusable manager | Complete | The standalone page owns route concerns, while the wizard embeds only the document manager. |
| 3. Share one document state in the wizard | Pending | The document step and summary must use the same collection and mutations. |
| 4. Replace the mocked summary | Pending | The summary must render real documents and remove the inert placeholder row. |
| 5. Remove documents from the road-permit payload | Pending | The API must stop requiring `documentPlaceholder`; existing document relations must survive submission. |
| 6. Clean up and verify the complete journey | Pending | Remove obsolete types and translations, update tests, and run the full relevant verification. |

## Completed work

### Step 1: Scope documents to an application

- [x] Require `applicationId` when listing documents through
  `GET /api/documents?applicationId=...`.
- [x] Filter the Prisma query by `applicationId` in
  [documents.repository.ts](apps/api/src/modules/documents/documents.repository.ts).
- [x] Reject missing or blank application IDs in
  [documents.service.ts](apps/api/src/modules/documents/documents.service.ts).
- [x] Pass the application ID through
  [documents.api.ts](apps/web/src/api/documents.api.ts) and
  [use-documents.ts](apps/web/src/pages/documents-page/hooks/use-documents.ts).
- [x] Pass the real draft `caseNumber` to ordinary document and sign-plan
  uploads.
- [x] Remove the production demo application ID. Test fixtures retain their own
  deterministic ID.
- [x] Update focused controller, service, repository, and browser fixtures.

Verification completed:

- 19 focused document API tests passed.
- Focused Biome checks passed.

### Step 2: Separate route and embedded responsibilities

- [x] Extract reusable document behavior into
  [documents-manager.tsx](apps/web/src/pages/documents-page/components/documents-manager.tsx).
- [x] Keep loading, upload, sign-plan, preview, deletion, empty, and error states
  in the manager.
- [x] Restore [documents-page/index.tsx](apps/web/src/pages/documents-page/index.tsx)
  as the route-level shell responsible for `<main>`, the page heading, document
  title, language, focus, and Back/Next navigation.
- [x] Embed only `DocumentsManager` in the road-permit wizard through
  [create-road-permit/index.tsx](apps/web/src/pages/application-page/create-road-permit/index.tsx).
- [x] Include the standalone document route in the global skip-link handling in
  [App.tsx](apps/web/src/app/App.tsx).

Verification completed:

- Focused Biome checks passed.
- The affected files have no editor diagnostics.
- The web build reaches the known summary placeholder error; no step 2 errors
  remain.

### Architecture review reminder

- [ ] Before starting Step 3, verify whether
  [documents-manager.tsx](apps/web/src/pages/documents-page/components/documents-manager.tsx)
  is a useful component boundary or an unnecessary extra layer.
- [ ] Compare keeping the manager with placing the shared document UI directly
  in the route page and road-permit step, considering duplicated markup, state
  ownership, testability, and accessibility responsibilities.
- [ ] If the manager remains, document its responsibility clearly and keep
  route-specific behavior out of it. If it does not add enough value, remove it
  before lifting document state into the wizard.

Step 2 is functionally complete, but this component boundary is provisional
until the review is performed.

## Remaining work

### Step 3: Share one document state in the wizard

The document manager currently owns `useDocuments(applicationId)`. The wizard
summary also needs the same data without introducing a second mocked collection
or an unrelated request lifecycle.

- [ ] Call `useDocuments(caseNumber)` once from the road-permit form in
  [create-road-permit/index.tsx](apps/web/src/pages/application-page/create-road-permit/index.tsx).
- [ ] Change `DocumentsManager` to receive the loaded documents, loading/error
  state, and add/remove callbacks while retaining `applicationId` for uploads.
- [ ] Pass the same document collection and callbacks to the summary step.
- [ ] Ensure changing to another draft clears the old collection before the new
  application finishes loading.
- [ ] Ensure successful uploads and deletions are reflected immediately in both
  the document step and summary.
- [ ] Keep standalone route behavior working by letting the route page create
  and pass its own document state to `DocumentsManager`.

Acceptance criteria:

- The wizard performs one application-scoped document load.
- No document from a previously opened draft is displayed while another draft
  loads.
- Uploading or deleting a document does not require a page reload before the
  summary updates.

### Step 4: Replace the mocked summary

- [ ] Remove `documentToUpload: any` and the `exampleDocument` usage from
  [SummaryAndSubmissionPage.tsx](apps/web/src/pages/application-page/create-road-permit/pages/SummaryAndSubmissionPage.tsx)
  and
  [create-road-permit/index.tsx](apps/web/src/pages/application-page/create-road-permit/index.tsx).
- [ ] Render the real `Document[]` collection, including document name, localized
  type, creation date, and preview action.
- [ ] Replace the hard-coded Danish table headings with existing `documents.*`
  translation keys.
- [ ] Replace the inert remove icon with the real, confirmed delete flow so a
  correction made from the summary updates the shared collection.
- [ ] Reuse the responsive document table/cards instead of creating a second
  desktop-only representation.
- [ ] Show accessible loading, error, and empty states in the summary.

Acceptance criteria:

- The summary contains only documents associated with the current application.
- Preview and deletion use the same behavior as the document step.
- The summary works at desktop, tablet, and mobile widths and remains keyboard
  operable.
- The current `exampleDocument` TypeScript build error is removed.

### Step 5: Remove documents from the road-permit submission payload

Uploaded documents already have an `applicationId` foreign key. Submitting a
road permit updates the existing application, so the document metadata should
not be sent or recreated during submission.

- [ ] Remove `documentPlaceholder` from
  [create-road-permit.dto.ts](apps/api/src/modules/road-permit/dto/create-road-permit.dto.ts).
- [ ] Remove `documentPlaceholder` from the submission shape in
  [road-permit.validation.ts](apps/api/src/modules/road-permit/road-permit.validation.ts).
- [ ] Remove the placeholder data from
  [road-permit.ts](apps/api/test/fixtures/road-permit.ts).
- [ ] Remove the obsolete document TODO from
  [road-permit.mapper.ts](apps/api/src/modules/road-permit/mappers/road-permit.mapper.ts).
- [ ] Do not add document metadata to `RoadPermitApplication`, draft JSON, or the
  submission body.
- [ ] Add a repository or database-backed test proving that documents attached
  to a draft remain attached after the application changes from `Draft` to
  `InProgress`.

No minimum document requirement is currently defined. Do not block submission
when the document collection is empty unless that business rule is explicitly
added.

Acceptance criteria:

- A valid submission succeeds without `documentPlaceholder`.
- Submission does not create duplicate document records or storage objects.
- Previously uploaded documents retain the same UUID, URL, object key, and
  application relation after submission.

### Step 6: Clean up and verify the complete journey

Cleanup:

- [ ] Remove the unused `ApplicationDocument` type from
  [formTypes.ts](apps/web/src/pages/application-page/create-road-permit/formTypes.ts).
- [ ] Remove obsolete placeholder translations and imports after confirming they
  have no remaining callers.
- [ ] Keep test-only demo IDs inside test fixtures.
- [ ] Confirm the deleted placeholder documents-and-drawings page has no
  remaining imports or translation keys.

Automated tests:

- [ ] Update document API tests for required application filtering.
- [ ] Test the standalone route with its real application ID query parameter.
- [ ] Test that the embedded manager does not introduce a nested `<main>` or
  change the road-permit page title.
- [ ] Add a wizard journey covering load, ordinary upload, sign-plan upload,
  summary display, preview, delete, and persistence after reload.
- [ ] Test summary loading, error, and empty states.
- [ ] Test that submitting a draft preserves its linked documents.

Verification commands, run from the repository root:

```bash
bun run check
bun run --cwd apps/api test
bun run --cwd apps/api test:api
bun run --cwd apps/web build
bun run --cwd apps/web test:unit
bun run --cwd apps/web test:e2e
```

Manual verification:

- [ ] Complete the document and summary flow using only the keyboard.
- [ ] Verify dialog focus entry, containment, Escape behavior, and focus return.
- [ ] Verify loading, success, failure, and deletion announcements with a screen
  reader.
- [ ] Verify desktop, tablet, mobile, browser zoom, and increased text spacing.
- [ ] Confirm that leaving and reopening a draft shows the same stored documents.

## Implementation order

1. Verify whether `DocumentsManager` should remain as a separate component.
2. Lift the document state into the road-permit form.
3. Replace the summary placeholder with the shared real document collection.
4. Remove `documentPlaceholder` from the API submission contract.
5. Add the submission-preserves-documents test.
6. Remove obsolete types, translations, and imports.
7. Run focused tests, then the full relevant verification and manual
   accessibility checks.

## Current known blocker

The web build currently fails because
[create-road-permit/index.tsx](apps/web/src/pages/application-page/create-road-permit/index.tsx)
still passes the removed `exampleDocument` to the summary. Step 4 resolves this
by replacing the placeholder prop with the real shared document collection.
