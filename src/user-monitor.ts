import { AppConfig } from './config.js';
import { TABLO_API_SUCCESS_CODE, TabloClient } from './http.js';
import { MonitoringNotifier } from './monitoring-notifier.js';
import { MonitoringState, StateChange, StateManager, TableState } from './state-manager.js';
import { TableTracker } from './table-tracker.js';
import { UserLoader } from './user-loader.js';

export interface MonitoringConfig extends AppConfig {
    userIdsFilePath: string;
    stateFilePath: string;
    monitoringIntervalSeconds: number;
}

export interface UserMonitor {
    startMonitoring(config: MonitoringConfig): Promise<void>;
    performScan(): Promise<void>;
    processChanges(changes: StateChange[]): Promise<void>;
}

export class ContinuousUserMonitor implements UserMonitor {
    private isRunning = false;
    private currentConfig?: MonitoringConfig;
    private monitoredUsers: number[] = [];
    private previousState?: MonitoringState;

    constructor(
        private tabloClient: TabloClient,
        private userLoader: UserLoader,
        private stateManager: StateManager,
        private tableTracker: TableTracker,
        private notifier: MonitoringNotifier
    ) { }

    async startMonitoring(config: MonitoringConfig): Promise<void> {
        // Validate configuration
        this.validateConfig(config);

        this.currentConfig = config;
        this.isRunning = true;

        console.log('🚀 Starting user monitoring service...');
        console.log(`📁 User IDs file: ${config.userIdsFilePath}`);
        console.log(`💾 State file: ${config.stateFilePath}`);
        console.log(`⏱️  Scan interval: ${config.monitoringIntervalSeconds} seconds`);
        console.log(`📅 Days to scan: ${config.daysToScan}`);
        console.log(`🔗 API base URL: ${config.baseUrl}`);

        // Set up graceful shutdown handlers
        this.setupShutdownHandlers();

        try {
            // Load monitored user IDs
            this.monitoredUsers = await this.userLoader.loadUserIds(config.userIdsFilePath);

            if (this.monitoredUsers.length === 0) {
                console.warn('⚠️  No user IDs to monitor. Service will continue but no notifications will be sent.');
            } else {
                console.log(`👥 Monitoring ${this.monitoredUsers.length} users: ${this.monitoredUsers.join(', ')}`);
            }

            // Load previous state
            this.previousState = await this.stateManager.loadState(config.stateFilePath);
            this.previousState.monitoredUsers = this.monitoredUsers; // Update monitored users list

            // Print initialization complete divider
            console.log('');
            console.log('═'.repeat(80));
            console.log('🎯 INITIALIZATION COMPLETE - STARTING MONITORING LOOP');
            console.log('═'.repeat(80));
            console.log('');

            // Start monitoring loop
            await this.runMonitoringLoop();

        } catch (error) {
            console.error('❌ Fatal error in monitoring service:', error);
            this.isRunning = false;
            throw error;
        }
    }

    async performScan(): Promise<void> {
        if (!this.currentConfig) {
            throw new Error('Monitoring not started - call startMonitoring first');
        }

        console.log('─'.repeat(60));
        console.log(`🔍 Starting scan at ${new Date().toLocaleString()}...`);
        console.log('─'.repeat(60));

        try {
            // Get all tables for multiple days
            const currentState = await this.scanAllTables();

            // Compare with previous state to detect changes
            const changes = this.stateManager.compareStates(this.previousState!, currentState);

            if (changes.length > 0) {
                console.log(`📊 Detected ${changes.length} changes`);
                await this.processChanges(changes);
            } else {
                console.log('✅ No changes detected');
            }

            // Save current state and update previous state
            await this.stateManager.saveState(currentState, this.currentConfig.stateFilePath);
            this.previousState = currentState;

            console.log(`✅ Scan completed at ${new Date().toLocaleString()}`);
            console.log('─'.repeat(60));

        } catch (error) {
            console.error('❌ Error during scan:', error);

            // Don't throw - we want to continue monitoring despite individual scan failures
            // Log the error and continue with the next scan cycle
        }
    }

