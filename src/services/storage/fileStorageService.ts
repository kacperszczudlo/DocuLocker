import * as FileSystem from 'expo-file-system';

export interface FileSystemDriver {
  documentDirectory: string | null;
  makeDirectoryAsync(dir: string, options?: { intermediates?: boolean }): Promise<void>;
  copyAsync(options: { from: string; to: string }): Promise<void>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }>;
}

export class FileStorageService {
  private readonly driver: FileSystemDriver;
  private readonly receiptsDirName = 'receipts/';

  constructor(driver?: FileSystemDriver) {
    this.driver = driver ?? (FileSystem as unknown as FileSystemDriver);
  }

  getReceiptDirectory(): string {
    const baseDir = this.driver.documentDirectory ?? '';
    return baseDir.endsWith('/') ? `${baseDir}${this.receiptsDirName}` : `${baseDir}/${this.receiptsDirName}`;
  }

  async ensureDirectoryExists(): Promise<string> {
    const receiptsDir = this.getReceiptDirectory();
    const info = await this.driver.getInfoAsync(receiptsDir);
    if (!info.exists) {
      await this.driver.makeDirectoryAsync(receiptsDir, { intermediates: true });
    }
    return receiptsDir;
  }

  async saveReceiptImage(sourceUri: string, customId?: string): Promise<string> {
    const receiptsDir = await this.ensureDirectoryExists();
    const fileId = customId ?? `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const destinationUri = `${receiptsDir}${fileId}.jpg`;

    await this.driver.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    return destinationUri;
  }

  async deleteReceiptImage(targetUri: string): Promise<void> {
    if (!targetUri) return;
    try {
      await this.driver.deleteAsync(targetUri, { idempotent: true });
    } catch {
      // Idempotent delete - ignore if file doesn't exist
    }
  }
}
