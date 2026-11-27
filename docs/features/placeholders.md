# Pladsholdere og sammenfletning

Område-featuren (UC-034, UC-035, UC-036) skal bruges inde i en ansøgning. Da
den blev bygget, fandtes ansøgningsdelen, kontaktpersoner og de øvrige trin
ikke endnu. Derfor indeholder branchen en række pladsholdere, så områderne kan
testes i en rigtig wizard.

Dette dokument er til dig, der bygger en af de rigtige features. Det beskriver,
hvad områderne faktisk er afhængige af, hvilke dele der kun er pladsholdere, og
hvordan du udskifter dem.

## Overblik

| Pladsholder | Hvor | Erstattes af | Svær? |
| --- | --- | --- | --- |
| Testansøgninger (API) | [`apps/api/src/modules/dev-applications/`](../../apps/api/src/modules/dev-applications/) | Ansøgnings-modulet | Let: slet modulet |
| Liste over testansøgninger (master) | [`dev-application-list.tsx`](../../apps/web/src/pages/application-page/components/dev-application-list.tsx), [`dev-applications.api.ts`](../../apps/web/src/api/dev-applications.api.ts) | Ansøgerens liste over ansøgninger | Let: slet filerne |
| Demo-data | [`application.seeder.ts`](../../apps/api/prisma/seeders/application.seeder.ts) | Holdets rigtige seeders | Let |
| Kladde i browseren for trin uden API | [`features/application-draft/`](../../apps/web/src/features/application-draft/) | Hvert trins eget API | Ét trin ad gangen |
| Trinene Kommune og periode, Opgaver, Andre aktører, Kontaktoplysninger, Skilteplan og trafik, Dokumenter | [`application-page/steps/`](../../apps/web/src/pages/application-page/steps/) | Holdets egne trin | Ét trin ad gangen |
| Kommuner | `dummyMunicipalities` i [`application-draft.ts`](../../apps/web/src/features/application-draft/application-draft.ts) | Kommune-endpoint | Let |
| Kortet | [`map-placeholder.tsx`](../../apps/web/src/pages/application-page/steps/map-step/map-placeholder.tsx) | Interaktivt kort | Let: én komponent |

Det, der **ikke** er en pladsholder, og som skal blive:

- API: [`apps/api/src/modules/areas/`](../../apps/api/src/modules/areas/) og
  [`common/application-types.ts`](../../apps/api/src/common/application-types.ts).
- Web: trinene **Kort** og **Områder**
  ([`map-step/`](../../apps/web/src/pages/application-page/steps/map-step/),
  [`areas-step/`](../../apps/web/src/pages/application-page/steps/areas-step/)),
  [`features/areas/`](../../apps/web/src/features/areas/),
  [`areas.api.ts`](../../apps/web/src/api/areas.api.ts),
  [`road-search.api.ts`](../../apps/web/src/api/road-search.api.ts) og
  [`types/area.types.ts`](../../apps/web/src/types/area.types.ts).
- Wizard-rammen: [`application-page/index.tsx`](../../apps/web/src/pages/application-page/index.tsx),
  [`application-steps.ts`](../../apps/web/src/pages/application-page/application-steps.ts)
  og komponenterne i
  [`application-page/components/`](../../apps/web/src/pages/application-page/components/)
  (undtagen `dev-application-list.tsx`). Rammen kan sagtens ændres, men den
  er ikke en pladsholder.

## Hvad områderne er afhængige af

Områderne kender kun tre ting om en ansøgning. Så længe de findes, kan alt
andet udskiftes.

1. **En række i `Application`-tabellen** med:
   - `caseNumber`: sagsnummeret. Det er ansøgningens id, og `Area.applicationId`
     peger på det.
   - `type`: `ExcavationPermit` eller `RoadUsePermit`. Typen bestemmer, om
     området har retning og dybde.
   - `status`: områder kan kun ændres ved `Draft` og `ChangeRequired`.
2. **Sagsnummeret i URL'en**: wizarden åbnes på
   `/ansoegning?sag=<sagsnummer>` (og `&trin=<trin>` for at huske trinnet).
3. **`GET /api/areas?applicationId=<sagsnummer>`**, som returnerer
   `{ application: { caseNumber, type, status }, areas: [...] }`. Siden henter
   ansøgningen herfra, fordi der endnu ikke findes et ansøgnings-endpoint.

