# Implementation Plan

- [x] 1. Foundation and API Updates





- [x] 1.1 Update API interfaces to support user monitoring


  - Extend the `Partecipante` interface in `src/http.ts` to include `idUtente`, `partecipante`, `avatar`, and `isBrand` fields
  - Update TypeScript types to match actual API response structure
  - _Requirements: 2.1, 2.2_

- [x] 1.2 Extend configuration system for monitoring


  - Update `AppConfig` interface in `src/config.ts` to include monitoring settings
  - Add support for `userIdsFilePath`, `stateFilePath`, and `monitoringIntervalSeconds`
  - Implement environment variable and CLI flag support for new configuration options
  - Set sensible defaults for monitoring configuration
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2. Core Monitoring Services





- [x] 2.1 Create user ID file loader utility


  - Implement `UserLoader` class in new file `src/user-loader.ts`
  - Support loading user IDs from text file with comment support (# prefix)
  - Parse and validate user IDs as numbers, skip invalid entries with warnings
  - Handle file not found and permission errors gracefully
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.2 Implement state management system


  - Create `StateManager` class in new file `src/state-manager.ts`
  - Define `TableState`, `ParticipantState`, and `MonitoringState` interfaces
  - Implement JSON-based state persistence with atomic writes
  - Create state comparison logic to detect changes between scans
  - _Requirements: 3.1, 3.2_



- [x] 2.3 Build table change detection logic





  - Create `TableTracker` class in new file `src/table-tracker.ts`
  - Implement user identification by matching `idUtente` against monitored user set
  - Create change detection algorithms for user joins/leaves and participant changes
  - Generate structured `StateChange` events for different scenarios
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 3. Notification System



- [x] 3.1 Create specialized monitoring notification service



  - Implement `MonitoringNotifier` class in new file `src/monitoring-notifier.ts`
  - Extend existing `MessageService` interface with monitoring-specific methods
  - Format detailed Telegram messages for user joined/left events
  - Create verbose notifications for participant changes and table updates
  - Include comprehensive table and participant information in messages
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Main Monitoring Service




- [x] 4.1 Implement core user monitoring service


  - Create `UserMonitor` class in new file `src/user-monitor.ts`
  - Orchestrate continuous monitoring loop with configurable intervals
  - Coordinate user loading, table scanning, state comparison, and notifications
  - Implement error handling and recovery for API failures and file errors
  - Handle graceful shutdown with state persistence
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. CLI Integration and Final Wiring





- [x] 5.1 Add watch-users CLI command


  - Extend CLI in `src/index.ts` with new `watch-users` command
  - Add command-line options for user IDs file path, state file path, and scan interval
  - Integrate monitoring configuration with existing config building system
  - Wire up UserMonitor service with TabloClient and notification services
  - _Requirements: 5.1, 6.1, 6.2, 6.3_



- [x] 5.2 Integrate monitoring with existing table scanning

  - Modify table scanning logic to work with monitoring requirements
  - Ensure all tables are scanned regardless of gender balance or distance filters
  - Adapt existing API calls to retrieve complete table information for monitoring
  - Maintain compatibility with existing scan command functionality

  - _Requirements: 2.1, 2.2, 2.3_

- [x] 5.3 Add comprehensive error handling and logging

  - Implement robust error handling for all file operations and API calls
  - Add detailed logging for monitoring events, state changes, and errors
  - Create recovery mechanisms for transient failures
  - Ensure monitoring continues despite individual scan failures
  - _Requirements: 5.3, 5.4, 1.3, 1.4_