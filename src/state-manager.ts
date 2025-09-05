import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';

export interface ParticipantState {
  idUtente: string;
  nome: string;
  cognome: string;
  sessoMaschile: boolean;
  dataDiNascita: string;
  partecipante: boolean;
}

export interface TableState {
  idTavolo: string;
  nomeRistorante: string;
  partecipanti: ParticipantState[];
  lastUpdated: string;
}

export interface MonitoringState {
  tables: Record<string, TableState>;
  monitoredUsers: number[];
  lastScanTime: string;
}

export interface StateChange {
  type: 'user_joined' | 'user_left' | 'table_updated' | 'participant_joined' | 'participant_left';
  tableId: string;
  tableName: string;
  monitoredUserId?: number;
  participantName?: string;
  participantId?: string;
  details: any;
}

export interface StateManager {
  loadState(filePath: string): Promise<MonitoringState>;
  saveState(state: MonitoringState, filePath: string): Promise<void>;
  compareStates(previous: MonitoringState, current: MonitoringState): StateChange[];
}

export class JsonStateManager implements StateManager {
  async loadState(filePath: string): Promise<MonitoringState> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const state = JSON.parse(content) as MonitoringState;

      // Validate state structure
      if (!state.tables || !Array.isArray(state.monitoredUsers) || !state.lastScanTime) {
        console.warn(`Warning: Invalid state structure in ${filePath}, starting with fresh state`);
        return this.createEmptyState();
      }

