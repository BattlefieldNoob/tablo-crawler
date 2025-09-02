# Requirements Document

## Introduction

This feature extends TabloCrawler to monitor specific user IDs for table participation, track state changes over time, and send detailed Telegram notifications when monitored users join or leave tables. The system maintains persistent state to detect changes and runs continuously as a long-running service.

## Requirements

### Requirement 1

**User Story:** As a TabloCrawler user, I want to load a list of user IDs from a file, so that I can monitor specific people's table participation.

#### Acceptance Criteria

1. WHEN the system starts THEN it SHALL load user IDs from a configurable file path
2. WHEN the file contains user IDs THEN the system SHALL parse and validate each ID as a number
3. IF the file is missing or unreadable THEN the system SHALL log an error and continue with an empty monitoring list
4. WHEN the file format is invalid THEN the system SHALL skip invalid entries and log warnings

### Requirement 2

**User Story:** As a TabloCrawler user, I want the system to search for my monitored users across all available tables, so that I can track their dining activities.

#### Acceptance Criteria

1. WHEN scanning tables THEN the system SHALL check each table's participant list for monitored user IDs
2. WHEN a monitored user is found THEN the system SHALL record their table participation details
3. WHEN multiple monitored users are at the same table THEN the system SHALL track all of them
4. WHEN no monitored users are found THEN the system SHALL continue monitoring without notifications

### Requirement 3

**User Story:** As a TabloCrawler user, I want the system to save and compare table states, so that I can detect when monitored users join or leave tables.

#### Acceptance Criteria

1. WHEN a table scan completes THEN the system SHALL save the current state of all tables with monitored users
2. WHEN the next scan occurs THEN the system SHALL compare the new state with the previous state
3. WHEN a monitored user joins a table THEN the system SHALL detect this as a "user joined" event
4. WHEN a monitored user leaves a table THEN the system SHALL detect this as a "user left" event
5. WHEN table details change but users remain the same THEN the system SHALL detect this as a "table updated" event

### Requirement 4

**User Story:** As a TabloCrawler user, I want to receive verbose Telegram messages about any changes to tables containing monitored users, so that I can stay informed about their dining environment.

#### Acceptance Criteria

1. WHEN a monitored user joins a table THEN the system SHALL send a detailed Telegram message with user info, table details, restaurant info, and other participants
2. WHEN a monitored user leaves a table THEN the system SHALL send a Telegram message indicating the user has left
3. WHEN any user joins a table that contains monitored users THEN the system SHALL send a notification about the new participant
4. WHEN any user leaves a table that contains monitored users THEN the system SHALL send a notification about the departed participant
5. WHEN table details change for a table with monitored users THEN the system SHALL send an update message
6. WHEN multiple events occur simultaneously THEN the system SHALL send separate messages for each event
7. IF Telegram is unavailable THEN the system SHALL log the message to console as fallback

### Requirement 5

**User Story:** As a TabloCrawler user, I want the monitoring system to run continuously, so that I can receive real-time updates about monitored users.

#### Acceptance Criteria

1. WHEN the monitoring command starts THEN the system SHALL run indefinitely until manually stopped
2. WHEN each scan cycle completes THEN the system SHALL wait for a configurable interval before the next scan
3. WHEN API errors occur THEN the system SHALL log the error and continue with the next scan cycle
4. WHEN the system encounters critical errors THEN it SHALL attempt to recover and continue monitoring
5. WHEN the user stops the process THEN the system SHALL gracefully save the current state before exiting

### Requirement 6

**User Story:** As a TabloCrawler user, I want to configure the monitoring behavior, so that I can customize the system for my needs.

#### Acceptance Criteria

1. WHEN configuring the system THEN I SHALL be able to specify the user IDs file path
2. WHEN configuring the system THEN I SHALL be able to set the scan interval in seconds
3. WHEN configuring the system THEN I SHALL be able to specify the state persistence file path
4. WHEN using CLI flags THEN they SHALL override environment variable settings
5. WHEN no configuration is provided THEN the system SHALL use sensible defaults