    async processChanges(changes: StateChange[]): Promise<void> {
        for (const change of changes) {
            try {
                console.log(`📢 Processing change: ${change.type} for table ${change.tableId}`);

                switch (change.type) {
                    case 'user_joined':
                        await this.handleUserJoined(change);
                        break;
                    case 'user_left':
                        await this.notifier.sendUserLeftNotification(change);
                        break;
                    case 'participant_joined':
                    case 'participant_left':
                        await this.handleParticipantChange(change);
                        break;
                    case 'table_updated':
                        await this.handleTableUpdate(change);
                        break;
                    default:
                        console.warn(`Unknown change type: ${change.type}`);
                }
            } catch (error) {
                console.error(`❌ Error processing change ${change.type} for table ${change.tableId}:`, error);
                // Continue processing other changes even if one fails
            }
        }
    }

    private async runMonitoringLoop(): Promise<void> {
        while (this.isRunning) {
            try {
                await this.performScan();
            } catch (error) {
                console.error('❌ Error in monitoring loop:', error);
                // Continue monitoring despite errors
            }

            if (this.isRunning) {
                console.log(`⏳ Waiting ${this.currentConfig!.monitoringIntervalSeconds} seconds until next scan...`);
                await this.sleep(this.currentConfig!.monitoringIntervalSeconds * 1000);
            }
        }
    }

    private async scanAllTables(): Promise<MonitoringState> {
        const tablesWithMonitoredUsers: Record<string, TableState> = {};
        const monitoredUserSet = new Set(this.monitoredUsers);

        // Scan tables for multiple days to catch all possible tables
        for (let dayOffset = 0; dayOffset < this.currentConfig!.daysToScan; dayOffset++) {
            const date = new Date();
            date.setDate(date.getDate() + dayOffset);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            try {
                console.log(`📅 Scanning tables for ${dateStr}...`);

                // Get table summaries for this day - use same parameters as regular scanner but without filters
                // This ensures we get ALL tables for monitoring, not just filtered ones
                const tablesResponse = await this.retryApiCall(
                    () => this.tabloClient.getTavoliNewOrder({
                        dateTavolo: `["${dateStr}"]`,
                        // Remove demographic filters to get ALL near tables
                        // We need to check every table to find monitored users
                        raggio: this.currentConfig?.searchRadius ?? "4",
                        lat: this.currentConfig?.latitude ?? "45.408153",
                        lng: this.currentConfig?.longitude ?? "11.875273",
                        mappa: "0",
                        page: "0",
                        orderType: "filtering",
                        itemPerPage: "50", // Increase to get more tables per request
                    }),
                    `getTavoliNewOrder for ${dateStr}`
                );

                if (tablesResponse.code !== TABLO_API_SUCCESS_CODE || !tablesResponse.tavoli) {
                    console.warn(`⚠️  No tables found for ${dateStr}`);
                    continue;
                }

                console.log(`📋 Found ${tablesResponse.tavoli.length} tables for ${dateStr}`);

                // First pass: Check which tables have monitored users using summary data
                const interestingTables: typeof tablesResponse.tavoli = [];
                for (const tableSummary of tablesResponse.tavoli) {
                    // Check if any monitored users are in the participant IDs from summary
                    const participantIds = tableSummary.idPartecipanti || [];
                    const hasMonitoredUsers = participantIds.some(id => monitoredUserSet.has(parseInt(id)));
                    if (hasMonitoredUsers) {
                        interestingTables.push(tableSummary);
                    }
                }

                console.log(`🎯 Found ${interestingTables.length} tables with monitored users out of ${tablesResponse.tavoli.length} total`);

                // Second pass: Get detailed information only for interesting tables
                for (const tableSummary of interestingTables) {
                    try {
                        const tableResponse = await this.retryApiCall(
                            () => this.tabloClient.getTavolo(tableSummary.idTavolo),
                            `getTavolo for ${tableSummary.idTavolo}`
                        );

                        if (tableResponse.code !== TABLO_API_SUCCESS_CODE || !tableResponse.tavolo) {
                            console.warn(`⚠️  Could not get details for table ${tableSummary.idTavolo} (API returned code ${tableResponse.code})`);
                            continue;
                        }

                        const tableDetails = tableResponse.tavolo;

                        // Double-check with detailed data (in case summary was incomplete)
                        const monitoredUsersInTable = this.tableTracker.findMonitoredUsers(tableDetails, this.monitoredUsers);

                        if (monitoredUsersInTable.length > 0) {
                            console.log(`👥 Found ${monitoredUsersInTable.length} monitored users in table ${tableSummary.idTavolo} (${tableDetails.nomeRistorante})`);

                            // Convert to TableState format
                            const tableState: TableState = {
                                idTavolo: tableSummary.idTavolo,
                                nomeRistorante: tableDetails.nomeRistorante,
                                partecipanti: tableDetails.partecipanti.map(p => ({
                                    idUtente: p.idUtente,
                                    nome: p.nome,
                                    cognome: p.cognome,
                                    sessoMaschile: p.sessoMaschile,
                                    dataDiNascita: p.dataDiNascita,
                                    partecipante: p.partecipante
                                })),
                                lastUpdated: new Date().toISOString()
                            };

                            tablesWithMonitoredUsers[tableSummary.idTavolo] = tableState;
                        }

                        // Add small delay between API calls to be respectful
                        await this.sleep(100);

                    } catch (error) {
                        console.error(`❌ Error getting details for table ${tableSummary.idTavolo}:`, error);
                        // Continue with other tables
                    }
                }

                // Add delay between day scans
                await this.sleep(100);

            } catch (error) {
                console.error(`❌ Error scanning tables for ${dateStr}:`, error);
                // Continue with other days
            }
        }

        return {
            tables: tablesWithMonitoredUsers,
            monitoredUsers: this.monitoredUsers,
            lastScanTime: new Date().toISOString()
        };
    }

