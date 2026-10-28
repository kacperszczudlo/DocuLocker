import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Release Signing and Public Privacy Policy Page', () => {
  it('docs/privacy-policy.html exists and contains valid HTML with Zero-Data policy', () => {
    const htmlPath = path.resolve(__dirname, '../../docs/privacy-policy.html');
    expect(fs.existsSync(htmlPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('DocuLocker');
    expect(html).toContain('Zero-Data');
  });

  it('android/app/build.gradle has release signing config separation', () => {
    const gradlePath = path.resolve(__dirname, '../../android/app/build.gradle');
    const gradle = fs.readFileSync(gradlePath, 'utf8');
    expect(gradle).toContain('signingConfigs.release');
  });

  it('eas.json exists with production build-bundle configuration', () => {
    const easPath = path.resolve(__dirname, '../../eas.json');
    expect(fs.existsSync(easPath)).toBe(true);
    const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));
    expect(eas.build.production.android.buildType).toBe('app-bundle');
  });
});
