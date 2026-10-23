export const documentDirectory = 'file:///data/user/0/app.doculocker.mobile/files/';

export async function makeDirectoryAsync(dir: string, options?: { intermediates?: boolean }): Promise<void> {
  // Mock no-op for Node tests
}

export async function copyAsync(options: { from: string; to: string }): Promise<void> {
  // Mock no-op for Node tests
}

export async function deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void> {
  // Mock no-op for Node tests
}

export async function getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }> {
  return { exists: false, size: 0 };
}
