import { describe, it, expect, vi } from 'vitest';
import { DataPurgeService } from '../../src/services/storage/dataPurgeService';

describe('DataPurgeService', () => {
  it('calls clear functions on database, file storage and notifications', async () => {
    const mockDb = {
      runAsync: vi.fn().mockResolvedValue({}),
      execAsync: vi.fn().mockResolvedValue({}),
    };
    const mockStorage = {
      deleteAllReceipts: vi.fn().mockResolvedValue(undefined),
    };
    const mockNotifications = {
      cancelAllAlerts: vi.fn().mockResolvedValue(undefined),
    };

    const service = new DataPurgeService(
      mockDb as any,
      mockStorage as any,
      mockNotifications as any
    );

    await service.purgeAllUserData();

    expect(mockDb.runAsync).toHaveBeenCalled();
    expect(mockStorage.deleteAllReceipts).toHaveBeenCalled();
    expect(mockNotifications.cancelAllAlerts).toHaveBeenCalled();
  });
});
