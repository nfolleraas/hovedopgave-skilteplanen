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

## Web

| Del | Fil |
| --- | --- |
| API-kald | [`api/areas.api.ts`](../../apps/web/src/api/areas.api.ts) |
| Typer | [`types/area.types.ts`](../../apps/web/src/types/area.types.ts) |
| Redigeringstilstand (reducer) | [`features/areas/area-edit-state.ts`](../../apps/web/src/features/areas/area-edit-state.ts) |
| Validering (spejler API'ets regler) | [`features/areas/area-validation.ts`](../../apps/web/src/features/areas/area-validation.ts) |
| Kort-trin | [`steps/map-step/`](../../apps/web/src/pages/application-page/steps/map-step/) |
| Områder-trin | [`steps/areas-step/`](../../apps/web/src/pages/application-page/steps/areas-step/) |

Flow i wizarden (`/ansoegning?sag=<sagsnummer>`):

1. Siden henter ansøgningen og dens områder én gang.
2. **Kort**: ansøgeren søger og vælger veje. Ved "Næste" oprettes ét område
   pr. vej. "Opret vej manuelt" åbner et tomt område (UC-034 A3).
3. **Områder**: hvert område er et kort, og kun ét er åbent ad gangen.
   - Veje fra søgningen kan ikke omdøbes. Kun manuelle veje kan.
   - "Gem" validerer først lokalt og gemmer derefter.
   - Sletning kræver bekræftelse (UC-035 trin 4).
   - Skifter man område med ugemte ændringer, spørger en dialog om man vil
     gemme eller kassere.
   - Når man forlader trinnet, gemmes det åbne område. Mangler der felter,
     vises en oversigt, og man bliver på trinnet.

## Ikke bygget endnu

- Vejsøgningen er en mock med faste veje
  ([`mock-road-search.ts`](../../apps/web/src/api/mock-road-search.ts)).
  Kortet er en pladsholder, så man kan hverken tegne på det (UC-004 trin 15)
  eller vælge et område direkte på kortet (UC-035 A2).
- Sagsbehandleren får ikke besked, når et område ændres eller slettes under
  `ChangeRequired` (UC-035 A3, UC-017). Det er markeret med TODO i
  `areas.service.ts`.
- Sletning bliver ikke logget (UC-035 trin 8).
- Område-endpoints har ingen login-kontrol, så det tjekkes ikke, at
  ansøgeren ejer ansøgningen (UC-035 forudsætning).