I webappen hedder objektet `AreaApplication`
([`types/area.types.ts`](../../apps/web/src/types/area.types.ts)), og det
sendes som prop til alle trin.

## Testansøgninger og listen (master-detail)

`/ansoegning` uden `?sag=` viser en liste over alle ansøgninger med en knap
til at oprette en testansøgning (master). Et klik på et sagsnummer åbner
wizarden (detail). Listen findes kun, så holdet kan teste uden at skrive
URL'en selv.

API-delen er `DevApplicationsModule` med `GET` og `POST /api/dev/applications`.
Den opretter en `Applicant`, en `Application` med status `Draft` og den
`ExcavationPermit` eller `RoadUsePermit`, skemaet kræver, med
pladsholderværdier (sagsnummer `DEV-GRAVE-<n>` eller `DEV-ROV-<n>`). Modulet
indlæses ikke i produktion.

### Sådan fjerner du dem, når ansøgningsdelen er klar

API:

1. Fjern `DevApplicationsModule` fra `imports` i
   [`app.module.ts`](../../apps/api/src/app.module.ts).
2. Slet mappen `apps/api/src/modules/dev-applications/`.

Web:

1. I [`application-page/index.tsx`](../../apps/web/src/pages/application-page/index.tsx):
   - erstat blokken `if (!caseNumber) { … <DevApplicationList /> … }` med
     jeres egen liste, eller send brugeren videre til den;
   - fjern linket med `devApplications.backToList` under trinlisten, eller
     peg det på jeres egen liste.
2. Slet `components/dev-application-list.tsx` og `api/dev-applications.api.ts`.
3. Fjern gruppen `devApplications` i `apps/web/locales/da/translation.json` og
   `en/translation.json`, og mønsteret `devApplications\.statuses` i
   [`i18next-parser.config.mjs`](../../apps/web/locales/i18next-parser.config.mjs).
4. Kør `bun run locale:check` i `apps/web`.

Brug `applicationUrl()` fra `dev-application-list.tsx` som forbillede, hvis
jeres liste skal linke til wizarden: `/ansoegning?sag=<sagsnummer>`.

## Ansøgningsdelen: hent ansøgningen fra jeres eget modul

I dag læser [`AreasRepository.getApplication()`](../../apps/api/src/modules/areas/areas.repository.ts)
selv `caseNumber`, `type` og `status` fra `Application`. Det virker også, når
ansøgnings-modulet findes, så det skal ikke ændres for at flette.

Vil I samle adgangen til `Application` ét sted, er det ét skifte:

1. Lad ansøgnings-modulet eksportere sin service, fx
   `exports: [ApplicationsService]`.
2. Importér modulet i [`areas.module.ts`](../../apps/api/src/modules/areas/areas.module.ts).
3. Lad `AreasService.getApplication()` kalde jeres service og returnere
   `{ caseNumber, type, status }`. Fjern derefter `getApplication()` fra
   `AreasRepository`.
4. Bevar fejlkoden `APPLICATION_NOT_FOUND` (404), som webappen viser som
   "sagen findes ikke".

Husk reglen fra [API-guiden](../api/modules-and-seeders.md): kun repositories
må bruge `PrismaService`.

I webappen kan siden blive ved med at hente ansøgningen fra
`GET /api/areas`. Får I et `GET /api/applications/:caseNumber`, kan
`index.tsx` hente ansøgningen derfra i stedet. Så skal I blot stadig give
trinene et objekt med `caseNumber`, `type` og `status`.

Ansøgningstyperne findes to steder, som skal holdes ens:
`supportedApplicationTypes` i
[`apps/api/src/common/application-types.ts`](../../apps/api/src/common/application-types.ts)
og [`apps/web/src/types/application.types.ts`](../../apps/web/src/types/application.types.ts).

## Kladden og de øvrige trin

Trinene uden API (alt undtagen Kort, Områder og Opsummering) gemmer deres
data i en kladde, `ApplicationDraft`, i browserens `sessionStorage` under
nøglen `application-draft:<sagsnummer>`. Den forsvinder, når fanen lukkes.
Feltnavnene følger Prisma-modellerne, så de kan sendes direkte, når der findes
endpoints.

