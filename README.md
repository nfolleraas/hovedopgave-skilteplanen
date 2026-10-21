# Hovedopgave for skilteplanen.dk

Et projekt udviklet i forbindelse med 5. semester på Datamatiker-studiet på UCL i samarbejde med [Skilteplanen](https://skilteplanen.dk).

Projektet består af følgende:

| App   | Stack                         | Sti             | Port (i containeren)               |
| ----- | ----------------------------- | --------------- | ---------------------------------- |
| `web` | React 19 + TypeScript, Vite 8 | `apps/web`      | 5173                               |
| `api` | NestJS 12 + TypeScript        | `apps/api`      | 3000, alle ruter ligger under `/api` |
| `db`  | Postgres 17                   | compose service | 5432, tilgængelig som hostname `db` |

For en linje-for-linje forklaring af container-opstillingen, hvorfor hver
indstilling findes, og hvordan den ændres, se [DEVCONTAINER.md](DEVCONTAINER.md).

## Forudsætninger

- [Docker](https://docs.docker.com/get-docker/) med Docker Compose v2
- [VS Code](https://code.visualstudio.com/) med
  [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)-udvidelsen

Intet andet er nødvendigt på værten. Node, bun og Postgres ligger alle i
containerne.

## Brug af dev containeren

En dev container er en Docker-container, som VS Code åbner repoet inde i.
Din editor, terminal, udvidelser og de værktøjer, du kører, ligger alle i
containeren, så hver bidragyder får den samme Node-version, samme bun og
samme database uden at installere noget på sin maskine.

Alt, som containeren har brug for, er beskrevet i `.devcontainer/`:

| Fil                      | Formål                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `devcontainer.json`      | Hvad VS Code kobler til, hvilke porte der videresendes, hvilke udvidelser der installeres, og hvad der køres efter oprettelse |
| `compose.yaml`           | De to containere: `app` (Node 22 + bun, indeholder repoet) og `db` (Postgres 17)                       |
| `devcontainer-lock.json` | Låste versioner af de installerede features. Commit den, ligesom `bun.lock`                              |

### Åbn projektet i containeren

1. Klon repositet og åbn mappen i VS Code.
2. Når du bliver bedt om det, vælg **Reopen in Container**. Hvis der ikke vises
   en prompt, skal du åbne kommandopaletten og køre **Dev Containers: Reopen in Container**.
3. Vent på builden. Ved første kørsel henter VS Code billederne, installerer bun,
   starter Postgres og kører `bun install` automatisk.

Repositet monteres på `/workspaces/devcontainer-test` inde i containeren.
Ændringer foretaget i VS Code lander direkte i din lokale checkout, så git fungerer
som normalt fra begge sider.

### Hverdagskommandoer

| Handling                                                       | Indtastning i kommandopaletten                              |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| Genopbyg efter redigering af `devcontainer.json` eller `compose.yaml` | **Dev Containers: Rebuild Container**                       |
| Genopbyg fra bunden og slet cache for billeder                 | **Dev Containers: Rebuild Container Without Cache**         |
| Forlad containeren og arbejd lokalt på værten                  | **Dev Containers: Reopen Folder Locally**                    |
| Se videresendte porte og deres aktuelle vært-port             | **Ports**-panelet i nederste bjælke                          |

En kørende container opfanger ikke ændringer i konfigurationen. Enhver
ændring under `.devcontainer/` kræver en genopbygning.

### Ting at vide

- `bun install` køres kun automatisk, når containeren først oprettes.
  Efter at have hentet ændringer, der berører en `package.json`, skal du køre
  den igen manuelt fra repo-roden.
- Hvis en port allerede er i brug på værten, vælger VS Code automatisk en anden
  ledig port, som vises i **Ports**-panelet.
- Databasen ligger kun på compose-netværket. `api`-appen når den som
  `db:5432` via miljøvariablen `DATABASE_URL`, som allerede er sat i
  `app`-containeren. For at forbinde en GUI fra værten skal du videresende
  `db:5432` fra **Ports**-panelet.
- Databasedata ligger i et navngivet volumen (`pgdata`), så de overlever
  container-genopbygninger. Slet volumenet, hvis du vil have en ren database.
- Udvidelser, der er angivet i `devcontainer.json`, installeres inde i
  containeren. Værtens udvidelser bliver ikke overført.
- [Biome](https://biomejs.dev/) er linteren, formatteren og import-sorteren,
  leveret af den enkelte Biome-udvidelse. Editoren formaterer ved gem og
  anvender sikre lint-fixes ved en eksplicit gem, organiserer imports og
  sorterer JSX-props alfabetisk. En enkelt `biome.json` i roden konfigurerer
  alt dette. Der er ingen ESLint, Prettier eller oxc i repositoriet.

## Kørsel af projektet

Alle kommandoer køres fra repo-roden, inde i containeren.

```bash
bun install        # én gang, eller efter ændringer i afhængigheder
bun run dev        # starter web og api parallelt
bun run check      # lint + format + import-sortering, rapportér kun; bruges i CI
bun run check:fix  # samme, men skriver alle sikre rettelser
bun run lint       # kun lint
bun run format     # kun format, skriver
bun run format:check  # kun format, rapportér
```

Biome dækker TypeScript, JSX, CSS og JSON. Markdown-, YAML-, HTML- og SVG-filer
lades uberørt.

`bun run dev` kører `dev`-scriptet for hver workspace-pakke og sætter
outputtet foran med pakkenavnet. Åbn derefter porten for **web** i
**Ports**-panelet. Vite viderestiller alle `/api/...`-anmodninger til Nest, så
browseren kun nogensinde taler med én enkelt origin. API'et eksponerer
i øjeblikket en enkelt `GET /api`-rute, der returnerer en hilsen.

For at køre én app for sig:

```bash
bun run --filter web dev
bun run --filter api dev
```

### Per-app scripts

Kør dem fra roden med et workspace-filter, eller med almindelig `bun run` inde
i appens mappe:

```bash
bun run --filter web lint     # fra roden
bun run lint                  # inde i apps/web
```

| Script       | `web`                              | `api`                     |
| ------------ | ---------------------------------- | ------------------------- |
| `dev`        | Vite dev server med HMR            | `nest start --watch`      |
| `build`      | `tsc -b && vite build`             | `nest build` til `dist/`  |
| `lint`       | `biome lint .`                     | `biome lint .`            |
| `test`       | –                                  | Vitest unit tests        |
| `test:e2e`   | –                                  | Vitest e2e tests         |
| `preview`    | serverer produktionsbuild          | –                         |
| `start:prod` | –                                  | `node dist/main`          |

### Database

Legitimationsoplysninger er faste til lokal udvikling og angivet i `compose.yaml`:

```bash
postgres://app:app@db:5432/app
```

Ingen app bruger databasen endnu. Når en gør det, skal du vælge en driver eller
ORM, der læser `DATABASE_URL`, og så behøver der ingen ændringer i
container-opstillingen.

## Repository-layout

```text
.
├── .devcontainer/          # container-definition, se DEVCONTAINER.md
├── apps/
│   ├── web/                # Vite + React frontend
│   └── api/                # NestJS backend
├── DEVCONTAINER.md         # detaljeret reference for container-opstillingen
├── package.json            # bun workspaces root, indeholder "dev"-scriptet
├── bun.lock                # enkelt lockfile for alle workspaces
└── .gitignore              # én samlet ignore-fil for hele repositoriet
```

Bun bruger sin isolerede linker til workspaces. Reelle pakker ligger i
`node_modules/.bun` i roden, og hver apps `node_modules` indeholder kun
symlinks til det, som appen erklærer. Kør altid `bun install` fra roden.

## Relateret dokumentation

- [DEVCONTAINER.md](DEVCONTAINER.md): alt om hver fil i `.devcontainer/`,
  hvordan du tilføjer værktøjer, services eller udvidelser, og faldgruber
  der blev stødt på under opbygningen.
- [apps/web/README.md](apps/web/README.md): noter til Vite React-templaten.
  Dets oxlint-afsnit gælder ikke længere; dette repo bruger Biome.
- [apps/api/README.md](apps/api/README.md): noter til NestJS starteren.
- [Dev Containers-specifikationen](https://containers.dev/) og
  [featurekatalogen](https://containers.dev/features) til at tilføje værktøjer
  til containeren.
- [VS Code Dev Containers-dokumentation](https://code.visualstudio.com/docs/devcontainers/containers).
- [Bun workspaces](https://bun.com/docs/install/workspaces) for hvordan
  `--filter` og den delte lockfile opfører sig.

## Versioner

| Værktøj          | Version |
| ---------------- | ------- |
| Node (container) | 22      |
| bun              | 1.4     |
| Vite             | 8.3     |
| React            | 19.2    |
| NestJS           | 12.0    |
| Postgres         | 17      |
| Biome            | 2.5     |
