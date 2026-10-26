import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService, NotificationDriver } from '@/services/notifications/notificationService';

class MockNotificationDriver implements NotificationDriver {
  public scheduled: Array<{
    identifier: string;
    content: { title: string; body: string; data?: Record<string, unknown> };
    trigger: Date | { date: Date };
  }> = [];

  async requestPermissionsAsync() {
    return { status: 'granted', granted: true };
  }

  async scheduleNotificationAsync(request: {
    content: { title: string; body: string; data?: Record<string, unknown> };
    trigger: Date | { date: Date };
  }) {
    const id = `notif-${this.scheduled.length + 1}`;
    this.scheduled.push({
      identifier: id,
      content: request.content,
      trigger: request.trigger,
    });
    return id;
  }

  async cancelScheduledNotificationAsync(identifier: string) {
    this.scheduled = this.scheduled.filter((n) => n.identifier !== identifier);
  }

  async getAllScheduledNotificationsAsync() {
    return [...this.scheduled];
  }
}

describe('NotificationService Unit Tests', () => {
  let driver: MockNotificationDriver;
  let service: NotificationService;

  beforeEach(() => {
    driver = new MockNotificationDriver();
    service = new NotificationService(driver);
  });

  it('requests permissions successfully', async () => {
    const granted = await service.requestPermissions();
    expect(granted).toBe(true);
  });

  it('schedules 30-day, 7-day, and return alerts when future dates apply', async () => {
    // Odniesienie: 2026-10-26
    const refNow = new Date('2026-10-26T10:00:00Z');

    // Gwarancja konczy sie 2028-10-26 (za 2 lata)
    // Zwrot konczy sie 2026-11-10 (za 15 dni)
    const result = await service.scheduleWarrantyAlerts(
      {
        documentId: 'doc-123',
        title: 'Konsola PlayStation 5',
        warrantyEndDate: '2028-10-26',
        returnDeadline: '2026-11-10',
        storeName: 'MediaMarkt',
      },
      refNow
    );

    expect(result.alert30dId).toBeTruthy();
    expect(result.alert7dId).toBeTruthy();
    expect(result.returnAlertId).toBeTruthy();
    expect(driver.scheduled).toHaveLength(3);

    const alertTypes = driver.scheduled.map((s) => s.content.data?.alertType);
    expect(alertTypes).toContain('WARRANTY_30D');
    expect(alertTypes).toContain('WARRANTY_7D');
    expect(alertTypes).toContain('RETURN_DEADLINE');
  });

  it('omits past alerts if warranty is already expiring or expired', async () => {
    // Odniesienie: 2026-10-26
    const refNow = new Date('2026-10-26T10:00:00Z');

    // Gwarancja konczy sie za 5 dni (2026-10-31)
    // Alert 30 dni przed byl 2026-10-01 (przeszlosc)
    // Alert 7 dni przed byl 2026-10-24 (przeszlosc)
    const result = await service.scheduleWarrantyAlerts(
      {
        documentId: 'doc-old',
        title: 'Zelazko',
        warrantyEndDate: '2026-10-31',
        returnDeadline: '2026-10-20', // w przeszlosci
      },
      refNow
    );

    expect(result.alert30dId).toBeNull();
    expect(result.alert7dId).toBeNull();
    expect(result.returnAlertId).toBeNull();
    expect(driver.scheduled).toHaveLength(0);
  });

  it('cancels existing alerts for document before scheduling new ones', async () => {
    const refNow = new Date('2026-10-26T10:00:00Z');

    await service.scheduleWarrantyAlerts(
      {
        documentId: 'doc-999',
        title: 'Myszka',
        warrantyEndDate: '2028-01-01',
      },
      refNow
    );
    expect(driver.scheduled.length).toBeGreaterThan(0);

    // Anulowanie
    await service.cancelAlertsForDocument('doc-999');
    expect(driver.scheduled).toHaveLength(0);
  });
});
