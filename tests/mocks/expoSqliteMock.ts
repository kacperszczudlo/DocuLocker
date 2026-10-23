export async function openDatabaseAsync(): Promise<never> {
  throw new Error('Native expo-sqlite should not be called in Node environment');
}
