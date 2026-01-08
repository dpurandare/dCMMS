import { AuditLogger, AuditActions, AuditResources } from '@/lib/audit-logger';

describe('AuditLogger', () => {
    beforeEach(() => {
        // Clear logs before each test
        AuditLogger.clearLogs();

        // Mock localStorage
        const mockUser = { id: 'user-123', username: 'testuser' };
        Storage.prototype.getItem = jest.fn((key) => {
            if (key === 'user') return JSON.stringify(mockUser);
            return null;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('log', () => {
        it('should log an action', () => {
            AuditLogger.log(AuditActions.CREATE, AuditResources.USER, 'user-456', {
                username: 'newuser',
            });

            const logs = AuditLogger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].action).toBe(AuditActions.CREATE);
            expect(logs[0].resource).toBe(AuditResources.USER);
            expect(logs[0].resourceId).toBe('user-456');
            expect(logs[0].userId).toBe('user-123');
        });

        it('should include metadata', () => {
            const metadata = { field: 'value', count: 42 };
            AuditLogger.log(AuditActions.UPDATE, AuditResources.ASSET, 'asset-1', metadata);

            const logs = AuditLogger.getLogs();
            expect(logs[0].metadata).toEqual(metadata);
        });

        it('should include timestamp', () => {
            AuditLogger.log(AuditActions.DELETE, AuditResources.WORK_ORDER, 'wo-1');

            const logs = AuditLogger.getLogs();
            expect(logs[0].timestamp).toBeDefined();
            expect(new Date(logs[0].timestamp)).toBeInstanceOf(Date);
        });

        it('should handle missing user', () => {
            Storage.prototype.getItem = jest.fn(() => null);

            AuditLogger.log(AuditActions.VIEW, AuditResources.REPORT);

            const logs = AuditLogger.getLogs();
            expect(logs[0].userId).toBe('anonymous');
        });
    });

    describe('getFilteredLogs', () => {
        beforeEach(() => {
            AuditLogger.log(AuditActions.CREATE, AuditResources.USER, 'user-1');
            AuditLogger.log(AuditActions.UPDATE, AuditResources.USER, 'user-2');
            AuditLogger.log(AuditActions.DELETE, AuditResources.ASSET, 'asset-1');
        });

        it('should filter by resource', () => {
            const filtered = AuditLogger.getFilteredLogs({ resource: AuditResources.USER });
            expect(filtered).toHaveLength(2);
            expect(filtered.every(log => log.resource === AuditResources.USER)).toBe(true);
        });

        it('should filter by action', () => {
            const filtered = AuditLogger.getFilteredLogs({ action: AuditActions.DELETE });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].action).toBe(AuditActions.DELETE);
        });

        it('should filter by userId', () => {
            const filtered = AuditLogger.getFilteredLogs({ userId: 'user-123' });
            expect(filtered.every(log => log.userId === 'user-123')).toBe(true);
        });

        it('should filter by date', () => {
            const since = new Date(Date.now() - 1000); // 1 second ago
            const filtered = AuditLogger.getFilteredLogs({ since });
            expect(filtered).toHaveLength(3); // All logs should be after this
        });
    });

    describe('clearLogs', () => {
        it('should clear all logs', () => {
            AuditLogger.log(AuditActions.CREATE, AuditResources.USER);
            expect(AuditLogger.getLogs()).toHaveLength(1);

            AuditLogger.clearLogs();
            expect(AuditLogger.getLogs()).toHaveLength(0);
        });
    });

    describe('maxLogs limit', () => {
        it('should not exceed max logs', () => {
            // Log 1001 entries (max is 1000)
            for (let i = 0; i < 1001; i++) {
                AuditLogger.log(AuditActions.VIEW, AuditResources.REPORT, `report-${i}`);
            }

            const logs = AuditLogger.getLogs();
            expect(logs.length).toBeLessThanOrEqual(1000);
        });
    });
});
