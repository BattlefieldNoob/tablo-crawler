# TabloCrawler (TypeScript + Bun)

A fast TypeScript + Bun CLI that monitors the Tablo social platform API with intelligent filtering. It finds gender‑balanced dining opportunities across multiple days and sends filtered notifications via Telegram or console output.

## 🚀 Features

- **Smart Filtering**: Only notifies about gender-balanced tables (≤1 person difference)
- **Multi-Day Scanning**: Scans 2-3 days starting from tomorrow (configurable)
- **Distance-Based Sorting**: Orders tables by distance, showing nearest first
- **Distance Filtering**: Only considers tables within specified maximum distance
- **Minimum Participants Filter**: Skips solo diners and small groups (configurable)
- **Fast CLI**: Runs with Bun on Windows, macOS, and Linux
- **Intelligent Notifications**: Always sends summary, even when no balanced tables found
- **Flexible Configuration**: Environment variables, config files, and CLI arguments
- **Telegram Integration**: Smart notification management with optional disabling
- **Detailed Reporting**: Restaurant info, participant demographics, birth years, and distance
- **Error Handling**: Robust API error detection and graceful failure handling
- **Lightweight**: Minimal resource usage, perfect for IoT devices
- **Multi-Task CLI**: Select between table scanning and users listing tasks

## � Smart Filtering Logic

### Gender Balance Examples
| Participants | Action | Reason |
|-------------|---------|---------|
| 3👨 / 3👩 | ✅ **SENT** | Perfect balance |
| 4👨 / 3👩 | ✅ **SENT** | 1 person difference (tolerance) |
| 2👨 / 3👩 | ✅ **SENT** | 1 person difference (tolerance) |
| 5👨 / 2👩 | ❌ **SKIPPED** | 3 person difference (too unbalanced) |
| 1👨 / 4👩 | ❌ **SKIPPED** | 3 person difference (too unbalanced) |
| 1👨 only | ⏭️ **SKIPPED** | Below minimum participants |

### Multi-Day Scanning
- **Day +1**: Tomorrow
- **Day +2**: Day after tomorrow  
- **Day +3**: Three days from now
- **Configurable**: Adjust via `DAYS_TO_SCAN` (1-7 days)

## 🏗️ Architecture

Built with TypeScript and Bun, sharing clear, modular services:

- `src/http.ts`: Tablo API client + TypeScript interfaces
- `src/filter.ts`: Filtering logic (distance, participants, gender)
- `src/format.ts`: Message formatting and summary
- `src/scanner.ts`: Multi-day scanning and orchestration
- `src/message.ts`: Console and Telegram message services
- `src/config.ts`: Configuration (env + CLI merge)
- `src/users.ts`: Users listing task
- `src/index.ts`: CLI entrypoint (Commander)

## 🌐 Tablo API Integration