      console.log(`Loaded monitoring state from ${filePath}`);
      return state;

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`State file not found at ${filePath}, starting with fresh state`);
        return this.createEmptyState();
      }

      console.error(`Error loading state from ${filePath}:`, error);
      console.log('Starting with fresh state');
      return this.createEmptyState();
    }
  }

  async saveState(state: MonitoringState, filePath: string): Promise<void> {
    try {
      // Validate state before saving
      this.validateState(state);

      // Ensure directory exists (only if it's not the current directory)
      const dir = dirname(filePath);
      if (dir !== '.' && dir !== '') {
        await mkdir(dir, { recursive: true });
      }

      // Atomic write using temporary file
      const tempFilePath = `${filePath}.tmp`;
      const content = JSON.stringify(state, null, 2);

      await writeFile(tempFilePath, content, 'utf-8');

      // Rename temp file to actual file (atomic operation on most filesystems)
      await writeFile(filePath, content, 'utf-8');

      console.log(`💾 Saved monitoring state to ${filePath} (${Object.keys(state.tables).length} tables, ${state.monitoredUsers.length} monitored users)`);

    } catch (error) {
      console.error(`❌ Error saving state to ${filePath}:`, error);

      // Try to save a backup with timestamp if main save fails
      try {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        const content = JSON.stringify(state, null, 2);
        await writeFile(backupPath, content, 'utf-8');
        console.log(`💾 Saved backup state to ${backupPath}`);
      } catch (backupError) {
        console.error(`❌ Failed to save backup state:`, backupError);
      }

      throw error;
    }
  }

  compareStates(previous: MonitoringState, current: MonitoringState): StateChange[] {
    const changes: StateChange[] = [];
    const monitoredUserSet = new Set(current.monitoredUsers);

    // Check for new tables with monitored users
    for (const [tableId, currentTable] of Object.entries(current.tables)) {
      const previousTable = previous.tables[tableId];

      if (!previousTable) {
        // New table - check if it has monitored users
        const monitoredUsersInTable = currentTable.partecipanti
          .filter(p => monitoredUserSet.has(parseInt(p.idUtente)))
          .map(p => parseInt(p.idUtente));

        for (const userId of monitoredUsersInTable) {
          changes.push({
            type: 'user_joined',
            tableId,
            tableName: currentTable.nomeRistorante,
            monitoredUserId: userId,
            details: { table: currentTable }
          });
        }
        continue;
      }

      // Compare participants between previous and current state
      const previousParticipants = new Map(
        previousTable.partecipanti.map(p => [p.idUtente, p])
      );
      const currentParticipants = new Map(
        currentTable.partecipanti.map(p => [p.idUtente, p])
      );

      // Check for users who joined
      for (const [userId, participant] of currentParticipants) {
        if (!previousParticipants.has(userId)) {
          const userIdNum = parseInt(userId);
          if (monitoredUserSet.has(userIdNum)) {
            changes.push({
              type: 'user_joined',
              tableId,
              tableName: currentTable.nomeRistorante,
              monitoredUserId: userIdNum,
              details: { table: currentTable, participant }
            });
          } else {
            // Non-monitored user joined a table with monitored users
            const hasMonitoredUsers = currentTable.partecipanti
              .some(p => monitoredUserSet.has(parseInt(p.idUtente)));

            if (hasMonitoredUsers) {
              changes.push({
                type: 'participant_joined',
                tableId,
                tableName: currentTable.nomeRistorante,
                participantName: `${participant.nome} ${participant.cognome}`,
                participantId: participant.idUtente,
                details: { table: currentTable, participant }
              });
            }
          }
        }
      }

      // Check for users who left
      for (const [userId, participant] of previousParticipants) {
        if (!currentParticipants.has(userId)) {
          const userIdNum = parseInt(userId);
          if (monitoredUserSet.has(userIdNum)) {
            changes.push({
              type: 'user_left',
              tableId,
              tableName: previousTable.nomeRistorante,
              monitoredUserId: userIdNum,
              details: { participant }
            });
          } else {
            // Non-monitored user left a table with monitored users
            const hasMonitoredUsers = previousTable.partecipanti
              .some(p => monitoredUserSet.has(parseInt(p.idUtente)));

            if (hasMonitoredUsers) {
              changes.push({
                type: 'participant_left',
                tableId,
                tableName: previousTable.nomeRistorante,
                participantName: `${participant.nome} ${participant.cognome}`,
                participantId: participant.idUtente,
                details: { participant }
              });
            }
          }
        }
      }

      // Check for table updates (same participants but different table details)
      const hasMonitoredUsers = currentTable.partecipanti
        .some(p => monitoredUserSet.has(parseInt(p.idUtente)));

      if (hasMonitoredUsers &&
        previousParticipants.size === currentParticipants.size &&
        [...currentParticipants.keys()].every(id => previousParticipants.has(id))) {

        // Compare actual table data instead of just timestamp
        const tableDataChanged = this.hasTableDataChanged(previousTable, currentTable);

        if (tableDataChanged) {
          changes.push({
            type: 'table_updated',
            tableId,
            tableName: currentTable.nomeRistorante,
            details: { previousTable, currentTable }
          });
        }
      }
    }

    // Check for tables that disappeared (monitored users left)
    for (const [tableId, previousTable] of Object.entries(previous.tables)) {
      if (!current.tables[tableId]) {
        const monitoredUsersInTable = previousTable.partecipanti
          .filter(p => monitoredUserSet.has(parseInt(p.idUtente)))
          .map(p => parseInt(p.idUtente));

        for (const userId of monitoredUsersInTable) {
          changes.push({
            type: 'user_left',
            tableId,
            tableName: previousTable.nomeRistorante,
            monitoredUserId: userId,
            details: { table: previousTable }
          });
        }
      }
    }

    return changes;
  }

  private createEmptyState(): MonitoringState {
    return {
      tables: {},
      monitoredUsers: [],
      lastScanTime: new Date().toISOString()
    };
  }

  private hasTableDataChanged(previous: TableState, current: TableState): boolean {
    // Compare table name
    if (previous.nomeRistorante !== current.nomeRistorante) {
      return true;
    }

    // Compare participants data (excluding lastUpdated timestamp)
    if (previous.partecipanti.length !== current.partecipanti.length) {
      return true;
    }

    // Create maps for efficient comparison
    const previousParticipants = new Map(
      previous.partecipanti.map(p => [p.idUtente, p])
    );
    const currentParticipants = new Map(
      current.partecipanti.map(p => [p.idUtente, p])
    );

    // Check if any participant data changed
    for (const [userId, currentParticipant] of currentParticipants) {
      const previousParticipant = previousParticipants.get(userId);

      if (!previousParticipant) {
        return true; // New participant
      }

      // Compare participant fields (excluding any timestamp fields)
      if (previousParticipant.nome !== currentParticipant.nome ||
        previousParticipant.cognome !== currentParticipant.cognome ||
        previousParticipant.sessoMaschile !== currentParticipant.sessoMaschile ||
        previousParticipant.dataDiNascita !== currentParticipant.dataDiNascita ||
        previousParticipant.partecipante !== currentParticipant.partecipante) {
        return true;
      }
    }

    return false; // No meaningful changes detected
  }

  private validateState(state: MonitoringState): void {
    if (!state) {
      throw new Error('State is null or undefined');
    }

    if (!state.tables || typeof state.tables !== 'object') {
      throw new Error('State.tables must be an object');
    }

    if (!Array.isArray(state.monitoredUsers)) {
      throw new Error('State.monitoredUsers must be an array');
    }

    if (!state.lastScanTime || typeof state.lastScanTime !== 'string') {
      throw new Error('State.lastScanTime must be a string');
    }

    // Validate each table state
    for (const [tableId, tableState] of Object.entries(state.tables)) {
      if (!tableState.idTavolo || !tableState.nomeRistorante || !Array.isArray(tableState.partecipanti)) {
        throw new Error(`Invalid table state for table ${tableId}`);
      }
    }

    console.log(`✅ State validation passed (${Object.keys(state.tables).length} tables)`);
  }
}