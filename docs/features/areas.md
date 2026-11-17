# Områder (Areas)

Et område er en vejstrækning, som en ansøgning dækker. Featuren dækker
UC-034 (opret område), UC-035 (slet område) og UC-036 (opdater område). Den
bruges i ansøgningswizarden for gravetilladelse (UC-004) og råden over vej
(UC-007).

## Ansøgningstyper

Systemet understøtter kun to ansøgningstyper. Typen bestemmer, hvilke felter et
område har:

| Type | Husnr./beskrivelse, vejelement, vejside, længde, bredde | Retning | Dybde |
| --- | --- | --- | --- |
| `ExcavationPermit` (gravetilladelse) | ✅ | ✅ | ✅ |
| `RoadUsePermit` (råden over vej) | ✅ | ❌ | ❌ |

Prisma-enum'en `ApplicationType` indeholder stadig `RoadUsePermitEvent`, fordi
domænemodellen er fælles for hele holdet og ikke ændres her. Koden bruger kun
listen `supportedApplicationTypes`, som findes i både
[API'et](../../apps/api/src/common/application-types.ts) og
[webappen](../../apps/web/src/types/application.types.ts).

## Data

Et område gemmes i PostgreSQL i tre tabeller
([`apps/api/prisma/domain/`](../../apps/api/prisma/domain/)):

- `Area`: vejnavn, vejstatus, postnummer, husnr. fra/til, alternativ
  beskrivelse og `applicationId` (ansøgningens sagsnummer).
- `AreaDetail` (Områdeinformation): vejelement, beskrivelse af vejelement,
  vejside og retning.
- `AreaSize` (OmrådeAreal): længde, bredde, dybde og areal i m².

`AreaDetail` og `AreaSize` er valgfri. Et område fra vejsøgningen har kun
vejen, indtil ansøgeren udfylder detaljerne. Arealet beregnes af serveren som
længde × bredde.

## API

Koden ligger i [`apps/api/src/modules/areas/`](../../apps/api/src/modules/areas/).

| Endpoint | Formål | Use case |
| --- | --- | --- |
| `GET /api/areas?applicationId=` | Ansøgningens type, status og områder | – |
| `GET /api/areas/:id` | Ét område | – |
| `POST /api/areas/bulk` | Ét område pr. vej valgt i vejsøgningen | UC-034 trin 3 |
| `POST /api/areas` | Ét manuelt oprettet område | UC-034 A3 |
| `PATCH /api/areas/:id` | Opdater område og detaljer | UC-034 trin 5, UC-036 |
| `DELETE /api/areas/:id` | Slet område med detaljer og areal | UC-035 |

Reglerne ligger i
[`rules/area-rules.ts`](../../apps/api/src/modules/areas/rules/area-rules.ts):

- Områder kan kun ændres, når ansøgningen har status `Draft` eller
  `ChangeRequired` (UC-035 F2). Ellers returneres `APPLICATION_NOT_EDITABLE`.
- Enten skal begge husnumre eller en alternativ beskrivelse være udfyldt
  (UC-034 F1).
- Vejelement `Other` kræver en beskrivelse. Længde, bredde og dybde skal være
  større end 0.
- Felter, typen ikke bruger, afvises (`AREA_FIELDS_NOT_ALLOWED`).
- Det sidste område kan ikke slettes (`LAST_AREA`, UC-035 F1).
- Bogstavet i et husnummer gemmes med stort, fx `5a` → `5A`
  (BEK nr. 271 af 2018, § 16, stk. 2). Formatet og rækkefølgen af husnumrene
  kontrolleres ikke.

Maks. længder og formater (fx postnummer med 4 cifre) tjekkes i DTO'erne i
[`dto/create-area.dto.ts`](../../apps/api/src/modules/areas/dto/create-area.dto.ts):
vejnavn og beskriv vejelement 200 tegn, husnr. 20 tegn og alternativ
beskrivelse 500 tegn. Webappen bruger de samme grænser.

## Web

| Del | Fil |
| --- | --- |
| API-kald | [`api/areas.api.ts`](../../apps/web/src/api/areas.api.ts) |
| Typer | [`types/area.types.ts`](../../apps/web/src/types/area.types.ts) |
| Redigeringstilstand (reducer) | [`features/areas/area-edit-state.ts`](../../apps/web/src/features/areas/area-edit-state.ts) |
| Validering, talformat og maks. længder (spejler API'ets regler) | [`features/areas/area-validation.ts`](../../apps/web/src/features/areas/area-validation.ts) |
| Kort-trin | [`steps/map-step/`](../../apps/web/src/pages/application-page/steps/map-step/) |
| Områder-trin | [`steps/areas-step/`](../../apps/web/src/pages/application-page/steps/areas-step/) |

Flow i wizarden (`/ansoegning?sag=<sagsnummer>`):

1. Siden henter ansøgningen og dens områder én gang.
2. **Kort**: ansøgeren søger og vælger veje. Ved "Næste" oprettes ét område
   pr. vej. "Indtast vej manuelt" åbner et tomt område (UC-034 A3).
   - Vejsøgningen kalder Dataforsyningens GSearch (`navngivenvej`) direkte fra
     browseren i
     [`road-search.api.ts`](../../apps/web/src/api/road-search.api.ts).
     Tokenet ligger i `VITE_DATAFORSYNINGEN_TOKEN`. Vite lægger det i
     browserkoden, så det er synligt for brugerne af siden.
   - Søgeteksten er højst 100 tegn. Tegn som `&`, `|`, `:` og anførselstegn
     erstattes af mellemrum, før der søges, fordi GSearch ellers kan svare
     HTTP 400. Bogstaver (også æ, ø, å), tal og punktum bevares.
   - Resultatlisten er en MUI `List` med et afkrydsningsikon pr. vej. Klik
     eller Enter vælger vejen, og vælger man en valgt vej igen, fjernes den.
     "Ingen veje fundet" vises i listen, og en fejl i søgningen vises som en
     `Alert` under feltet.
   - En vej, der krydser flere postnumre, vises én gang pr. postnummer, fordi
     et område kun har ét postnummer.
   - Dataforsyningen oplyser ikke, om vejen er kommunal eller privat. Ansøgeren
     vælger vejstatus for hver valgt vej, før der kan gås videre.
   - Kan ansøgningen ikke ændres (status er ikke `Draft` eller
     `ChangeRequired`), vises beskeden om det, og søgningen skjules. Ændres
     status i en anden fane, viser oprettelsen samme besked.
3. **Områder**: hvert område er et kort, og kun ét er åbent ad gangen.
   - Vejstatus kan rettes på alle områder. Vejnavn og postnummer kan kun
     rettes på en manuel vej, og kun i den session, hvor den blev oprettet
     (se "Ikke bygget endnu").
   - "Gem område" validerer først lokalt og gemmer derefter. Efter "Gem
     område" og "Annuller" lukkes kortet igen.
   - Formatfejl (fx `abc` i længde) vises, så snart man forlader feltet.
     Manglende felter vises først, når man prøver at gemme.
   - Tal skrives på dansk: komma er decimaltegn, og punktum er
     tusindtalsseparator (`0,6`, `1.000`, `1.000,5`). `1.5` afvises.
   - Postnummer-feltet tager kun cifre. Tekstfelterne har samme maks. længde
     som API'et, og alternativ beskrivelse og beskriv vejelement viser antal
     tegn.
   - Sletning kræver bekræftelse (UC-035 trin 4).
   - Skifter man område med ugemte ændringer, spørger en dialog om man vil
     gemme eller kassere.
   - Når man forlader trinnet, gemmes det åbne område. Mangler der felter,
     vises en oversigt, og man bliver på trinnet.

## Test

Testene er unittests af kernen. Komponenterne testes manuelt efter
testarket for UC-034, UC-035 og UC-036.

| Slags | Hvor | Kør |
| --- | --- | --- |
| API unittest (regler og service) | `apps/api/src/modules/areas/**/*.spec.ts` | `bun run --filter api test` |
| Web unittest (validering, reducer) | `apps/web/src/features/areas/*.test.ts` | `bun run --filter web test` |
| Web unittest (API-klient, vejsøgning, vej-mapper) | `apps/web/src/api/**/*.test.ts` | `bun run --filter web test` |

- Service-testene bruger en falsk `AreasRepository`, så de kræver ikke
  databasen.
- Vejsøgningstestene erstatter `fetch`, så Dataforsyningen kaldes ikke.
- [`src/test/fake-areas-api.ts`](../../apps/web/src/test/fake-areas-api.ts)
  er en falsk udgave af område-API'et til komponenttest. Ingen test bruger den
  i øjeblikket.

## Pladsholdere

Ansøgningslisten, testansøgningerne og de øvrige trin i wizarden er
pladsholdere, indtil holdets egne features er klar. Hvad der kan udskiftes, og
hvordan, står i [Pladsholdere og sammenfletning](placeholders.md).

## Ikke bygget endnu

- Vejstatus (kommunal eller privat) hentes ikke automatisk. Den skal på sigt
  komme fra en datakilde, så ansøgeren ikke selv skal vælge den.
- Kortet er en pladsholder, så man kan hverken tegne på det (UC-004 trin 15)
  eller vælge et område direkte på kortet (UC-035 A2).
- Sagsbehandleren får ikke besked, når et område ændres eller slettes under
  `ChangeRequired` (UC-035 A3, UC-017). Det er markeret med TODO i
  `areas.service.ts`.
- Sletning bliver ikke logget (UC-035 trin 8).
- Område-endpoints har ingen login-kontrol, så det tjekkes ikke, at
  ansøgeren ejer ansøgningen (UC-035 forudsætning).
- Databasen gemmer ikke, om en vej blev indtastet manuelt. Efter en
  genindlæsning kan vejnavn og postnummer derfor ikke rettes på en manuel vej,
  kun vejstatus. Det kræver et felt som `isManuallyAdded` på `Area`, dvs. en
  ændring af Prisma-skemaet.
- Dataforsyningen har meddelt, at GSearch lukker omkring 1. november 2026
  (se [GSearch-dokumentationen](https://docs.dataforsyningen.dk/#gsearch)).
  Vejsøgningen skal flyttes til den efterfølgende tjeneste, når den kendes.
  Kun [`road-search.api.ts`](../../apps/web/src/api/road-search.api.ts) og
  [`road.mapper.ts`](../../apps/web/src/api/mappers/road.mapper.ts) skal
  ændres.
