# Design Document

## Overview

The user monitoring feature extends TabloCrawler with a new `monitor` command that continuously tracks specific user IDs across all tables, detects state changes, and sends detailed Telegram notifications. The system maintains persistent state between scans to identify when monitored users or their table environments change.

## Architecture

### Core Components

1. **UserMonitor Service** - Main orchestration service that coordinates scanning, state comparison, and notifications
2. **UserLoader** - Handles loading and validation of user IDs from file
3. **StateManager** - Manages persistence and comparison of table states
4. **MonitoringNotifier** - Specialized message service for detailed monitoring notifications
5. **TableTracker** - Tracks individual table states and detects changes

### Integration Points

- Extends existing CLI with new `watch-users` command
- Reuses existing `TabloClient` for API communication
- Leverages existing `MessageService` interface for notifications
- Extends `AppConfig` with monitoring-specific configuration

## Components and Interfaces

### UserLoader

```typescript
interface UserLoader {
  loadUserIds(filePath: string): Promise<number[]>;
}
```

**Responsibilities:**
- Read user IDs from configurable file (supports comments with # prefix)
- Validate and parse user IDs as numbers
- Handle file errors gracefully with logging
- Skip comment lines and empty lines

### StateManager

```typescript
interface TableState {
  idTavolo: string;
  nomeRistorante: string;
  partecipanti: ParticipantState[];
  lastUpdated: string;
}

interface ParticipantState {
  idUtente: string;
  nome: string;
  cognome: string;
  sessoMaschile: boolean;
  dataDiNascita: string;
  partecipante: boolean;
}

interface MonitoringState {
  tables: Record<string, TableState>;
  monitoredUsers: number[];
  lastScanTime: string;
}

interface StateManager {
  loadState(filePath: string): Promise<MonitoringState>;
  saveState(state: MonitoringState, filePath: string): Promise<void>;
  compareStates(previous: MonitoringState, current: MonitoringState): StateChange[];
}
```

**Responsibilities:**
- Persist monitoring state to JSON file
- Load previous state on startup
- Compare current vs previous states to detect changes
- Generate structured change events

### TableTracker

```typescript
interface StateChange {
  type: 'user_joined' | 'user_left' | 'table_updated' | 'participant_joined' | 'participant_left';
  tableId: string;
  tableName: string;
  monitoredUserId?: number;
  participantName?: string;
  details: any;
}

interface TableTracker {
  findMonitoredUsers(table: TavoloDetails, monitoredIds: number[]): number[];
  detectChanges(oldTable: TableState | null, newTable: TableState, monitoredIds: number[]): StateChange[];
}
```

**Responsibilities:**
- Identify monitored users by matching `idUtente` against monitored user IDs
- Compare old vs new table states using participant `idUtente` fields
- Generate specific change events for different scenarios
- Handle edge cases like table creation/deletion

### MonitoringNotifier

```typescript
interface MonitoringNotifier extends MessageService {
  sendUserJoinedNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void>;
  sendUserLeftNotification(change: StateChange): Promise<void>;
  sendParticipantChangeNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void>;
  sendTableUpdateNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void>;
}
```

**Responsibilities:**
- Format detailed notifications for different event types
- Include comprehensive table and participant information
- Highlight monitored users in messages
- Provide context about what changed

### UserMonitor Service

```typescript
interface UserMonitor {
  startMonitoring(config: MonitoringConfig): Promise<void>;
  performScan(): Promise<void>;
  processChanges(changes: StateChange[]): Promise<void>;
}
```

**Responsibilities:**
- Orchestrate the continuous monitoring loop
- Coordinate scanning, state comparison, and notifications
- Handle errors and recovery
- Manage graceful shutdown

## Data Models

### Extended Configuration

```typescript
interface MonitoringConfig extends AppConfig {
  userIdsFilePath: string;
  stateFilePath: string;
  monitoringIntervalSeconds: number;
}
```

### Updated API Interfaces

The existing `Partecipante` interface needs to be extended to include the `idUtente` field:

```typescript
export interface Partecipante {
  idUtente: string;
  sessoMaschile: boolean;
  nome: string;
  cognome: string;
  dataDiNascita: string;
  partecipante: boolean;
  avatar?: string;
  isBrand?: boolean;
}
```

### User Identification Strategy

The Tablo API provides `idUtente` field in each participant object, enabling direct user ID matching:

1. **Direct ID Matching**: Compare monitored user IDs against `partecipanti[].idUtente` values
2. **Efficient Lookup**: Use Set data structure for O(1) user ID lookups
3. **Validation**: Ensure user IDs are valid numbers when loading from file

**File Format**: Simple text file with one user ID per line, supporting comments with # prefix:
```
# Monitored users for dining events
12345  # John Doe
67890  # Jane Smith
# 11111  # Temporarily disabled user
```

## Error Handling

### File Operations
- Missing user IDs file: Log warning, continue with empty monitoring list
- Corrupted state file: Log error, start with fresh state
- File permission errors: Log error, attempt fallback locations

### API Errors
- Network timeouts: Retry with exponential backoff
- Authentication failures: Log error, continue monitoring
- Rate limiting: Respect API limits with appropriate delays

### State Management
- State corruption: Validate state structure, reset if invalid
- Disk space issues: Log warnings, attempt cleanup of old states
- Concurrent access: Use file locking for state persistence

## Testing Strategy

### Manual Testing
- **Real API integration**: Test with actual Tablo API responses
- **Telegram notifications**: Verify message formatting and delivery
- **Long-running stability**: Test continuous operation over extended periods
- **User ID file parsing**: Test comment handling and validation
- **State change detection**: Verify all change types are detected correctly

## Performance Considerations

### Memory Usage
- Limit state history to prevent unbounded growth
- Use efficient data structures for user lookup
- Clean up old table states periodically

### API Rate Limiting
- Implement configurable delays between API calls
- Batch table detail requests when possible
- Respect API rate limits to avoid blocking

### File I/O Optimization
- Use atomic writes for state persistence
- Implement state file rotation to prevent corruption
- Cache user IDs in memory to avoid repeated file reads

## Security Considerations

### File Access
- Validate file paths to prevent directory traversal
- Use appropriate file permissions for state files
- Handle sensitive user data appropriately

### API Security
- Reuse existing authentication mechanisms
- Log API errors without exposing sensitive tokens
- Validate API responses to prevent injection attacks