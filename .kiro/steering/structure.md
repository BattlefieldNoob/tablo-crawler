# Project Structure

## Root Directory
```
├── src/                    # Source code (TypeScript)
├── docs/                   # Documentation and API examples
├── node_modules/           # Dependencies (managed by Bun)
├── .git/                   # Git repository
├── .github/                # GitHub workflows and templates
├── .kiro/                  # Kiro IDE configuration and steering
├── package.json            # Project metadata and scripts
├── tsconfig.json           # TypeScript configuration
├── bunfig.toml            # Bun runtime configuration
├── mise.toml              # Development environment setup
├── bun.lock               # Dependency lock file
└── README.md              # Project documentation
```

## Source Code Organization (`src/`)

### Core Architecture
- **`index.ts`**: CLI entrypoint using Commander.js with two main commands (`scan`, `users`)
- **`config.ts`**: Configuration management with environment variable and CLI flag merging
- **`http.ts`**: Tablo API client with TypeScript interfaces for all API responses

### Business Logic Modules
- **`scanner.ts`**: Multi-day table scanning orchestration and main application loop
- **`filter.ts`**: Gender balance filtering, distance filtering, and participant validation
- **`format.ts`**: Message formatting for console and Telegram output
- **`message.ts`**: Messaging services (Console and Telegram implementations)
- **`users.ts`**: Restaurant user listing functionality

### Supporting Files
- **`global.d.ts`**: Global TypeScript type definitions

## Documentation (`docs/`)
- **`TABLO_API_IMPLEMENTATION.md`**: Complete API integration documentation
- **`*.json`**: Example API response files for reference

## Code Organization Patterns

### Modular Services
Each module has a single responsibility:
- HTTP client handles all API communication
- Filter module contains all business logic for table selection
- Message services abstract notification delivery
- Scanner orchestrates the main application workflow

### Configuration Strategy
- Environment variables for deployment settings
- CLI flags for runtime overrides
- Sensible defaults for all optional parameters
- Centralized config building in `config.ts`

### TypeScript Interfaces
- Complete type definitions for all API responses
- Strict typing with `strict: true` in tsconfig
- Interface segregation for different API endpoints
- Helper functions for type conversion (`toNumberOrNull`)

## File Naming Conventions
- Lowercase with hyphens for multi-word files (not applicable in current structure)
- Descriptive single-word names for modules (`scanner`, `filter`, `format`)
- TypeScript `.ts` extension for all source files
- Configuration files use standard extensions (`.json`, `.toml`, `.md`)