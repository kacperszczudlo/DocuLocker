import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Google Play Policy Permissions Check', () => {
  it('app.json does not contain prohibited or dangerous permissions', () => {
    const appJsonPath = path.resolve(__dirname, '../../app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const permissions: string[] = appJson.expo.android.permissions;

    expect(permissions).not.toContain('android.permission.SCHEDULE_EXACT_ALARM');
    expect(permissions).not.toContain('android.permission.SYSTEM_ALERT_WINDOW');
    expect(permissions).not.toContain('android.permission.READ_EXTERNAL_STORAGE');
    expect(permissions).not.toContain('android.permission.WRITE_EXTERNAL_STORAGE');
    expect(appJson.expo.android.versionCode).toBeGreaterThanOrEqual(1);
  });

  it('main AndroidManifest.xml does not contain prohibited permissions', () => {
    const manifestPath = path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml');
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    expect(manifest).not.toContain('android.permission.SYSTEM_ALERT_WINDOW');
    expect(manifest).not.toContain('android.permission.SCHEDULE_EXACT_ALARM');
    expect(manifest).not.toContain('android.permission.READ_EXTERNAL_STORAGE');
    expect(manifest).not.toContain('android.permission.WRITE_EXTERNAL_STORAGE');
  });
});
