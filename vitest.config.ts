import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'expo-sqlite': path.resolve(__dirname, './tests/mocks/expoSqliteMock.ts'),
      'expo-file-system/legacy': path.resolve(__dirname, './tests/mocks/expoFileSystemMock.ts'),
      'expo-file-system': path.resolve(__dirname, './tests/mocks/expoFileSystemMock.ts'),
      'expo-notifications': path.resolve(__dirname, './tests/mocks/expoNotificationsMock.ts'),
      'expo-print': path.resolve(__dirname, './tests/mocks/expoPrintMock.ts'),
      'expo-sharing': path.resolve(__dirname, './tests/mocks/expoSharingMock.ts'),
      '@react-native-ml-kit/text-recognition': path.resolve(__dirname, './tests/mocks/mlKitMock.ts'),
    },
  },
});
