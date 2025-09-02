# Technology Stack

## Runtime & Build System
- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **Language**: TypeScript with ES2022 target
- **Module System**: ESNext with Bundler resolution
- **Package Manager**: Bun (uses bun.lock)

## Dependencies
- **CLI Framework**: Commander.js for command-line interface
- **HTTP Client**: Native fetch API (built into Bun)
- **Type System**: TypeScript with strict mode enabled

## Configuration Files
- `package.json`: Project metadata and scripts
- `tsconfig.json`: TypeScript compiler configuration
- `bunfig.toml`: Bun-specific configuration
- `mise.toml`: Development environment management

## Common Commands

### Development
```bash
# Install dependencies
bun install

# Run table scanning (main functionality)
bun run scan
# or
bun run src/index.ts scan

# Run user listing for a restaurant
bun run users -- --id-ristorante 12345 --min-partecipazioni 2
# or
bun run src/index.ts users --id-ristorante 12345

# Direct execution
bun run src/index.ts
```

### Environment Setup
```bash
# Required environment variables
export TABLO_AUTH_TOKEN="your_auth_token_here"

# Optional Telegram integration
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"

# Optional configuration
export DAYS_TO_SCAN="3"
export MIN_PARTICIPANTS="2"
export MAX_DISTANCE="10.0"
export INTERVAL_SECONDS="300"
```

## API Integration
- **Base URL**: https://api.tabloapp.com
- **Authentication**: X-AUTH-TOKEN header
- **Primary Endpoints**:
  - `/tavoliService/getTavoliNewOrder` - Get table summaries
  - `/tavoliService/getTavolo` - Get detailed table information
  - `/tavoliService/getNewUtentiInvitoRistorante` - Get restaurant users

## Platform Support
- Windows (primary development platform)
- macOS and Linux (including ARM64/Raspberry Pi)
- Designed for IoT devices and lightweight deployments