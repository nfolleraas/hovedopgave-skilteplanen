# Dev container setup

Reference til, hvordan dette repos udviklingsmiljø er sat sammen, hvorfor hvert
element findes, og hvordan det ændres. Skrevet efter at have bygget det trin for
trin den 9. oktober 2026.

## Hvad du får

Et enkelt VS Code-devcontainer, der kører to apps fra samme repo samtidig,
en PostgreSQL-database og pgweb som webbaseret databaseklient.

| Del                         | Hvor                  | Kører på                                      |
| --------------------------- | --------------------- | --------------------------------------------- |
| React + TypeScript (Vite 8) | `apps/web`            | container port 5173                           |
| NestJS 12 + TypeScript      | `apps/api`            | container port 3000, ruter under `/api`      |
| Postgres 17                 | `db` compose service  | hostname `db`, port 5432, kun på compose-netværket |
| pgweb                       | `pgweb` compose service | `http://localhost:8081`, forbinder til `db` |

Start alt fra repo-roden inde i containeren:

```bash
bun run dev
```

Åbn derefter web-porten fra VS Code-panelet Ports. Anmodninger til `/api/...`
viderebehandles af Vite til Nest, så browseren kun kommunikerer med én oprindelse.

## Repo-layout

```text
.
├── .devcontainer/
│   ├── devcontainer.json       # hvad VS Code tilslutter sig og installerer
│   ├── compose.yaml            # containere: app + db + pgweb
│   ├── devcontainer-lock.json  # låste feature-versioner, kom det med i repoet
│   └── setup-zsh.sh            # Oh My Zsh plugins og tema
├── apps/
│   ├── web/                    # Vite + React, package name "web"
│   └── api/                    # NestJS, package name "api"
├── package.json                # bun workspaces root, indeholder "dev"-scriptet
├── bun.lock                    # én samlet lockfile for alle workspaces
└── .gitignore                  # én samlet ignore-fil for hele repoet
```

Bun bruger sin isolerede linker til workspaces: de rigtige pakker ligger i den
skjulte `node_modules/.bun` i roden, og hver apps `node_modules` indeholder
kun symlinks til det, den faktisk erklærer. Kør altid `bun install` fra roden.

## Filerne, linje for linje

### `.devcontainer/devcontainer.json`

```json
{
  "name": "hovedopgave-skilteplanen",
  "dockerComposeFile": "compose.yaml",
  "service": "app",
  "workspaceFolder": "/workspaces/hovedopgave-skilteplanen",
  "features": {
    "ghcr.io/shyim/devcontainers-features/bun:0": {},
    "ghcr.io/devcontainers/features/common-utils:2": {
      "configureZshAsDefaultShell": true
    }
  },

  "forwardPorts": [5173, 3000, 5432, 8081],
  "portsAttributes": {
    "5173": { "label": "web (vite)" },
    "3000": { "label": "api (nest)" },
    "5432": { "label": "db (postgres)" },
    "8081": { "label": "webui (postgres)" }
  },

  "postCreateCommand": "bash .devcontainer/setup-zsh.sh && bun install",

  "customizations": {
    "vscode": {
      "extensions": [
        "biomejs.biome",
        "mikestead.dotenv",
        "bradlc.vscode-tailwindcss",
        "redhat.vscode-yaml",
        "SalomonKylian.html-quick-wrapper",
        "formulahendry.auto-rename-tag",
        "aaron-bond.better-comments",
        "usernamehw.errorlens",
        "PKief.material-icon-theme",
        "YoavBls.pretty-ts-errors",
        "ms-azuretools.vscode-containers",
        "openai.chatgpt"
      ],
      "settings": {
        "terminal.integrated.defaultProfile.linux": "zsh",
        "workbench.startupEditor": "none",
        "workbench.iconTheme": "material-icon-theme",
        "editor.defaultFormatter": "biomejs.biome",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.biome": "explicit",
          "source.organizeImports.biome": "explicit",
          "source.action.useSortedAttributes.biome": "explicit"
        }
      }
    }
  },

  "remoteUser": "node"
}
```

- **`dockerComposeFile` / `service` / `workspaceFolder`** erstatter et almindeligt
  `image`. VS Code starter alle services i compose-filen og kobler sig til `app`.
  `workspaceFolder` skal matche bind-mount-målet i `compose.yaml`.
- **`features`** er installationsscripts, der lægges oven på service-billedet på
  build-tidspunktet. Bun-featuret tilføjer bun; common-utils konfigurerer Zsh
  som standardshell. `:0` er feature-versionens major-version, ikke bun-
  versionen; den præcise løste version registreres i `devcontainer-lock.json`.
- **`forwardPorts`** gør containerens porte tilgængelige for værten via browseren.
  Det betyder “gør tilgængelige”, ikke “garanterer dette nummer”: hvis værtsporten
  allerede er optaget, vælger VS Code den næste ledige port, og Ports-panelet
  viser den faktiske port.
