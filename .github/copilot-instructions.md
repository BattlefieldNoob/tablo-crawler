<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a TypeScript + Bun CLI application called TabloCrawler that:

1. Monitors the Tablo social platform API — periodically fetches tavoli (dining table) information and participant details with intelligent filtering
2. Sends smart notifications via Telegram bot or console output with gender-balanced table filtering and multi-day scanning
3. Runs fast with Bun, using native fetch and modern TypeScript

## Project Structure
- `src/` — Shared business logic for the CLI
  - `config.ts` — Configuration builder (env + CLI options)
  - `http.ts` — Tablo API client and data models (TypeScript interfaces)
  - `filter.ts` — Table filtering logic (distance, participants, gender balance)
  - `format.ts` — Message formatting and summary helpers
  - `scanner.ts` — Multi-day scanning and orchestration
  - `message.ts` — Message services (Console and Telegram)
  - `users.ts` — Users listing task for a restaurant
  - `index.ts` — CLI entrypoint (Commander)
- `docs/` — API docs and examples

## Key Components
- CLI Entrypoint (`index.ts`) — Parses commands and options
- `TabloClient` (`http.ts`) — HTTP client for Tablo API using fetch
- `scanMultipleDays` (`scanner.ts`) — Multi-day table scan and notifications
- `hasMinimumParticipants` / `isWithinDistance` / `hasGenderBalance` (`filter.ts`) — Filtering primitives
- `ConsoleMessageService` / `TelegramMessageService` (`message.ts`) — Output channels
- `AppConfig` (`config.ts`) — Centralized configuration

## Smart Filtering Features
- Gender Balance Filtering: Only sends Telegram notifications for tables with ≤1 person gender difference
- Multi-Day Scanning: Scans multiple days starting from tomorrow (configurable)
- Minimum Participants Filter: Skips tables below a configurable threshold
- Distance-Based Sorting and Filtering: Prioritize and limit by max distance
- Intelligent Notifications: Always sends a summary, even when no balanced tables are found

## Tablo API Integration
The application integrates with the Tablo API (https://api.tabloapp.com) to:
1. Fetch Tavoli List: `/tavoliService/getTavoliNewOrder` with query parameters for target dates
2. Extract Tavoli IDs: Read `idTavolo` and optional `distanza`
3. Get Detailed Information: `/tavoliService/getTavolo` for each `idTavolo` to get:
   - Restaurant name (`nomeRistorante`)
   - Participant list (`partecipanti`)
   - For each participant: gender (`sessoMaschile` boolean), first name (`nome`), last name (`cognome`), birth year (`dataDiNascita`)

### Data Models (TypeScript)
- `TavoliNewOrderResponse` — Response from getTavoliNewOrder endpoint
- `TavoloResponse` — Response from getTavolo endpoint
- `TavoloDetails` — Restaurant and participant information including distance
- `Partecipante` — Individual participant data including birth year

## Configuration Options
The application supports configuration via environment variables and CLI options.

### Key Environment Variables
- `TABLO_AUTH_TOKEN` — Authentication token (required unless provided via CLI)
- `API_BASE_URL` — API base URL (default: `https://api.tabloapp.com`)
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — Telegram notification settings
- `TELEGRAM_NOTIFICATIONS_ENABLED` — Enable/disable Telegram notifications (default: true)
- `DAYS_TO_SCAN` — Number of days to scan starting from tomorrow (default: 3)
- `MIN_PARTICIPANTS` — Minimum participants to consider a table (default: 2)
- `MAX_DISTANCE` — Maximum distance in km to consider a table (default: 10.0)
- `INTERVAL_SECONDS` — Scan interval in seconds for loop modes (default: 300)
- `LOGGING_ENABLED` — Enable detailed console logging (default: true)

### CLI Options (Commander)
- `scan` command: `--days`, `--min-participants`, `--max-distance`, `--api.base.url`, `--auth.token`, `--telegram.bot.token`, `--telegram.chat.id`
- `users` command: `--id-ristorante` (required), `--min-partecipazioni`, `--api.base.url`, `--auth.token`

## Run Targets
- `bun run src/index.ts scan` — Run the multi-day scanning task
- `bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 2` — List users
- Package scripts: `bun run scan`, `bun run users`, `bun run start`

## Development Guidelines
When suggesting code changes, keep in mind:
- Keep responsibilities modular — filtering in `filter.ts`, formatting in `format.ts`, API in `http.ts`, orchestration in `scanner.ts`
- Favor TypeScript types for models and functions; keep data parsing tolerant to unknown fields
- Consider both Windows and Linux usage scenarios; commands should work with Bun
- Error handling should include clear console diagnostics; avoid crashing on recoverable API issues
- Testability: design pure helpers and keep I/O at the edges (API calls and messaging services)
- Track Project Structure Changes: Any modifications (new files, renamed paths, directories) must be documented and reflected in both the README.md and this copilot-instructions.md file

## Performance Note
Bun provides fast startup and execution. Avoid adding heavy build steps or slow toolchains. Prefer simple scripts and small, focused dependencies.