| Fil | Indhold |
| --- | --- |
| [`application-draft.ts`](../../apps/web/src/features/application-draft/application-draft.ts) | Typer for kladden, tomme værdier, `load`/`save` og `dummyMunicipalities` |
| [`draft-validation.ts`](../../apps/web/src/features/application-draft/draft-validation.ts) | Validering pr. trin. Bruges også af Opsummering |
| [`step-props.ts`](../../apps/web/src/pages/application-page/steps/step-props.ts) | `DraftStepProps`, som alle kladde-trin får |

### Sådan udskifter du ét trin, fx Kontaktoplysninger

Kontaktpersoner (UC-031–033) er i dag
[`contacts-step.tsx`](../../apps/web/src/pages/application-page/steps/contacts-step/contacts-step.tsx)
og listen `contactPersons` i kladden.

1. Byg jeres trin som en komponent, der mindst tager
   `application`, `onBack` og `onNext`. `application.caseNumber` er
   sagsnummeret, I skal gemme på.
2. I `renderStep()` i
   [`application-page/index.tsx`](../../apps/web/src/pages/application-page/index.tsx)
   skal `case 'contactInfo'` rendere jeres komponent i stedet for
   `<ContactsStep {...draftProps} />`. Trinnets id og placering står i
   [`application-steps.ts`](../../apps/web/src/pages/application-page/application-steps.ts).
3. Skal jeres trin gemme, når brugeren skifter trin via trinlisten, så brug
   samme mønster som Områder: sæt `leaveGuard.current` til en funktion, der
   gemmer og returnerer `false` for at blive på trinnet (se `AreasStep`).
   I dag har siden kun én `leaveGuard`, så den kan genbruges af det trin, der
   er åbent.
4. Fjern det, kladden ikke længere skal have: `contactPersons` og
   `ContactPersonDraft`/`emptyContactPerson()` i `application-draft.ts`,
   `validateContactPersons()` i `draft-validation.ts`, samt
   `contacts-step.tsx`.
5. Opdatér [`summary-step.tsx`](../../apps/web/src/pages/application-page/steps/summary-step/summary-step.tsx),
   som i dag læser kontaktpersoner og deres fejl fra kladden.
6. Kør `bun run locale:extract` og `bun run locale:check` i `apps/web`, og
   fjern tekster under `wizard.contacts`, der ikke bruges længere.

De andre kladde-trin udskiftes på samme måde:

| Trin (`id`) | Komponent | Kladde-felter |
| --- | --- | --- |
| `municipalityAndPeriod` | `period-step.tsx` | `period` (og `dummyMunicipalities`) |
| `tasks` | `tasks-step.tsx` | `cableTasks`, `materials` |
| `otherActors` | `actors-step.tsx` | `actors` |
| `contactInfo` | `contacts-step.tsx` | `contactPersons` |
| `signPlanAndTraffic` | `sign-plan-step.tsx` | `signPlan`, `trafficChanges`, `trafficCalmingMeasures` |
| `documents` | `documents-step.tsx` | `documents` |

Når det sidste trin er udskiftet, kan `features/application-draft/`,
`step-props.ts` og `draft`-tilstanden i `index.tsx` slettes.

## Demo-data

[`application.seeder.ts`](../../apps/api/prisma/seeders/application.seeder.ts)
opretter én kladde, `DEMO-2026-0001` (råden over vejareal), med ansøger og
tilladelse. Den registreres i [`seed.ts`](../../apps/api/prisma/seed.ts).

Områder har ingen seeder. De oprettes gennem wizarden. Erstat gerne
demo-seederen med jeres egen, så længe der findes mindst én ansøgning med
status `Draft` til test. Se [API-guiden](../api/modules-and-seeders.md#seeders)
for, hvordan seeders skrives.

## Steder, hvor I sandsynligvis får merge-konflikter

| Fil | Hvorfor |
| --- | --- |
| `apps/api/src/app.module.ts` | Alle moduler registreres her |
| `apps/api/prisma/seed.ts` | Alle seeders registreres her |
| `apps/web/src/pages/application-page/index.tsx` | `renderStep()` vælger komponenten for hvert trin |
| `apps/web/src/features/application-draft/*.ts` | Alle kladde-trin deler typer og validering |
| `apps/web/locales/*/translation.json` | Alle tekster ligger i én fil pr. sprog |

Ret konflikter i oversættelsesfilerne ved at beholde begge sider og køre
`bun run locale:check` bagefter.