- **`portsAttributes`** sætter kun labels i Ports-panelet.
- **`postCreateCommand`** konfigurerer Zsh og kører `bun install`, når
  devcontaineren oprettes. Zsh-scriptet kan køres igen sikkert. Når du har
  hentet ændringer i en `package.json`, skal du køre `bun install` manuelt.
- **`customizations.vscode.extensions`** installeres inde i containeren. Hostens
  extensions bliver ikke overført.
- **`customizations.vscode.settings`** er editor-indstillinger, der kun anvendes
  inde i containeren. `workbench.iconTheme` vælger Material Icon Theme for alle,
  fordi at installere selve extensionen alene ikke aktiverer den. Resten gør
  Biome til formatter og linter: formatér ved hver gem, og ved en eksplicit gem
  anvendes også sikre lint-fixes, import-organisation og sortering af JSX-
  attributter. Biome læser den enkelte `biome.json` i repo-roten og finder sit
  binary i `node_modules`, derfor er `@biomejs/biome` en root dev dependency
  låst til en præcis version, som Biomes egen dokumentation anbefaler. Config
  ekskluderer `public/`, `*.svg` og `*.html`, så `index.html` og ikon-assets
  aldrig bliver omskrevet. `apps/api`-overrides slår `useImportType` fra, fordi
  NestJS dependency injection kræver runtime class imports under
  `emitDecoratorMetadata`.
- **`remoteUser`** undgår at arbejde som root. Basisbilledet leverer en `node`
  bruger.

`.devcontainer/setup-zsh.sh` installerer `zsh-autosuggestions` og
`zsh-syntax-highlighting` under Oh My Zsh og vælger temaet `jnrowe`. Scriptet
kloner kun plugins, der ikke allerede findes, så genkørsel er sikker.

### `.devcontainer/compose.yaml`

```yaml
services:
  app:
    image: mcr.microsoft.com/devcontainers/typescript-node:22-bookworm
    volumes:
      - ..:/workspaces/devcontainer-test:cached
    command: sleep infinity
    environment:
      - DATABASE_URL=postgres://app:app@db:5432/app
    depends_on:
      - db
  pgweb:
    container_name: pgweb
    image: sosedoff/pgweb
    restart: unless-stopped
    ports:
      - 8081:8081
    environment:
      - PGWEB_DATABASE_URL=postgres://app:app@db:5432/app?sslmode=disable
    depends_on:
      - db
  db:
    image: postgres:17
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=app
      - POSTGRES_DB=app
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- **`app.image`** er Microsofts forbyggede Node 22-image på Debian bookworm med
  git, zsh og `node`-brugeren. Node 22, fordi Vite 8 kræver mindst 20.19.
- **`app.volumes`** bind-mounts repoet. Compose-filen ligger i
  `.devcontainer/`, så `..` er repo-roden.
- **`app.command: sleep infinity`** holder containeren i live. Billedet har ingen
  langvarig proces, så uden dette lukker den med det samme og VS Code har
  intet at tilslutte sig til.
- **`DATABASE_URL`** bruger hostname `db`, navnet på den anden service. Inde i
  compose-netværket løser service-navne som DNS. `localhost` inde i `app` er kun
  `app` selv. Verificér med `getent hosts db`.
- **`db`** har bevidst ingen `ports`-sektion. Appen når den via
  compose-netværket. pgweb forbinder til den via `db:5432` og udstiller sin
  webgrænseflade på værtens port 8081.
- **`pgweb`** er en let webklient til databasen. Åbn `http://localhost:8081`
  på værten. Dens `PGWEB_DATABASE_URL` bruger Compose-servicenavnet `db`;
  der kræves ingen direkte værtseksponering af Postgres.
- **`pgdata`** er et navngivet volume, så data overlever
  container-rebuilds. Bemærk de to forskellige `volumes:`-former: en _liste_ inde i
  en service og et _mapping_ øverst. Hvis dette gøres forkert, får man fejlen
  `volumes must be a mapping`.

Valider efter redigering, inde fra `.devcontainer/`:

```bash
docker compose config
```

### `package.json` (root)

```json
{
  "name": "devcontainer-test",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "check": "biome check",
    "check:fix": "biome check --write",
    "lint": "biome lint",
    "format": "biome format --write",
    "format:check": "biome format"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.15"
  }
}
```

`--filter '*'` kører `dev`-scriptet for hvert workspace-package parallelt, med
output præfikset med pakkenavnet. Begge apps skal derfor have et script kaldet
`dev`. Biome-scriptene filtreres ikke: Biome går gennem hele repoet fra roden og
respekterer `.gitignore` via `vcs`-indstillingen, og de per-app `lint`-scripts
kalder blot `biome lint .` for bekvemmelighed. `check` er den, der skal køre i CI,
fordi den dækker lint, format og import-order i et enkelt gennemløb. Nest-appens
`dev` blev tilføjet manuelt som et alias:

```json
"dev": "nest start --watch"
```

### `apps/api/src/main.ts`

```ts
app.setGlobalPrefix('api');
```

Hver Nest-route ligger under `/api`. Det er det, der gør, at Vite-proxyn kan
viderebehandle `/api` uden path rewrite.

### `apps/web/vite.config.ts`

```ts
server: {
  host: true,
  proxy: {
    '/api': 'http://localhost:3000',
  },
},
```

- **`host: true`** gør, at Vite lytter på alle interfaces, ikke kun loopback.
  Det er nødvendigt for, at porten kan være tilgængelig fra uden for
  containeren.
- **`proxy`** viderebehandler `/api/...` til Nest. `localhost:3000` er korrekt her,
  fordi Vite og Nest kører i samme container.

### `.gitignore` (root)

Én samlet ignore-fil for hele repoet. Ignore-filer gælder kun for deres egen mappe
og nedad, så per-app-filer blev fjernet. Den inkluderer `node_modules`, `dist`,
`*.local`, `*.tsbuildinfo` og den sædvanlige editor-noise.

## Sådan ændrer du ting

**Enhver ændring i `devcontainer.json` eller `compose.yaml`** kræver
_Dev Containers: Rebuild Container_ i kommandopalette. En kørende container
henter ikke konfigurationsændringer ind.

**Tilføj et værktøj til containeren** (fx en CLI): find en feature på
https://containers.dev/features og tilføj den under `features`. Hvis der ikke
findes en, skift `app.image` til `build: { dockerfile: Dockerfile }` i
`compose.yaml` og installer den der.

**Tilføj en ny service** (Redis, Mailpit, ...): tilføj den under `services:` i
`compose.yaml`, giv den et navngivet volume, hvis den gemmer data, og referér
til den fra `app` via service-navnet. Ingen `ports`-sektion er nødvendig for
trafik mellem appen og tjenesten.

**Skift databasen**: ændr `db.image` og de tre `POSTGRES_*`-variabler til den nye
databaseengines ækvivalenter, opdater `DATABASE_URL` så den matcher, og slet det
gamle volume (`docker volume rm devcontainer-test_devcontainer_pgdata`), fordi
engines ikke kan dele et data-katalog.

**Kobl Nest til Postgres**: vælg en driver eller ORM (Prisma, Drizzle, TypeORM).
Alle læser `DATABASE_URL`, som allerede er sat inde i `app`. Intet i
devcontaineren behøver at ændres.

**Nå databasen fra en host-GUI**: brug pgweb på `http://localhost:8081`.
For en anden databaseklient skal du eksplicit forwarde `db:5432` fra Ports-
panelet; `forwardPorts` ser kun på app-containeren, så dens 5432-post giver
ikke adgang til db-servicen. Port 8081 udstilles af Compose direkte på værten;
den tilsvarende `forwardPorts`-post er derfor ikke nødvendig for pgweb.

**Tilføj en VS Code-extension**: tilføj dens ID i
`customizations.vscode.extensions` og rebuild, eller installer den fra Extensions-
visningen, mens du er i containeren, og vælg _Add to devcontainer.json_.

**Skift en port**: opdater den på tre steder: appens egen konfiguration,
`forwardPorts` og `portsAttributes`.

## Faldgruber, der opstod undervejs

- **Vite vises på en anden host-port.** Et andet projekt på værten udstiller
  allerede 5173, så VS Code viderebehandlede til 5174. Læs den faktiske port i
  Ports-panelet, eller stop det andet projekt, eller flyt Vite til en ledig port.
- **`git rm --cached` siger "pathspec did not match".** Stier er relative til den
  mappe, du kører git fra, ikke repo-roden.
- **Nest CLI spørger om `@nestjs/observe`.** Det er et hostet observability SaaS,
  ikke en linter. Svar nej, eller angiv `--no-observe`.
- **`tsconfig.build.tsbuildinfo` blev committed.** Det er en build-cache. Ignore-
  regler påvirker aldrig allerede trackede filer, så efter at `*.tsbuildinfo` blev
  tilføjet til `.gitignore`, måtte filen også fjernes med `git rm --cached`.
- **`devcontainer-lock.json` dukkede op efter den første build.** Commit den.
  Den låser den præcise feature-version, ligesom `bun.lock`.

## Versioner på skrivningstidspunktet

| Værktøj          | Version |
| ---------------- | ------- |
| Node (container) | 22      |
| bun              | 1.4.2   |
| Vite             | 8.3     |
| React            | 19.2    |
| NestJS           | 12.0    |
| Postgres         | 17      |
| Docker Compose   | v5.5    |
| Biome            | 2.5.15  |