Integrates with Tablo API (https://api.tabloapp.com) to:

1. **Multi-Day Tavoli Search**: Calls `/tavoliService/getTavoliNewOrder` for each target date
2. **Extract Tavoli IDs**: Processes responses to extract `idTavolo` for each event
3. **Detailed Information**: For each tavolo, calls `/tavoliService/getTavolo` to get:
   - Restaurant name and location (`nomeRistorante`, `indirizzoRistorante`)
   - Participant list with demographics (`partecipanti`)
   - For each participant: gender (`sessoMaschile`), name (`nome`, `cognome`), birth year (`dataDiNascita`)

### API Configuration
- Host: `https://api.tabloapp.com`
- Authentication: `X-AUTH-TOKEN` header (your Tablo auth token)
- Location: Padova area (45.408153, 11.875273) with 4km radius (in code)
- Age Range: 18–37 years (in code)

## ⚙️ Configuration Options

### Complete Configuration Table

| Setting | Environment Variable | Config File | CLI Argument | Default | Description |
|---------|---------------------|-------------|--------------|---------|-------------|
| **API Settings** | | | | | |
| Base URL | `API_BASE_URL` | — | `--api.base.url` | `https://api.tabloapp.com` | Tablo API base URL |
| Auth Token | `TABLO_AUTH_TOKEN` | — | `--auth.token` | Required | Your Tablo authentication token |
| **Scanning Behavior** | | | | | |
| Scan Interval | `INTERVAL_SECONDS` | — | — | `300` | Seconds between scans (5 minutes) |
| Days to Scan | `DAYS_TO_SCAN` | — | `--days` | `3` | Number of days to scan from tomorrow |
| Min Participants | `MIN_PARTICIPANTS` | — | `--min-participants` | `2` | Minimum people required per table |
| Max Distance | `MAX_DISTANCE` | — | `--max-distance` | `10.0` | Maximum distance in km to consider |
| **Telegram Settings** | | | | | |
| Bot Token | `TELEGRAM_BOT_TOKEN` | — | `--telegram.bot.token` | Optional | Telegram bot token from @BotFather |
| Chat ID | `TELEGRAM_CHAT_ID` | — | `--telegram.chat.id` | Optional | Your Telegram chat ID |
| Enable Notifications | `TELEGRAM_NOTIFICATIONS_ENABLED` | — | — | `true` | Enable/disable Telegram messages |
| **Logging** | | | | | |
| Enable Logging | `LOGGING_ENABLED` | — | — | `true` | Enable detailed console output |

### Configuration Examples

#### Basic Setup (Environment Variables)
PowerShell (Windows):
```powershell
$env:TABLO_AUTH_TOKEN = "your_auth_token_here"
$env:TELEGRAM_BOT_TOKEN = "your_bot_token"
$env:TELEGRAM_CHAT_ID = "your_chat_id"
$env:DAYS_TO_SCAN = "5"        # Scan 5 days ahead
$env:MIN_PARTICIPANTS = "3"    # Only tables with 3+ people
```

Bash (Linux/macOS):
```bash
export TABLO_AUTH_TOKEN="your_auth_token_here"
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
export DAYS_TO_SCAN="5"
export MIN_PARTICIPANTS="3"
```

#### Command Line Options
Use CLI flags to override env values.

Examples:
```bash
bun run src/index.ts scan --days 5 --min-participants 3 --auth.token YOUR_TOKEN
bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 2 --auth.token YOUR_TOKEN
```

## 📦 Dependencies

- Bun 1.1+ installed
- Windows/macOS/Linux (including ARM64/Raspberry Pi)
- Tablo API access token

### Installing Dependencies

```bash
bun install
```

## ⚙️ Configuration

### Configuration

Prefer environment variables; override with CLI flags as needed.

```bash
export TABLO_AUTH_TOKEN="your_tablo_auth_token_here"
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
export TELEGRAM_CHAT_ID="your_chat_id_here"
```

## 🚀 Running the Application

### On Windows (Bun)

```powershell
# One-time
bun install

# Set the authentication token
$env:TABLO_AUTH_TOKEN = "your_tablo_auth_token_here"

# Scan tables (multi-day)
bun run scan

# List users for a restaurant
bun run users -- --id-ristorante 12345 --min-partecipazioni 2
```

### Commands

- Scan tables (multi-day): `bun run scan`
- Users listing: `bun run users -- --id-ristorante <id> [--min-partecipazioni <n>]`

Notes:
- Users listing runs once and exits (no interval loop)
- `--id-ristorante` is required for users listing
- `--min-partecipazioni` is optional; if omitted, all users returned by the API are shown

### On Raspberry Pi / Linux (Bun)

```bash
bun install
export TABLO_AUTH_TOKEN="your_tablo_auth_token_here"
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
export TELEGRAM_CHAT_ID="your_chat_id_here"

# Scan tables
bun run scan

# Users listing
bun run users -- --id-ristorante 12345 --min-partecipazioni 1
```

## 📊 Output Example

The application generates intelligent reports with gender balance filtering:

### Console Output
```
TabloCrawler - Bun Edition
⏰ Inizio scansione tavoli...

� Scansione data: 2025-07-22 (giorno +1)
� Trovati 5 tavoli per 2025-07-22

📋 Dettagli tavolo 294925 (2025-07-22):
🍽️ **Birrone Padova - Beer House & Comfort Food**
� Data: 2025-07-22
�👥 Partecipanti (6):
  👨 Fratelli Capone (1999)
  👨 Davide Capone (1999)  
  👩 Annalisa Mancuso (1999)
  👨 Giuseppe Falciglia (1998)
  👨 Marco Di Benedetto (1995)
  👨 Lorenzo Verdi (1996)

� Tavolo Birrone Padova: 5👨 / 1👩 (diff: 4)
⚠️ Tavolo 294925 (2025-07-22) non ha equilibrio di genere - solo console

📋 Dettagli tavolo 294926 (2025-07-22):
🍽️ **Osteria del Borgo**
📅 Data: 2025-07-22
👥 Partecipanti (4):
  👩 Sofia Rossi (1995)
  👨 Alessandro Bianchi (1993)
  👩 Giulia Verdi (1997)
  👨 Matteo Neri (1994)

🔢 Tavolo Osteria del Borgo: 2👨 / 2👩 (diff: 0)
⚖️ Tavolo 294926 (2025-07-22) ha equilibrio di genere - invio a Telegram

⏭️ Tavolo 294927 (2025-07-22) ha meno di 2 partecipanti (1) - saltato

✅ 2025-07-22: 1 tavoli equilibrati trovati

📅 Scansione data: 2025-07-23 (giorno +2)
🔍 Trovati 3 tavoli per 2025-07-23
...

📊 Scansione multi-giorno completata: 12 tavoli totali, 3 con equilibrio di genere (prossimi 3 giorni)
✅ Scansione completata. Pausa di 5 minuti...
```

### Telegram Notifications (Filtered)
Only balanced tables are sent to Telegram:

```
🍽️ **Osteria del Borgo**
📅 Data: 2025-07-22
👥 Partecipanti (4):
  👩 Sofia Rossi (1995)
  👨 Alessandro Bianchi (1993)
  👩 Giulia Verdi (1997)
  👨 Matteo Neri (1994)

📊 Scansione multi-giorno completata: 12 tavoli totali, 3 con equilibrio di genere (prossimi 3 giorni)
```

Or when no balanced tables are found:
```
⚖️ Nessun tavolo con equilibrio di genere trovato nei prossimi 3 giorni. Trovati 8 tavoli totali.
```

## 🤖 Telegram Bot Setup

1. **Create a Bot**: Message [@BotFather](https://t.me/BotFather) on Telegram
2. **Get Bot Token**: Follow BotFather's instructions to create a bot and get the token
3. **Get Chat ID**: 
   - Start a conversation with your bot
   - Send a message to your bot
   - Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your chat ID in the response

## 📋 Setting Up as a Service

### Systemd Service (Linux/Raspberry Pi)

Create `/etc/systemd/system/tablocrawler.service`:

```ini
[Unit]
Description=TabloCrawler - Smart Tablo Monitor
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/tablocrawler
Environment=TABLO_AUTH_TOKEN=your_auth_token
Environment=TELEGRAM_BOT_TOKEN=your_bot_token
Environment=TELEGRAM_CHAT_ID=your_chat_id
Environment=DAYS_TO_SCAN=3
Environment=MIN_PARTICIPANTS=2
Environment=INTERVAL_SECONDS=300
ExecStart=/usr/bin/bun run scan
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable tablocrawler
sudo systemctl start tablocrawler
sudo systemctl status tablocrawler
```

### Windows Service

Use [NSSM](https://nssm.cc/) or similar tools to run Bun as a service:

```powershell
nssm install TabloCrawler "C:\Program Files\Bun\bun.exe" "run scan"
nssm set TabloCrawler AppDirectory "C:\path\to\tablocrawler"
nssm start TabloCrawler
```

## 📊 Monitoring & Logs

The application provides detailed logging and status updates:

- **Console Output**: Real-time status updates and table scanning results
- **Telegram Notifications**: Gender-balanced table alerts and summary reports
- **Error Handling**: Automatic detection of API failures with detailed debug information
- **Configuration Validation**: Startup checks for required settings

Example Telegram notification:

```
🍽️ Balanced Table Found!
🏪 Restaurant: Osteria del Borgo
👥 Participants: 4 (2M, 2F)
� Date: 2025-01-15
⚖️ Perfect gender balance!

Names: Marco C., Giulia R., Andrea M., Sara B.
```

## 🔧 Development

### Project Structure

```
src/
├── config.ts      # AppConfig and config builder
├── filter.ts      # Filtering logic
├── format.ts      # Output formatting
├── http.ts        # Tablo API client + models
├── index.ts       # CLI entrypoint (Commander)
├── message.ts     # Console/Telegram message services
├── scanner.ts     # Multi-day scanning orchestration
└── users.ts       # Users listing task
```

### Adding New Features

1. Filtering Logic: extend `filter.ts`
2. Message Formats: tweak `format.ts`
3. Scanning Strategies: enhance `scanner.ts`
4. Configuration: extend `AppConfig` in `config.ts`
5. API Models: add interfaces in `http.ts`

### Common Commands

```bash
bun install
bun run scan
bun run users -- --id-ristorante 12345 --min-partecipazioni 2
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify `TABLO_AUTH_TOKEN` is correct and active
   - Check token format and expiration

2. **Network Connectivity**
   - Verify access to `https://api.tabloapp.com`
   - Check firewall settings for outbound HTTPS
   - Test API endpoints manually with curl

3. **Telegram Bot Issues**
   - Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
   - Ensure bot is not blocked by Telegram
   - Test with simple message first
   - Check Telegram API rate limits

4. **No Tables Found**
   - Verify date range is correct (starts from tomorrow)
   - Check if there are any tables available on Tablo platform
   - Ensure `MIN_PARTICIPANTS` setting is not too restrictive

5. **Gender Balance Issues**
   - Review filtering logic in console output
   - Adjust tolerance if needed (currently ≤1 person difference)
   - Check participant data quality from API

6. **Permission/Runtime Issues (Linux)**
   - Ensure Bun is installed and on PATH
   - Check systemd service user permissions
   - Verify access to config files

### Debug Mode

Enable detailed logging by setting:
```bash
export LOGGING_ENABLED=true
```

This will show:
- HTTP request/response details
- Table filtering decisions
- Gender balance calculations
- Configuration validation

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review existing GitHub issues
3. Create a new issue with detailed information

---

**Happy Monitoring! 🚀**
