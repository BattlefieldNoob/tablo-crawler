import { Partecipante, TavoloDetails } from './http';
import { MessageService } from './message';
import { ParticipantState, StateChange } from './state-manager';

export interface MonitoringNotifier extends MessageService {
    sendUserJoinedNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void>;
    sendUserLeftNotification(change: StateChange): Promise<void>;
    sendParticipantChangeNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void>;
    sendTableUpdateNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void>;
}

export class DetailedMonitoringNotifier implements MonitoringNotifier {
    constructor(private messageService: MessageService) { }

    async send(text: string): Promise<void> {
        return this.messageService.send(text);
    }

    async sendUserJoinedNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void> {
        const monitoredUser = tableDetails.partecipanti.find(p =>
            parseInt(p.idUtente) === change.monitoredUserId
        );

        if (!monitoredUser) {
            console.warn(`Monitored user ${change.monitoredUserId} not found in table details`);
            return;
        }

        const message = this.formatUserJoinedMessage(change, tableDetails, monitoredUser);
        await this.messageService.send(message);
    }

    async sendUserLeftNotification(change: StateChange): Promise<void> {
        const participant = change.details?.participant as ParticipantState;

        const message = [
            `🚪 MONITORED USER LEFT TABLE`,
            ``,
            `👤 User: ${participant?.nome || 'Unknown'} ${participant?.cognome || ''}`,
            `🏪 Restaurant: ${change.tableName}`,
            `📍 Table ID: ${change.tableId}`,
            `⏰ Time: ${new Date().toLocaleString()}`
        ].join('\n');

        await this.messageService.send(message);
    }

    async sendParticipantChangeNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void> {
        const isJoined = change.type === 'participant_joined';
        const emoji = isJoined ? '➕' : '➖';
        const action = isJoined ? 'JOINED' : 'LEFT';

        const monitoredUsers = this.getMonitoredUsersInTable(tableDetails, change);
        const monitoredUsersList = monitoredUsers.length > 0
            ? `\n👥 Monitored users at table: ${monitoredUsers.map(u => `${u.nome} ${u.cognome}`).join(', ')}`
            : '';

        const message = [
            `${emoji} PARTICIPANT ${action} MONITORED TABLE`,
            ``,
            `👤 Participant: ${change.participantName} (ID: ${change.participantId})`,
            `🏪 Restaurant: ${change.tableName}`,
            `📍 Table ID: ${change.tableId}`,
            `${monitoredUsersList}`,
            ``,
            `📊 Current table status:`,
            this.formatTableParticipants(tableDetails.partecipanti),
            `⏰ Time: ${new Date().toLocaleString()}`
        ].join('\n');

        await this.messageService.send(message);
    }

    async sendTableUpdateNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void> {
        const monitoredUsers = this.getMonitoredUsersInTable(tableDetails, change);
        const monitoredUsersList = monitoredUsers.length > 0
            ? `👥 Monitored users: ${monitoredUsers.map(u => `${u.nome} ${u.cognome}`).join(', ')}`
            : '';

        const message = [
            `🔄 TABLE UPDATED`,
            ``,
            `🏪 Restaurant: ${change.tableName}`,
            `📍 Table ID: ${change.tableId}`,
            `${monitoredUsersList}`,
            ``,
            `📊 Current participants:`,
            this.formatTableParticipants(tableDetails.partecipanti),
            `⏰ Time: ${new Date().toLocaleString()}`
        ].join('\n');

        await this.messageService.send(message);
    }

    private formatUserJoinedMessage(change: StateChange, tableDetails: TavoloDetails, monitoredUser: Partecipante): string {
        const userInfo = this.formatUserInfo(monitoredUser);
        const otherParticipants = tableDetails.partecipanti.filter(p => p.idUtente !== monitoredUser.idUtente);

        return [
            `🎉 MONITORED USER JOINED TABLE`,
            ``,
            `👤 User Details:`,
            userInfo,
            ``,
            `🏪 Restaurant: ${tableDetails.nomeRistorante}`,
            `📍 Table ID: ${change.tableId}`,
            ``,
            `👥 Other participants (${otherParticipants.length}):`,
            otherParticipants.length > 0
                ? this.formatTableParticipants(otherParticipants)
                : '   (No other participants)',
            ``,
            `📊 Total participants: ${tableDetails.partecipanti.length}`,
            `♂️ Male: ${tableDetails.partecipanti.filter(p => p.sessoMaschile).length}`,
            `♀️ Female: ${tableDetails.partecipanti.filter(p => !p.sessoMaschile).length}`,
            `⏰ Time: ${new Date().toLocaleString()}`
        ].join('\n');
    }

    private formatUserInfo(user: Partecipante): string {
        const gender = user.sessoMaschile ? '♂️' : '♀️';
        const age = this.calculateAge(user.dataDiNascita);
        const ageText = age ? ` (${age} years old)` : '';
        const brandText = user.isBrand ? ' 🏷️ Brand' : '';

        return [
            `   Name: ${user.nome} ${user.cognome}${brandText}`,
            `   Gender: ${gender}`,
            `   Birth Date: ${user.dataDiNascita}${ageText}`,
            `   Status: ${user.partecipante ? 'Confirmed participant' : 'Invited'}`
        ].join('\n');
    }

    private formatTableParticipants(participants: Partecipante[]): string {
        if (participants.length === 0) {
            return '   (No participants)';
        }

        return participants.map(p => {
            const gender = p.sessoMaschile ? '♂️' : '♀️';
            const status = p.partecipante ? '✅' : '⏳';
            const brandText = p.isBrand ? ' 🏷️' : '';
            return `   ${status} ${gender} ${p.nome} ${p.cognome}${brandText}`;
        }).join('\n');
    }

    private getMonitoredUsersInTable(tableDetails: TavoloDetails, change: StateChange): Partecipante[] {
        // For this implementation, we'll identify monitored users by checking if they match the change's monitoredUserId
        // In a real implementation, we'd need access to the full monitored user list
        if (change.monitoredUserId) {
            const monitoredUser = tableDetails.partecipanti.find(p =>
                parseInt(p.idUtente) === change.monitoredUserId
            );
            return monitoredUser ? [monitoredUser] : [];
        }
        return [];
    }

    private calculateAge(birthDate: string): number | null {
        try {
            const birth = new Date(birthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }

            return age;
        } catch {
            return null;
        }
    }
}

/**
 * Factory function to create a MonitoringNotifier with the appropriate underlying MessageService
 */
export function createMonitoringNotifier(messageService: MessageService): MonitoringNotifier {
    return new DetailedMonitoringNotifier(messageService);
}