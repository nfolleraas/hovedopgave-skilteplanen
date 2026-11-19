# Kontaktpersoner (Contact persons)

En kontaktperson er en person, kommunen kan kontakte om en ansøgning.
Featuren dækker UC-031 (opret kontaktperson), UC-032 (slet kontaktperson) og
UC-033 (opdater kontaktperson). Den bruges i trinnet **Kontaktoplysninger** i
ansøgningswizarden for gravetilladelse (UC-004) og råden over vej (UC-007).

En kontaktperson hører altid til en **aktør** på ansøgningen (UC-040 trin 7),
fx bygherren eller entreprenøren. En aktør kan have flere kontaktpersoner, og
en ansøgning kan have flere aktører.

## Ansøgningstyper

Typen bestemmer kun, om ansøgeren selv vælger tilgængelighed:

| Type | Tilgængelighed |
| --- | --- |
| `ExcavationPermit` (gravetilladelse) | Vælges: dag, aften, nat eller døgn |
| `RoadUsePermit` (råden over vej) | Altid dag. Systemet sætter den (UC-031 A1, UC-033 A1) |

En kontaktperson har én tilgængelighed (`Availability` i Prisma). »Døgn«
dækker hele døgnet.

## Data

En kontaktperson gemmes i tabellen `ContactPerson`
([`contact-person.prisma`](../../apps/api/prisma/domain/contact-person.prisma))
med navn, e-mail, telefonnummer, tilgængelighed, `applicationId`
(ansøgningens sagsnummer) og `actorId` (aktøren).

Skemaet for `Actor`, `Address` og `ContactPerson` er kopieret fra
`AktørUseCase`-branchen. Der er ingen unik-begrænsning på `actorId` eller
`applicationId`, så både en aktør og en ansøgning kan have flere
kontaktpersoner (migrationen
`20261112120000_allow_multiple_contact_persons_per_actor`).

## API

Koden ligger i
[`apps/api/src/modules/contact-persons/`](../../apps/api/src/modules/contact-persons/).

| Endpoint | Formål | Use case |
| --- | --- | --- |
| `GET /api/contact-persons?applicationId=` | Ansøgningens type og status, aktører og kontaktpersoner | – |
| `GET /api/contact-persons/:id` | Én kontaktperson | – |
| `POST /api/contact-persons` | Opret kontaktperson på en aktør | UC-031 |
| `PATCH /api/contact-persons/:id` | Opdater kontaktperson | UC-033 |
| `DELETE /api/contact-persons/:id` | Slet kontaktperson | UC-032 |

Reglerne ligger i
[`rules/contact-person-rules.ts`](../../apps/api/src/modules/contact-persons/rules/contact-person-rules.ts):

- Kontaktpersoner kan kun ændres, når ansøgningen har status `Draft` eller
  `ChangeRequired`. Ellers returneres `APPLICATION_NOT_EDITABLE` (409).
- Navn skal udfyldes, telefonnummeret skal være 8 cifre, og e-mailen skal
  have et gyldigt format (UC-031 F1–F4, UC-033 F1–F4). Ellers returneres
  `CONTACT_PERSON_INVALID` med `invalidFields`.
- E-mailen må kun indeholde engelske bogstaver, tal og `.`, `_`, `+` og `-`
  før @, og bogstaver, tal, `-` og `.` efter @. Domænet skal slutte på mindst
  to bogstaver (fx `.dk`). Komma, mellemrum, `æøå` og andre specialtegn
  afvises. Webappen og API'et bruger samme mønster.
- Gravetilladelser skal have en tilgængelighed. Ved råden over vej sætter
  serveren den til `Day`, og en valgt tilgængelighed afvises
  (`CONTACT_PERSON_FIELDS_NOT_ALLOWED`).
- Aktøren skal være på ansøgningen (`ACTOR_NOT_FOUND`). Ansøgning og aktør
  kan ikke ændres efter oprettelsen.
- En aktør kan ikke have to kontaktpersoner med præcis de samme oplysninger
  (navn, tilgængelighed, telefonnummer og e-mail efter trim) på samme
  ansøgning. Det gælder både ved oprettelse og redigering
  (`CONTACT_PERSON_DUPLICATE`, 409).
- Den sidste kontaktperson på en ansøgning kan ikke slettes
  (`LAST_CONTACT_PERSON`, 400, UC-032 F1). Vil ansøgeren udskifte den, oprettes
  den nye først (UC-032 A3).
- `PATCH` lægger de gemte værdier og ændringerne sammen og validerer hele
  kontaktpersonen.

Maks. længder og formater tjekkes i
[`dto/create-contact-person.dto.ts`](../../apps/api/src/modules/contact-persons/dto/create-contact-person.dto.ts):
navn 200 tegn og e-mail 254 tegn. Et telefonnummer, der ikke er 8 cifre,
afvises allerede af DTO'en med Nests standardfejl. Webappen bruger de samme
grænser.

Alle fejl har formen `{ code, message }`.

## Web