    private async handleUserJoined(change: StateChange): Promise<void> {
        try {
            // Get fresh table details for the notification with retry logic
            const tableResponse = await this.retryApiCall(
                () => this.tabloClient.getTavolo(change.tableId),
                `getTavolo for user joined notification ${change.tableId}`,
                2, // Fewer retries for notifications to avoid delays
                500
            );

            if (tableResponse.code === TABLO_API_SUCCESS_CODE && tableResponse.tavolo) {
                await this.notifier.sendUserJoinedNotification(change, tableResponse.tavolo);
                console.log(`✅ User joined notification sent for table ${change.tableId}`);
            } else {
                console.warn(`⚠️  Could not get fresh table details for user joined notification: ${change.tableId} (code: ${tableResponse.code})`);
                // Send notification without fresh details
                await this.notifier.sendUserJoinedNotification(change, change.details.table);
                console.log(`✅ User joined notification sent with cached details for table ${change.tableId}`);
            }
        } catch (error) {
            console.error(`❌ Error handling user joined for table ${change.tableId}:`, error);
            // Try to send notification with cached details as last resort
            try {
                if (change.details?.table) {
                    await this.notifier.sendUserJoinedNotification(change, change.details.table);
                    console.log(`✅ Fallback user joined notification sent for table ${change.tableId}`);
                } else {
                    console.error(`❌ No cached table details available for fallback notification`);
                }
            } catch (fallbackError) {
                console.error(`❌ Fallback notification also failed:`, fallbackError);
            }
        }
    }

    private async handleParticipantChange(change: StateChange): Promise<void> {
        try {
            // Get fresh table details for the notification with retry logic
            const tableResponse = await this.retryApiCall(
                () => this.tabloClient.getTavolo(change.tableId),
                `getTavolo for participant change notification ${change.tableId}`,
                2,
                500
            );

            if (tableResponse.code === TABLO_API_SUCCESS_CODE && tableResponse.tavolo) {
                await this.notifier.sendParticipantChangeNotification(change, tableResponse.tavolo);
                console.log(`✅ Participant change notification sent for table ${change.tableId}`);
            } else {
                console.warn(`⚠️  Could not get fresh table details for participant change notification: ${change.tableId} (code: ${tableResponse.code})`);
                // Send notification with cached details if available
                if (change.details?.table) {
                    await this.notifier.sendParticipantChangeNotification(change, change.details.table);
                    console.log(`✅ Participant change notification sent with cached details for table ${change.tableId}`);
                } else {
                    console.warn(`⚠️  No cached table details available for participant change notification`);
                }
            }
        } catch (error) {
            console.error(`❌ Error handling participant change for table ${change.tableId}:`, error);
            // Try with cached details as fallback
            try {
                if (change.details?.table) {
                    await this.notifier.sendParticipantChangeNotification(change, change.details.table);
                    console.log(`✅ Fallback participant change notification sent for table ${change.tableId}`);
                }
            } catch (fallbackError) {
                console.error(`❌ Fallback participant change notification failed:`, fallbackError);
            }
        }
    }

