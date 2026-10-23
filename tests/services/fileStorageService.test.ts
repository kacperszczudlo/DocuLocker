import { describe, it, expect, beforeEach } from 'vitest';
import { FileStorageService, FileSystemDriver } from '@/services/storage/fileStorageService';

class MockFileSystemDriver implements FileSystemDriver {
  documentDirectory = 'file:///app/documents/';
  directories = new Set<string>();
  files = new Map<string, { size: number }>();

  async makeDirectoryAsync(dir: string, options?: { intermediates?: boolean }): Promise<void> {
    this.directories.add(dir);
  }

  async copyAsync(options: { from: string; to: string }): Promise<void> {
    const fromFile = this.files.get(options.from) ?? { size: 1024 };
    this.files.set(options.to, fromFile);
  }

  async deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void> {
    this.files.delete(uri);
  }

  async getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }> {
    const file = this.files.get(uri);
    return {
      exists: !!file,
      size: file?.size,
    };
  }
}

describe('FileStorageService', () => {
  let driver: MockFileSystemDriver;
  let storageService: FileStorageService;

  beforeEach(() => {
    driver = new MockFileSystemDriver();
    storageService = new FileStorageService(driver);
  });

  it('initializes receipt directory when saving image', async () => {
    const savedPath = await storageService.saveReceiptImage('file:///tmp/camera_123.jpg', 'doc-uuid-1');
    expect(savedPath).toContain('receipts/doc-uuid-1.jpg');
    expect(driver.directories.has('file:///app/documents/receipts/')).toBe(true);

    const info = await driver.getInfoAsync(savedPath);
    expect(info.exists).toBe(true);
  });

  it('generates random id if customId is not provided', async () => {
    const savedPath = await storageService.saveReceiptImage('file:///tmp/camera_999.jpg');
    expect(savedPath).toMatch(/receipts\/[a-zA-Z0-9_-]+\.jpg$/);

    const info = await driver.getInfoAsync(savedPath);
    expect(info.exists).toBe(true);
  });

  it('deletes receipt image safely with idempotent delete', async () => {
    const savedPath = await storageService.saveReceiptImage('file:///tmp/receipt.jpg', 'doc-uuid-delete');
    expect((await driver.getInfoAsync(savedPath)).exists).toBe(true);

    await storageService.deleteReceiptImage(savedPath);
    expect((await driver.getInfoAsync(savedPath)).exists).toBe(false);

    // Deleting nonexistent file should not throw
    await expect(storageService.deleteReceiptImage(savedPath)).resolves.not.toThrow();
  });
});