| Del | Fil |
| --- | --- |
| API-kald | [`api/contact-persons.api.ts`](../../apps/web/src/api/contact-persons.api.ts) |
| Typer | [`types/contact-person.types.ts`](../../apps/web/src/types/contact-person.types.ts) |
| Redigeringstilstand (reducer) | [`features/contact-persons/contact-person-edit-state.ts`](../../apps/web/src/features/contact-persons/contact-person-edit-state.ts) |
| Validering (spejler API'ets regler) | [`features/contact-persons/contact-person-validation.ts`](../../apps/web/src/features/contact-persons/contact-person-validation.ts) |
| Tekstnøgler for enums og telefonformat | [`features/contact-persons/contact-person-labels.ts`](../../apps/web/src/features/contact-persons/contact-person-labels.ts) |
| Trinnet Kontaktoplysninger | [`steps/contacts-step/`](../../apps/web/src/pages/application-page/steps/contacts-step/) |

Flow i wizarden (`/ansoegning?sag=<sagsnummer>&trin=contactInfo`):

1. Siden henter ansøgningen, dens aktører og kontaktpersoner én gang fra
   `GET /api/contact-persons`. Reduceren ligger på siden, så kontaktpersonerne
   bevares, når man skifter trin.
2. Til venstre er kontaktpersonerne, grupperet efter aktør
   (»Entreprenør · Graveselskabet A/S«). Kun aktører med kontaktpersoner
   vises. Hver kontaktperson er et kort, ligesom et område på trinnet
   Områder, med navn, tilgængelighed, telefonnummer og e-mail og knapperne
   »Redigér« og »Slet«. En ny kontaktperson vises som et stiplet kort, indtil
   den er gemt. Til højre er formularen. På smalle skærme ligger formularen
   under listen.
3. **Opret** (UC-031): »+ Tilføj kontaktperson« åbner formularen. Ansøgeren
   vælger aktør (»Tilknyt til aktør«), navn, tilgængelighed, telefonnummer og
   e-mail og vælger »Gem kontaktperson«.
4. **Opdater** (UC-033): »Redigér« åbner formularen med de gemte værdier.
   Aktøren vises, men kan ikke ændres. »Gem ændringer« gemmer.
5. **Slet** (UC-032): »Slet« viser en bekræftelsesdialog med kontaktpersonens
   oplysninger. Er det den sidste kontaktperson, vises en fejl i stedet, og
   intet slettes.
6. Formularen lukker efter »Gem« og »Annuller«, og der vises en bekræftelse.
7. Formatfejl (fx et telefonnummer med 7 cifre) vises, så snart man forlader
   feltet, og forsvinder, når feltet er rettet. Manglende felter vises først,
   når man prøver at gemme. Så vises en samlet besked øverst i formularen, en
   fejl ved hvert felt, og fokus flyttes til det første felt med fejl.
   Indtastningen bevares, hvis serveren afviser den.
   - Telefonnummer tager kun cifre. Indsatte numre som `22 33 44 55` og
     `+45 22 33 44 55` bliver til `22334455`.
   - E-mail kan ikke indeholde mellemrum, og domænet skal have mindst ét
     punktum uden tomme dele (`navn@firma..dk` afvises). API'et bruger samme
     mønster.
   - Navn og e-mail har samme maks. længde som API'et (200 og 254 tegn), og
     API'et fjerner mellemrum omkring dem.
   - Hver fejlkode fra API'et har sin egen besked. Er kontaktpersonen slettet
     i en anden fane, siger formularen det, og en sletning af den viser blot,
     at den allerede var slettet.
   - Lukker eller genindlæser man fanen med ugemte ændringer, spørger
     browseren først.
8. Skifter man til en anden kontaktperson med ugemte ændringer, spørger en
   dialog, om man vil gemme eller kassere.
9. Når man forlader trinnet (»Næste«, »Tilbage« eller trinlisten), gemmes en
   åben formular med ændringer. Er den ugyldig, bliver man på trinnet.
   »Næste« kræver mindst én gemt kontaktperson (UC-004 F7).
10. Kan ansøgningen ikke ændres, vises en besked, og knapperne til at oprette,
    redigere og slette skjules.

## Test

| Slags | Hvor | Kør |
| --- | --- | --- |
| API unittest (regler og service) | `apps/api/src/modules/contact-persons/**/*.spec.ts` | `bun run --filter api test` |
| API e2e (mod databasen i `DATABASE_URL`) | `apps/api/test/contact-persons.e2e-spec.ts` | `bun run --filter api test:e2e` |
| Web unittest (validering, reducer) | `apps/web/src/features/contact-persons/*.test.ts` | `bun run --filter web test` |
| Web komponenttest (trinnet i wizarden) | `apps/web/src/pages/application-page/steps/contacts-step/contacts-step.test.tsx` | `bun run --filter web test` |

- Service-testene bruger en falsk `ContactPersonsRepository`, så de kræver
  ikke databasen.
- E2e-testene opretter deres egne ansøgninger (`E2E-CP-*`) og sletter dem
  igen. Databasen skal have alle migrationer fra denne branch.
- Komponenttesten bruger
  [`src/test/fake-contact-persons-api.ts`](../../apps/web/src/test/fake-contact-persons-api.ts),
  en falsk udgave af API'et, der erstatter `fetch`.

## Pladsholdere

Testansøgningerne, listen over dem og de øvrige trin i wizarden er
pladsholdere, indtil holdets egne features er klar. Hvad der kan udskiftes, og
hvordan, står i [Pladsholdere og sammenfletning](placeholders.md).

## Ikke bygget endnu

- Logning: UC-032 siger, at en sletning og en fejlet sletning logges. Der er
  ingen log-service endnu. Det er markeret med TODO i
  `contact-persons.service.ts`.
- Der er ingen login-kontrol, så det tjekkes ikke, at ansøgeren ejer
  ansøgningen.
- UC-032-mockuppen viser en detaljevisning af én kontaktperson. Den er ikke
  bygget, fordi rækken i listen allerede viser alle oplysningerne, og »Slet«
  ligger på rækken.