    private async handleTableUpdate(change: StateChange): Promise<void> {
        try {
            // Get fresh table details for the notification with retry logic
            const tableResponse = await this.retryApiCall(
                () => this.tabloClient.getTavolo(change.tableId),
                `getTavolo for table update notification ${change.tableId}`,
                2,
                500
            );

            if (tableResponse.code === TABLO_API_SUCCESS_CODE && tableResponse.tavolo) {
                await this.notifier.sendTableUpdateNotification(change, tableResponse.tavolo);
                console.log(`✅ Table update notification sent for table ${change.tableId}`);
            } else {
                console.warn(`⚠️  Could not get fresh table details for table update notification: ${change.tableId} (code: ${tableResponse.code})`);
                // Send notification with cached details
                if (change.details?.currentTable) {
                    await this.notifier.sendTableUpdateNotification(change, change.details.currentTable);
                    console.log(`✅ Table update notification sent with cached details for table ${change.tableId}`);
                } else {
                    console.warn(`⚠️  No cached table details available for table update notification`);
                }
            }
        } catch (error) {
            console.error(`❌ Error handling table update for table ${change.tableId}:`, error);
            // Try with cached details as fallback
            try {
                if (change.details?.currentTable) {
                    await this.notifier.sendTableUpdateNotification(change, change.details.currentTable);
                    console.log(`✅ Fallback table update notification sent for table ${change.tableId}`);
                }
            } catch (fallbackError) {
                console.error(`❌ Fallback table update notification failed:`, fallbackError);
            }
        }
    }

    private setupShutdownHandlers(): void {
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
            this.isRunning = false;

            try {
                if (this.previousState && this.currentConfig) {
                    console.log('💾 Saving final state...');
                    await this.stateManager.saveState(this.previousState, this.currentConfig.stateFilePath);
                    console.log('✅ State saved successfully');
                }
            } catch (error) {
                console.error('❌ Error saving state during shutdown:', error);
            }

            console.log('👋 User monitoring service stopped');
            process.exit(0);
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private validateConfig(config: MonitoringConfig): void {
        if (!config.authToken) {
            throw new Error('❌ Missing authentication token. Set TABLO_AUTH_TOKEN or use --auth.token');
        }

        if (!config.baseUrl) {
            throw new Error('❌ Missing API base URL. Set API_BASE_URL or use --api.base.url');
        }

        if (config.monitoringIntervalSeconds < 10) {
            console.warn('⚠️  Warning: Scan interval is very short (<10s). This may cause API rate limiting.');
        }

        if (config.daysToScan < 1) {
            throw new Error('❌ Days to scan must be greater than 1');
        }

        console.log('✅ Configuration validated successfully');
    }

    private async retryApiCall<T>(
        apiCall: () => Promise<T>,
        operationName: string,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxRetries) {
                    console.error(`❌ ${operationName} failed after ${maxRetries} attempts:`, lastError.message);
                    throw lastError;
                }

                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`⚠️  ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }

        throw lastError!;
    }
}

/**
 * Factory function to create a UserMonitor with all dependencies
 */
export function createUserMonitor(
    tabloClient: TabloClient,
    userLoader: UserLoader,
    stateManager: StateManager,
    tableTracker: TableTracker,
    notifier: MonitoringNotifier
): UserMonitor {
    return new ContinuousUserMonitor(tabloClient, userLoader, stateManager, tableTracker, notifier);
}