# Pladsholdere og sammenfletning

Kontaktperson-featuren (UC-031, UC-032, UC-033) skal bruges inde i en
ansøgning. Da den blev bygget, fandtes ansøgningsdelen, aktørerne og de øvrige
trin ikke endnu. Derfor indeholder branchen en række pladsholdere, så
kontaktpersonerne kan testes i en rigtig wizard.

Wizard-rammen og de fleste pladsholder-trin er kopieret fra
`Feature-CreateArea` (områder). Filerne er så vidt muligt ens på de to
branches, så de er lette at flette.

Dette dokument er til dig, der bygger en af de rigtige features eller fletter
branchen. Det beskriver, hvad kontaktpersonerne faktisk er afhængige af, hvilke
dele der kun er pladsholdere, og hvordan du udskifter dem.

## Overblik

| Pladsholder | Hvor | Erstattes af | Svær? |
| --- | --- | --- | --- |
| Testansøgninger med to testaktører (API) | [`apps/api/src/modules/dev-applications/`](../../apps/api/src/modules/dev-applications/) | Ansøgnings- og aktør-modulerne | Let: slet modulet |
| Liste over testansøgninger (master) | [`dev-application-list.tsx`](../../apps/web/src/pages/application-page/components/dev-application-list.tsx), [`dev-applications.api.ts`](../../apps/web/src/api/dev-applications.api.ts) | Ansøgerens liste over ansøgninger | Let: slet filerne |
| Demo-data | [`application.seeder.ts`](../../apps/api/prisma/seeders/application.seeder.ts) | Holdets rigtige seeders | Let |
| Kladde i browseren for trin uden API | [`features/application-draft/`](../../apps/web/src/features/application-draft/) | Hvert trins eget API | Ét trin ad gangen |
| Trinene Kommune og periode, Opgaver, Skilteplan og trafik, Dokumenter | [`application-page/steps/`](../../apps/web/src/pages/application-page/steps/) | Holdets egne trin | Ét trin ad gangen |
| Trinnet Øvrige aktører (viser kun aktørerne) | [`actors-step.tsx`](../../apps/web/src/pages/application-page/steps/actors-step/actors-step.tsx) | Aktør-trinnet fra `AktørUseCase` (UC-040–042) | Let |
| Trinene Kort og Områder | [`placeholder-step.tsx`](../../apps/web/src/pages/application-page/steps/placeholder-step/placeholder-step.tsx) | `map-step` og `areas-step` fra `Feature-CreateArea` | Se [sammenfletning](#sammenfletning) |
| Kommuner | `dummyMunicipalities` i [`application-draft.ts`](../../apps/web/src/features/application-draft/application-draft.ts) | Kommune-endpoint | Let |
| Demo-aktører på nye vejtilladelser | [`placeholder-actors.ts`](../../apps/api/src/modules/road-permit/placeholder-actors.ts) (bruges i `RoadPermitRepository.create`) | Et aktør-trin i formularen (UC-040–042) | Let: slet filen og `connect` |

Det, der **ikke** er en pladsholder, og som skal blive:

- API: [`apps/api/src/modules/contact-persons/`](../../apps/api/src/modules/contact-persons/)
  og [`common/application-types.ts`](../../apps/api/src/common/application-types.ts).
- Web: trinnet **Kontaktoplysninger**
  ([`contacts-step/`](../../apps/web/src/pages/application-page/steps/contacts-step/)),
  [`features/contact-persons/`](../../apps/web/src/features/contact-persons/),
  [`contact-persons.api.ts`](../../apps/web/src/api/contact-persons.api.ts) og
  [`types/contact-person.types.ts`](../../apps/web/src/types/contact-person.types.ts).
- Wizard-rammen: [`application-page/index.tsx`](../../apps/web/src/pages/application-page/index.tsx),
  [`application-steps.ts`](../../apps/web/src/pages/application-page/application-steps.ts)
  og komponenterne i
  [`application-page/components/`](../../apps/web/src/pages/application-page/components/)
  (undtagen `dev-application-list.tsx`).

## Hvad kontaktpersonerne er afhængige af

1. **En række i `Application`-tabellen** med `caseNumber` (sagsnummeret, som
   `ContactPerson.applicationId` peger på), `type` (bestemmer tilgængelighed)
   og `status` (kontaktpersoner kan kun ændres ved `Draft` og
   `ChangeRequired`).
2. **Mindst én aktør på ansøgningen** (relationen `Actor.applications`), fordi
   en kontaktperson hører til en aktør. Uden aktører viser trinnet en besked i
   stedet for »+ Tilføj kontaktperson«.
3. **Sagsnummeret i URL'en**: wizarden åbnes på
   `/ansoegning?sag=<sagsnummer>` (og `&trin=<trin>` for at huske trinnet).
4. **`GET /api/contact-persons?applicationId=<sagsnummer>`**, som returnerer
   `{ application, actors, contactPersons }`. Siden henter ansøgningen og
   aktørerne herfra, fordi der endnu ikke findes et ansøgnings- eller
   aktør-endpoint.

I webappen hedder ansøgningsobjektet `WizardApplication`
([`types/application.types.ts`](../../apps/web/src/types/application.types.ts)),
og det sendes som prop til alle trin.

## Testansøgninger og listen (master-detail)

`/ansoegning` uden `?sag=` viser en liste over alle ansøgninger med en knap
til at oprette en testansøgning (master). Et klik på et sagsnummer åbner
wizarden (detail). Listen findes kun, så holdet kan teste uden at skrive
URL'en selv. Kolonnen »Kontaktpersoner« viser, hvor mange der er gemt, så man
kan se, at en oprettelse eller sletning er nået til databasen.

API-delen er `DevApplicationsModule` med `GET` og `POST /api/dev/applications`.
Den opretter en `Applicant`, en `Application` med status `Draft`, den
`ExcavationPermit` eller `RoadUsePermit`, skemaet kræver, og to testaktører
(»Testentreprenør A/S« og »Testledningsejer A/S«), som kontaktpersoner kan
knyttes til. Sagsnummeret er `DEV-GRAVE-<n>` eller `DEV-ROV-<n>`. Modulet
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

## Aktør-trinnet

Kontaktpersoner skal bruge rigtige aktører fra databasen. Derfor viser
pladsholderen for »Øvrige aktører« kun de aktører, der allerede er på
ansøgningen (testaktørerne), og man kan ikke oprette eller rette dem. Det
gør aktør-featuren (UC-040–042) på `AktørUseCase`.

Sådan sættes det rigtige trin ind:

1. I `renderStep()` i
   [`application-page/index.tsx`](../../apps/web/src/pages/application-page/index.tsx)
   skal `case 'otherActors'` rendere aktør-trinnet.
2. Når en aktør oprettes, rettes eller slettes, skal listen `actors`, som
   siden giver til `ContactsStep` og `SummaryStep`, opdateres. I dag ligger den
   i `load.actors` og hentes kun én gang.
3. Slet aktør-pladsholderen og teksten `wizard.actors.placeholder`.

## Kladden og de øvrige trin

Trinene uden API (Kommune og periode, Opgaver, Skilteplan og trafik,
Dokumenter) gemmer deres data i en kladde, `ApplicationDraft`, i browserens
`sessionStorage` under nøglen `application-draft:<sagsnummer>`. Den
forsvinder, når fanen lukkes. Aktører og kontaktpersoner er ikke en del af
kladden, fordi de gemmes gennem API'et.

| Fil | Indhold |
| --- | --- |
| [`application-draft.ts`](../../apps/web/src/features/application-draft/application-draft.ts) | Typer for kladden, tomme værdier, `load`/`save` og `dummyMunicipalities` |
| [`draft-validation.ts`](../../apps/web/src/features/application-draft/draft-validation.ts) | Validering pr. trin. Bruges også af Opsummering |
| [`step-props.ts`](../../apps/web/src/pages/application-page/steps/step-props.ts) | `DraftStepProps`, som alle kladde-trin får, og `LeaveGuard` |

Et trin udskiftes sådan:

1. Byg trinnet som en komponent, der mindst tager `application`, `onBack` og
   `onNext`.
2. Ret `case '<trin>'` i `renderStep()` i `index.tsx`.
3. Skal trinnet gemme, når brugeren skifter trin via trinlisten, så brug samme
   mønster som Kontaktoplysninger: sæt `leaveGuard.current` til en funktion,
   der gemmer og returnerer `false` for at blive på trinnet (se
   `ContactsStep`).
4. Fjern trinnets felter fra kladden og dets validering, og opdatér
   [`summary-step.tsx`](../../apps/web/src/pages/application-page/steps/summary-step/summary-step.tsx).
5. Kør `bun run locale:extract` og `bun run locale:check` i `apps/web`.

| Trin (`id`) | Komponent | Kladde-felter |
| --- | --- | --- |
| `municipalityAndPeriod` | `period-step.tsx` | `period` (og `dummyMunicipalities`) |
| `tasks` | `tasks-step.tsx` | `cableTasks`, `materials` |
| `signPlanAndTraffic` | `sign-plan-step.tsx` | `signPlan`, `trafficChanges`, `trafficCalmingMeasures` |
| `documents` | `documents-step.tsx` | `documents` |

## Demo-data

[`application.seeder.ts`](../../apps/api/prisma/seeders/application.seeder.ts)
opretter én kladde, `DEMO-2026-0001` (råden over vejareal).

[`actor.seeder.ts`](../../apps/api/prisma/seeders/actor.seeder.ts) opretter
tre demo-aktører (entreprenør, ledningsejer og projektkoordinator) med en
adresse, så kontaktpersoner kan testes. De knyttes til `DEMO-2026-0001` og til
alle testansøgninger (`DEV-…`), der ikke har aktører endnu, fx dem oprettet
fra listen på `Feature-CreateArea`. Seederen bruger faste UUID'er, så den kan
køres igen uden dubletter. Kør den med `bun run db:seed` i `apps/api`.

Erstat seederne med aktør-featurens egne, når den er flettet ind.

## Sammenfletning

### Med `Feature-CreateArea` (områder)

- Wizard-rammen (`application-steps.ts`, `components/`, kladde-trinene,
  `features/application-draft/`) er kopieret derfra. Følgende er ændret her
  og skal flettes med omtanke:
  - `index.tsx`: siden henter fra `GET /api/contact-persons` og har
    kontaktperson-reduceren. `Feature-CreateArea` henter fra `GET /api/areas`
    og har område-reduceren. Den flettede side skal hente begge og have begge
    reducere. `leaveGuard` deles af det trin, der er åbent.
  - `case 'map'` og `case 'areas'` rendere `PlaceholderStep` her. Brug
    `MapStep` og `AreasStep` fra `Feature-CreateArea`, og slet
    `placeholder-step/` og teksten `wizard.areasPlaceholder`.
  - `contacts-step/` er den rigtige her. Behold denne version.
  - `actors-step.tsx` viser aktører fra databasen her (se
    [Aktør-trinnet](#aktør-trinnet)).
  - `application-draft.ts` og `draft-validation.ts` har ikke `actors` og
    `contactPersons` her.
  - `summary-step.tsx` læser kontaktpersoner og aktører fra API'et her og
    områder fra API'et på `Feature-CreateArea`. Behold begge dele.
  - `step-props.ts` bruger `WizardApplication` her og `AreaApplication` dér.
    De har samme felter, så brug én af dem. `LeaveGuard` ligger i
    `step-props.ts` her og i `areas-step.tsx` dér.
  - `dev-application-list.tsx` viser `contactPersonCount` her og `areaCount`
    dér. Vis begge, og lad API'et returnere begge.
  - Ansøgningstyperne hedder `wizard.enums.ApplicationType` her og
    `areas.labels.applicationType` dér.
- `Feature-CreateArea` importerer `PrismaService` fra `src/prisma/`, mens
  `main` og denne branch bruger `src/modules/prisma/`.
- Begge branches tilføjer `modules/dev-applications`, `app.setup.ts`,
  `common/application-types.ts`, `web/src/api/client.ts` og
  `utils/focus-by-id.ts`. De er næsten ens, så behold foreningsmængden.
- `Feature-CreateArea` har en tom side på `/kontaktpersoner`. Den skal ikke
  med, fordi kontaktpersonerne ligger i wizarden.
- Databasen bygger videre på `Feature-CreateArea`: `area.prisma`,
  `area-detail.prisma`, `area-size.prisma` og migrationen
  `20261109114658_restore_area_optional_fields` er kopieret derfra uændret.
  Oven på dem ligger migrationerne fra `AktørUseCase` (se nedenfor). Den
  delte udviklingsdatabase `app` har alle migrationerne fra denne branch.
  Skifter man tilbage til `Feature-CreateArea`, mangler den branch de fire
  aktør- og kontaktperson-migrationer, så `prisma migrate dev` vil foreslå at
  nulstille databasen. Brug `bun run db:deploy`, eller vent til begge er
  flettet ind i `main`.

### Med `AktørUseCase` (aktører)

- `actor.prisma`, `address.prisma` og `contact-person.prisma` og migrationerne
  `20261103144206`, `20261104101955` og
  `20261104134121_allow_multiple_contact_persons_per_application` er kopieret
  derfra uændret.
- Holdet har besluttet, at en aktør kan have flere kontaktpersoner. Denne
  branch fjerner derfor `@unique` fra `ContactPerson.actorId` med migrationen
  `20261112120000_allow_multiple_contact_persons_per_actor`. `AktørUseCase`
  skal have samme ændring, og kun én af de to migrationer skal beholdes.
- `AktørUseCase` tilføjer `src/modules/contact-person/` (ental), som kun er
  NestJS-skabelon, men dens `create-contact-person.dto.ts` bruges af
  `CreateActorDto`. Behold `modules/contact-persons/` til endpoints, og aftal
  én DTO.

### Andre steder med konflikter

| Fil | Hvorfor |
| --- | --- |
| `apps/api/src/app.module.ts` | Alle moduler registreres her |
| `apps/api/prisma/seed.ts` | Alle seeders registreres her |
| `apps/web/src/pages/application-page/index.tsx` | `renderStep()` vælger komponenten for hvert trin |
| `apps/web/src/features/application-draft/*.ts` | Alle kladde-trin deler typer og validering |
| `apps/web/locales/*/translation.json` | Alle tekster ligger i én fil pr. sprog |

Ret konflikter i oversættelsesfilerne ved at beholde begge sider og køre
`bun run locale:check` bagefter.

`apps/api/test/app.e2e-spec.ts` fra `main` har ingen tests, så
`bun run test:e2e` afslutter med fejl, selvom alle andre tests består.
